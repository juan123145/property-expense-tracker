"use server";

import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function completeOnboarding(formData: FormData): Promise<{ error?: string }> {
  const user = await requireAuth();

  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;

  if (!username || username.length < 3 || username.length > 20) {
    return { error: "Username must be 3-20 characters" };
  }

  if (!/^[a-z0-9_]+$/.test(username)) {
    return { error: "Username can only contain letters, numbers, and underscores" };
  }

  if (!name || name.length < 1 || name.length > 100) {
    return { error: "Name is required (1-100 characters)" };
  }

  try {
    await db
      .insert(users)
      .values({
        id: user.id,
        email: user.email ?? null,
        name,
        image: user.image ?? null,
        username,
        phone,
        onboardingComplete: true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username,
          name,
          phone,
          onboardingComplete: true,
          lastSeenAt: new Date(),
        },
      });
  } catch (err: any) {
    const errorMsg = err.message?.toLowerCase() || err.toString().toLowerCase();
    if (errorMsg.includes("unique") || errorMsg.includes("username")) {
      return { error: "Username already taken. Please choose another one." };
    }
    console.error("completeOnboarding:", err);
    return { error: "Failed to save profile" };
  }

  redirect("/dashboard");
}
