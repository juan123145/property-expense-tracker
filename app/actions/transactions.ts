"use server";

import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { transactions, transactionAttachments, properties, units } from "@/db/schema";
import { eq, and, desc, inArray, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { deleteFromR2 } from "@/lib/r2";
import { shouldFlagForReview } from "@/lib/flagging";
import { canWriteToProperty } from "@/lib/permissions";

function parseOptionalUuid(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  return v && v !== "none" ? v : null;
}

function parseAttachmentsJson(formData: FormData): Array<{ url: string; name: string | null; sizeKb: number | null }> {
  const raw = formData.get("attachmentsJson") as string | null;
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function createTransaction(_prev: unknown, formData: FormData) {
  const user = await requireAuth();

  const date = formData.get("date") as string;
  const amountRaw = formData.get("amount") as string;
  const type = formData.get("type") as string;
  const propertyIdRaw = parseOptionalUuid(formData.get("propertyId") as string);
  const unitIdRaw = parseOptionalUuid(formData.get("unitId") as string);

  const payeeRaw = (formData.get("payee") as string)?.trim();
  if (!date) return { error: "Date is required." };
  if (!amountRaw || isNaN(parseFloat(amountRaw))) return { error: "Amount is required." };
  if (!type) return { error: "Type is required." };
  if (!payeeRaw) return { error: "Payee is required." };

  // AUTHORIZATION: User must be able to write to the property
  if (propertyIdRaw) {
    const hasAccess = await canWriteToProperty(user.id, propertyIdRaw);
    if (!hasAccess) {
      return { error: "You do not have permission to create transactions for this property." };
    }

    // Validate property exists
    const [prop] = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.id, propertyIdRaw))
      .limit(1);
    if (!prop) {
      return { error: "Property not found." };
    }

    // Validate unitId belongs to property if provided
    if (unitIdRaw) {
      const [unit] = await db
        .select({ id: units.id })
        .from(units)
        .where(and(eq(units.id, unitIdRaw), eq(units.propertyId, propertyIdRaw)))
        .limit(1);
      if (!unit) {
        return { error: "Unit does not belong to the selected property." };
      }
    }
  }

  const newAttachments = parseAttachmentsJson(formData);
  const ocrConfidenceRaw = formData.get("ocrConfidence") as string | null;
  const ocrConfidence = ocrConfidenceRaw ? parseFloat(ocrConfidenceRaw) : null;
  const needsReview = shouldFlagForReview({
    category: (formData.get("category") as string) || null,
    amount: parseFloat(amountRaw),
    ocrConfidence,
    hasAttachment: newAttachments.length > 0,
  });

  try {
    const [tx] = await db.insert(transactions).values({
      userId: user.id,
      date,
      amount: parseFloat(amountRaw).toFixed(2),
      type,
      payee: payeeRaw || null,
      category: (formData.get("category") as string) || null,
      subcategory: (formData.get("subcategory") as string) || null,
      propertyId: propertyIdRaw,
      unitId: unitIdRaw,
      notes: (formData.get("notes") as string) || null,
      ocrConfidence: ocrConfidence !== null ? String(ocrConfidence) : null,
      needsReview,
    }).returning({ id: transactions.id });

    if (newAttachments.length > 0) {
      await db.insert(transactionAttachments).values(
        newAttachments.map((a, i) => ({
          transactionId: tx.id,
          url: a.url,
          name: a.name ?? null,
          sizeKb: a.sizeKb ?? null,
          position: i,
        }))
      );
    }

    revalidatePath("/transactions");
    revalidatePath("/properties");
    return { success: true };
  } catch (err) {
    console.error("createTransaction:", err);
    return { error: "Failed to save transaction. Please try again." };
  }
}

