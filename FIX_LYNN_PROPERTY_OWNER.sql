-- FIX: Set fuegourbano809@gmail.com as OWNER of "Lynn" property
-- This script does the following:
-- 1. Finds the property "Lynn"
-- 2. Finds the user with email fuegourbano809@gmail.com
-- 3. Updates their membership to OWNER role
-- 4. Ensures they have full permissions (canShare=true)

-- STEP 1: Check current state
SELECT
  p.id,
  p.name,
  p.user_id,
  p.owner_id,
  u.email,
  pm.id as membership_id,
  pm.role,
  pm.status,
  pm.can_share
FROM properties p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN property_memberships pm ON p.id = pm.property_id AND pm.user_id = u.id
WHERE p.name = 'Lynn'
ORDER BY p.created_at DESC;

-- STEP 2: Update the property to set owner info correctly
UPDATE properties
SET
  user_id = (SELECT id FROM users WHERE email = 'fuegourbano809@gmail.com'),
  owner_id = (SELECT id FROM users WHERE email = 'fuegourbano809@gmail.com')
WHERE name = 'Lynn';

-- STEP 3: Update or create the membership record with OWNER role
INSERT INTO property_memberships
  (property_id, user_id, role, status, can_share, accepted_at, created_at)
SELECT
  p.id,
  u.id,
  'OWNER',
  'ACTIVE',
  true,
  NOW(),
  NOW()
FROM properties p, users u
WHERE p.name = 'Lynn'
  AND u.email = 'fuegourbano809@gmail.com'
ON CONFLICT (property_id, user_id) DO UPDATE
SET
  role = 'OWNER',
  status = 'ACTIVE',
  can_share = true,
  accepted_at = NOW();

-- STEP 4: Verify the fix
SELECT
  p.id,
  p.name,
  p.user_id,
  p.owner_id,
  u.email as owner_email,
  pm.role,
  pm.status,
  pm.can_share
FROM properties p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN property_memberships pm ON p.id = pm.property_id AND pm.user_id = u.id
WHERE p.name = 'Lynn';

-- Expected output:
-- p.name = 'Lynn'
-- u.email = 'fuegourbano809@gmail.com'
-- pm.role = 'OWNER'
-- pm.status = 'ACTIVE'
-- pm.can_share = true
