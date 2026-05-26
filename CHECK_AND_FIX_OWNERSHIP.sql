-- CHECK DATABASE OWNERSHIP ISSUES
-- Run this to see what properties exist and if they have owner memberships

-- STEP 1: Check what properties exist
SELECT
  p.id,
  p.name,
  p.user_id,
  p.owner_id,
  p.created_at,
  CASE
    WHEN p.owner_id IS NOT NULL THEN p.owner_id
    ELSE p.user_id
  END as effective_owner_id
FROM properties p
ORDER BY p.created_at DESC;

-- STEP 2: Check if properties have membership records
SELECT
  p.id,
  p.name,
  CASE
    WHEN p.owner_id IS NOT NULL THEN p.owner_id
    ELSE p.user_id
  END as owner_id,
  pm.id as membership_id,
  pm.user_id,
  pm.role,
  pm.status,
  pm.can_share
FROM properties p
LEFT JOIN property_memberships pm ON p.id = pm.property_id
ORDER BY p.created_at DESC;

-- STEP 3: Identify properties WITHOUT an owner membership
SELECT
  p.id,
  p.name,
  CASE
    WHEN p.owner_id IS NOT NULL THEN p.owner_id
    ELSE p.user_id
  END as owner_id,
  'MISSING OWNER MEMBERSHIP' as issue
FROM properties p
LEFT JOIN property_memberships pm ON p.id = pm.property_id AND (
  (p.owner_id IS NOT NULL AND pm.user_id = p.owner_id) OR
  (p.owner_id IS NULL AND pm.user_id = p.user_id)
)
WHERE pm.id IS NULL
  AND (p.user_id IS NOT NULL OR p.owner_id IS NOT NULL);

-- ============================================
-- FIX: Create missing owner memberships
-- ============================================
-- Uncomment and run this section to fix issues

-- INSERT INTO property_memberships
--   (property_id, user_id, role, status, can_share, accepted_at, created_at)
-- SELECT
--   p.id,
--   CASE
--     WHEN p.owner_id IS NOT NULL THEN p.owner_id
--     ELSE p.user_id
--   END as owner_id,
--   'OWNER',
--   'ACTIVE',
--   true,
--   NOW(),
--   NOW()
-- FROM properties p
-- LEFT JOIN property_memberships pm ON p.id = pm.property_id
-- WHERE pm.id IS NULL
--   AND (p.user_id IS NOT NULL OR p.owner_id IS NOT NULL)
-- ON CONFLICT DO NOTHING;

-- After running the INSERT, verify with:
-- SELECT * FROM property_memberships ORDER BY created_at DESC LIMIT 5;