export async function updateTransaction(_prev: unknown, formData: FormData) {
  const user = await requireAuth();

  const id = formData.get("id") as string;
  if (!id) return { error: "Transaction ID is required." };

  const date = formData.get("date") as string;
  const amountRaw = formData.get("amount") as string;
  const type = formData.get("type") as string;
  const payeeRaw = (formData.get("payee") as string)?.trim();
  const newPropertyIdRaw = parseOptionalUuid(formData.get("propertyId") as string);
  const newUnitIdRaw = parseOptionalUuid(formData.get("unitId") as string);

  if (!date) return { error: "Date is required." };
  if (!amountRaw || isNaN(parseFloat(amountRaw))) return { error: "Amount is required." };
  if (!type) return { error: "Type is required." };
  if (!payeeRaw) return { error: "Payee is required." };

  // Get current transaction to check authorization
  const [currentTx] = await db
    .select({ propertyId: transactions.propertyId })
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);

  if (!currentTx) {
    return { error: "Transaction not found." };
  }

  const currentPropertyId = currentTx.propertyId;

  // AUTHORIZATION: User must be able to write to the current property
  if (currentPropertyId) {
    const hasAccess = await canWriteToProperty(user.id, currentPropertyId);
    if (!hasAccess) {
      return { error: "You do not have permission to update this transaction." };
    }
  }

  // If property is being changed, validate access to new property
  if (newPropertyIdRaw && newPropertyIdRaw !== currentPropertyId) {
    const hasAccessToNew = await canWriteToProperty(user.id, newPropertyIdRaw);
    if (!hasAccessToNew) {
      return { error: "You do not have permission to move this transaction to the new property." };
    }

    // Validate new property exists
    const [newProp] = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.id, newPropertyIdRaw))
      .limit(1);
    if (!newProp) {
      return { error: "New property not found." };
    }

    // Validate new unitId belongs to new property if provided
    if (newUnitIdRaw) {
      const [newUnit] = await db
        .select({ id: units.id })
        .from(units)
        .where(and(eq(units.id, newUnitIdRaw), eq(units.propertyId, newPropertyIdRaw)))
        .limit(1);
      if (!newUnit) {
        return { error: "Unit does not belong to the new property." };
      }
    }
  } else if (newUnitIdRaw && currentPropertyId) {
    // Validate unitId belongs to current property if not changing property
    const [unit] = await db
      .select({ id: units.id })
      .from(units)
      .where(and(eq(units.id, newUnitIdRaw), eq(units.propertyId, currentPropertyId)))
      .limit(1);
    if (!unit) {
      return { error: "Unit does not belong to the selected property." };
    }
  }

  const newAttachments = parseAttachmentsJson(formData);
  const deleteIds: string[] = (() => {
    const raw = formData.get("deleteIds") as string | null;
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  })();

  if (deleteIds.length > 0) {
    const toDelete = await db
      .select({ url: transactionAttachments.url })
      .from(transactionAttachments)
      .where(and(
        inArray(transactionAttachments.id, deleteIds),
        eq(transactionAttachments.transactionId, id)
      ));
    for (const { url } of toDelete) {
      try { await deleteFromR2(url); } catch { /* non-fatal */ }
    }
    await db.delete(transactionAttachments).where(
      and(
        inArray(transactionAttachments.id, deleteIds),
        eq(transactionAttachments.transactionId, id)
      )
    );
  }

  if (newAttachments.length > 0) {
    const [maxRow] = await db
      .select({ pos: transactionAttachments.position })
      .from(transactionAttachments)
      .where(eq(transactionAttachments.transactionId, id))
      .orderBy(desc(transactionAttachments.position))
      .limit(1);
    const nextPos = (maxRow?.pos ?? -1) + 1;
    await db.insert(transactionAttachments).values(
      newAttachments.map((a, i) => ({
        transactionId: id,
        url: a.url,
        name: a.name ?? null,
        sizeKb: a.sizeKb ?? null,
        position: nextPos + i,
      }))
    );
  }

  const [countRow] = await db
    .select({ value: count() })
    .from(transactionAttachments)
    .where(eq(transactionAttachments.transactionId, id));
  const remainingAttachments = (countRow?.value ?? 0) + newAttachments.length;

  const ocrConfidenceRaw = formData.get("ocrConfidence") as string | null;
  const ocrConfidence = ocrConfidenceRaw ? parseFloat(ocrConfidenceRaw) : null;
  const needsReview = shouldFlagForReview({
    category: (formData.get("category") as string) || null,
    amount: parseFloat(amountRaw),
    ocrConfidence,
    hasAttachment: remainingAttachments > 0,
  });

  try {
    await db
      .update(transactions)
      .set({
        date,
        amount: parseFloat(amountRaw).toFixed(2),
        type,
        payee: payeeRaw || null,
        category: (formData.get("category") as string) || null,
        subcategory: (formData.get("subcategory") as string) || null,
        propertyId: newPropertyIdRaw,
        unitId: newUnitIdRaw,
        notes: (formData.get("notes") as string) || null,
        ocrConfidence: ocrConfidence !== null ? String(ocrConfidence) : null,
        needsReview,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id));

    revalidatePath("/transactions");
    revalidatePath("/properties");
    return { success: true };
  } catch (err) {
    console.error("updateTransaction:", err);
    return { error: "Failed to update transaction. Please try again." };
  }
}

