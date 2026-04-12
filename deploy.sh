#!/bin/bash
# Royal 300 Staff Management - VPS Deployment Script
# This script runs ON THE VPS

echo "🚀 Deploying Royal 300 Staff Management..."

# Navigate to project directory
cd /var/www/royal300_staff_management || exit 1

# Pull latest changes
echo "📥 Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd server || exit 1
npm install

# Restart backend
echo "🔄 Restarting backend..."
pm2 restart royal300-backend || pm2 start index.js --name royal300-backend

# Build frontend
echo "🏗️  Building frontend..."
cd ..
npm install
npm run build

# Reload Nginx
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ Deployment complete!"
echo "🌐 Visit: https://staff.royal300.com"
