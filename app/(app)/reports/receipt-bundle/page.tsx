import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ReceiptBundleClient } from "./client";

export default async function ReceiptBundlePage() {
  const user = await requireAuth();

  const userProperties = await db
    .select({ id: properties.id, name: properties.name })
    .from(properties)
    .where(and(eq(properties.userId, user.id), eq(properties.isArchived, false)));

  return <ReceiptBundleClient userProperties={userProperties} />;
}