export async function deleteTransaction(id: string) {
  const user = await requireAuth();

  // Get transaction's propertyId to check authorization
  const [tx] = await db
    .select({ propertyId: transactions.propertyId })
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);

  if (!tx) {
    throw new Error("Transaction not found.");
  }

  // AUTHORIZATION: User must be able to write to the property
  if (tx.propertyId) {
    const hasAccess = await canWriteToProperty(user.id, tx.propertyId);
    if (!hasAccess) {
      throw new Error("You do not have permission to delete this transaction.");
    }
  }

  // Soft-delete with deletedByUserId
  await db
    .update(transactions)
    .set({
      isDeleted: true,
      deletedAt: new Date(),
      deletedByUserId: user.id,
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, id));

  revalidatePath("/transactions");
  revalidatePath("/properties");
}

export async function clearAttachment(transactionId: string) {
  const user = await requireAuth();

  const [tx] = await db
    .select({ attachmentUrl: transactions.attachmentUrl, propertyId: transactions.propertyId })
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);

  if (!tx) return;

  // AUTHORIZATION: User must be able to write to the transaction's property
  if (tx.propertyId) {
    const hasAccess = await canWriteToProperty(user.id, tx.propertyId);
    if (!hasAccess) {
      throw new Error("You do not have permission to modify this transaction.");
    }
  }

  // Delete all from new table
  const attachments = await db
    .select({ url: transactionAttachments.url })
    .from(transactionAttachments)
    .where(eq(transactionAttachments.transactionId, transactionId));

  // Delete old single-column file if present
  if (tx.attachmentUrl) {
    try { await deleteFromR2(tx.attachmentUrl); } catch { /* non-fatal */ }
  }
  for (const { url } of attachments) {
    try { await deleteFromR2(url); } catch { /* non-fatal */ }
  }

  await db.delete(transactionAttachments).where(eq(transactionAttachments.transactionId, transactionId));

  await db
    .update(transactions)
    .set({ attachmentUrl: null, attachmentName: null, attachmentSizeKb: null, updatedAt: new Date() })
    .where(eq(transactions.id, transactionId));

  revalidatePath("/transactions");
  revalidatePath("/properties");
}

export async function deleteTransactionAttachment(attachmentId: string) {
  const user = await requireAuth();

  const [attachment] = await db
    .select({
      url: transactionAttachments.url,
      transactionId: transactionAttachments.transactionId,
      propertyId: transactions.propertyId,
    })
    .from(transactionAttachments)
    .innerJoin(transactions, eq(transactionAttachments.transactionId, transactions.id))
    .where(eq(transactionAttachments.id, attachmentId))
    .limit(1);

  if (!attachment) return;

  // AUTHORIZATION: User must be able to write to the transaction's property
  if (attachment.propertyId) {
    const hasAccess = await canWriteToProperty(user.id, attachment.propertyId);
    if (!hasAccess) {
      throw new Error("You do not have permission to modify this transaction.");
    }
  }

  try { await deleteFromR2(attachment.url); } catch { /* non-fatal */ }

  await db.delete(transactionAttachments).where(eq(transactionAttachments.id, attachmentId));

  revalidatePath("/transactions");
  revalidatePath("/properties");
}

export async function markAsReviewed(id: string) {
  const user = await requireAuth();

  // Get transaction's propertyId to check authorization
  const [tx] = await db
    .select({ propertyId: transactions.propertyId })
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);

  if (!tx) {
    throw new Error("Transaction not found.");
  }

  // AUTHORIZATION: User must be able to write to the property
  if (tx.propertyId) {
    const hasAccess = await canWriteToProperty(user.id, tx.propertyId);
    if (!hasAccess) {
      throw new Error("You do not have permission to review this transaction.");
    }
  }

  await db
    .update(transactions)
    .set({ needsReview: false, updatedAt: new Date() })
    .where(eq(transactions.id, id));

  revalidatePath("/needs-review");
  revalidatePath("/transactions");
}

export async function restoreTransaction(id: string) {
  const user = await requireAuth();

  // Get transaction's propertyId to check authorization
  const [tx] = await db
    .select({ propertyId: transactions.propertyId })
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);

  if (!tx) {
    throw new Error("Transaction not found.");
  }

  // AUTHORIZATION: User must be able to write to the property
  if (tx.propertyId) {
    const hasAccess = await canWriteToProperty(user.id, tx.propertyId);
    if (!hasAccess) {
      throw new Error("You do not have permission to restore this transaction.");
    }
  }

  await db
    .update(transactions)
    .set({ isDeleted: false, deletedAt: null, deletedByUserId: null, updatedAt: new Date() })
    .where(eq(transactions.id, id));

  revalidatePath("/trash");
  revalidatePath("/transactions");
}
