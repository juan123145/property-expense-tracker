import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, transactionAttachments, users } from "@/db/schema";
import { eq, sum } from "drizzle-orm";
import { SettingsClient } from "./client";

const QUOTA_KB = 500 * 1024; // 500 MB

export default async function SettingsPage() {
  const user = await requireAuth();

  const [storageRow, userProfile] = await Promise.all([
    db
      .select({ totalKb: sum(transactionAttachments.sizeKb) })
      .from(transactionAttachments)
      .innerJoin(transactions, eq(transactionAttachments.transactionId, transactions.id))
      .where(eq(transactions.userId, user.id))
      .then((r) => r[0]),
    db
      .select({ username: users.username, phone: users.phone })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)
      .then((r) => r[0]),
  ]);

  const usedKb = Number(storageRow?.totalKb ?? 0);

  return (
    <SettingsClient
      user={{ name: user.name ?? null, email: user.email ?? null, image: user.image ?? null }}
      username={userProfile?.username ?? null}
      phone={userProfile?.phone ?? null}
      usedKb={usedKb}
      quotaKb={QUOTA_KB}
    />
  );
}
