import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { OnboardingClient } from "./client";

export const metadata = { title: "Complete Your Profile" };

export default async function OnboardingPage() {
  const user = await requireAuth();

  const [existingUser] = await db
    .select({ onboardingComplete: users.onboardingComplete })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (existingUser?.onboardingComplete) {
    redirect("/dashboard");
  }

  return <OnboardingClient user={user} />;
}
