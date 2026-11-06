# 🚀 Closify CRM - cPanel Production Deployment Guide
**Target Domain:** `https://crm.aceonesolutions.com`  
**Powered by:** `@aceone solutions`

---

## 📋 Pre-Deployment Checklist

1. **Subdomain Created in cPanel:**
   - Go to **cPanel > Domains** and create `crm.aceonesolutions.com`.
   - Ensure the document root is set (e.g. `/home/username/crm.aceonesolutions.com` or `/home/username/public_html/crm`).
   - Enable Free **AutoSSL / Let's Encrypt** for `crm.aceonesolutions.com`.

2. **PostgreSQL Database:**
   - If using cPanel PostgreSQL: Go to **cPanel > PostgreSQL Databases**, create a DB (e.g. `aceone_crm`), create a user, assign all privileges, and note the connection string.
   - Or use cloud managed PostgreSQL (Neon.tech, Supabase, Aiven) with zero server overhead.

---

## 🛠️ Step-by-Step Deployment on cPanel

### Step 1: Set Up Node.js in cPanel
1. Open **cPanel** and click **Setup Node.js App** (CloudLinux NodeJS Selector).
2. Click **Create Application**:
   - **Node.js Version:** `20.x` or `22.x` (Recommended: 20 LTS)
   - **Application Mode:** `Production`
   - **Application Root:** `crm.aceonesolutions.com`
   - **Application URL:** `crm.aceonesolutions.com`
   - **Application Startup File:** `server.js` (or `app.js`)
3. Click **Create**.
4. Once created, cPanel will display a command to enter the virtual environment, e.g.:
   ```bash
   source /home/username/nodevenv/crm.aceonesolutions.com/20/bin/activate && cd /home/username/crm.aceonesolutions.com
   ```

---

### Step 2: Upload Project Files
1. Create a zip archive of the project (excluding `node_modules` and `.git`).
2. Go to **cPanel > File Manager**, navigate to your Application Root (`/home/username/crm.aceonesolutions.com`), and upload the zip.
3. Extract the zip into the directory.
4. Ensure `.env` is present in the application root (you can copy `.env.production` to `.env`).

---

### Step 3: Production Environment Variables (.env)
In the application root, ensure `.env` contains:
```env
NODE_ENV="production"
PORT=3000

# Canonical Domain URL
NEXT_PUBLIC_APP_URL="https://crm.aceonesolutions.com"

# PostgreSQL Connection String
DATABASE_URL="postgresql://username:password@localhost:5432/database_name?schema=public&sslmode=prefer"

# Pre-Generated 256-Bit Cryptographic Secrets
ENCRYPTION_KEY="6a47b0573f191c054a91df77c29fb1acb096428bfe167d752ee3273059b912d8"
SESSION_SECRET="9be3a91b0a9d6ef84cf3de885ae5559ab742fe1ea77bed49eaf2ef64820cf3fc"

# WhatsApp Gateway Persistent Config
WA_GATEWAY_PORT=3001
WA_AUTH_DIR="./.wa_auth"

# Automated Cron Sync Secret
CRON_SECRET="bbe0366f728a185497067a6c659f8a8b1e4e8c80bbde13d0"
```

---

### Step 4: Install Dependencies & Run Database Migration
Open **Terminal** in cPanel (or SSH into your server):
```bash
# 1. Activate the Node.js virtual environment (copy exact command from cPanel Node.js App page)
source /home/username/nodevenv/crm.aceonesolutions.com/20/bin/activate && cd /home/username/crm.aceonesolutions.com

# 2. Install production dependencies
npm install --production=false

# 3. Generate Prisma client & sync database schema
npx prisma db push

# 4. Build the Next.js production bundle
npm run build
```

---

### Step 5: Start / Restart the Application
1. In **cPanel > Setup Node.js App**, find your application.
2. Click **Restart**.
3. Visit: `https://crm.aceonesolutions.com`
4. Both Next.js and the internal WhatsApp Gateway daemon will boot automatically under the single unified `server.js` process!
