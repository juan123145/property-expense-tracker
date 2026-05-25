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

function parseDate(text: string): string | null {
  const now = new Date();
  const found: Array<{ str: string; date: Date }> = [];

  const patterns: Array<{ re: RegExp; toISO: (m: RegExpMatchArray) => string }> = [
    // YYYY-MM-DD or YYYY/MM/DD
    {
      re: /\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/g,
      toISO: (m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`,
    },
    // MM/DD/YYYY or MM-DD-YYYY
    {
      re: /\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](20\d{2})\b/g,
      toISO: (m) => `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`,
    },
    // MM/DD/YY
    {
      re: /\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](\d{2})\b/g,
      toISO: (m) => `20${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`,
    },
    // Month DD, YYYY  or  Month DD YYYY
    {
      re: /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(20\d{2})\b/gi,
      toISO: (m) => {
        const MM: Record<string, string> = {
          jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
          jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
        };
        return `${m[3]}-${MM[m[1].toLowerCase().slice(0, 3)]}-${m[2].padStart(2, "0")}`;
      },
    },
  ];

  for (const { re, toISO } of patterns) {
    let m: RegExpMatchArray | null;
    const copy = new RegExp(re.source, re.flags);
    while ((m = copy.exec(text)) !== null) {
      try {
        const iso = toISO(m);
        const d = new Date(iso + "T12:00:00");
        if (!isNaN(d.getTime()) && d <= now) found.push({ str: iso, date: d });
      } catch {
        // skip invalid
      }
    }
  }

  if (found.length === 0) return null;
  // Return the most recent non-future date
  return found.reduce((best, cur) => (cur.date > best.date ? cur : best)).str;
}

function parseAmount(text: string): string | null {
  const totalKeywords = /\b(total|grand total|amount due|balance due|total due|amt due|total amount)\b/i;
  const amountRe = /\$?\s*([\d,]+\.\d{2})/g;

  // First pass: lines containing "total" keywords
  for (const line of text.split("\n")) {
    if (!totalKeywords.test(line)) continue;
    const amounts: number[] = [];
    let m: RegExpMatchArray | null;
    const copy = new RegExp(amountRe.source, amountRe.flags);
    while ((m = copy.exec(line)) !== null) {
      const n = parseFloat(m[1].replace(/,/g, ""));
      if (n > 0.01) amounts.push(n);
    }
    if (amounts.length > 0) return Math.max(...amounts).toFixed(2);
  }

  // Second pass: largest dollar-sign amount anywhere
  const allAmounts: number[] = [];
  let m: RegExpMatchArray | null;
  const dollarRe = /\$\s*([\d,]+\.\d{2})/g;
  while ((m = dollarRe.exec(text)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (n > 0 && n < 1_000_000) allAmounts.push(n);
  }

  if (allAmounts.length === 0) return null;
  return Math.max(...allAmounts).toFixed(2);
}

function parsePayee(text: string): string | null {
  const skip =
    /^(receipt|invoice|thank you|store|sales|register|cashier|transaction|date|time|order|welcome|guest|customer|copy|visit us|www\.|http|\*+|-+|=+|\d+)$/i;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.length < 3) continue;
    if (skip.test(line)) continue;
    if (/^[\d\s\-().]+$/.test(line)) continue; // phone or pure number
    if (/^\d/.test(line) && line.length < 10) continue; // short number-starting line
    // Take first 5 words (store names rarely exceed this)
    return line.split(/\s+/).slice(0, 5).join(" ");
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
      // Verify the category exists in our CATEGORIES list
      if (CATEGORIES.find((c) => c.name === cat)) return cat;
    }
  }
  return null;
}

// ─── PDF text extraction ──────────────────────────────────────────────────────

export async function ocrPdfBuffer(buffer: Buffer): Promise<OcrResult> {
  let rawText = "";
  try {
    const data = await pdfParse(buffer);
    rawText = data.text ?? "";
  } catch {
    return { date: null, amount: null, payee: null, category: null, confidence: 0, rawText: "" };
  }

  if (!rawText.trim()) {
    return { date: null, amount: null, payee: null, category: null, confidence: 0, rawText: "" };
  }

  const payee = parsePayee(rawText);
  return {
    date: parseDate(rawText),
    amount: parseAmount(rawText),
    payee,
    category: suggestCategory(payee),
    confidence: 0.85, // direct text extraction is highly reliable
    rawText,
  };
}

// ─── Google Vision ────────────────────────────────────────────────────────────

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
        requests: [
          {
            image: { content: base64 },
            features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
          },
        ],
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

  const confidence = response?.fullTextAnnotation?.pages?.[0]?.confidence ?? 0.5;

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
