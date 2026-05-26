# Property Expense Tracker - Comprehensive Architecture Analysis

## Executive Summary

The current application has **CRITICAL ARCHITECTURAL FAILURES** in property sharing, permissions, data visibility, and ownership attribution. The system was not designed for collaborative multi-user workflows and contains numerous permission leaks, race conditions, and data consistency issues.

**Current State:** Single-user-centric architecture with bolted-on sharing
**Required State:** Property-centric, permission-enforced collaboration platform

---

## 1. DATABASE SCHEMA PROBLEMS

### 1.1 Missing Core Tables

**CRITICAL GAPS:**

```
Current schema:
- properties (belongs to single userId)
- transactions (belongs to single userId)
- units (scoped to property)
- propertyShares (attempt to add sharing)
- transactionAttachments (new, but not fully integrated)
- users
```

**Missing Tables (MUST create):**

1. **PropertyMembership** - replaces propertyShares
   - propertyId (FK)
   - userId (FK)
   - role (OWNER | EDITOR | VIEWER)
   - canShare (boolean) - independent permission
   - status (ACTIVE | PENDING | REVOKED)
   - createdAt
   - acceptedAt
   - revokedAt

2. **PropertyInvitation** - proper invitation lifecycle
   - propertyId (FK)
   - invitedEmail (text)
   - invitedByUserId (FK)
   - role (EDITOR | VIEWER)
   - canShare (boolean)
   - status (PENDING | ACCEPTED | DECLINED | EXPIRED | CANCELED)
   - token (unique, single-use)
   - expiresAt
   - createdAt
   - respondedAt

3. **PropertyAuditLog** - track all actions
   - propertyId (FK)
   - userId (FK)
   - action (string)
   - resourceType (transaction | property | membership | etc)
   - resourceId (uuid)
   - changes (jsonb)
   - timestamp

4. **StorageOwnership** - attribute storage to property owner
   - attachmentUrl (text, PK)
   - propertyId (FK)
   - ownerId (FK to users)
   - uploadedByUserId (FK to users) - may differ from owner
   - sizeBytes (integer)
   - createdAt

5. **SoftDeleteQueue** - proper lifecycle management
   - transactionId (FK)
   - deletedByUserId (FK)
   - deletedAt (timestamp)
   - scheduledPermanentDeleteAt (timestamp)
   - status (SOFT_DELETED | PERMANENTLY_DELETED)
   - createdAt

### 1.2 Schema Defects - Current Tables

#### properties table

**PROBLEM 1: Single ownership model**
```sql
"user_id" text NOT NULL
```
- Properties belong to ONE user
- NO way to represent shared ownership
- No audit trail
- No timestamp for modifications

**FIX REQUIRED:**
```sql
ALTER TABLE properties ADD COLUMN "owner_id" text NOT NULL;
ALTER TABLE properties ADD COLUMN "created_by_user_id" text NOT NULL;
ALTER TABLE properties ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();
```

**PROBLEM 2: No image ownership link**
- `imageUrl` exists but no relationship to uploads
- No way to attribute storage to property owner
- Missing R2 bucket path information

**FIX REQUIRED:**
```sql
ALTER TABLE properties ADD COLUMN "image_storage_owner_id" text;
```

#### transactions table

