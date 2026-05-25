import { db } from "@/db";
import { transactions, transactionAttachments } from "@/db/schema";
import { eq, and, lt, isNotNull } from "drizzle-orm";
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

  // Delete R2 files for each transaction
  for (const id of ids) {
    const attachments = await db
      .select({ url: transactionAttachments.url })
      .from(transactionAttachments)
      .where(eq(transactionAttachments.transactionId, id));

    for (const { url } of attachments) {
      try { await deleteFromR2(url); } catch { /* non-fatal */ }
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
