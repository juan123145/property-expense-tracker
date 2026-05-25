"use server";

import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { properties, units, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type UnitEdit = { id?: string; name: string; deleted: boolean };

export async function createProperty(_prev: unknown, formData: FormData) {
  const user = await requireAuth();

  const name = formData.get("name") as string;
  if (!name?.trim()) return { error: "Property name is required." };

  const numberOfUnits = parseInt(formData.get("numberOfUnits") as string) || 0;

  const [property] = await db
    .insert(properties)
    .values({
      userId: user.id,
      name: name.trim(),
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      zip: (formData.get("zip") as string) || null,
      type: (formData.get("type") as string) || null,
      notes: (formData.get("notes") as string) || null,
    })
    .returning();

  if (numberOfUnits > 0) {
    await db.insert(units).values(
      Array.from({ length: numberOfUnits }, (_, i) => ({
        propertyId: property.id,
        name: `Unit ${i + 1}`,
      }))
    );
  }

  revalidatePath("/properties");
  return { success: true, propertyId: property.id };
}

export async function updateProperty(_prev: unknown, formData: FormData) {
  const user = await requireAuth();

  const id = formData.get("id") as string;
  if (!id) return { error: "Property ID is required." };

  const name = formData.get("name") as string;
  if (!name?.trim()) return { error: "Property name is required." };

  await db
    .update(properties)
    .set({
      name: name.trim(),
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      zip: (formData.get("zip") as string) || null,
      type: (formData.get("type") as string) || null,
      notes: (formData.get("notes") as string) || null,
    })
    .where(and(eq(properties.id, id), eq(properties.userId, user.id)));

  // Process unit changes
  const unitsRaw = formData.get("unitsJson") as string | null;
  if (unitsRaw) {
    let edits: UnitEdit[] = [];
    try { edits = JSON.parse(unitsRaw); } catch { /* ignore */ }

    for (const unit of edits) {
      const trimmedName = unit.name.trim();
      if (unit.id && unit.deleted) {
        // Null out any transactions referencing this unit before deleting
        await db.update(transactions).set({ unitId: null }).where(eq(transactions.unitId, unit.id));
        await db.delete(units).where(and(eq(units.id, unit.id), eq(units.propertyId, id)));
      } else if (unit.id && !unit.deleted && trimmedName) {
        await db.update(units).set({ name: trimmedName }).where(eq(units.id, unit.id));
      } else if (!unit.id && !unit.deleted && trimmedName) {
        await db.insert(units).values({ propertyId: id, name: trimmedName });
      }
    }
  }

  revalidatePath("/properties");
  revalidatePath(`/properties/${id}`);
  return { success: true };
}

export async function archiveProperty(id: string, archive: boolean) {
  const user = await requireAuth();

  await db
    .update(properties)
    .set({ isArchived: archive })
    .where(and(eq(properties.id, id), eq(properties.userId, user.id)));

  revalidatePath("/properties");
  revalidatePath(`/properties/${id}`);

  if (archive) redirect("/properties");
}
