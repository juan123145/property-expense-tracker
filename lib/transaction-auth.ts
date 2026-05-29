import { transactions } from "@/db/schema";
import { and, eq, inArray, isNull, or } from "drizzle-orm";

/**
 * Builds the Drizzle WHERE clause that enforces transaction visibility.
 *
 * Rule:
 *   - Property-linked (propertyId IS NOT NULL): visible ONLY if the user
 *     currently has access to that property (propertyId IN accessibleIds).
 *   - Personal (propertyId IS NULL): visible ONLY to the transaction creator.
 *
 * This correctly implements access revocation: removing a user from a property
 * immediately removes visibility of ALL that property's transactions, regardless
 * of who created them.
 */
export function buildTransactionAccess(
  userId: string,
  accessibleIds: string[],
) {
  return or(
    // Personal transactions (no property): only the creator sees them
    and(isNull(transactions.propertyId), eq(transactions.userId, userId)),
    // Property-linked: current active property membership required
    accessibleIds.length > 0
      ? inArray(transactions.propertyId, accessibleIds)
      : undefined,
  );
}
