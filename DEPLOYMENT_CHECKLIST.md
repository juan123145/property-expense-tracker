# Deployment Checklist

## Pre-Deployment (2026-05-26)

### Database & Schema
- [x] Database: All migrations applied successfully (0004-0016)
- [x] Schema: All 5 new tables created
  - [x] PropertyMembership (RBAC roles)
  - [x] PropertyInvitation (invite lifecycle)
  - [x] PropertyAuditLog (audit trail)
  - [x] StorageOwnership (file attribution)
  - [x] SoftDeleteQueue (deletion lifecycle)
- [x] Schema: 3 existing tables updated
  - [x] properties (added ownerId, createdAt, updatedAt, auditLog)
  - [x] attachments (added uploaderId for attribution)
  - [x] propertyShares (migration to PropertyMembership completed)

### Core Features
- [x] RBAC System: Implemented with 4 roles
  - [x] OWNER: full access, can share
  - [x] EDITOR: create/edit transactions
  - [x] VIEWER: read-only access
  - [x] CAN_SHARE: independent toggle for sharing permission
- [x] Permission Enforcement: Backend auth checks on all API routes
- [x] Transactions: Made property-scoped (visible to all members)
- [x] Invitations: Full lifecycle implemented
  - [x] PENDING state with 30-day expiration
  - [x] ACCEPTED/DECLINED/EXPIRED transitions
  - [x] Resendable invitations
  - [x] No more auto-attachment during onboarding
- [x] Storage: Ownership tracking implemented
  - [x] StorageOwnership table created
  - [x] All files attributed to property owner on upload
  - [x] Uploader tracked separately
  - [x] Supports future billing/quota tracking
- [x] Deletion: Background job with retry logic
  - [x] SoftDeleteQueue table for reliable cleanup
  - [x] 30-day retention window
  - [x] Retry logic (max 5 attempts)
  - [x] Atomic R2 + DB deletion
  - [x] Cron endpoint for background processing
- [x] Frontend: Permission-based UI controls
  - [x] Edit buttons only shown to OWNER/EDITOR
  - [x] Delete buttons only shown to OWNER
  - [x] Share UI only shown to CAN_SHARE users
  - [x] Proper role-based menu items

### Build & Deployment
- [x] Build: Succeeds with no errors (npm run build)
- [x] TypeScript: All types correct (npx tsc --noEmit)
- [x] Linting: No new errors (pre-existing warnings only)
- [x] Dev server: Starts successfully (npm run dev)
- [x] Migrations: Applied idempotently (npm run db:migrate)

### Testing & Validation
- [x] All 28 Phase 8 tasks complete
- [x] 8 implementation phases done
- [x] 17 implementation commits created
- [x] Git status clean
- [x] Zero breaking changes to existing data

## Critical Bugs Fixed

### Phase 8 Verification (10 total)
- [x] Bug #1: Page reload requirement - FIXED
  - Root cause: Missing cache invalidation in frontend queries
  - Solution: Proper revalidatePath() calls in server actions
  - Verification: Transaction visibility updates immediately

- [x] Bug #2: Edit button for viewers - FIXED
  - Root cause: No role-based UI filtering
  - Solution: Added role checks in permission utility functions
  - Verification: Viewer accounts see read-only UI

- [x] Bug #3: Shared property image missing - FIXED
  - Root cause: URL attribution broken in shared context
  - Solution: Proper URL generation using property owner's access
  - Verification: Images load for all property members

- [x] Bug #4: Editors can modify properties - FIXED
  - Root cause: No backend permission check on property updates
  - Solution: Added requireRole('OWNER') to property update route
  - Verification: Only owners can edit property settings

- [x] Bug #5: Transactions not visible - FIXED
  - Root cause: Transactions were user-scoped instead of property-scoped
  - Solution: Changed query to filter by property members
  - Verification: All members see all property transactions

- [x] Bug #6: Data inheritance broken - FIXED
  - Root cause: Old propertyShares table not migrated
  - Solution: Migration script converts propertyShares to PropertyMembership
  - Verification: All legacy shares converted correctly

- [x] Bug #7: Inconsistent sharing - FIXED
  - Root cause: Multiple different query patterns
  - Solution: Unified getAccessiblePropertyIds() function
  - Verification: Consistent permission checks everywhere

- [x] Bug #8: Storage attribution wrong - FIXED
  - Root cause: No StorageOwnership table
  - Solution: Created StorageOwnership table with propertyId, ownerId, uploaderId
  - Verification: Storage dashboard shows correct ownership

- [x] Bug #9: Attachment ownership wrong - FIXED
  - Root cause: No uploader tracking
  - Solution: Added uploaderId field to attachments table
  - Verification: Both uploader and owner recorded correctly

- [x] Bug #10: Deletion unreliable - FIXED
  - Root cause: No retry mechanism for failed deletions
  - Solution: SoftDeleteQueue with exponential backoff retry
  - Verification: Background job handles transient failures

## Data Integrity Checks

- [x] No data loss in migrations
- [x] Legacy propertyShares data preserved (migrated to PropertyMembership)
- [x] All user transactions still exist
- [x] All attachments still accessible
- [x] All properties accessible by current owners

## Backwards Compatibility

- [x] Fully backwards compatible with existing data
- [x] Legacy propertyShares table automatically migrated
- [x] Existing user sessions remain valid
- [x] No breaking changes to API contracts
- [x] No breaking changes to database schema (only additive)

## Production Readiness

- [x] All 28 tasks complete
- [x] 8 implementation phases done
- [x] Database safely migrated
- [x] Zero breaking changes to existing data
- [x] Backwards compatible with legacy propertyShares
- [x] Ready for production deployment

## Pre-Deployment Tasks

- [ ] Backup production database
- [ ] Review IMPLEMENTATION_SUMMARY.md for details
- [ ] Review RELEASE_NOTES.md for user-facing changes
- [ ] Deploy application
- [ ] Monitor deletion job: curl /api/jobs/process-deletions -H "Authorization: Bearer $CRON_SECRET"
- [ ] Verify property sharing works with test account
- [ ] Monitor logs for any errors
- [ ] Communicate changes to users
