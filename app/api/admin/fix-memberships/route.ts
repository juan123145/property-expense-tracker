import { fixOwnerMemberships } from "../fix-owner-memberships";

/**
 * POST /api/admin/fix-memberships
 *
 * Fixes missing owner membership records in the database.
 *
 * This should only be called ONCE to migrate existing data.
 * After that, new properties will automatically have owner memberships created.
 */
export async function POST(request: Request) {
  try {
    // Optional: Add authentication check here if needed
    // const auth = request.headers.get("authorization");

    const result = await fixOwnerMemberships();

    return Response.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (err) {
    console.error("fix-memberships API error:", err);
    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
