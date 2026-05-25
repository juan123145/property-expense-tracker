import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ocrImageBuffer } from "@/lib/ocr";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Image file required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await ocrImageBuffer(buffer, file.type);
    return NextResponse.json(result);
  } catch (err) {
    console.error("OCR error:", err);
    // Return empty result rather than 500 — OCR is best-effort
    return NextResponse.json({
      date: null,
      amount: null,
      payee: null,
      category: null,
      confidence: 0,
      rawText: "",
    });
  }
}
