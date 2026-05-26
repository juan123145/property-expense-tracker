import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadToR2 } from "@/lib/r2";
import { db } from "@/db";
import { properties, storageOwnerships } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function validateMagicBytes(buf: Uint8Array, contentType: string): boolean {
  const b = buf;
  if (contentType === "image/jpeg")
    return b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
  if (contentType === "image/png")
    return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
  if (contentType === "image/webp")
    return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
           b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  if (contentType === "application/pdf")
    return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
  return false;
}

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

  const folderParam = (formData.get("folder") as string | null) ?? "";
  const folder = folderParam === "properties" ? "properties" : "receipts";

  const timestamp = Date.now();
  const safeName = sanitizeFilename(file.name);
  const key = `${folder}/${session.user.id}/${timestamp}-${safeName}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let buffer: Uint8Array = new Uint8Array((await file.arrayBuffer()) as any);
  const contentType = file.type;

  if (!validateMagicBytes(buffer, contentType)) {
    return NextResponse.json({ error: "File content does not match declared type" }, { status: 400 });
  }

  if (contentType === "application/pdf") {
    buffer = await optimizePdf(buffer);
  }

  const url = await uploadToR2(key, buffer, contentType);
  const sizeKb = Math.round(buffer.byteLength / 1024);

  // Record storage ownership
  const propertyIdString = (formData.get("propertyId") as string | null) ?? null;

  try {
    let ownerId = session.user.id; // Default to uploader

    // If propertyId provided, get the property owner
    if (propertyIdString) {
      const [property] = await db
        .select({ ownerId: properties.ownerId })
        .from(properties)
        .where(eq(properties.id, propertyIdString))
        .limit(1);

      if (property) {
        ownerId = property.ownerId;
      }
    }

    // Create storage ownership record
    await db.insert(storageOwnerships).values({
      attachmentUrl: url,
      propertyId: propertyIdString,
      ownerId: ownerId,
      uploadedByUserId: session.user.id,
      sizeBytes: buffer.byteLength,
      contentType: contentType,
      filePath: key,
    });
  } catch (err) {
    // Non-fatal error - log but don't fail the upload
    console.error("Failed to record storage ownership:", err);
  }

  return NextResponse.json({ url, filename: file.name, sizeKb });
}
