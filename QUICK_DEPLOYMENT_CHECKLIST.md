# Quick Deployment Checklist

**Build Status**: ✅ PASSING (0 TypeScript errors)  
**Code Status**: ✅ READY

---

## Phase 1: Push Code (5 min)

```bash
git log --oneline | head -3
# Verify: 5786204, d459350, 1c1edc9 present

git push origin main
```

---

## Phase 2: Deploy Code (Varies)

Deploy to production using your standard process:
- Vercel: Auto-deploys on push
- Docker: Pull, build, restart
- Other: Follow your deployment procedure

---

## Phase 3: Run Database Migrations (5 min)

```bash
npm run db:migrate
```

Verify:
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM _drizzle_migrations WHERE migration LIKE '0014%';"
# Should return: 1
```

---

## Phase 4: Quick Smoke Test (5 min)

- [ ] Production site loads
- [ ] Can log in
- [ ] Properties page shows
- [ ] No console errors
- [ ] No 500 errors in logs

---

## Phase 5: Multi-User Test (30 min)

**Three browser sessions**:

**Owner**:
1. Share property with editor@example.com as EDITOR
2. ✅ See real error message if duplicate
3. Copy invite URL

**Editor** (Incognito):
1. Paste invite URL
2. ✅ Accept invitation
3. ✅ See shared property + transactions
4. ✅ Try accessing different property → 404

**Owner**:
1. Go to Manage Access
2. Change Editor role to VIEWER
3. ✅ Updates immediately
4. Revoke access
5. ✅ Disappears immediately

**Editor**:
1. Refresh properties
2. ✅ Shared property gone

---

## Success Criteria

- ✅ Real error messages (not generic "Failed to create invitation")
- ✅ Authorization enforced (can't access unauthorized properties)
- ✅ Cache invalidates (changes appear immediately)
- ✅ Multi-user access works

---

## If Something Fails

Check:
1. Is commit d459350 deployed? (authorization fix)
2. Is commit 1c1edc9 deployed? (error message + resilience fix)
3. Is commit 5786204 deployed? (cache invalidation fix)
4. Is migration 0014 applied? (unique constraint)

**Quick Fix**: If migrations failed, manual SQL:
```sql
ALTER TABLE "property_invitations" 
ADD CONSTRAINT "property_invitations_property_id_invited_email_key" 
UNIQUE ("property_id", "invited_email");
```

---

## Done When

All checkboxes above are checked ✅

Production is now stable and secure.
