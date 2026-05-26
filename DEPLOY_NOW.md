# One-Command Deployment

Everything is ready. Pick the command that matches your setup:

---

## For Vercel (Automatic - Nothing to Do)

✅ Already done! Code auto-deploys on git push.

Just verify:
1. Check https://vercel.com/[your-project]/deployments
2. Latest commit has green checkmark ✅
3. Deployment complete

Then test: Go to your app and try sharing a property.

---

## For Linux/Mac/VPS (Copy & Paste)

```bash
ssh user@your-production-server

# Then paste this entire block:
cd /path/to/property-expense-tracker && \
git pull origin main && \
npm ci && \
npm run build && \
npm run db:migrate && \
echo "✅ Deployment complete!" && \
# Uncomment ONE of these to restart:
# pm2 restart app
# sudo systemctl restart property-expense-tracker
# docker-compose restart
```

**What it does:**
1. Pulls latest code (includes migration 0014 fix)
2. Installs dependencies
3. Builds production
4. Applies database migrations (creates unique constraint)
5. Restarts your app (uncomment correct line)

---

## For Docker

```bash
# SSH into production server
ssh user@your-production-server

# Then run:
cd /path/to/property-expense-tracker && \
git pull origin main && \
docker-compose build && \
docker-compose up -d && \
docker-compose exec app npm run db:migrate
```

---

## For Windows Server

```powershell
# SSH or RDP into production server
# Then run this in PowerShell:

cd C:\path\to\property-expense-tracker
git pull origin main
npm ci
npm run build
npm run db:migrate
# Then restart your app (PM2, IIS, Docker, etc.)
```

---

## After Running Deployment Script

### Verify Migrations Applied (Optional)

```bash
# SSH to production
ssh user@your-production-server

# Connect to database:
psql $DATABASE_URL -c "SELECT COUNT(*) as migrations_applied FROM _drizzle_migrations WHERE migration LIKE '0014%';"

# Should show: migrations_applied
#             1
```

---

## Quick Test (Do This After Deployment)

1. Open your production URL
2. Log in as **owner**
3. Go to any property
4. Click "Share Property"
5. Enter test email: `test@example.com`
6. Select role: VIEWER
7. Click send
8. ✅ Should see success message

9. Try again with **same email** to **same property**
10. ✅ Should see: "This user already has a pending invitation or accepted access to this property."
11. ✅ NOT: "Failed to send invitation"

**If you see the proper error message**: ✅ YOU'RE DONE

---

## Rollback (If Anything Goes Wrong)

```bash
ssh user@your-production-server

# Revert last deployment
cd /path/to/property-expense-tracker
git reset --hard HEAD~1
git push origin main
# Redeploy (your deployment system handles this)

# Note: Database changes (migration) cannot be rolled back automatically
# If needed, contact database admin to revert migration 0014
```

---

## Questions?

- Vercel not deploying? Check that `git push` succeeded
- Build failing? Check build logs at Vercel/Docker/hosting dashboard
- Migration failing? Make sure `DATABASE_URL` is set correctly in environment
- Still seeing "Failed to send invitation"? Migration might not have applied - verify with SQL query above

**Need more help?** See:
- `QUICK_DEPLOYMENT_CHECKLIST.md` - Detailed steps
- `PRE_DEPLOYMENT_VALIDATION.md` - Full validation guide
- `PRODUCTION_DEBUGGING_REPORT.md` - Technical details of the fixes
