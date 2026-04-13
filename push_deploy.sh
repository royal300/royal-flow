#!/bin/bash
# Royal 300 Staff Management - Local Push & Deploy Script
# This script runs ON YOUR LOCAL MACHINE

echo "🚀 Starting deployment process..."

# 1. Commit changes
if [[ -n $(git status -s) ]]; then
    echo "📦 Staging changes..."
    git add .
    echo "💾 Committing changes..."
    git commit -m "Enhance task form with multiple times and UI improvements (square cards, 4-column layout)"
else
    echo "✨ No new local changes to commit."
fi

# 2. Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

# 3. Trigger VPS deployment
echo "🖥️  Triggering remote deployment on VPS..."
VPS_HOST="staff.royal300.com"
SSH_USER="root"

# Run the remote deploy script
ssh $SSH_USER@$VPS_HOST "cd /var/www/royal300_staff_management && chmod +x deploy.sh && ./deploy.sh"

if [ $? -eq 0 ]; then
    echo "✅ Success! Deployment complete."
    echo "🌐 Visit: https://staff.royal300.com"
else
    echo "❌ Deployment failed on VPS. Run: pm2 logs royal300-backend on the server."
    exit 1
fi
