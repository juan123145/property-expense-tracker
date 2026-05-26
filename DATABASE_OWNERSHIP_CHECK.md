# Database Ownership Check & Fix Guide

This guide helps you diagnose and fix property ownership issues in your database.

---

## Quick Check (3 Steps)

### Step 1: Connect to Your Database

```bash
# Using psql (PostgreSQL CLI)
psql $DATABASE_URL

# Or if you have database credentials:
psql postgresql://user:password@host:5432/dbname
```

### Step 2: Run the Diagnostic Queries

Copy and paste these queries one at a time:

#### Query 1: List all properties and their owners
```sql
SELECT
  p.id,
  p.name,
  p.user_id,
  p.owner_id,
  p.created_at
FROM properties p
ORDER BY p.created_at DESC;
```

**What to look for:**
- What is the property ID?
- What is the user_id (creator)?
- What is the owner_id?
- If owner_id is NULL, the user_id is the owner

#### Query 2: Check for membership records
```sql
SELECT
  p.id,
  p.name,
  COALESCE(p.owner_id, p.user_id) as owner_id,
  pm.id as membership_id,
  pm.user_id as member_user_id,
  pm.role,
  pm.status
FROM properties p
LEFT JOIN property_memberships pm ON p.id = pm.property_id
ORDER BY p.created_at DESC;
```

**What to look for:**
- Does membership_id show NULL? → **Missing membership** (PROBLEM!)
- Does member_user_id match owner_id? → **Correct**
- Does member_user_id NOT match owner_id? → **Wrong user** (PROBLEM!)
- Is pm.role not OWNER? → **Wrong role** (PROBLEM!)

#### Query 3: Find properties with ownership issues
```sql
SELECT
  p.id,
  p.name,
  COALESCE(p.owner_id, p.user_id) as expected_owner_id,
  CASE
    WHEN pm.id IS NULL THEN 'NO MEMBERSHIP RECORD'
    WHEN pm.user_id != COALESCE(p.owner_id, p.user_id) THEN 'WRONG USER'
    WHEN pm.role != 'OWNER' THEN 'WRONG ROLE: ' || pm.role
    ELSE 'OK'
  END as issue
FROM properties p
LEFT JOIN property_memberships pm ON p.id = pm.property_id
WHERE p.id IS NOT NULL;
```

**What to look for:**
- Any row with issue != 'OK' needs fixing

---

## Fix Issues

### If: NO MEMBERSHIP RECORD

**SQL to fix:**
```sql
INSERT INTO property_memberships
  (property_id, user_id, role, status, can_share, accepted_at, created_at)
VALUES (
  '[PROPERTY_ID]',
  '[OWNER_USER_ID]',
  'OWNER',
  'ACTIVE',
  true,
  NOW(),
  NOW()
);
```

Replace:
- `[PROPERTY_ID]` with the property's ID from Step 2
- `[OWNER_USER_ID]` with the correct owner's user ID

**Example:**
```sql
INSERT INTO property_memberships
  (property_id, user_id, role, status, can_share, accepted_at, created_at)
VALUES (
  '72ed4ec7-829b-455b-a4ca-25586700488a',
  '108583774626424131870',
  'OWNER',
  'ACTIVE',
  true,
  NOW(),
  NOW()
);
```

### If: WRONG USER (membership exists for wrong user)

**SQL to fix:**
```sql
-- Delete the incorrect membership
DELETE FROM property_memberships
WHERE property_id = '[PROPERTY_ID]'
  AND user_id != '[CORRECT_OWNER_ID]';

-- Then add the correct one
INSERT INTO property_memberships
  (property_id, user_id, role, status, can_share, accepted_at, created_at)
VALUES (
  '[PROPERTY_ID]',
  '[CORRECT_OWNER_ID]',
  'OWNER',
  'ACTIVE',
  true,
  NOW(),
  NOW()
);
```

### If: WRONG ROLE (membership exists but role is not OWNER)

**SQL to fix:**
```sql
UPDATE property_memberships
SET role = 'OWNER', can_share = true
WHERE property_id = '[PROPERTY_ID]'
  AND user_id = '[OWNER_USER_ID]';
```

---

## Use the API Endpoint (Automatic)

If you have access to the app URL, you can run the automatic fix:

```bash
curl -X POST https://your-domain.com/api/admin/fix-memberships
```

**Response:**
```json
{
  "success": true,
  "message": "Fixed 1 properties with missing owner memberships",
  "fixed": 1
}
```

---

## Verify the Fix

After running any fix, verify with:

```sql
-- Check the property now has an owner membership
SELECT
  p.id,
  p.name,
  pm.id,
  pm.user_id,
  pm.role,
  pm.status,
  pm.can_share
FROM properties p
LEFT JOIN property_memberships pm ON p.id = pm.property_id
WHERE p.id = '[YOUR_PROPERTY_ID]';
```

Should show:
- pm.id: ✅ NOT NULL
- pm.user_id: ✅ Should be the owner's ID
- pm.role: ✅ Should be 'OWNER'
- pm.status: ✅ Should be 'ACTIVE'
- pm.can_share: ✅ Should be true

---

## If Still Not Working

If the property still shows as inaccessible after fixing:

1. **Clear browser cache**: Ctrl+Shift+Delete
2. **Hard refresh**: Ctrl+Shift+R
3. **Log out and back in**
4. **Restart the app** (if self-hosted)

The caches might be stale from before the fix.

---

## Full Database State SQL

Run this to get a complete overview:

```sql
-- Show all users
SELECT id, email, name FROM users ORDER BY created_at DESC;

-- Show all properties with owners
SELECT id, name, user_id, owner_id FROM properties ORDER BY created_at DESC;

-- Show all memberships
SELECT
  pm.id,
  pm.property_id,
  pm.user_id,
  u.email,
  pm.role,
  pm.status,
  pm.can_share,
  pm.accepted_at
FROM property_memberships pm
LEFT JOIN users u ON pm.user_id = u.id
ORDER BY pm.created_at DESC;

-- Show missing owner memberships
SELECT DISTINCT
  p.id,
  p.name,
  COALESCE(p.owner_id, p.user_id) as owner_id
FROM properties p
WHERE NOT EXISTS (
  SELECT 1 FROM property_memberships pm
  WHERE pm.property_id = p.id
    AND pm.user_id = COALESCE(p.owner_id, p.user_id)
)
ORDER BY p.created_at DESC;
```

---

## Example: Your Situation

If your property is:
```
ID: 72ed4ec7-829b-455b-a4ca-25586700488a
Name: "My House"
Owner Email: Furgourbano809@gmail.com
Owner User ID: 108583774626424131870
```

**The fix would be:**
```sql
INSERT INTO property_memberships
  (property_id, user_id, role, status, can_share, accepted_at, created_at)
VALUES (
  '72ed4ec7-829b-455b-a4ca-25586700488a',
  '108583774626424131870',
  'OWNER',
  'ACTIVE',
  true,
  NOW(),
  NOW()
);
```

After this, you would be able to:
✅ Share the property
✅ Manage access
✅ See the property in your list
✅ Edit property details
✅ No more "property not visible" errors

---

## Questions?

If you're not sure which user ID or property ID to use:

1. Run Query 1 and Query 2 from Step 2 above
2. Match the email address with the user_id
3. Use that in the INSERT statement

If you need help with the exact user/property IDs, provide the property name and owner email address, and I can help you build the exact SQL to fix it.
