# MongoDB Installation Fix

## The Error
`Failed to enable unit: Unit file mongod.service does not exist.`

This means MongoDB is not installed on your VPS yet.

---

## Solution: Install MongoDB Properly

### Step 1: Import MongoDB GPG Key
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
```

### Step 2: Add MongoDB Repository
```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

### Step 3: Update Package List
```bash
sudo apt-get update
```

### Step 4: Install MongoDB
```bash
sudo apt-get install -y mongodb-org
```

### Step 5: Start MongoDB
```bash
sudo systemctl start mongod
```

### Step 6: Enable MongoDB (Auto-start on boot)
```bash
sudo systemctl enable mongod
```

### Step 7: Verify MongoDB is Running
```bash
sudo systemctl status mongod
```

You should see: **Active: active (running)**

### Step 8: Test MongoDB Connection
```bash
mongosh
```

Type `exit` to quit MongoDB shell.

---

## Alternative: Use Docker for MongoDB (Easier)

If the above doesn't work, use Docker:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Run MongoDB in Docker
sudo docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v /data/mongodb:/data/db \
  --restart unless-stopped \
  mongo:7.0

# Verify it's running
sudo docker ps
```

Update your `.env` file to use:
```env
MONGO_URI=mongodb://localhost:27017/royal300_staff
```

---

## After MongoDB is Running

Continue with the deployment:
```bash
cd /var/www/royal300_staff_management/server
npm install
pm2 start ecosystem.config.js
pm2 save
```

---

## Quick Verification Commands

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Check if port 27017 is listening
sudo netstat -tulpn | grep 27017

# Test connection
mongosh --eval "db.adminCommand('ping')"
```
