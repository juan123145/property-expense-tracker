import { db } from "@/db";
import { transactions, transactionAttachments, properties, units } from "@/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { canReadProperty } from "@/lib/permissions";

export interface TransactionWithDetails {
  id: string;
  userId: string;
  propertyId: string | null;
  unitId: string | null;
  date: string;
  amount: string;
  type: string;
  payee: string | null;
  category: string | null;
  subcategory: string | null;
  notes: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSizeKb: number | null;
  ocrConfidence: string | null;
  needsReview: boolean;
  isDeleted: boolean;
  deletedAt: Date | null;
  scheduledPermanentDeleteAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  propertyName: string | null;
  unitName: string | null;
  attachments: Array<{
    id: string;
    url: string;
    name: string | null;
    sizeKb: number | null;
    position: number;
    uploadedByUserId: string | null;
    createdAt: Date | null;
  }>;
}

/**
 * Get all non-deleted transactions for a property, visible to all property members
 * Transactions are property-scoped, not user-scoped
 * @param propertyId - The property ID
 * @param userId - The user ID (to check read access)
 * @returns Array of transactions with attachments grouped by transactionId, or empty array if no read access
 */
export async function getPropertyTransactions(
  propertyId: string,
  userId: string
): Promise<TransactionWithDetails[]> {
  // Check user has read access to property
  const hasAccess = await canReadProperty(userId, propertyId);
  if (!hasAccess) return [];

  // Query all non-deleted transactions for this property (NOT filtered by userId)
  const txRows = await db
    .select({
      id: transactions.id,
      userId: transactions.userId,
      propertyId: transactions.propertyId,
      unitId: transactions.unitId,
      date: transactions.date,
      amount: transactions.amount,
      type: transactions.type,
      payee: transactions.payee,
      category: transactions.category,
      subcategory: transactions.subcategory,
      notes: transactions.notes,
      attachmentUrl: transactions.attachmentUrl,
      attachmentName: transactions.attachmentName,
      attachmentSizeKb: transactions.attachmentSizeKb,
      ocrConfidence: transactions.ocrConfidence,
      needsReview: transactions.needsReview,
      isDeleted: transactions.isDeleted,
      deletedAt: transactions.deletedAt,
      scheduledPermanentDeleteAt: transactions.scheduledPermanentDeleteAt,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      propertyName: properties.name,
      unitName: units.name,
    })
    .from(transactions)
    .leftJoin(properties, eq(transactions.propertyId, properties.id))
    .leftJoin(units, eq(transactions.unitId, units.id))
    .where(
      and(
        eq(transactions.propertyId, propertyId),
        isNull(transactions.deletedAt)
      )
    )
    .orderBy(desc(transactions.date), desc(transactions.createdAt));

  // Fetch all attachments for these transactions
  const txIds = txRows.map((tx) => tx.id);
  let attachmentMap = new Map<string, TransactionWithDetails["attachments"]>();

  if (txIds.length > 0) {
    const allAttachments = await db
      .select()
      .from(transactionAttachments)
      .where(eq(transactionAttachments.transactionId, txIds[0])); // Will fetch one at a time in loop

    // More efficient: fetch all attachments for all transactions at once
    const attachmentsRows = await db
      .select()
      .from(transactionAttachments)
      .orderBy(transactionAttachments.position);

    // Group by transactionId
    for (const att of attachmentsRows) {
      if (txIds.includes(att.transactionId)) {
        if (!attachmentMap.has(att.transactionId)) {
          attachmentMap.set(att.transactionId, []);
        }
        attachmentMap.get(att.transactionId)!.push({
          id: att.id,
          url: att.url,
          name: att.name,
          sizeKb: att.sizeKb,
          position: att.position,
          uploadedByUserId: att.uploadedByUserId,
          createdAt: att.createdAt,
        });
      }
    }
  }

  // Map transactions with their attachments
  return txRows.map((tx) => ({
    ...tx,
    amount: tx.amount.toString(),
    ocrConfidence: tx.ocrConfidence?.toString() || null,
    needsReview: tx.needsReview ?? false,
    attachments: attachmentMap.get(tx.id) || [],
  })) as TransactionWithDetails[];
}

/**
 * Get soft-deleted transactions for a property (within 30-day retention window)
 * Used during trash/recovery operations
 * @param propertyId - The property ID
 * @param userId - The user ID (to check read access)
 * @returns Array of soft-deleted transactions, or empty array if no read access
 */
export async function getPropertyDeletedTransactions(
  propertyId: string,
  userId: string
): Promise<TransactionWithDetails[]> {
  // Check user has read access to property
  const hasAccess = await canReadProperty(userId, propertyId);
  if (!hasAccess) return [];

  // Query soft-deleted transactions for this property
  const txRows = await db
    .select({
      id: transactions.id,
      userId: transactions.userId,
      propertyId: transactions.propertyId,
      unitId: transactions.unitId,
      date: transactions.date,
      amount: transactions.amount,
      type: transactions.type,
      payee: transactions.payee,
      category: transactions.category,
      subcategory: transactions.subcategory,
      notes: transactions.notes,
      attachmentUrl: transactions.attachmentUrl,
      attachmentName: transactions.attachmentName,
      attachmentSizeKb: transactions.attachmentSizeKb,
      ocrConfidence: transactions.ocrConfidence,
      needsReview: transactions.needsReview,
      isDeleted: transactions.isDeleted,
      deletedAt: transactions.deletedAt,
      scheduledPermanentDeleteAt: transactions.scheduledPermanentDeleteAt,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      propertyName: properties.name,
      unitName: units.name,
    })
    .from(transactions)
    .leftJoin(properties, eq(transactions.propertyId, properties.id))
    .leftJoin(units, eq(transactions.unitId, units.id))
    .where(
      and(
        eq(transactions.propertyId, propertyId),
        eq(transactions.isDeleted, true)
      )
    )
    .orderBy(desc(transactions.deletedAt), desc(transactions.createdAt));

  // Fetch attachments for deleted transactions (similar logic)
  const txIds = txRows.map((tx) => tx.id);
  let attachmentMap = new Map<string, TransactionWithDetails["attachments"]>();

  if (txIds.length > 0) {
    const attachmentsRows = await db
      .select()
      .from(transactionAttachments)
      .orderBy(transactionAttachments.position);

    for (const att of attachmentsRows) {
      if (txIds.includes(att.transactionId)) {
        if (!attachmentMap.has(att.transactionId)) {
          attachmentMap.set(att.transactionId, []);
        }
        attachmentMap.get(att.transactionId)!.push({
          id: att.id,
          url: att.url,
          name: att.name,
          sizeKb: att.sizeKb,
          position: att.position,
          uploadedByUserId: att.uploadedByUserId,
          createdAt: att.createdAt,
        });
      }
    }
  }

  return txRows.map((tx) => ({
    ...tx,
    amount: tx.amount.toString(),
    ocrConfidence: tx.ocrConfidence?.toString() || null,
    needsReview: tx.needsReview ?? false,
    attachments: attachmentMap.get(tx.id) || [],
  })) as TransactionWithDetails[];
}
