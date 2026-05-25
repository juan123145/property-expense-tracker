import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { transactions, transactionAttachments, properties } from "@/db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import JSZip from "jszip";
import { getFromR2 } from "@/lib/r2";

const GRAY = rgb(0.4, 0.4, 0.4);
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const ACCENT = rgb(0.18, 0.38, 0.73);

function urlToR2Key(url: string): string | null {
  if (url.startsWith("/api/file/")) return url.slice("/api/file/".length);
  return null;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

// ─── Summary PDF ──────────────────────────────────────────────────────────────

async function buildSummaryPdf(
  txs: Array<{
    date: string;
    payee: string | null;
    type: string;
    amount: string;
    category: string | null;
    subcategory: string | null;
    propertyName: string | null;
  }>,
  dateLabel: string,
  propertyLabel: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const [W, H] = PageSizes.Letter;
  const margin = 50;
  const col = { date: margin, payee: margin + 70, cat: margin + 270, amount: W - margin - 70 };
  const rowH = 16;

  let page = doc.addPage(PageSizes.Letter);
  let y = H - margin;

  const newPage = () => {
    page = doc.addPage(PageSizes.Letter);
    y = H - margin;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) newPage();
  };

  // Title
  page.drawText("Transaction Summary", { x: margin, y, font: fontBold, size: 18, color: ACCENT });
  y -= 28;
  page.drawText(`Period: ${dateLabel}`, { x: margin, y, font, size: 10, color: GRAY });
  y -= 16;
  if (propertyLabel) {
    page.drawText(`Property: ${propertyLabel}`, { x: margin, y, font, size: 10, color: GRAY });
    y -= 16;
  }
  page.drawText(`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, { x: margin, y, font, size: 10, color: GRAY });
  y -= 24;

  // Header row
  page.drawRectangle({ x: margin, y: y - 4, width: W - 2 * margin, height: rowH + 4, color: ACCENT });
  page.drawText("Date", { x: col.date, y: y - 1, font: fontBold, size: 9, color: WHITE });
  page.drawText("Payee", { x: col.payee, y: y - 1, font: fontBold, size: 9, color: WHITE });
  page.drawText("Category", { x: col.cat, y: y - 1, font: fontBold, size: 9, color: WHITE });
  page.drawText("Amount", { x: col.amount, y: y - 1, font: fontBold, size: 9, color: WHITE });
  y -= rowH + 8;

  let totalIncome = 0;
  let totalExpenses = 0;

  for (let i = 0; i < txs.length; i++) {
    ensureSpace(rowH + 4);
    const tx = txs[i];
    const amt = parseFloat(tx.amount);
    const isIncome = tx.type === "income";
    if (isIncome) totalIncome += amt; else totalExpenses += amt;

    if (i % 2 === 1) {
      page.drawRectangle({ x: margin, y: y - 4, width: W - 2 * margin, height: rowH, color: rgb(0.96, 0.96, 0.98) });
    }

    const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max - 1) + "…" : s;
    const catLabel = [tx.category, tx.subcategory].filter(Boolean).join(" › ");
    const amtStr = fmt(amt);
    const amtColor = isIncome ? rgb(0.1, 0.5, 0.1) : rgb(0.6, 0.1, 0.1);

    page.drawText(tx.date, { x: col.date, y, font, size: 8, color: BLACK });
    page.drawText(truncate(tx.payee ?? "—", 28), { x: col.payee, y, font, size: 8, color: BLACK });
    page.drawText(truncate(catLabel || "—", 22), { x: col.cat, y, font, size: 8, color: GRAY });
    const amtW = font.widthOfTextAtSize(amtStr, 8);
    page.drawText(amtStr, { x: col.amount + 60 - amtW, y, font, size: 8, color: amtColor });

    y -= rowH;
  }

  // Totals
  y -= 8;
  ensureSpace(60);
  page.drawLine({ start: { x: margin, y }, end: { x: W - margin, y }, thickness: 0.5, color: GRAY });
  y -= 16;

  const catTotals = new Map<string, number>();
  for (const tx of txs) {
    if (tx.type !== "expense") continue;
    const k = tx.category ?? "Uncategorized";
    catTotals.set(k, (catTotals.get(k) ?? 0) + parseFloat(tx.amount));
  }

  page.drawText("Totals", { x: margin, y, font: fontBold, size: 11, color: BLACK });
  y -= 18;
  page.drawText(`Total Income:`, { x: margin, y, font, size: 9, color: GRAY });
  page.drawText(fmt(totalIncome), { x: margin + 120, y, font: fontBold, size: 9, color: rgb(0.1, 0.5, 0.1) });
  y -= 14;
  page.drawText(`Total Expenses:`, { x: margin, y, font, size: 9, color: GRAY });
  page.drawText(fmt(totalExpenses), { x: margin + 120, y, font: fontBold, size: 9, color: rgb(0.6, 0.1, 0.1) });
  y -= 14;
  page.drawText(`Net:`, { x: margin, y, font, size: 9, color: GRAY });
  const net = totalIncome - totalExpenses;
  page.drawText(fmt(net), { x: margin + 120, y, font: fontBold, size: 9, color: net >= 0 ? rgb(0.1, 0.5, 0.1) : rgb(0.6, 0.1, 0.1) });
  y -= 22;

  if (catTotals.size > 0) {
    ensureSpace(20 + catTotals.size * 14 + 10);
    page.drawText("Expenses by Category", { x: margin, y, font: fontBold, size: 10, color: BLACK });
    y -= 16;
    for (const [cat, amt] of [...catTotals.entries()].sort((a, b) => b[1] - a[1])) {
      ensureSpace(14);
      page.drawText(cat, { x: margin + 10, y, font, size: 8, color: GRAY });
      page.drawText(fmt(amt), { x: margin + 200, y, font, size: 8, color: BLACK });
      y -= 14;
    }
  }

  return doc.save();
}

// ─── Receipts PDF ─────────────────────────────────────────────────────────────

async function buildReceiptsPdf(
  attachments: Array<{
    url: string;
    name: string | null;
    txDate: string;
    txPayee: string | null;
    txAmount: string;
    userId: string;
  }>
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const [W, H] = PageSizes.Letter;

  if (attachments.length === 0) {
    const page = doc.addPage(PageSizes.Letter);
    page.drawText("No attachments found for this period.", { x: 50, y: H / 2, font, size: 12, color: GRAY });
    return doc.save();
  }

  for (const att of attachments) {
    const key = urlToR2Key(att.url);
    const label = `${att.txDate}  ·  ${att.txPayee ?? "Unknown"}  ·  ${fmt(parseFloat(att.txAmount))}`;

    const addHeaderPage = async (note?: string) => {
      const pg = doc.addPage(PageSizes.Letter);
      pg.drawRectangle({ x: 0, y: H - 40, width: W, height: 40, color: ACCENT });
      pg.drawText(label, { x: 20, y: H - 26, font: fontBold, size: 10, color: WHITE });
      if (att.name) pg.drawText(att.name, { x: 20, y: H - 38, font, size: 7, color: rgb(0.8, 0.85, 1) });
      if (note) pg.drawText(note, { x: 20, y: H / 2, font, size: 11, color: GRAY });
    };

    if (!key) {
      await addHeaderPage("Attachment URL format not recognized.");
      continue;
    }

    const buf = key ? await getFromR2(key) : null;
    if (!buf) {
      await addHeaderPage("Could not retrieve attachment from storage.");
      continue;
    }

    const lowerName = (att.name ?? att.url).toLowerCase();
    const isPdf = lowerName.endsWith(".pdf");
    const isJpeg = lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg");
    const isPng = lowerName.endsWith(".png");

    if (isPdf) {
      try {
        const src = await PDFDocument.load(buf);
        const pageIdxs = src.getPageIndices();
        const copied = await doc.copyPages(src, pageIdxs);
        for (const p of copied) doc.addPage(p);
        // Overlay label on first copied page
        const firstPage = doc.getPage(doc.getPageCount() - pageIdxs.length);
        const existingH = firstPage.getHeight();
        firstPage.drawRectangle({ x: 0, y: existingH - 20, width: firstPage.getWidth(), height: 20, color: rgb(0, 0, 0) });
        firstPage.drawText(label, { x: 10, y: existingH - 15, font, size: 8, color: WHITE });
      } catch {
        await addHeaderPage("Could not embed PDF attachment.");
      }
    } else if (isJpeg || isPng) {
      try {
        const pg = doc.addPage(PageSizes.Letter);
        const img = isJpeg ? await doc.embedJpg(buf) : await doc.embedPng(buf);
        const maxW = W - 60;
        const maxH = H - 90;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const iW = img.width * scale;
        const iH = img.height * scale;
        pg.drawRectangle({ x: 0, y: H - 45, width: W, height: 45, color: ACCENT });
        pg.drawText(label, { x: 20, y: H - 25, font: fontBold, size: 10, color: WHITE });
        if (att.name) pg.drawText(att.name, { x: 20, y: H - 40, font, size: 7, color: rgb(0.8, 0.85, 1) });
        pg.drawImage(img, { x: (W - iW) / 2, y: (H - 45 - iH) / 2, width: iW, height: iH });
      } catch {
        await addHeaderPage("Could not embed image attachment.");
      }
    } else {
      // WebP or other format
      const pg = doc.addPage(PageSizes.Letter);
      pg.drawRectangle({ x: 0, y: H - 45, width: W, height: 45, color: ACCENT });
      pg.drawText(label, { x: 20, y: H - 25, font: fontBold, size: 10, color: WHITE });
      pg.drawText("Receipt image attached to transaction (format: WebP — preview not embeddable in PDF)", {
        x: 50, y: H / 2 + 10, font, size: 10, color: GRAY,
      });
      pg.drawText("View the receipt in the app under the transaction details.", {
        x: 50, y: H / 2 - 10, font, size: 9, color: GRAY,
      });
    }
  }

  return doc.save();
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const propertyId = searchParams.get("propertyId") || null;
  const type = searchParams.get("type") ?? "both"; // "summary" | "receipts" | "both"

  if (!start || !end) {
    return NextResponse.json({ error: "start and end date are required" }, { status: 400 });
  }

  const userId = session.user.id;

  // Fetch transactions in range
  const conds = [
    eq(transactions.userId, userId),
    eq(transactions.isDeleted, false),
    gte(transactions.date, start),
    lte(transactions.date, end),
    ...(propertyId ? [eq(transactions.propertyId, propertyId)] : []),
  ];

  const txRows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      amount: transactions.amount,
      type: transactions.type,
      payee: transactions.payee,
      category: transactions.category,
      subcategory: transactions.subcategory,
      propertyName: properties.name,
    })
    .from(transactions)
    .leftJoin(properties, eq(transactions.propertyId, properties.id))
    .where(and(...conds))
    .orderBy(transactions.date);

  const attRows = await db
    .select({
      transactionId: transactionAttachments.transactionId,
      url: transactionAttachments.url,
      name: transactionAttachments.name,
    })
    .from(transactionAttachments)
    .innerJoin(transactions, eq(transactionAttachments.transactionId, transactions.id))
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.isDeleted, false),
      gte(transactions.date, start),
      lte(transactions.date, end),
      ...(propertyId ? [eq(transactions.propertyId, propertyId)] : []),
    ))
    .orderBy(asc(transactions.date), asc(transactionAttachments.position));

  const txMap = new Map(txRows.map((t) => [t.id, t]));
  const dateLabel = `${start} to ${end}`;
  const propertyLabel = propertyId
    ? (txRows.find((t) => t.propertyName)?.propertyName ?? "")
    : "";

  const zip = new JSZip();

  if (type === "summary" || type === "both") {
    const summaryPdf = await buildSummaryPdf(txRows, dateLabel, propertyLabel);
    zip.file("summary.pdf", summaryPdf);
  }

  if (type === "receipts" || type === "both") {
    const attachmentList = attRows.map((a) => {
      const tx = txMap.get(a.transactionId);
      return {
        url: a.url,
        name: a.name,
        txDate: tx?.date ?? "",
        txPayee: tx?.payee ?? null,
        txAmount: tx?.amount ?? "0",
        userId,
      };
    });
    const receiptsPdf = await buildReceiptsPdf(attachmentList);
    zip.file("receipts.pdf", receiptsPdf);
  }

  const zipBuffer = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });

  return new NextResponse(zipBuffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="receipt-bundle-${start}-${end}.zip"`,
    },
  });
}
