#!/bin/bash
# Local deploy script for Royal 300 Staff Management

echo "🚀 Starting deployment..."

# Check if we are in the correct directory
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Please run this from the project root."
    exit 1
fi

# 1. Check for untracked/modified changes
if [[ -n $(git status -s) ]]; then
    echo "📦 Staging changes..."
    git add .
    echo "💾 Committing changes..."
    git commit -m "Overhaul Task Management: campaign-based forms and date-wise staff view"
else
    echo "✨ No changes to commit."
fi

# 2. Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

# 3. Deploy to VPS
echo "🖥️  Triggering remote deployment on VPS..."
# We use the domain as the host
VPS_HOST="staff.royal300.com"
SSH_USER="root"

ssh $SSH_USER@$VPS_HOST "cd /var/www/royal300_staff_management && ./deploy.sh"

if [ $? -eq 0 ]; then
    echo "✅ Deployment complete!"
    echo "🌐 Visit: https://staff.royal300.com"
else
    echo "❌ Deployment failed on VPS. Please check remote logs."
    exit 1
fi
