import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { OnboardingClient } from "./client";

export const metadata = { title: "Complete Your Profile" };

export default async function OnboardingPage() {
  const user = await requireAuth();

  let isOnboardingComplete = false;
  try {
    const result = await db
      .select({ onboardingComplete: users.onboardingComplete })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    isOnboardingComplete = result[0]?.onboardingComplete ?? false;
  } catch {
    // users table may not exist yet if migration hasn't run
  }

  if (isOnboardingComplete) {
    redirect("/dashboard");
  }

  return <OnboardingClient user={user} />;
}
