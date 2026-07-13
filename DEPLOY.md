# 🚀 NetWave Hotspot — Render + Vercel Deployment Guide

---

## OVERVIEW

```
Frontend (React)  →  Vercel   (free)
Backend (Node.js) →  Render   (free)
Database (SQLite) →  Render   (stored inside the backend container)
```

> ⚠️ **Important:** The backend auto-runs migrations and seeds the database
> on every start. You do NOT need shell access or any manual commands.

---

## PART 1 — DEPLOY BACKEND ON RENDER

### Step 1 — Push code to GitHub
Make sure your full project is in a GitHub repository.

### Step 2 — Create Render Web Service
1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Set **Root Directory** to: `backend`
4. Set **Build Command** to:
   ```
   npm install && npx prisma generate && npx prisma migrate deploy
   ```
5. Set **Start Command** to:
   ```
   npm start
   ```
6. Set **Runtime** to: `Node`
7. Plan: **Free**

### Step 3 — Set Environment Variables in Render
Go to your service → **Environment** tab → Add these:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `DATABASE_URL` | `file:./prisma/prod.db` |
| `JWT_SECRET` | *(click Generate)* |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | `https://YOUR-APP.vercel.app` ← add this AFTER deploying Vercel |
| `APP_URL` | `https://YOUR-BACKEND.onrender.com` |
| `PAYSTACK_PUBLIC_KEY` | `pk_live_xxx` |
| `PAYSTACK_SECRET_KEY` | `sk_live_xxx` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_USER` | `your@gmail.com` |
| `SMTP_PASS` | `your_app_password` |

### Step 4 — Deploy
Click **Deploy**. Watch the logs. You will see:
```
✅ Migrations applied
✅ Super Admin created  →  admin@netwave.ng / Admin@123
✅ Default plans created
🚀 NetWave API running on port 10000
```

**Copy your Render URL** — it looks like:
```
https://netwave-backend-xxxx.onrender.com
```

---

## PART 2 — DEPLOY FRONTEND ON VERCEL

### Step 1 — Create Vercel Project
1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Set **Root Directory** to: `frontend`
4. Framework: **Create React App**

### Step 2 — Set Environment Variable in Vercel
Go to **Project Settings** → **Environment Variables** → Add:

| Key | Value |
|-----|-------|
| `REACT_APP_API_URL` | `https://YOUR-BACKEND.onrender.com/api/v1` |

> Replace `YOUR-BACKEND.onrender.com` with your actual Render URL from Part 1.

### Step 3 — Deploy
Click **Deploy**. Vercel builds the React app and gives you a URL like:
```
https://netwave-xxxx.vercel.app
```

---

## PART 3 — CONNECT THEM TOGETHER

### Update Render with your Vercel URL
1. Go back to **Render** → your backend service → **Environment**
2. Update `FRONTEND_URL` to your Vercel URL:
   ```
   https://netwave-xxxx.vercel.app
   ```
3. Click **Save** → Render will auto-redeploy

### Test the connection
Open your Vercel URL. The homepage should load plans from the backend.
Check the browser Console (F12) — there should be no CORS errors.

---

## PART 4 — ADMIN LOGIN

After deployment:
- URL: `https://netwave-xxxx.vercel.app/login`
- Email: `admin@netwave.ng`
- Password: `Admin@123`

> ⚠️ **Change the password immediately** after first login via Admin → Profile.

---

## PART 5 — PAYSTACK WEBHOOK

In your Paystack Dashboard → **Settings → Webhooks**, add:
```
https://YOUR-BACKEND.onrender.com/api/v1/payments/webhook/paystack
```

In your Flutterwave Dashboard → **Settings → Webhooks**, add:
```
https://YOUR-BACKEND.onrender.com/api/v1/payments/webhook/flutterwave
```

---

## TROUBLESHOOTING

### ❌ "CORS error" in browser console
- Make sure `FRONTEND_URL` in Render exactly matches your Vercel URL
- No trailing slash: ✅ `https://app.vercel.app` ❌ `https://app.vercel.app/`
- Redeploy Render after changing the env var

### ❌ Frontend shows blank / "Failed to fetch"
- Check `REACT_APP_API_URL` in Vercel env vars — must be your Render URL
- Redeploy Vercel after changing env vars

### ❌ Render service sleeps (free tier)
Render free tier sleeps after 15 minutes of inactivity. First request after sleep
takes ~30 seconds. To keep it awake, use a free uptime service:
- [UptimeRobot](https://uptimerobot.com) — ping `https://YOUR-BACKEND.onrender.com/health` every 5 minutes

### ❌ Database resets on Render free tier
Render's free tier has **ephemeral storage** — the SQLite file is wiped on each deploy.
To fix this permanently, upgrade to Render's paid plan ($7/mo) for persistent disk,
OR switch to PostgreSQL using [Neon.tech](https://neon.tech) (free PostgreSQL):
1. Create a free Neon DB → copy the connection string
2. Change `DATABASE_URL` in Render to: `postgresql://user:pass@host/dbname`
3. Change `prisma/schema.prisma` provider from `sqlite` to `postgresql`
4. Redeploy

### ❌ "Cannot find module" on Render
Make sure Build Command is exactly:
```
npm install && npx prisma generate && npx prisma migrate deploy
```

---

## RENDER FREE TIER LIMITS

| Resource | Limit |
|----------|-------|
| RAM | 512 MB |
| CPU | Shared |
| Storage | Ephemeral (resets on deploy) |
| Bandwidth | 100 GB/month |
| Sleep | After 15 min inactivity |

**Recommendation:** For a production hotspot business, upgrade to Render Starter ($7/mo)
which gives persistent disk and no sleep. Your SQLite data will survive deploys.

