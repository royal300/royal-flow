# Royal 300 Staff Management - VPS Deployment Guide

## 🎯 Deployment Overview
- **Domain:** staff.royal300.com
- **VPS:** Hostinger VPS (existing server with other sites)
- **Folder:** `/var/www/royal300_staff_management`
- **Tech Stack:** React (Frontend) + Node.js/Express (Backend) + MongoDB

---

## 📋 Prerequisites Checklist
- [ ] SSH access to Hostinger VPS
- [ ] Domain `staff.royal300.com` pointed to VPS IP
- [ ] Node.js installed (v18+)
- [ ] MongoDB installed and running
- [ ] Nginx installed
- [ ] PM2 installed globally

---

## 🚀 Step-by-Step Deployment

### Step 1: SSH into Your VPS
```bash
ssh root@your-vps-ip
# Or use the credentials from Hostinger panel
```

### Step 2: Install Required Software (if not already installed)

#### Install Node.js (if needed)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Should show v18+
npm --version
```

#### Install MongoDB (if needed)
```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

#### Install PM2 (if needed)
```bash
sudo npm install -g pm2
pm2 --version
```

### Step 3: Create Project Directory
```bash
cd /var/www
mkdir royal300_staff_management
cd royal300_staff_management
```

### Step 4: Clone Repository from GitHub
```bash
# Clone your repository
git clone https://github.com/royal300/royal-flow.git .

# Verify files
ls -la
```

### Step 5: Setup Backend (Node.js Server)

#### Navigate to server directory
```bash
cd /var/www/royal300_staff_management/server
```

#### Install dependencies
```bash
npm install
```

#### Create environment file
```bash
nano .env
```

Add the following content:
```env
MONGO_URI=mongodb://localhost:27017/royal300_staff
PORT=5001
NODE_ENV=production
```

Save and exit (Ctrl+X, Y, Enter)

#### Test backend
```bash
node index.js
# Should see: "Server running on port 5001" and "Connected to MongoDB"
# Press Ctrl+C to stop
```

### Step 6: Setup Frontend (React App)

#### Navigate to root directory
```bash
cd /var/www/royal300_staff_management
```

#### Install dependencies
```bash
npm install
```

#### Update API URL for production
```bash
nano src/lib/storage.ts
```

Change line 1 from:
```typescript
export const API_URL = 'http://localhost:5001/api';
```

To:
```typescript
export const API_URL = 'https://staff.royal300.com/api';
```

Save and exit.

#### Build production version
```bash
npm run build
```

This creates a `dist` folder with optimized production files.

### Step 7: Setup PM2 for Backend Process

#### Create PM2 ecosystem file
```bash
cd /var/www/royal300_staff_management
nano ecosystem.config.js
```

Add this content:
```javascript
module.exports = {
  apps: [{
    name: 'royal300-backend',
    cwd: '/var/www/royal300_staff_management/server',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    }
  }]
};
```

Save and exit.

#### Start backend with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Verify backend is running
```bash
pm2 status
pm2 logs royal300-backend
```

### Step 8: Configure Nginx

#### Create Nginx configuration
```bash
sudo nano /etc/nginx/sites-available/staff.royal300.com
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name staff.royal300.com;

    # Frontend - Serve React build
    root /var/www/royal300_staff_management/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend routes (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Save and exit.

#### Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/staff.royal300.com /etc/nginx/sites-enabled/
```

#### Test Nginx configuration
```bash
sudo nginx -t
```

#### Reload Nginx
```bash
sudo systemctl reload nginx
```

### Step 9: Setup SSL Certificate (HTTPS)

#### Install Certbot
```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

#### Get SSL certificate
```bash
sudo certbot --nginx -d staff.royal300.com
```

Follow the prompts:
- Enter email address
- Agree to terms
- Choose to redirect HTTP to HTTPS (option 2)

#### Verify auto-renewal
```bash
sudo certbot renew --dry-run
```

### Step 10: Setup Firewall (if needed)
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
sudo ufw status
```

### Step 11: Create Deployment Script for Future Updates

```bash
nano /var/www/royal300_staff_management/deploy.sh
```

Add this content:
```bash
#!/bin/bash
echo "🚀 Deploying Royal 300 Staff Management..."

# Navigate to project directory
cd /var/www/royal300_staff_management

# Pull latest changes
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd server
npm install

# Restart backend
echo "🔄 Restarting backend..."
pm2 restart royal300-backend

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
```

Make it executable:
```bash
chmod +x /var/www/royal300_staff_management/deploy.sh
```

---

## 🔄 Future Deployments

Whenever you push changes to GitHub, run:
```bash
cd /var/www/royal300_staff_management
./deploy.sh
```

---

## 🛠️ Useful Commands

### Check Backend Status
```bash
pm2 status
pm2 logs royal300-backend
pm2 restart royal300-backend
```

### Check Nginx Status
```bash
sudo systemctl status nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Check MongoDB Status
```bash
sudo systemctl status mongod
mongo  # Connect to MongoDB shell
```

### View Application Logs
```bash
pm2 logs royal300-backend --lines 100
```

### Monitor Server Resources
```bash
pm2 monit
```

---

## 🔒 Security Checklist
- [x] SSL certificate installed (HTTPS)
- [ ] MongoDB authentication enabled
- [ ] Firewall configured (UFW)
- [ ] Regular backups scheduled
- [ ] Environment variables secured
- [ ] PM2 startup script enabled

---

## 📊 MongoDB Backup (Recommended)

### Create backup script
```bash
nano /root/backup-royal300.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/root/backups/royal300"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
mongodump --db royal300_staff --out $BACKUP_DIR/backup_$DATE

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
```

Make executable and schedule:
```bash
chmod +x /root/backup-royal300.sh
crontab -e
```

Add this line (daily backup at 2 AM):
```
0 2 * * * /root/backup-royal300.sh
```

---

## 🌐 DNS Configuration

Make sure your domain `staff.royal300.com` points to your VPS IP:

**In your domain registrar (Hostinger DNS):**
```
Type: A
Name: staff
Value: YOUR_VPS_IP
TTL: 3600
```

---

## ✅ Verification Checklist

After deployment, verify:
- [ ] https://staff.royal300.com loads the login page
- [ ] Logo displays correctly
- [ ] Can login as admin
- [ ] Can login as staff
- [ ] Face registration works
- [ ] Attendance scanning works
- [ ] Tasks display correctly
- [ ] All features functional

---

## 🆘 Troubleshooting

### Frontend not loading
```bash
# Check Nginx
sudo nginx -t
sudo systemctl status nginx
# Check build files exist
ls -la /var/www/royal300_staff_management/dist
```

### Backend not responding
```bash
# Check PM2
pm2 status
pm2 logs royal300-backend
# Check if port 5001 is listening
sudo netstat -tulpn | grep 5001
```

### MongoDB connection failed
```bash
# Check MongoDB
sudo systemctl status mongod
# Check connection
mongo --eval "db.adminCommand('ping')"
```

### SSL certificate issues
```bash
# Renew certificate
sudo certbot renew
sudo systemctl reload nginx
```

---

## 📞 Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs royal300-backend`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check MongoDB logs: `sudo tail -f /var/log/mongodb/mongod.log`

---

**🎉 Your Royal 300 Staff Management system is now live at https://staff.royal300.com!**
