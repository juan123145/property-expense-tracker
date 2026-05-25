import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ocrImageBuffer, ocrPdfBuffer } from "@/lib/ocr";

const EMPTY: import("@/lib/ocr").OcrResult = {
  date: null, amount: null, payee: null, category: null, confidence: 0, rawText: "",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  if (!isImage && !isPdf) {
    return NextResponse.json({ error: "Image or PDF required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = isPdf
      ? await ocrPdfBuffer(buffer)
      : await ocrImageBuffer(buffer, file.type);
    return NextResponse.json(result);
  } catch (err) {
    console.error("OCR error:", err);
    return NextResponse.json(EMPTY);
  }
}
