# 🐘 Switch from SQLite to PostgreSQL (Neon.tech)

Neon.tech gives you a FREE PostgreSQL database — no expiry, 0.5GB storage.
This is the recommended database for production because SQLite on Render
free tier resets on every deployment.

---

## STEP 1 — Create free Neon database

1. Go to **https://neon.tech** → Sign up (free)
2. Click **New Project**
3. Name it: `netwave-hotspot`
4. Region: choose closest to your Render region
5. Click **Create Project**
6. Copy the **Connection String** — looks like:
   ```
   postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

## STEP 2 — Update Prisma schema

Open `backend/prisma/schema.prisma` and change the datasource:

```prisma
datasource db {
  provider = env("DB_PROVIDER")
  url      = env("DATABASE_URL")
}
```

This is already done in the latest code. ✅

---

## STEP 3 — Update Render Environment Variables

In your Render backend service → **Environment** tab, add/update:

| Key           | Value                                                                 |
|---------------|-----------------------------------------------------------------------|
| `DATABASE_URL`| `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `DB_PROVIDER` | `postgresql`                                                         |

For local development keep your `.env`:
```
DATABASE_URL="file:./prisma/dev.db"
DB_PROVIDER="sqlite"
```

---

## STEP 4 — Update Build Command on Render

Change your Render **Build Command** to:
```
npm install && npx prisma generate && npx prisma migrate deploy
```

This is already what you should have. ✅

---

## STEP 5 — Deploy

Push your code to GitHub. Render will:
1. Install dependencies
2. Generate Prisma client for PostgreSQL
3. Run `migrate deploy` → creates all tables on Neon
4. Start the server → `autoSetup()` seeds the database

Watch the Render logs — you should see:
```
✅ Migrations applied
✅ Super Admin created
✅ Default plans created
🚀 NetWave API running on port 10000
```

---

## STEP 6 — Verify on Neon

Go back to **neon.tech** → your project → **Tables** tab.
You should see all your tables: User, Voucher, Payment, etc.

---

## ⚠️ Important Notes

- Neon free tier **pauses** your database after 5 minutes of inactivity.
  The first query after a pause takes ~1–2 seconds (cold start).
  This is normal and fine for a hotspot system.

- Your data is **persistent** — it does NOT reset on Render deploys.

- Neon gives you a **connection pooling** URL too (for high traffic):
  Use the **Pooled connection** string instead for production.
  It looks like: `postgresql://...@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`

---

## Troubleshooting

### ❌ "SSL connection required"
Add `?sslmode=require` at the end of your DATABASE_URL. ✅ Already in Neon's default string.

### ❌ "relation does not exist"
Migrations haven't run yet. Check your Render build command includes `npx prisma migrate deploy`.

### ❌ "Can't reach database server"
Neon may have paused. Send any request to wake it up — it auto-resumes in ~1s.

### ❌ "Environment variable not found: DB_PROVIDER"
Add `DB_PROVIDER=postgresql` to your Render environment variables.

