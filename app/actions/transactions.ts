"use server";

import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, transactionAttachments } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { deleteFromR2 } from "@/lib/r2";

function parseOptionalUuid(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  return v && v !== "none" ? v : null;
}

function parseAttachmentsJson(formData: FormData): Array<{ url: string; name: string | null; sizeKb: number | null }> {
  const raw = formData.get("attachmentsJson") as string | null;
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function createTransaction(_prev: unknown, formData: FormData) {
  const user = await requireAuth();

  const date = formData.get("date") as string;
  const amountRaw = formData.get("amount") as string;
  const type = formData.get("type") as string;

  if (!date) return { error: "Date is required." };
  if (!amountRaw || isNaN(parseFloat(amountRaw))) return { error: "Amount is required." };
  if (!type) return { error: "Type is required." };

  const newAttachments = parseAttachmentsJson(formData);
  const ocrConfidenceRaw = formData.get("ocrConfidence") as string | null;
  const ocrConfidence = ocrConfidenceRaw ? parseFloat(ocrConfidenceRaw) : null;
  const needsReview = formData.get("needsReview") === "true";

  const [tx] = await db.insert(transactions).values({
    userId: user.id,
    date,
    amount: parseFloat(amountRaw).toFixed(2),
    type,
    payee: (formData.get("payee") as string) || null,
    category: (formData.get("category") as string) || null,
    subcategory: (formData.get("subcategory") as string) || null,
    propertyId: parseOptionalUuid(formData.get("propertyId") as string),
    unitId: parseOptionalUuid(formData.get("unitId") as string),
    notes: (formData.get("notes") as string) || null,
    ocrConfidence: ocrConfidence !== null ? String(ocrConfidence) : null,
    needsReview,
  }).returning({ id: transactions.id });

  if (newAttachments.length > 0) {
    await db.insert(transactionAttachments).values(
      newAttachments.map((a, i) => ({
        transactionId: tx.id,
        url: a.url,
        name: a.name ?? null,
        sizeKb: a.sizeKb ?? null,
        position: i,
      }))
    );
  }

  revalidatePath("/transactions");
  revalidatePath("/properties");
  return { success: true };
}

export async function updateTransaction(_prev: unknown, formData: FormData) {
  const user = await requireAuth();

  const id = formData.get("id") as string;
  if (!id) return { error: "Transaction ID is required." };

  const date = formData.get("date") as string;
  const amountRaw = formData.get("amount") as string;
  const type = formData.get("type") as string;

  if (!date) return { error: "Date is required." };
  if (!amountRaw || isNaN(parseFloat(amountRaw))) return { error: "Amount is required." };
  if (!type) return { error: "Type is required." };

  const newAttachments = parseAttachmentsJson(formData);
  const deleteIds: string[] = (() => {
    const raw = formData.get("deleteIds") as string | null;
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  })();

  if (deleteIds.length > 0) {
    const toDelete = await db
      .select({ url: transactionAttachments.url })
      .from(transactionAttachments)
      .where(and(
        inArray(transactionAttachments.id, deleteIds),
        eq(transactionAttachments.transactionId, id)
      ));
    for (const { url } of toDelete) {
      try { await deleteFromR2(url); } catch { /* non-fatal */ }
    }
    await db.delete(transactionAttachments).where(
      and(
        inArray(transactionAttachments.id, deleteIds),
        eq(transactionAttachments.transactionId, id)
      )
    );
  }

  if (newAttachments.length > 0) {
    const [maxRow] = await db
      .select({ pos: transactionAttachments.position })
      .from(transactionAttachments)
      .where(eq(transactionAttachments.transactionId, id))
      .orderBy(desc(transactionAttachments.position))
      .limit(1);
    const nextPos = (maxRow?.pos ?? -1) + 1;
    await db.insert(transactionAttachments).values(
      newAttachments.map((a, i) => ({
        transactionId: id,
        url: a.url,
        name: a.name ?? null,
        sizeKb: a.sizeKb ?? null,
        position: nextPos + i,
      }))
    );
  }

  const ocrConfidenceRaw = formData.get("ocrConfidence") as string | null;
  const ocrConfidence = ocrConfidenceRaw ? parseFloat(ocrConfidenceRaw) : null;
  const needsReview = formData.get("needsReview") === "true";

  await db
    .update(transactions)
    .set({
      date,
      amount: parseFloat(amountRaw).toFixed(2),
      type,
      payee: (formData.get("payee") as string) || null,
      category: (formData.get("category") as string) || null,
      subcategory: (formData.get("subcategory") as string) || null,
      propertyId: parseOptionalUuid(formData.get("propertyId") as string),
      unitId: parseOptionalUuid(formData.get("unitId") as string),
      notes: (formData.get("notes") as string) || null,
      ocrConfidence: ocrConfidence !== null ? String(ocrConfidence) : null,
      needsReview,
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

  revalidatePath("/transactions");
  revalidatePath("/properties");
  return { success: true };
}

export async function deleteTransaction(id: string) {
  const user = await requireAuth();

  await db
    .update(transactions)
    .set({ isDeleted: true, deletedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

  revalidatePath("/transactions");
  revalidatePath("/properties");
}

export async function clearAttachment(transactionId: string) {
  const user = await requireAuth();

  const [tx] = await db
    .select({ attachmentUrl: transactions.attachmentUrl })
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)))
    .limit(1);

  if (!tx) return;

  // Delete all from new table
  const attachments = await db
    .select({ url: transactionAttachments.url })
    .from(transactionAttachments)
    .where(eq(transactionAttachments.transactionId, transactionId));

  // Delete old single-column file if present
  if (tx.attachmentUrl) {
    try { await deleteFromR2(tx.attachmentUrl); } catch { /* non-fatal */ }
  }
  for (const { url } of attachments) {
    try { await deleteFromR2(url); } catch { /* non-fatal */ }
  }

  await db.delete(transactionAttachments).where(eq(transactionAttachments.transactionId, transactionId));

  await db
    .update(transactions)
    .set({ attachmentUrl: null, attachmentName: null, attachmentSizeKb: null, updatedAt: new Date() })
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, user.id)));

  revalidatePath("/transactions");
  revalidatePath("/properties");
}

export async function deleteTransactionAttachment(attachmentId: string) {
  const user = await requireAuth();

  const [attachment] = await db
    .select({ url: transactionAttachments.url, transactionId: transactionAttachments.transactionId })
    .from(transactionAttachments)
    .innerJoin(transactions, eq(transactionAttachments.transactionId, transactions.id))
    .where(and(eq(transactionAttachments.id, attachmentId), eq(transactions.userId, user.id)))
    .limit(1);

  if (!attachment) return;

  try { await deleteFromR2(attachment.url); } catch { /* non-fatal */ }

  await db.delete(transactionAttachments).where(eq(transactionAttachments.id, attachmentId));

  revalidatePath("/transactions");
  revalidatePath("/properties");
}