**PROBLEM 1: User-scoped NOT property-scoped**
```sql
"user_id" text NOT NULL
"property_id" uuid
```
- Transactions belong to a USER, not a PROPERTY
- Visibility rule: check `transactions.userId == currentUser.id`
- Shared users CANNOT see transactions created by others (CRITICAL BUG #5)

**FIX REQUIRED:**
- Transactions must NOT have userId
- Transactions must have propertyId (NOT nullable)
- Data visibility controlled by property membership

**PROBLEM 2: Old attachment_url schema**
```sql
"attachment_url" text
"attachment_name" text
"attachment_size_kb" integer
```
- Single attachment per transaction (outdated)
- Replaced by transactionAttachments table
- No ownership link
- No storage attribution

**FIX REQUIRED:**
- Keep old columns for migration compatibility
- Migrate data to transactionAttachments table
- Create StorageOwnership records

**PROBLEM 3: isDeleted flag + NO retention window**
```sql
"is_deleted" boolean DEFAULT false
"deleted_at" timestamp with time zone
```
- Soft delete present, but...
- No scheduled permanent delete timestamp
- Cron job manually cleans up after 30 days
- Shared users don't see deleted transactions (visibility bug)

**FIX REQUIRED:**
```sql
ALTER TABLE transactions ADD COLUMN "deleted_by_user_id" text;
ALTER TABLE transactions ADD COLUMN "scheduled_permanent_delete_at" timestamp;
```

#### propertyShares table

**CRITICAL DESIGN FLAWS:**

```sql
propertyId uuid NOT NULL
ownerId text NOT NULL
invitedEmail text NOT NULL
sharedWithUserId text  -- NULL while pending
permission text -- 'view' | 'edit'
status text DEFAULT 'pending'  -- 'pending' | 'accepted' | 'revoked'
```

**PROBLEM 1: Primitive role system**
- Only 2 permissions: 'view' | 'edit'
- No OWNER role defined in schema
- Missing CAN_SHARE permission toggle

**PROBLEM 2: Email validation gap**
- Shares created with email before user exists
- `sharedWithUserId` is NULL initially
- On accept, user must match email (no validation)

**PROBLEM 3: No invitation expiration**
- Invites live forever
- No way to cancel pending invites
- No way to resend invites

**PROBLEM 4: No decline/revocation tracking**
- Revoked shares show status='revoked' but...
- No timestamp on revocation
- No audit of who revoked and when

**PROBLEM 5: Race condition**
```sql
UNIQUE("property_id", "invited_email")
```
- Constraint prevents duplicate invites to same email
- BUT: what if user signs up with different email, then adds correct one?
- Invitation system can deadlock

---

## 2. PERMISSION SYSTEM ARCHITECTURE FAILURES

### 2.1 Current Model (BROKEN)

**Owner Check:**
```typescript
// properties.ts:78
const [current] = await db
  .select({ imageUrl: properties.imageUrl })
  .from(properties)
  .where(and(eq(properties.id, id), eq(properties.userId, user.id)))
  .limit(1);
```
✅ Correctly checks property ownership

**Editor/Write Check:**
```typescript
// auth-utils.ts:29-48
async function canWriteToProperty(userId: string, propertyId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: properties.id })
    .from(properties)
    .where(
      and(
        eq(properties.id, propertyId),
        or(
          eq(properties.userId, userId),  // Owner check ✅
          and(
            eq(propertyShares.sharedWithUserId, userId),
            eq(propertyShares.status, "accepted"),
            eq(propertyShares.permission, "edit"),  // Editor check ✅
          )
        )
      )
    )
    .leftJoin(propertyShares, eq(propertyShares.propertyId, properties.id))
    .limit(1);
  return !!row;
}
```
✅ Correctly checks owner OR editor with accepted share

**HOWEVER:**

#### PERMISSION LEAK #1: Frontend control of edit button

**Location:** `components/properties/property-detail-client.tsx:29-50`

```typescript
export function PropertyDetailClient({ property, units }: Props) {
  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4 mr-2" />
          Edit Property
        </Button>
        {/* ... */}
```

**PROBLEM:**
- Frontend component does NOT check permissions
- Component is rendered for BOTH owners and shared users
- Button always appears for anyone viewing the property
- Shared EDITORS can see the button (expected)
- Shared VIEWERS can see the button (CRITICAL BUG #3)

**IMPACT:** Shared viewers can click "Edit Property" button

#### PERMISSION LEAK #2: AddPropertySheet doesn't validate

**Location:** `components/properties/add-property-sheet.tsx`

**PROBLEM:**
- Sheet accepts property object as prop
- No permission check in component
- Form submit calls `updateProperty` action

**HOWEVER:**
- `updateProperty` action DOES check ownership (auth-utils line 78)
- Backend will reject if user is not owner
- Shared editors attempting to edit will get error

**IMPACT:** Shared editors get error on form submit (UX bad but secure)
**IMPACT:** Shared viewers see edit button but get error (confusing)

#### PERMISSION LEAK #3: Transaction visibility NOT inherited from property

**Location:** `app/(app)/properties/[id]/page.tsx:51-78`

```typescript
async function getPropertyTransactions(propertyId: string, userId: string) {
  const txRows = await db
    .select({ /* ... */ })
    .from(transactions)
    .leftJoin(properties, eq(transactions.propertyId, properties.id))
    .leftJoin(units, eq(transactions.unitId, units.id))
    .where(
      and(
        eq(transactions.propertyId, propertyId),
        eq(transactions.userId, userId),  // <-- PROBLEM: filters by userId
        eq(transactions.isDeleted, false)
      )
    )
    // ...
}
```

**THE BUG:**
- Gets property (correctly checks shared access)
- Gets transactions with `.where(eq(transactions.userId, userId))`
- Shared user accessing property sees NO transactions
- Only user who CREATED the transaction can see it

**CRITICAL BUG #5: Transactions tied to property are NOT automatically visible to shared users**

**IMPACT:**
- Property shared with editor
- Owner creates transaction
- Editor views shared property
- Transaction NOT visible to editor
- Defeats purpose of sharing

#### PERMISSION LEAK #4: No CAN_SHARE permission toggle

**Current behavior:**
```typescript
// shares.ts:28-34
const [property] = await db
  .select({ id: properties.id, name: properties.name })
  .from(properties)
  .where(and(eq(properties.id, propertyId), eq(properties.userId, user.id)))
  .limit(1);

if (!property) return { error: "Property not found." };
```

**PROBLEM:**
- Only property OWNER can call shareProperty
- No other role can share
- No CAN_SHARE toggle per user

**MISSING:**
- Editors with CAN_SHARE permission should be able to share VIEWERS
- Viewers with CAN_SHARE permission should be able to share other VIEWERS
- Current architecture makes this impossible

### 2.2 Required RBAC Model

```
OWNER
├── Can: edit property, delete property, manage permissions
├── Can: create/edit/delete transactions
├── Can: upload files (files count against owner's storage)
├── Can: share with CAN_SHARE=true/false
│   ├── Can share EDITOR role
│   └── Can share VIEWER role
│
EDITOR (with CAN_SHARE toggle)
├── Can: create/edit/delete transactions
├── Can: upload files (files count against OWNER's storage, not editor's)
├── Can: view property
├── CAN_SHARE=true: can share VIEWER role only
├── CAN_SHARE=false: cannot share
│
VIEWER (with CAN_SHARE toggle)
├── Can: view property
├── Can: view transactions
├── Can: view attachments
├── CAN_SHARE=true: can share VIEWER role only
├── CAN_SHARE=false: cannot share
```

---

## 3. SHARING ARCHITECTURE FAILURES

### 3.1 Current Flow (BROKEN)

```
1. Owner sends share → PropertyShare(status='pending', inviteToken=...)
2. Email sent with link → /invite/{token}
3. Recipient clicks link → acceptInvite()
4. acceptInvite() → PropertyShare(status='accepted', sharedWithUserId=...)
5. Frontend re-fetches properties
```

### 3.2 Race Conditions & Bugs

#### RACE CONDITION #1: Image Missing After Sharing

**Suspected root cause:**

```
Timeline:
T0: Owner uploads property image → upload route
T1: Image written to R2
T2: Owner shares property
T3: shareProperty() called
T4: Email sent with invite link
T5: Property data fetched (includes imageUrl)
T6: Frontend shows property without image
T7: acceptInvite() called by recipient
T8: PropertyShare accepted
T9: Recipient views property
T10: Image APPEARS (cache invalidated)
```

**PROBLEM:**
- Image URL stored in `properties.imageUrl`
- Image uploaded to R2 with path `properties/{userId}/{timestamp}-{filename}`
- When shared user views property, image URL is same
- BUT: R2 may have authorization headers or cache issues
- Reload forces cache bust

**CRITICAL BUG #2: Shared property image sometimes missing after sharing**

#### RACE CONDITION #2: Page Reload Required

**Suspected root cause:**

```
Timeline:
T0: Shared user opens browser
T1: App checks propertyShares status
T2: Status is still 'pending'
T3: acceptInvite() called
T4: Status updated to 'accepted'
T5: Frontend revalidates /properties
T6: But property page is already loaded with cached query
T7: Property appears to be inaccessible
T8: User refreshes page
T9: getProperty() re-queries, finds accepted share
T10: Property now visible
```

**CRITICAL BUG #1: Shared property sometimes requires reload page**

**ROOT CAUSE:** Optimistic UI updates not synchronized with server state

#### RACE CONDITION #3: Property Share Email Not Validated

**Current flow:**

```typescript
// shares.ts:20
const email = (formData.get("email") as string)?.toLowerCase().trim();

// Check if email matches current user
if (email === user.email?.toLowerCase()) return { error: "..." };

// Create share with invitedEmail
// If email not in users table yet → no problem
// If user signs up later → match on email
```

**PROBLEM:**
- Email not validated against users table
- Invitation created before user exists
- On accept, `sharedWithUserId` set based on auth session
- If accepting user has different email → account mismatch
- No validation that invitedEmail == accepting user's email

### 3.3 Invitation System Defects

**MISSING:**
1. No invitation expiration (invites live forever)
2. No way to decline invitation (must ignore email)
3. No way to cancel pending invitation
4. No pending invitation state UI
5. No invitation history/audit
6. No resend invitation capability

---

## 4. DATA VISIBILITY & INHERITANCE FAILURES

### 4.1 Critical Bug #6: Property-Scoped Data Inheritance Broken

**Current Status:**

```
Property is shared with User2 (EDITOR)
├─ Property visible ✅
├─ Transactions created by User1 → NOT visible to User2 ❌
├─ Transactions created by User2 → visible to User2 ✓ (of course)
├─ Property images visible ✅ (sometimes)
├─ Attachments created by User1 → NOT visible to User2 ❌
└─ Transaction metadata → NOT visible to User2 ❌
```

**ROOT CAUSE:**

All queries filter by `transactions.userId == currentUserId`

Example from `[id]/page.tsx:74`:
```typescript
eq(transactions.userId, userId)
```

This should be:
```typescript
eq(propertyShares.propertyId, propertyId)  // + permission check
```

**FIX REQUIRED:**
- Remove `userId` from transaction queries where property access applies
- Replace with property membership check
- Data must inherit property visibility

### 4.2 Critical Bug #7: Sharing Architecture Behaves Inconsistently

**Properties Page:** `app/(app)/properties/page.tsx`

```typescript
async function getSharedProperties(userId: string) {
  const shares = await db
    .select({ propertyId: propertyShares.propertyId, permission: propertyShares.permission })
    .from(propertyShares)
    .where(and(eq(propertyShares.sharedWithUserId, userId), eq(propertyShares.status, "accepted")));
  // ...returns with sharedPermission flag
}
```

**Property Detail Page:** `app/(app)/properties/[id]/page.tsx`

```typescript
async function getProperty(id: string, userId: string) {
  const [property] = await db
    .select({ /* properties only, no permission */ })
    .from(properties)
    .where(
      and(
        eq(properties.id, id),
        or(
          eq(properties.userId, userId),
          and(
            eq(propertyShares.sharedWithUserId, userId),
            eq(propertyShares.status, "accepted"),
          )
        )
      )
    )
    .leftJoin(propertyShares, eq(propertyShares.propertyId, properties.id))
    .limit(1);
  return property ?? null;
}
```

**PROBLEM:**
- Properties page knows permission level
- Property detail page doesn't fetch permission
- UI can't hide "Edit" button based on permission
- Leads to permission leak #1

**CONSISTENT STATE NEEDED:**
- All property queries must return permission level
- UI can use permission to show/hide controls
- Backend must STILL enforce permissions

---

## 5. STORAGE ATTRIBUTION FAILURES

### 5.1 Critical Bug #8: Storage Attribution Incorrect

**Current State:**

```
User1 uploads receipt → R2 at receipts/user1/{...}
Transaction created by User1 with attachment_url

When User2 (shared editor) uploads receipt:
→ R2 at receipts/user2/{...}
→ Transaction created by User2 with attachment_url
```

**PROBLEM:**
- Storage counted against uploading user
- Property owner may exceed quota unknowingly
- Shared editors can fill up owner's storage (if there's a quota)
- No centralized storage accounting

**REQUIRED:**

1. All uploads must be attributed to property OWNER
2. Upload path: `receipts/{propertyOwnerId}/{...}` NOT uploading user
3. StorageOwnership table tracks real owner
4. Billing/quota calculated against property owner

**FIX:**

In `app/api/upload/route.ts:65`:
```typescript
// CURRENT (WRONG)
const key = `${folder}/${session.user.id}/${timestamp}-${safeName}`;

// REQUIRED (CORRECT)
// - Determine property from context (if transaction upload)
// - Get property owner
// - Use property owner's ID
const propertyId = formData.get("propertyId") as string;
const property = await getPropertyWithOwner(propertyId);
const key = `${folder}/${property.owner_id}/${timestamp}-${safeName}`;
```

### 5.2 Attachment Ownership Inconsistencies

**Current State:**

```
properties.imageUrl → string URL (no ownership link)
transactions.attachment_url → string URL (old schema, no ownership)
transactionAttachments.url → string URL (no ownership link)
```

**PROBLEM:**
- No way to query "all attachments owned by user X"
- No way to calculate storage usage
- Orphaned files if transaction deleted
- No audit trail of file uploads

**REQUIRED:**
- Create StorageOwnership table
- Link every URL to owner and uploader
- Track creation and deletion timestamps

---

## 6. ATTACHMENT ARCHITECTURE FAILURES

### 6.1 Critical Bug #9: Attachment Ownership Architecture Incorrect

**Schema Issues:**

```
transactionAttachments
├── id (uuid)
├── transactionId (FK)
├── url (text)
├── name (text)
├── sizeKb (integer)
├── position (integer)
└── createdAt (timestamp)

MISSING:
├── uploadedByUserId (text) - who uploaded
└── No reference to StorageOwnership
```

**Problems:**

1. **No uploader tracking**
   - Don't know who uploaded file
   - Can't generate audit log
   - Can't track per-user storage

2. **No ownership link to property**
   - Files not tied to property owner
   - Storage attribution fails
   - Can't cleanup when property deleted

3. **Orphan file risk**
   - Transaction deleted → attachment deleted (FK cascade) ✅
   - BUT: R2 file not deleted immediately
   - Purge job cleans up eventually
   - Race condition: file lingering in R2

4. **No encryption/access control**
   - URL directly accessible in R2
   - Anyone with URL can download
   - No fine-grained permission checks
   - Attachment URLs visible in database queries

**REQUIRED:**

```
transactionAttachments + StorageOwnership
├── transactionId (FK)
├── url (text)
├── uploadedByUserId (FK)
├── propertyOwnerId (FK)  -- inherited from property
├── sizeKb (integer)
├── createdAt
└── StorageOwnership link
    ├── attachmentUrl (PK)
    ├── propertyId (FK)
    ├── ownerId (FK)
    ├── uploadedByUserId (FK)
    └── sizeBytes
```

---

## 7. SOFT DELETE & LIFECYCLE FAILURES

### 7.1 Critical Bug #10: Deletion Lifecycle May Not Have Backend Cleanup

**Current Implementation:**

```
app/api/cron/purge-trash/route.ts

GET request with bearer token check
→ Find transactions where isDeleted=true AND deletedAt < 30 days ago
→ Delete R2 files
→ Hard delete transactions (cascade deletes attachments)
```

**PROBLEMS:**

1. **Cron job may not be running**
   - Vercel cron requires paid tier (possibly)
   - No monitoring of job execution
   - No alerting if job fails
   - Manual intervention required

2. **No scheduled_permanent_delete_at tracking**
   ```typescript
   // Current: deleted_at only
   const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
   ```
   - Cutoff calculated at query time
   - No way to track permanent deletion deadline
   - If property shared, shared users don't see deleted-state entries

3. **Shared users don't see deleted transactions**
   - Property detail page filters: `.where(eq(transactions.userId, userId))`
   - When owner deletes transaction, soft-deleted entry exists
   - Shared users never see isDeleted transactions
   - Owner can't restore transaction that shared user needs

4. **No audit trail of deletion**
   - Who deleted the transaction?
   - Why was it deleted?
   - Can't log for compliance

5. **Storage cleanup not atomic**
   ```typescript
   // Delete R2 files
   for (const id of ids) {
     const attachments = await db.select(...)
     for (const { url } of attachments) {
       try { await deleteFromR2(url); } catch { /* non-fatal */ }
     }
   }
   
   // Then hard delete DB rows
   for (const id of ids) {
     await db.delete(transactions).where(eq(transactions.id, id));
     deleted++;
   }
   ```
   - R2 file delete fails → DB row still deleted
   - Orphaned files in R2
   - No cleanup job for orphans

**REQUIRED:**

1. Implement SoftDeleteQueue table
2. Track deletion reason and user
3. Mark scheduled permanent delete timestamp
4. Implement durable background job (not cron)
5. Atomic R2 + DB deletion
6. Visible soft-deleted state for authorized users

---

## 8. FRONTEND/BACKEND TRUST VIOLATIONS

### 8.1 Frontend Controls Gate Backend Access

**Problem:** Backend actions trust frontend validation

Example: Transaction creation

```typescript
// app/actions/transactions.ts:26
export async function createTransaction(_prev: unknown, formData: FormData) {
  const user = await requireAuth();

  const date = formData.get("date") as string;
  const amountRaw = formData.get("amount") as string;
  // ...
  const propertyId = parseOptionalUuid(formData.get("propertyId") as string);
  // ...
}
```

**MISSING:**
- No check that user can create transaction on this property
- No check that propertyId actually exists
- No check that user has EDITOR or OWNER role
- Only check is `requireAuth()` at top

**IMPACT:**
- User could manually craft FormData with any propertyId
- User could create transaction on property they don't own
- User could create transaction on property they can only VIEW

**REQUIRED:** 
Backend must verify user has write access to property before allowing transaction creation

---

## 9. MISSING ACCESS CONTROL CHECKS

### By Endpoint/Action:

#### ✅ Checked Correctly:

1. **createProperty** → checks `requireAuth()`, owner-only action
2. **updateProperty** → checks owner via property.userId
3. **archiveProperty** → checks owner via property.userId
4. **shareProperty** → checks owner via property.userId
5. **revokeShare** → checks owner via share.ownerId
6. **acceptInvite** → no extra checks needed (token is verification)

#### ❌ NOT Checked:

1. **createTransaction**
   - Missing: user has write access to propertyId
   - Missing: user has write access to unitId
   - Fix: call canWriteToProperty(user.id, propertyId)

2. **updateTransaction**
   - Missing: user has write access to propertyId
   - Missing: user has write access to unitId
   - Current check only validates against old userId
   - Fix: call canWriteToProperty(user.id, propertyId) on BOTH old and new

3. **deleteTransaction**
   - Missing: user has write access to propertyId
   - Current check only validates against old userId

4. **clearAttachment** (legacy endpoint)
   - Missing: user has write access to propertyId

5. **deleteTransactionAttachment**
   - Missing: user has write access to propertyId

6. **markAsReviewed**
   - Missing: user has write access to propertyId

7. **restoreTransaction**
   - Missing: user has write access to propertyId

#### 🔶 Partially Checked:

1. **getPropertyTransactions** (in page.tsx)
   - Checks user can access property ✅
   - BUT: filters transactions by `transactions.userId`
   - Should filter by property membership

2. **uploadToR2** (upload route)
   - Checks `requireAuth()` ✅
   - Missing: if upload is for specific property, check access

3. **getFileFromR2** (file route)
   - May not require auth
   - Anyone with URL can download
   - Should check property membership

---

## 10. RACE CONDITIONS & CONSISTENCY ISSUES

### 10.1 Concurrent Writes to Shared Property

**Scenario:**

```
T0: User A (owner) creates transaction on Property X
T1: User B (editor) updates transaction on Property X
T2: User A updates transaction while User B's update in-flight

Race condition results:
- Last write wins (no locking)
- User B's update may be lost
- OCR confidence and review flag may be inconsistent
```

**ROOT CAUSE:**
- No transaction isolation
- No optimistic locking
- No conflict detection

### 10.2 Property Image Update Race

```
T0: Owner uploads new property image
T1: Upload completes, image URL stored
T2: Shared user loads property page
T3: Frontend renders with new imageUrl
T4: Image load from R2 fails (cache issue or timing)
T5: Image appears missing

T6: Page refresh
T7: Image loads correctly
```

### 10.3 Cascade Deletion Race

```
T0: Owner deletes transaction with attachments
T1: Transaction marked isDeleted=true
T2: Cron job runs
T3: Cron tries to delete R2 files
T4: R2 delete fails (network issue)
T5: Transaction hard-deleted from DB
T6: Orphaned file remains in R2
T7: No way to clean up (transaction record gone)
```

---

## 11. SECURITY VULNERABILITIES

### 11.1 MEDIUM: File URL Leakage

**Problem:**
- File URLs stored in database
- URLs accessible to anyone with database access
- URLs may be indexed by search engines
- No access control on file retrieval

**Impact:** Information disclosure

**Fix Required:**
1. Generate signed URLs for file access
2. Include user/property in signed URL check
3. Verify membership before serving file

### 11.2 LOW: Email Enumeration

**Problem:**
```typescript
// shares.ts:35
if (email === user.email?.toLowerCase()) return { error: "You cannot share a property with yourself." };
```

- If email matches current user, error message differs
- Attacker can enumerate valid user emails

**Impact:** Account enumeration

**Fix:** Generic error message

### 11.3 MEDIUM: Invitation Token Predictability

**Current:**
```typescript
const token = randomUUID();
```

**Good:** UUID is reasonably random

**Problem:** 
- Single use not enforced at code level
- Only enforced by checking status field
- If attacker can recreate token format, might brute force

**Fix:** Add rate limiting on accept endpoint

### 11.4 MEDIUM: Missing CSRF Protection

**Problem:**
- Server actions may be vulnerable to CSRF
- ShareProperty accepts FormData but no token validation

**Fix:** Ensure Next.js CSRF protection enabled

---

## 12. MISSING VALIDATION & ERROR HANDLING

### By Action:

1. **createTransaction**
   - ✅ Date required
   - ✅ Amount required and must be number
   - ✅ Type required
   - ✅ Payee required
   - ❌ propertyId not validated to exist
   - ❌ unitId not validated to exist
   - ❌ unitId not validated to belong to property
   - ❌ Property ownership not verified

2. **updateTransaction**
   - Same as createTransaction, plus:
   - ❌ Old transaction ownership not verified for shared scenarios

3. **shareProperty**
   - ✅ Email format validated
   - ✅ Property ownership verified
   - ✅ Can't share with self
   - ❌ Email not normalized for duplicate check
   - ❌ No check if user already has access

4. **acceptInvite**
   - ✅ Token must exist and be pending
   - ✅ Can't accept own invitation
   - ❌ No check if already accepted
   - ❌ No expiration time check

---

## 13. TESTING GAPS

### Cannot Be Tested Without Fixes:

1. Shared users can see transactions created by owner
2. Shared editors can edit transactions created by anyone
3. Shared viewers cannot edit transactions
4. Shared viewers cannot upload files
5. Storage is attributed to owner, not uploader
6. Deleted transactions visible during retention window
7. Permanent deletion after 30 days
8. Role escalation blocked
9. CAN_SHARE permissions enforced
10. Cascade deletion cleans up R2 files
11. Orphaned files cleaned up
12. Property images load for shared users
13. Page reload not required after accept
14. Audit log entries created for all actions
15. Invitations expire
16. Pending invitations can be canceled
17. Invitations can be resent
18. Declined invitations tracked

---

## 14. SUMMARY OF CRITICAL ISSUES

### Database Schema:

| Issue | Severity | Fix |
|-------|----------|-----|
| Missing PropertyMembership table | CRITICAL | Create new table |
| Missing PropertyInvitation table | CRITICAL | Create new table |
| Missing PropertyAuditLog table | HIGH | Create new table |
| Missing StorageOwnership table | HIGH | Create new table |
| Missing SoftDeleteQueue table | HIGH | Create new table |
| properties.imageUrl not tied to uploads | HIGH | Add image_storage_owner_id |
| transactions.userId prevents sharing | CRITICAL | Make property-scoped instead |
| propertyShares permissions too simple | CRITICAL | Add role enum, canShare toggle |
| No invitation expiration | MEDIUM | Add expiresAt to invitations |
| No deletion audit | MEDIUM | Add deleted_by_user_id to transactions |

### Permissions:

| Issue | Severity | Fix |
|-------|----------|-----|
| Edit button shown to viewers | CRITICAL | Require permission check in component + backend |
| Transactions not inherited from property | CRITICAL | Change transaction visibility to property-scoped |
| CAN_SHARE toggle missing | CRITICAL | Implement in schema and business logic |
| No role enforcement on share creation | HIGH | Implement RBAC in shares.ts |
| No permission on transaction creation | CRITICAL | Check canWriteToProperty before create/update |
| File access not gated by property | MEDIUM | Require property membership to serve files |

### Data Visibility:

| Issue | Severity | Fix |
|-------|----------|-----|
| Shared users can't see owner's transactions | CRITICAL | Query by property, not userId |
| Property not inherited to transactions | CRITICAL | Design property-centric schema |
| Shared images sometimes missing | HIGH | Debug R2 cache / authorization |
| Permission level not passed to frontend | HIGH | Include permission in all property queries |

### Lifecycle:

| Issue | Severity | Fix |
|-------|----------|-----|
| No permanent deletion guarantee | HIGH | Implement SoftDeleteQueue table + job |
| Orphaned R2 files | MEDIUM | Atomic DB + R2 deletion |
| Cron job unreliable | HIGH | Replace with durable background job |
| Deleted state not visible to shared users | MEDIUM | Query by property, include isDeleted state |

### Security:

| Issue | Severity | Fix |
|-------|----------|-----|
| File URLs not access-controlled | MEDIUM | Implement signed URLs |
| Email enumeration possible | LOW | Generic error messages |
| No CSRF protection | MEDIUM | Verify Next.js auth configuration |
| Frontend controls permission display | MEDIUM | Backend must provide permission data |

---

## 15. IMPLEMENTATION ROADMAP OVERVIEW

This analysis will inform a phased implementation plan:

### Phase 1: Database & Schema Foundation (BLOCKING)
- Create PropertyMembership table
- Create PropertyInvitation table
- Create PropertyAuditLog table
- Create StorageOwnership table
- Create SoftDeleteQueue table
- Migrate data from propertyShares → PropertyMembership
- Add missing columns to properties, transactions

### Phase 2: Core Permission System
- Implement RBAC service
- Add role enforcement to all actions
- Implement CAN_SHARE toggle
- Update auth-utils with new permission helpers
- Add permission to all property queries

### Phase 3: Transaction Inheritance & Visibility
- Change transaction queries to property-scoped
- Implement transitive visibility rules
- Update all transaction endpoints
- Add shared user filtering

### Phase 4: Invitation System Redesign
- Implement PropertyInvitation lifecycle
- Add expiration logic
- Add accept/decline/cancel flows
- Create Manage Access UI
- Update email sending

### Phase 5: Storage & Attachment Fixes
- Implement StorageOwnership table
- Update upload endpoint to attribute to owner
- Implement R2 signed URLs
- Add file access control

### Phase 6: Soft Delete & Lifecycle
- Implement SoftDeleteQueue
- Replace cron with durable job
- Add retention window tracking
- Implement atomic deletion

### Phase 7: Testing & Validation
- Permission boundary testing
- Data visibility testing
- Shared user flow testing
- Deletion lifecycle testing
- Cascade deletion testing

### Phase 8: Regression Testing & Deployment
- Full end-to-end testing
- Load testing for race conditions
- Production deployment
- Monitoring setup

---

## END OF ANALYSIS
