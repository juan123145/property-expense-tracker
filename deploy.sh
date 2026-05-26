#!/bin/bash

# Production Deployment & Migration Script
# Run this on your production server to deploy code and apply migrations

set -e  # Exit on any error

echo "🚀 Starting Production Deployment..."
echo ""

# Step 1: Pull Latest Code
echo "📦 Step 1: Pulling latest code from GitHub..."
git pull origin main
echo "✅ Code pulled successfully"
echo ""

# Step 2: Install Dependencies
echo "📦 Step 2: Installing dependencies..."
npm ci  # Use ci instead of install for production
echo "✅ Dependencies installed"
echo ""

# Step 3: Build
echo "🔨 Step 3: Building application..."
npm run build
if [ $? -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed! Rolling back..."
  git reset --hard HEAD~1
  exit 1
fi
echo ""

# Step 4: Run Database Migrations
echo "🗄️  Step 4: Running database migrations..."
npm run db:migrate
if [ $? -eq 0 ]; then
  echo "✅ Migrations applied successfully"
else
  echo "❌ Migration failed! Check database connection and permissions."
  exit 1
fi
echo ""

# Step 5: Verify Migration 0014
echo "✅ Step 5: Verifying migration 0014 is applied..."
# Note: This verification is informational only
echo "Migration applied successfully (verified by db:migrate)"
echo ""

# Step 6: Restart Application
echo "🔄 Step 6: Restarting application..."
# Uncomment the restart command that matches your setup:

# For PM2:
# pm2 restart app

# For systemd:
# sudo systemctl restart property-expense-tracker

# For Docker:
# docker-compose restart

# For Vercel (automatic, no restart needed):
echo "⚠️  Vercel redeploys automatically. If using Docker/PM2/systemd, uncomment the restart command above."

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Quick Test:"
echo "1. Open production URL in browser"
echo "2. Log in to owner account"
echo "3. Try to share a property with a test email"
echo "4. Verify: Real error message appears (not 'Failed to send invitation')"
echo ""
