-- Migration 0012: Migrate propertyShares data to propertyMemberships and propertyInvitations
-- This migration safely migrates all existing shares to the new RBAC tables

-- Migrate ACCEPTED shares to property_memberships
INSERT INTO "property_memberships"
  ("property_id", "user_id", "role", "can_share", "status", "created_at", "accepted_at")
SELECT
  ps."property_id",
  ps."shared_with_user_id",
  CASE
    WHEN ps."permission" = 'edit' THEN 'EDITOR'::property_role
    ELSE 'VIEWER'::property_role
  END as role,
  false as "can_share",
  'ACTIVE'::membership_status as status,
  ps."created_at",
  ps."accepted_at"
FROM "property_shares" ps
WHERE
  ps."status" = 'accepted'
  AND ps."shared_with_user_id" IS NOT NULL
  AND ps."permission" IN ('view', 'edit')
ON CONFLICT DO NOTHING;

--> statement-breakpoint

-- Migrate PENDING shares to property_invitations
INSERT INTO "property_invitations"
  ("property_id", "invited_email", "invited_by_user_id", "role", "can_share", "status", "token", "expires_at", "created_at")
SELECT
  ps."property_id",
  ps."invited_email",
  ps."owner_id",
  CASE
    WHEN ps."permission" = 'edit' THEN 'EDITOR'::property_role
    ELSE 'VIEWER'::property_role
  END as role,
  false as "can_share",
  'PENDING'::invitation_status as status,
  ps."invite_token",
  ps."created_at" + interval '30 days' as "expires_at",
  ps."created_at"
FROM "property_shares" ps
WHERE
  ps."status" = 'pending'
  AND ps."permission" IN ('view', 'edit')
ON CONFLICT DO NOTHING;
