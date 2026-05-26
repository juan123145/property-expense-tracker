-- Migration 0013: Create OWNER memberships for all properties
-- Ensures every property has an OWNER membership for the property owner

INSERT INTO "property_memberships"
  ("property_id", "user_id", "role", "can_share", "status", "created_at", "accepted_at")
SELECT
  p."id" as "property_id",
  p."owner_id" as "user_id",
  'OWNER'::property_role as role,
  true as "can_share",
  'ACTIVE'::membership_status as status,
  p."created_at",
  p."created_at"
FROM "properties" p
WHERE NOT EXISTS (
  SELECT 1
  FROM "property_memberships" pm
  WHERE
    pm."property_id" = p."id"
    AND pm."user_id" = p."owner_id"
    AND pm."role" = 'OWNER'::property_role
)
ON CONFLICT DO NOTHING;
