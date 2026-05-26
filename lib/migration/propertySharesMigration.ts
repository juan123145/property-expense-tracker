/**
 * PropertyShares Migration Utility
 *
 * Migration plan from deprecated propertyShares table to new tables:
 * - propertyMemberships: for active and accepted shares
 * - propertyInvitations: for pending invitations
 *
 * TODO: Implement the following migration steps:
 * 1. For each accepted share (propertyShares.status = 'accepted'):
 *    - Create PropertyMembership with role mapped from permission
 *    - Set status to ACTIVE
 *    - Set acceptedAt from propertyShares.acceptedAt
 *
 * 2. For each pending share (propertyShares.status = 'pending'):
 *    - Create PropertyInvitation with role mapped from permission
 *    - Set status to PENDING
 *    - Preserve invite token and invited email
 *
 * 3. For each revoked share (propertyShares.status = 'revoked'):
 *    - Create PropertyMembership with status = REVOKED
 *    - This preserves the audit trail of the share
 *
 * ROLE MAPPING:
 * - propertyShares.permission = 'edit' → propertyRoleEnum = 'EDITOR'
 * - propertyShares.permission = 'view' → propertyRoleEnum = 'VIEWER'
 * - Note: 'OWNER' role is not stored in propertyShares, only in properties.owner_id
 *
 * PERMISSIONS:
 * - canShare should default to false unless explicitly set in the share record
 *
 * Safety considerations:
 * - Run migration with transaction rollback capability
 * - Verify all records migrated before deleting propertyShares table
 * - Keep propertyShares table for 1-2 months after migration for rollback safety
 * - Log all migration actions to propertyAuditLogs
 */
