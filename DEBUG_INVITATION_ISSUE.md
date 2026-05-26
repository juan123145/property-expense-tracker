# DEBUG: Invitation Creation Failure

## Current State

### Local Environment
- Git: 26 commits ahead of origin/main
- Latest: 7c96ff4 (docs: final implementation status)
- Migration 0014 exists locally (added unique constraint)
- Build: Passes

### Production Environment
- **UNKNOWN**: May not have migration 0014
- **UNKNOWN**: May not have SharePropertyModal
- **UNKNOWN**: Build may be from older commit

## Root Cause Analysis

### Issue 1: Generic Error Message
File: `app/actions/shares.ts:105-108`
```typescript
catch (err) {
  console.error("shareProperty:", err);
  return { error: "Failed to create invitation. Please try again." };
}
```

**Problem**: All errors converted to generic message. Real error is only in console.

**Impact**: Cannot diagnose failure without accessing production logs.

### Issue 2: Missing Unique Constraint (Likely Cause)
File: `db/migrations/0014_add_property_invitations_unique_constraint.sql`

**Problem**: Migration 0014 may not be applied in production DB.

**Code in invitation-service.ts expects it:**
```typescript
.onConflictDoUpdate({
  target: [propertyInvitations.propertyId, propertyInvitations.invitedEmail],
  set: { ... }
})
```

**Without constraint**: Duplicate key error when:
- First invitation to user@company.com → Works
- Second invitation to same user@company.com → FAILS (duplicate)
- Or any error in the onConflictDoUpdate logic

### Issue 3: Deployment Mismatch
- Local has 26 commits not in production
- Production may have old code and old DB schema
- Frontend and backend may be out of sync

## Investigation Steps

1. ✅ Check git status (26 commits ahead)
2. ⏳ Verify migration 0014 is applied in production
3. ⏳ Check production logs for actual error
4. ⏳ Verify production DB schema matches code expectations
5. ⏳ Test invitation API directly (not through UI)
6. ⏳ Verify all 26 commits are deployed

## Known Facts

- SharePropertyModal created (new component)
- Unique constraint migration created
- Code expects constraint but may not exist in production
- Generic error hiding real issue

## Next Actions

1. Deploy all 26 commits to production
2. Apply migration 0014 to production DB
3. Improve error message in shareProperty to show real error
4. Test invitation flow with multiple users
5. Verify data consistency
