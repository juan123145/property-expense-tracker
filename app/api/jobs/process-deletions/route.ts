import { processPermanentDeletions, retryFailedDeletions } from "@/lib/deletion-service";
import { db } from "@/db";
import { softDeleteQueue } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/jobs/process-deletions
 *
 * Processes permanent deletion queue with retry logic.
 * Verifies authorization via bearer token in CRON_SECRET.
 * Calls processPermanentDeletions() to handle up to 100 transactions.
 * Then calls retryFailedDeletions() to retry failed attempts.
 *
 * Returns:
 * - 401 if unauthorized
 * - 500 if error occurs
 * - 200 with results { deletedCount, failedCount, retriedCount }
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Process permanent deletions
    const deleteResults = await processPermanentDeletions();

    // Retry failed deletions
    const retryResults = await retryFailedDeletions();

    return Response.json({
      success: true,
      deletedCount: deleteResults.deletedCount,
      failedCount: deleteResults.failedCount,
      retriedCount: retryResults.retriedCount,
    });
  } catch (err) {
    console.error("Error in process-deletions POST:", err);
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/process-deletions
 *
 * Returns the count of transactions pending permanent deletion.
 * Verifies authorization via bearer token in CRON_SECRET.
 *
 * Returns:
 * - 401 if unauthorized
 * - 200 with { pendingCount }
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get count of SOFT_DELETED records ready for permanent deletion
    const pending = await db
      .select({ count: softDeleteQueue.id })
      .from(softDeleteQueue)
      .where(eq(softDeleteQueue.status, "SOFT_DELETED"))
      .execute();

    const pendingCount = pending.length;

    return Response.json({ pendingCount });
  } catch (err) {
    console.error("Error in process-deletions GET:", err);
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
