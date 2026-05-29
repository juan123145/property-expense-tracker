import { db } from "@/db";
import { transactions, transactionAttachments, storageOwnerships } from "@/db/schema";
import { eq, and, lt, isNotNull, inArray } from "drizzle-orm";
import { deleteFromR2 } from "@/lib/r2";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const toDelete = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.isDeleted, true),
        isNotNull(transactions.deletedAt),
        lt(transactions.deletedAt, cutoff)
      )
    );

  if (toDelete.length === 0) {
    return Response.json({ deleted: 0 });
  }

  const ids = toDelete.map((r) => r.id);

  // For each transaction, clean up R2 files and quota records
  for (const id of ids) {
    const attachments = await db
      .select({ url: transactionAttachments.url })
      .from(transactionAttachments)
      .where(eq(transactionAttachments.transactionId, id));

    if (attachments.length > 0) {
      const urls = attachments.map((a) => a.url);
      // Delete storageOwnerships rows (frees quota) before transaction cascade
      await db.delete(storageOwnerships).where(inArray(storageOwnerships.attachmentUrl, urls));
      for (const { url } of attachments) {
        try { await deleteFromR2(url); } catch { /* non-fatal, logged in deleteFromR2 */ }
      }
    }
  }

  // Hard delete the transactions (cascade removes attachments rows)
  let deleted = 0;
  for (const id of ids) {
    await db.delete(transactions).where(eq(transactions.id, id));
    deleted++;
  }

  return Response.json({ deleted });
}
