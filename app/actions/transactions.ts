"use server";

import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function parseOptionalUuid(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  return v && v !== "none" ? v : null;
}

export async function createTransaction(_prev: unknown, formData: FormData) {
  const user = await requireAuth();

  const date = formData.get("date") as string;
  const amountRaw = formData.get("amount") as string;
  const type = formData.get("type") as string;

  if (!date) return { error: "Date is required." };
  if (!amountRaw || isNaN(parseFloat(amountRaw))) return { error: "Amount is required." };
  if (!type) return { error: "Type is required." };

  await db.insert(transactions).values({
    userId: user.id,
    date,
    amount: parseFloat(amountRaw).toFixed(2),
    type,
    payee: (formData.get("payee") as string) || null,
    category: (formData.get("category") as string) || null,
    subcategory: (formData.get("subcategory") as string) || null,
    propertyId: parseOptionalUuid(formData.get("propertyId") as string),
    unitId: parseOptionalUuid(formData.get("unitId") as string),
    notes: (formData.get("notes") as string) || null,
  });

  revalidatePath("/transactions");
  revalidatePath("/properties");
  return { success: true };
}

export async function updateTransaction(_prev: unknown, formData: FormData) {
  const user = await requireAuth();

  const id = formData.get("id") as string;
  if (!id) return { error: "Transaction ID is required." };

  const date = formData.get("date") as string;
  const amountRaw = formData.get("amount") as string;
  const type = formData.get("type") as string;

  if (!date) return { error: "Date is required." };
  if (!amountRaw || isNaN(parseFloat(amountRaw))) return { error: "Amount is required." };
  if (!type) return { error: "Type is required." };

  await db
    .update(transactions)
    .set({
      date,
      amount: parseFloat(amountRaw).toFixed(2),
      type,
      payee: (formData.get("payee") as string) || null,
      category: (formData.get("category") as string) || null,
      subcategory: (formData.get("subcategory") as string) || null,
      propertyId: parseOptionalUuid(formData.get("propertyId") as string),
      unitId: parseOptionalUuid(formData.get("unitId") as string),
      notes: (formData.get("notes") as string) || null,
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

  revalidatePath("/transactions");
  revalidatePath("/properties");
  return { success: true };
}

export async function deleteTransaction(id: string) {
  const user = await requireAuth();

  await db
    .update(transactions)
    .set({ isDeleted: true, deletedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

  revalidatePath("/transactions");
  revalidatePath("/properties");
}
