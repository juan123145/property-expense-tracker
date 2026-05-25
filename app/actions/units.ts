"use server";

import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { units, properties } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createUnit(_prev: unknown, formData: FormData) {
  const user = await requireAuth();

  const propertyId = formData.get("propertyId") as string;
  const name = formData.get("name") as string;

  if (!name?.trim()) return { error: "Unit name is required." };

  const [property] = await db
    .select()
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.userId, user.id)))
    .limit(1);

  if (!property) return { error: "Property not found." };

  const existing = await db
    .select()
    .from(units)
    .where(and(eq(units.propertyId, propertyId), eq(units.name, name.trim())))
    .limit(1);

  if (existing.length > 0) return { error: "A unit with that name already exists." };

  await db.insert(units).values({ propertyId, name: name.trim() });

  revalidatePath(`/properties/${propertyId}`);
  return { success: true };
}
