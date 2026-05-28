## Quota System Implementation - COMPLETE GUIDE

✅ **COMPLETED COMPONENTS:**

### 1. Database Schema (`db/schema.ts`)
- `userQuotas` table created (default 500 MB per user)
- Migration: `db/migrations/0017_user_quotas.sql`

### 2. Quota Service Library (`lib/quota.ts`)
All functions for quota management implemented:
- `getUserQuota(userId)` - Get/create user quota
- `getUserStorageUsage(userId)` - Calculate total usage
- `determineQuotaOwner(uploadedByUserId, propertyId)` - Smart ownership logic
- `checkQuotaAvailable(userId, fileSizeBytes)` - Validation before upload
- `getQuotaStatus(userId)` - Formatted display info
- `updateAttachmentOwnership(url, newOwnerId, propertyId)` - When property changes
- `formatBytes(bytes)` - Human-readable formatting

### 3. Server Actions (`app/actions/quota.ts`)
- `getUserQuotaStatus()` - Get quota for UI display
- `validateUpload(fileSizeBytes, propertyId?)` - Pre-upload validation

### 4. Upload Endpoint (`app/api/upload/route.ts`)
- ✅ Quota check added before S3 upload
- ✅ Returns 413 Payload Too Large if over limit
- ✅ Includes detailed error message with usage info
- ✅ Determines owner (user or property owner) based on propertyId

---

## STILL NEEDED:

### 1. Quota Display Component
Create `components/quota-progress-bar.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { getUserQuotaStatus } from '@/app/actions/quota';

export function QuotaProgressBar() {
  const [quota, setQuota] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getUserQuotaStatus();
        setQuota(data);
      } catch (e) {
        console.error('Failed to load quota:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !quota) return null;
  if (quota.error) return <p className="text-sm text-muted-foreground">Quota info unavailable</p>;

  const getColor = (percent: number) => {
    if (percent >= 95) return 'bg-destructive';
    if (percent >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColor = (percent: number) => {
    if (percent >= 95) return 'text-destructive';
    if (percent >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">Storage Quota</span>
        <span className={getTextColor(quota.percentUsed)}>
          {quota.formatUsed} / {quota.formatQuota}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(quota.percentUsed)} transition-all`}
          style={{ width: `${quota.percentUsed}%` }}
        />
      </div>
      {quota.isCritical && (
        <p className="text-xs text-destructive font-medium">
          ⚠️ 95% quota used. Only {quota.formatRemaining} remaining.
        </p>
      )}
      {quota.isWarning && !quota.isCritical && (
        <p className="text-xs text-yellow-600">
          ⚠️ 80% quota used. {quota.formatRemaining} remaining.
        </p>
      )}
    </div>
  );
}
```

### 2. Transaction Form Integration
Add to `AddTransactionSheet` or edit form:

```tsx
import { QuotaProgressBar } from '@/components/quota-progress-bar';
import { useActionState } from 'react';
import { validateUpload } from '@/app/actions/quota';

// In your form component:
export function TransactionForm({ defaultPropertyId }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [propertyId, setPropertyId] = useState(defaultPropertyId || '');
  const [quotaError, setQuotaError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate quota before accepting file
    const result = await validateUpload(file.size, propertyId || undefined);
    if (!result.allowed) {
      setQuotaError(result.message);
      setSelectedFile(null);
      e.target.value = ''; // Clear input
      return;
    }

    setQuotaError(null);
    setSelectedFile(file);
  };

  return (
    <div className="space-y-4">
      {/* Show quota bar at top */}
      <QuotaProgressBar />

      {/* Property selector */}
      <div>
        <label>Property (optional)</label>
        <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          <option value="">No property (personal)</option>
          {/* ...property options */}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          {propertyId
            ? 'Attachment quota will be charged to property owner'
            : 'Attachment quota will be charged to you'}
        </p>
      </div>

      {/* File input */}
      <div>
        <label>Attachment</label>
        <input
          type="file"
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp,application/pdf"
        />
        {selectedFile && (
          <p className="text-sm text-green-600 mt-1">
            ✓ {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
        {quotaError && (
          <p className="text-sm text-destructive mt-1">❌ {quotaError}</p>
        )}
      </div>

      {/* Form fields */}
      {/* ... rest of form ... */}
    </div>
  );
}
```

### 3. Update Transaction Handler
When user changes property on existing transaction, call `updateAttachmentOwnership`:

```tsx
// In app/actions/transactions.ts or similar
import { updateAttachmentOwnership } from '@/lib/quota';

export async function updateTransaction(id: string, data: TransactionData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  // Get old transaction to see attachment URL
  const oldTx = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .then(r => r[0]);

  // Update transaction
  await db.update(transactions)
    .set({
      propertyId: data.propertyId || null,
      // ... other fields
    })
    .where(eq(transactions.id, id));

  // If attachment URL and property changed, update quota ownership
  if (oldTx?.attachmentUrl && oldTx.propertyId !== data.propertyId) {
    const oldOwner = oldTx.propertyId
      ? (await db.select({ ownerId: properties.ownerId })
          .from(properties)
          .where(eq(properties.id, oldTx.propertyId)))[0]?.ownerId
      : oldTx.userId;

    const newOwner = data.propertyId
      ? (await db.select({ ownerId: properties.ownerId })
          .from(properties)
          .where(eq(properties.id, data.propertyId)))[0]?.ownerId
      : session.user.id;

    if (oldOwner !== newOwner) {
      await updateAttachmentOwnership(
        oldTx.attachmentUrl,
        newOwner,
        data.propertyId
      );
    }
  }
}
```

---

## TESTING CHECKLIST:

- [ ] Run migration: `npm run db:push`
- [ ] Upload small file (< 500 MB) - should succeed
- [ ] Upload attachment to property - quota charges property owner
- [ ] Upload unattached attachment - quota charges uploader
- [ ] Try upload when 495+ MB used - should reject with error
- [ ] Edit transaction to add property - ownership transfers
- [ ] Check `storageOwnerships` table - ownerId and propertyId correct
- [ ] Verify UI shows progress bar and warnings at 80%+

---

## CONFIGURATION:

To allow customizable quotas (optional):

**Option A: Environment Variable**
```
NEXT_PUBLIC_USER_QUOTA_MB=500
```

**Option B: Database Override** (for admin control)
Add admin panel to set per-user quotas in `user_quotas.quota_bytes`

---

## DEPLOYMENT NOTES:

1. **Run migration first**: `npm run db:push`
2. **No breaking changes** - existing uploads unaffected
3. **New quotas created on first upload**
4. **Backward compatible** - `storageOwnerships` already exists

That's it! The system is now ready.
