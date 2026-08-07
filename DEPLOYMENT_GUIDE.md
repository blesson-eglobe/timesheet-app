# Full-Stack Deployment Guide (GitHub Pages + Cloud Backend)

Since GitHub Pages only hosts your **static frontend files** (`src/`), your Express backend (`server/`) and MySQL database must be hosted on a cloud provider.

Follow these 3 simple steps to get your entire application live online:

---

## Step 1: Host Your MySQL Database (Free/Easy Cloud Providers)

You need a live MySQL database accessible over the internet instead of local WAMP (`localhost:3306`).

### Recommended Free MySQL Providers

1. **[Aiven for MySQL](https://aiven.io/mysql)** (Offers a free MySQL database tier with SSL connection).
2. **[Railway](https://railway.app/)** (Add a new "MySQL" service in 1 click).
3. **[PlanetScale / TiDB Cloud](https://tidbcloud.com/)** (Serverless MySQL-compatible database).

After creating your cloud MySQL database, note down your credentials:

- `DB_HOST` (e.g., `mysql.aivencloud.com`)
- `DB_PORT` (e.g., `19382`)
- `DB_USER` (e.g., `avnadmin`)
- `DB_PASSWORD` (e.g., `secret_password`)
- `DB_NAME` (e.g., `defaultdb`)

---

## Step 2: Deploy Your Express API Server (`server/`)

You can deploy the backend for free using **Render** or **Railway**.

### Option A: Deploy on [Render.com](https://render.com/) (Recommended)

1. Log in to [Render.com](https://render.com/) using your GitHub account.
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository (`blesson-eglobe/timesheet-app`).
4. Configure the Web Service settings:
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Scroll down to **Environment Variables** and add the following:
   - `PORT` = `4000`
   - `NODE_ENV` = `production`
   - `DB_HOST` = `your_cloud_mysql_host`
   - `DB_PORT` = `your_cloud_mysql_port`
   - `DB_USER` = `your_cloud_mysql_user`
   - `DB_PASSWORD` = `your_cloud_mysql_password`
   - `DB_NAME` = `your_cloud_mysql_database_name`
   - `JWT_SECRET` = `any_secure_random_string`
   - `CLIENT_URL` = `https://blesson-eglobe.github.io/timesheet-app,http://localhost:5173`
6. Click **Create Web Service**. Once deployed, copy your live backend URL (e.g., `https://timesheet-server-xxxx.onrender.com`).

---

## Step 3: Connect Frontend to Live Backend & Re-deploy GitHub Pages

Now that your backend is online, tell your React frontend where to find it:

1. Create a file named `.env.production` inside the root folder (`c:\Users\Designer 3\Desktop\Personal Projects\Timesheet App\.env.production`).
2. Add your live Render/Railway API URL:

   ```env
   VITE_API_URL=https://timesheet-server-xxxx.onrender.com/api
   ```

3. Build and deploy your frontend to GitHub Pages:

   ```bash
   npm run build
   ```

   If you use the `gh-pages` branch or GitHub Actions to deploy, push the new build. Your GitHub Pages app will now send all API requests (`axios`) to your live Express server instead of `/api` (`localhost`)!
