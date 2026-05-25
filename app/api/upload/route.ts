import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadToR2 } from "@/lib/r2";
import { PDFDocument } from "pdf-lib";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
}

async function optimizePdf(input: Uint8Array): Promise<Uint8Array> {
  try {
    const doc = await PDFDocument.load(input, { ignoreEncryption: true });
    // Remove creator/producer metadata to reduce size
    doc.setCreator("");
    doc.setProducer("");
    // useObjectStreams compresses cross-reference tables — best lossless reduction available
    const optimized = await doc.save({ useObjectStreams: true, addDefaultPage: false });
    // Only use optimized version if it's actually smaller
    return optimized.byteLength < input.byteLength ? optimized : input;
  } catch {
    return input;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
  }

  const timestamp = Date.now();
  const safeName = sanitizeFilename(file.name);
  const key = `receipts/${session.user.id}/${timestamp}-${safeName}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let buffer: Uint8Array = new Uint8Array((await file.arrayBuffer()) as any);
  let contentType = file.type;

  if (contentType === "application/pdf") {
    buffer = await optimizePdf(buffer);
  }

  const url = await uploadToR2(key, buffer, contentType);
  const sizeKb = Math.round(buffer.byteLength / 1024);

  return NextResponse.json({ url, filename: file.name, sizeKb });
}
