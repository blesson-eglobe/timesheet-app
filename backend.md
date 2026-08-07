# Full-Stack Cloud Setup & Deployment Guide

**Stack:** Aiven MySQL + Render Express Backend + GitHub Pages React Frontend

This document provides a comprehensive, step-by-step manual for configuring your database, deploying your backend API to the cloud, and linking your production frontend.

---

## 🏗️ Part 1: Aiven Cloud MySQL Database Setup

Aiven provides a managed, cloud-hosted MySQL database accessible from anywhere (replacing local WAMP).

### 1. Get Your Aiven Connection Details

1. Log in to [console.aiven.io](https://console.aiven.io/).
2. Select your MySQL service (`Free MySQL`).
3. Under **Overview** -> **Connection information**, note your credentials:
   - **Host**: e.g., `mysql-yourproject.aivencloud.com`
   - **Port**: e.g., `20335`
   - **User**: `avnadmin`
   - **Password**: `your_secure_password`
   - **Database Name**: `defaultdb`

### 2. Configure Local Database Connection (`server/.env`)

Open your local `server/.env` file. You can maintain both your Local WAMP and Aiven Cloud settings by commenting (`#`) out whichever block you are not actively using:

```env
PORT=4000
NODE_ENV=development

# --- INACTIVE: MySQL (Local WAMP Server) ---
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=
# DB_NAME=timesheet_db
# DB_SSL=false

# --- ACTIVE: MySQL (Aiven Cloud) ---
DB_HOST=mysql-yourproject.aivencloud.com
DB_PORT=20335
DB_USER=avnadmin
DB_PASSWORD=your_secure_password
DB_NAME=defaultdb
DB_SSL=true

# JWT & CORS
JWT_SECRET=supersecret_meridian_timesheet_key_2026
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

> [!IMPORTANT]
> Never commit `server/.env` to GitHub! It contains sensitive database passwords. Our local `.gitignore` keeps it safely un-tracked.

### 3. Initialize Tables & Seed Demo Data

Once `server/.env` is saved with your Aiven details, open a terminal inside the `server/` folder and run:

```powershell
# Step A: Create all database tables (users, timesheets, approvals, etc.)
npm run migrate

# Step B: Populate demo employees and manager pending reviews
npm run seed
```

Your Aiven cloud database is now fully initialized and ready for production!

---

## ☁️ Part 2: Render.com Backend Service Setup (`server/`)

To host your Express Node.js backend online for free, deploy it as a **Web Service** on [Render.com](https://render.com/).

### 1. Create Web Service on Render

1. Log into your Render dashboard using your GitHub account.
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository (`blesson-eglobe/timesheet-app`).

### 2. Configure Build & Start Settings

In the Web Service settings, verify that these exact values are entered:

| Setting | Exact Value | Explanation |
| :--- | :--- | :--- |
| **Root Directory** | `server` | Tells Render to enter the backend folder instead of the frontend root. |
| **Runtime** | `Node` | Node.js runtime environment. |
| **Build Command** | `npm install && npm run build` | Installs dependencies and compiles TypeScript (`npx tsc`) to JavaScript (`dist/`). |
| **Start Command** | `npm start` | Launches `node dist/index.js` in production. |

### 3. Add Environment Variables on Render

Under the **Environment** tab on Render, click **Add Environment Variable** and add the following pairs:

| Key | Value |
| :--- | :--- |
| `PORT` | `4000` |
| `NODE_ENV` | `production` |
| `DB_HOST` | `mysql-yourproject.aivencloud.com` |
| `DB_PORT` | `20335` |
| `DB_USER` | `avnadmin` |
| `DB_PASSWORD` | `your_secure_password` |
| `DB_NAME` | `defaultdb` |
| `DB_SSL` | `true` |
| `JWT_SECRET` | `supersecret_meridian_timesheet_key_2026` |
| `CLIENT_URL` | `*` *(or your exact frontend URL when deployed)* |

> [!NOTE]
> **Why we enter them here instead of `.env`:** Render securely stores these variables inside its vault and automatically injects them into `process.env.*` when your server boots up. This is the industry-standard way to manage credentials without uploading `.env` files to Git.

### 4. Click **Save Changes** (or trigger a Manual Deploy). Once green (**Live**), copy your live backend URL (e.g., `https://timesheet-app-xxxx.onrender.com`).

---

## 🌐 Part 3: Connecting React Frontend (`.env.production` + GitHub Pages)

GitHub Pages hosts static UI files (`HTML/CSS/JS`) and cannot run backend code. We must tell Vite to embed your live Render backend address into your compiled JavaScript bundle.

### 1. Create `.env.production` in Root Project Folder

In your main repository directory (`Timesheet App`), create a file named exactly `.env.production` containing:

```env
VITE_API_URL=https://timesheet-app-xxxx.onrender.com/api
```

*(Ensure there is a leading dot `.` in `.env.production` and `/api` at the end of the URL).*

### 2. Build and Deploy to GitHub Pages

Open a terminal in your root directory (`Timesheet App`) and run:

```powershell
# Step A: Vite builds production bundle into dist/ with your live Render API URL baked in
npm run build

# Step B: Pushes the compiled dist/ directory to your gh-pages branch on GitHub
npm run deploy
```

Once deployed (`Published`), visit your live website at `https://blesson-eglobe.github.io/timesheet-app/`. Your frontend will now communicate directly with your live cloud backend on Render!

---

## ⏰ Part 4: Daily Routine & Best Practices

### ☀️ Morning Startup on Production (Render Free Tier)

- **The 15-Minute Sleep Rule:** On Render's Free Tier, if your backend receives no traffic for 15 minutes (like overnight), it powers down to save resources.
- **First Click Delay:** When you open your site in the morning, the **very first API request takes ~45 to 60 seconds** to wake up the server from sleep.
- **Instant Warmup Tip:** While opening your browser in the morning, visit your backend health URL directly: `https://timesheet-app-xxxx.onrender.com/api/health`. Once it returns `{"status":"ok",...}`, your server is fully awake and all interactions will be instantaneous!

### 💻 Local Development (`localhost:5173`)

You can develop locally at any time without changing any production files:

1. **Start Backend (`http://localhost:4000`):**

   ```powershell
   cd server
   npm run dev
   ```

2. **Start Frontend (`http://localhost:5173`):**

   ```powershell
   # In root project folder
   npm run dev
   ```

   *(Vite ignores `.env.production` when running `dev` and automatically uses `vite.config.ts` to proxy `/api` straight to `localhost:4000`!)*

### 🔍 Graphical Database Access (DBeaver / TablePlus / MySQL Workbench)

To visually inspect or query your Aiven tables (`users`, `timesheets`, `approvals`) on your PC:

- Connect your database tool using your Aiven `Host`, `Port`, `User`, `Password`, and `Database Name`.
- Under **SSL/TLS settings**, choose **Require SSL** (`rejectUnauthorized: false`).
