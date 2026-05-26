import { requireAuth, getAccessiblePropertyIds } from "@/lib/auth-utils";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { ReceiptBundleClient } from "./client";

export default async function ReceiptBundlePage() {
  const user = await requireAuth();

  const accessiblePropertyIds = await getAccessiblePropertyIds(user.id);

  const userProperties = await db
    .select({ id: properties.id, name: properties.name })
    .from(properties)
    .where(and(inArray(properties.id, accessiblePropertyIds), eq(properties.isArchived, false)));

  return <ReceiptBundleClient userProperties={userProperties} />;
}
