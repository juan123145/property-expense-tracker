'use server';

import { auth } from "@/auth";
import { getUserQuota, getUserStorageUsage, checkQuotaAvailable, formatBytes } from "@/lib/quota";

/**
 * Server action to get user's quota status
 * Used in transaction forms to show quota bar and prevent over-limit uploads
 */
export async function getUserQuotaStatus() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const quota = await getUserQuota(session.user.id);
    const usedBytes = await getUserStorageUsage(session.user.id);
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
      isWarning: percentUsed >= 80,
      isCritical: percentUsed >= 95,
    };
  } catch (error) {
    console.error("Failed to get quota status:", error);
    return { error: "Failed to fetch quota status" };
  }
}

/**
 * Server action to validate if file can be uploaded (with propertyId awareness)
 */
export async function validateUpload(
  fileSizeBytes: number,
  propertyId?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized", allowed: false };
  }

  try {
    // TODO: Import determineQuotaOwner from quota utils and use propertyId
    // For now, charge against current user
    const result = await checkQuotaAvailable(session.user.id, fileSizeBytes);

    return {
      allowed: result.allowed,
      usedBytes: result.usedBytes,
      quotaBytes: result.quotaBytes,
      remainingBytes: result.remainingBytes,
      message: result.allowed
        ? `Ready to upload (${formatBytes(fileSizeBytes)})`
        : `Upload exceeds quota. Need ${formatBytes(fileSizeBytes - result.remainingBytes)} more space.`,
    };
  } catch (error) {
    console.error("Upload validation error:", error);
    return { error: "Failed to validate upload", allowed: false };
  }
}
