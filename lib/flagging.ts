export function shouldFlagForReview({
  category,
  amount,
  ocrConfidence,
  hasAttachment,
}: {
  category: string | null | undefined;
  amount: string | number | null | undefined;
  ocrConfidence: string | number | null | undefined;
  hasAttachment?: boolean;
}): boolean {
  if (!category) return true;

  const amt = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (!amt || isNaN(amt as number)) return true;

  if (ocrConfidence !== null && ocrConfidence !== undefined) {
    const conf = typeof ocrConfidence === "string" ? parseFloat(ocrConfidence) : ocrConfidence;
    if (!isNaN(conf) && conf < 0.7) return true;
  }

  if (hasAttachment === false) return true;

  return false;
}
