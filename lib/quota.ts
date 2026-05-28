/**
 * Quota management utilities
 * Handles calculation of storage usage per user based on ownership rules:
 * - Unattached attachments → User's personal quota
 * - Attachments on property transactions → Property owner's quota
 */

const DEFAULT_QUOTA_BYTES = 524288000; // 500 MB

/**
 * Get or create user quota
 */
export async function getUserQuota(userId: string) {
  // For now, return default quota without database
  // The table exists but we don't require it to exist for basic functionality
  return {
    userId,
    quotaBytes: DEFAULT_QUOTA_BYTES,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Calculate total storage usage for a user
 * For MVP, return 0 (no usage yet)
 */
export async function getUserStorageUsage(userId: string): Promise<number> {
  try {
    const { db } = await import("@/db");
    const { storageOwnerships } = await import("@/db/schema");
    const { eq, sql } = await import("drizzle-orm");

    const result = await db
      .select({
        totalBytes: sql<number>`COALESCE(SUM(${storageOwnerships.sizeBytes}), 0)`,
      })
      .from(storageOwnerships)
      .where(eq(storageOwnerships.ownerId, userId));

    return result[0]?.totalBytes || 0;
  } catch (error) {
    console.warn("Failed to get storage usage, defaulting to 0:", error);
    return 0;
  }
}

/**
 * Determine the quota owner for an attachment being uploaded
 */
export async function determineQuotaOwner(
  uploadedByUserId: string,
  propertyId?: string | null
): Promise<string> {
  if (!propertyId) {
    return uploadedByUserId;
  }

  try {
    const { db } = await import("@/db");
    const { properties } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const prop = await db
      .select({ ownerId: properties.ownerId })
      .from(properties)
      .where(eq(properties.id, propertyId));

    if (!prop[0]) {
      return uploadedByUserId;
    }

    return prop[0].ownerId;
  } catch (error) {
    console.warn("Failed to get property owner, defaulting to uploader:", error);
    return uploadedByUserId;
  }
}

/**
 * Check if user has enough quota to upload a file
 */
export async function checkQuotaAvailable(
  userId: string,
  fileSizeBytes: number
): Promise<{
  allowed: boolean;
  usedBytes: number;
  quotaBytes: number;
  remainingBytes: number;
}> {
  try {
    const quota = await getUserQuota(userId);
    const usedBytes = await getUserStorageUsage(userId);
    const remainingBytes = quota.quotaBytes - usedBytes;

    return {
      allowed: fileSizeBytes <= remainingBytes,
      usedBytes,
      quotaBytes: quota.quotaBytes,
      remainingBytes,
    };
  } catch (error) {
    console.warn("Quota check failed, allowing upload:", error);
    // Allow upload if quota system fails
    return {
      allowed: true,
      usedBytes: 0,
      quotaBytes: DEFAULT_QUOTA_BYTES,
      remainingBytes: DEFAULT_QUOTA_BYTES,
    };
  }
}

/**
 * Get quota status for user (for UI display)
 */
export async function getQuotaStatus(userId: string): Promise<{
  usedBytes: number;
  quotaBytes: number;
  percentUsed: number;
  remainingBytes: number;
  formatUsed: string;
  formatQuota: string;
  formatRemaining: string;
}> {
  try {
    const quota = await getUserQuota(userId);
    const usedBytes = await getUserStorageUsage(userId);
    const remainingBytes = quota.quotaBytes - usedBytes;
    const percentUsed = Math.round((usedBytes / quota.quotaBytes) * 100);

    return {
      usedBytes,
      quotaBytes: quota.quotaBytes,
      percentUsed,
      remainingBytes,
      formatUsed: formatBytes(usedBytes),
      formatQuota: formatBytes(quota.quotaBytes),
      formatRemaining: formatBytes(remainingBytes),
    };
  } catch (error) {
    console.warn("Failed to get quota status:", error);
    return {
      usedBytes: 0,
      quotaBytes: DEFAULT_QUOTA_BYTES,
      percentUsed: 0,
      remainingBytes: DEFAULT_QUOTA_BYTES,
      formatUsed: "0 MB",
      formatQuota: "500 MB",
      formatRemaining: "500 MB",
    };
  }
}

/**
 * Update attachment ownership when property changes
 */
export async function updateAttachmentOwnership(
  attachmentUrl: string,
  newOwnerId: string,
  propertyId?: string | null
) {
  try {
    const { db } = await import("@/db");
    const { storageOwnerships } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    await db
      .update(storageOwnerships)
      .set({
        ownerId: newOwnerId,
        propertyId: propertyId || null,
      })
      .where(eq(storageOwnerships.attachmentUrl, attachmentUrl));
  } catch (error) {
    console.warn("Failed to update attachment ownership:", error);
  }
}

/**
 * Format bytes to human readable (KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
