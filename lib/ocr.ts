import pdfParse from "pdf-parse";
import { CATEGORIES } from "./categories";

export type OcrResult = {
  date: string | null;
  amount: string | null;
  payee: string | null;
  category: string | null;
  confidence: number;
  rawText: string;
};

// ─── Parsers ──────────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

const MONTH_PATTERN =
  /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(20\d{2})\b/gi;

function extractDatesFromText(text: string): Array<{ str: string; date: Date; pos: number }> {
  const now = new Date();
  const results: Array<{ str: string; date: Date; pos: number }> = [];

  const patterns: Array<{ re: RegExp; toISO: (m: RegExpMatchArray) => string }> = [
    {
      re: /\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/g,
      toISO: (m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`,
    },
    {
      re: /\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](20\d{2})\b/g,
      toISO: (m) => `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`,
    },
    {
      re: /\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](\d{2})\b/g,
      toISO: (m) => `20${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`,
    },
    {
      re: new RegExp(MONTH_PATTERN.source, "gi"),
      toISO: (m) =>
        `${m[3]}-${MONTH_MAP[m[1].toLowerCase().slice(0, 3)]}-${m[2].padStart(2, "0")}`,
    },
    // DD Mon YYYY  (e.g. "29 Apr, 2025")
    {
      re: /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?),?\s+(20\d{2})\b/gi,
      toISO: (m) =>
        `${m[3]}-${MONTH_MAP[m[2].toLowerCase().slice(0, 3)]}-${m[1].padStart(2, "0")}`,
    },
  ];

  for (const { re, toISO } of patterns) {
    let m: RegExpMatchArray | null;
    const copy = new RegExp(re.source, re.flags);
    while ((m = copy.exec(text)) !== null) {
      try {
        const iso = toISO(m);
        const d = new Date(iso + "T12:00:00");
        if (!isNaN(d.getTime()) && d <= now) {
          results.push({ str: iso, date: d, pos: m.index ?? 0 });
        }
      } catch {
        // skip
      }
    }
  }

  return results;
}

function parseDate(text: string): string | null {
  const all = extractDatesFromText(text);
  if (all.length === 0) return null;

  // Priority 1: date on a line explicitly labeled as the invoice/receipt date
  const labeledDateRe =
    /\b(invoice\s+date|receipt\s+date|transaction\s+date|purchase\s+date|order\s+date|date\s+of\s+purchase|sale\s+date|bill\s+date|paid\s+on|payment\s+date)\b/i;

  for (const line of text.split("\n")) {
    if (!labeledDateRe.test(line)) continue;
    const datesOnLine = extractDatesFromText(line);
    if (datesOnLine.length > 0) {
      // Among labeled dates, return the earliest (issue date, not period-end)
      return datesOnLine.reduce((a, b) => (a.date < b.date ? a : b)).str;
    }
  }

  // Priority 2: return the date that appears earliest in the document
  // (invoice issue date is almost always at the top, period-end dates come later)
  return all.reduce((a, b) => (a.pos < b.pos ? a : b)).str;
}

function parseAmount(text: string): string | null {
  const lines = text.split("\n");

  // Keywords that indicate the total amount to pay
  const totalRe =
    /\b(invoice\s+amount|invoice\s+total|amount\s+charged|amount\s+paid|receipt\s+total|subtotal|total\s+amount|total\s+due|grand\s+total|total)\b/i;
  // Keywords whose amount we should NOT use (zero-balance lines, refunds, discounts)
  const skipRe = /\b(amount\s+due|balance\s+due|discount|refund|saving|payment[s]?)\b/i;

  const amountRe = /\$?\s*([\d,]+\.\d{2})/g;

  function amountsOnLine(line: string): number[] {
    const nums: number[] = [];
    let m: RegExpMatchArray | null;
    const copy = new RegExp(amountRe.source, amountRe.flags);
    while ((m = copy.exec(line)) !== null) {
      const n = parseFloat(m[1].replace(/,/g, ""));
      if (n > 0.01) nums.push(n);
    }
    return nums;
  }

  // Pass 1: preferred total keywords, same line or the very next line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!totalRe.test(line) || skipRe.test(line)) continue;

    // check same line first
    const same = amountsOnLine(line);
    if (same.length > 0) return Math.max(...same).toFixed(2);

    // then check the next line (common in table layouts)
    const next = lines[i + 1] ? amountsOnLine(lines[i + 1]) : [];
    if (next.length > 0) return Math.max(...next).toFixed(2);
  }

  // Pass 2: "Amount Due" or "Balance Due" — only accept if non-zero
  const balanceRe = /\b(amount\s+due|balance\s+due)\b/i;
  for (let i = 0; i < lines.length; i++) {
    if (!balanceRe.test(lines[i])) continue;
    const same = amountsOnLine(lines[i]).filter((n) => n > 0.01);
    if (same.length > 0) return Math.max(...same).toFixed(2);
    const next = lines[i + 1] ? amountsOnLine(lines[i + 1]).filter((n) => n > 0.01) : [];
    if (next.length > 0) return Math.max(...next).toFixed(2);
  }

  // Pass 3: largest explicit dollar-sign amount, ignoring $0.00 and amounts > $1M
  const allAmounts: number[] = [];
  let m: RegExpMatchArray | null;
  const dollarRe = /\$\s*([\d,]+\.\d{2})/g;
  while ((m = dollarRe.exec(text)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (n > 0.01 && n < 1_000_000) allAmounts.push(n);
  }
  if (allAmounts.length === 0) return null;
  return Math.max(...allAmounts).toFixed(2);
}

function parsePayee(text: string): string | null {
  // Exact-line skip (entire line is one of these tokens)
  const exactSkip =
    /^(receipt|invoice|thank you|store|sales|register|cashier|transaction|date|time|order|welcome|guest|customer|copy|visit us|paid|billed\s+to|ship\s+to|sold\s+to|description|qty|quantity|price|amount|subtotal|discount|tax|total|payment|subscription|billing|united\s+states|united\s+kingdom|\*+|-+|=+|\d+)$/i;

  // Lines that START with document-header words are always metadata, not vendor names
  const prefixSkip =
    /^(invoice|receipt|order|bill|statement|po\s|purchase\s+order|transaction\s+id|account\s+number|confirmation|ref(?:erence)?|id\s*[:#—]|www\.|http)/i;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.length < 3 || line.length > 80) continue;
    if (exactSkip.test(line)) continue;
    if (prefixSkip.test(line)) continue;
    if (/^[\d\s\-().,$@#%&*]+$/.test(line)) continue; // all symbols/numbers
    if (/^\d/.test(line) && line.length < 12) continue; // short number-starting
    // Skip all-caps tokens ≤8 chars — logos and section headers (ZERO, PAID, INVOICE)
    if (/^[A-Z0-9\s]{1,8}$/.test(line)) continue;
    // Skip address lines (digit + word, short)
    if (/^\d+\s+\w/.test(line) && line.length < 40) continue;
    // Take first 6 words max
    return line.split(/\s+/).slice(0, 6).join(" ");
  }
  return null;
}

const VENDOR_CATEGORY: Array<[RegExp, string]> = [
  [/home depot|lowe'?s|ace hardware|menards|harbor freight|fastenal/i, "Repairs & Maintenance"],
  [/sherwin.williams|benjamin moore|paint/i, "Repairs & Maintenance"],
  [/state farm|allstate|geico|progressive|farmers|nationwide|liberty mutual/i, "Insurance"],
  [/pest|exterminator|orkin|terminix|bug|rodent/i, "Repairs & Maintenance"],
  [/plumb|rooter|roto.rooter/i, "Repairs & Maintenance"],
  [/electric|hvac|air condition|heating|furnace/i, "Repairs & Maintenance"],
  [/cleaning|janitorial|merry maids/i, "Repairs & Maintenance"],
  [/landscap|lawn|garden|tree|snow/i, "Repairs & Maintenance"],
  [/pool|spa/i, "Repairs & Maintenance"],
  [/utility|electric company|power company|water company|gas company|sewer|waste/i, "Utilities"],
  [/at&t|comcast|xfinity|spectrum|cox|verizon fios|t-mobile|dish|directv/i, "Utilities"],
  [/property management|management company|property manager/i, "Management Fees"],
  [/mortgage|home loan|wells fargo|chase bank|bank of america|quicken|rocket mortgage/i, "Mortgages & Loans"],
  [/county tax|property tax|tax collector|tax assessor/i, "Taxes"],
  [/attorney|lawyer|law firm|legal|court|eviction/i, "Legal & Professional"],
  [/cpa|accountant|bookkeep|turbo tax/i, "Legal & Professional"],
  [/inspection|appraisal|survey/i, "Legal & Professional"],
];

function suggestCategory(payee: string | null): string | null {
  if (!payee) return null;
  for (const [re, cat] of VENDOR_CATEGORY) {
    if (re.test(payee)) {
      if (CATEGORIES.find((c) => c.name === cat)) return cat;
    }
  }
  return null;
}

// ─── Shared result builder ────────────────────────────────────────────────────

function buildResult(rawText: string, confidence: number): OcrResult {
  const payee = parsePayee(rawText);
  return {
    date: parseDate(rawText),
    amount: parseAmount(rawText),
    payee,
    category: suggestCategory(payee),
    confidence,
    rawText,
  };
}

// ─── PDF text extraction ──────────────────────────────────────────────────────

type VisionFilesResponse = {
  responses: Array<{
    responses?: Array<{
      fullTextAnnotation?: { text: string; pages?: Array<{ confidence?: number }> };
      error?: { message: string };
    }>;
    error?: { message: string };
  }>;
};

export async function ocrPdfBuffer(buffer: Buffer, signal?: AbortSignal): Promise<OcrResult> {
  const empty: OcrResult = { date: null, amount: null, payee: null, category: null, confidence: 0, rawText: "" };

  // Step 1: native text extraction (text-based PDFs)
  let rawText = "";
  try {
    const data = await pdfParse(buffer);
    rawText = data.text ?? "";
  } catch {
    // fall through to Vision
  }

  if (rawText.trim()) {
    return buildResult(rawText, 0.85);
  }

  // Step 2: scanned PDF — Google Vision files:annotate
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) return empty;

  try {
    const base64 = buffer.toString("base64");
    const res = await fetch(
      `https://vision.googleapis.com/v1/files:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{
            inputConfig: { content: base64, mimeType: "application/pdf" },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
            pages: [1, 2],
          }],
        }),
        signal,
      }
    );
    if (!res.ok) return empty;
    const data: VisionFilesResponse = await res.json();
    const pageResponses = data.responses?.[0]?.responses ?? [];
    rawText = pageResponses.map((p) => p.fullTextAnnotation?.text ?? "").join("\n");
    const confidence = pageResponses[0]?.fullTextAnnotation?.pages?.[0]?.confidence ?? 0.5;
    if (!rawText.trim()) return empty;
    return buildResult(rawText, confidence);
  } catch {
    return empty;
  }
}

// ─── Google Vision (images) ───────────────────────────────────────────────────

type VisionResponse = {
  responses: Array<{
    textAnnotations?: Array<{ description: string }>;
    fullTextAnnotation?: {
      text: string;
      pages?: Array<{ confidence?: number }>;
    };
    error?: { message: string };
  }>;
};

export async function ocrImageBuffer(
  buffer: Buffer,
  mimeType: string,
  signal?: AbortSignal
): Promise<OcrResult> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    return { date: null, amount: null, payee: null, category: null, confidence: 0, rawText: "" };
  }

  const base64 = buffer.toString("base64");

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          // DOCUMENT_TEXT_DETECTION handles dense document text (receipts, invoices)
          // much better than TEXT_DETECTION, and returns proper confidence scores
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        }],
      }),
      signal,
    }
  );

  if (!res.ok) throw new Error(`Vision API error: ${res.status}`);

  const data: VisionResponse = await res.json();
  const response = data.responses?.[0];

  if (response?.error) throw new Error(response.error.message);

  const rawText =
    response?.fullTextAnnotation?.text ??
    response?.textAnnotations?.[0]?.description ??
    "";

  // DOCUMENT_TEXT_DETECTION returns page-level confidence (0–1)
  const confidence = response?.fullTextAnnotation?.pages?.[0]?.confidence ?? 0.8;

  return buildResult(rawText, confidence);
}
