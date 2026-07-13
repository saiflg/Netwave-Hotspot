# 🌐 NetWave Hotspot Management System

**Enterprise-grade MikroTik Hotspot Billing Platform**

Built for ISPs, hotels, schools, cafés, hostels, cyber cafés and public Wi-Fi providers.

---

## 🚀 Features

### Admin Portal
- 📊 **Live Dashboard** — Revenue, sessions, customers, routers — auto-refreshes
- 📡 **Router Management** — Unlimited MikroTik routers, live connection testing
- 📋 **Internet Plans** — Unlimited plans with speed/data/validity control
- 🎟 **Voucher System** — Single & bulk generation (up to 500), QR codes, PDF/Excel export
- 👥 **Customer Management** — CRUD, suspend/activate, role assignment
- ⚡ **Sessions** — Live session monitoring, force terminate
- 💳 **Payments** — Paystack & Flutterwave, webhook-verified
- 📈 **Reports** — Revenue, customers, vouchers — PDF export
- 🎫 **Support Tickets** — Full ticket system with staff replies
- 📢 **Announcements** — Site-wide banners with types (info/warning/success/danger)
- 📜 **Legal Pages** — Edit Privacy Policy, Terms, Refund, FAQ, Contact in dashboard
- ⚙️ **Settings** — Change everything without touching code
- 🎨 **Branding** — Logo, colors, hero text, captive portal content
- 🔍 **SEO** — Meta title, description, keywords from dashboard
- 📝 **Activity Logs** — Full audit trail

### Public Site
- 🏠 **Landing Page** — Plans, how it works, footer with legal links
- 💳 **Buy Voucher** — Select plan → Pay (Paystack/Flutterwave) → Get voucher code
- 📧 **Email Delivery** — Voucher emailed automatically after payment
- 🔐 **Auth** — Login, Register, Forgot/Reset Password, Email Verification

### Captive Portal
- 🎟 Voucher code login
- 👤 Username/password login
- 📱 QR Code auto-login
- 💳 Inline plan purchase
- ⏱ Live session countdown
- 📶 Data usage display
- 🔌 MikroTik auto-provision on login

### MikroTik Integration
- `node-routeros` API connection
- Auto user provisioning on payment
- Profile-based speed limiting
- Active user monitoring
- Router ping health checks

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| ORM | Prisma (SQLite dev / PostgreSQL prod) |
| Frontend | React 18 + React Router v6 |
| State | React Query |
| Charts | Recharts |
| Auth | JWT + bcrypt |
| Payments | Paystack + Flutterwave |
| Router | MikroTik RouterOS API (`routeros-client`) |
| Email | Nodemailer (SMTP) |
| PDF | PDFKit |
| Excel | ExcelJS |
| QR | `qrcode` + `react-qr-code` |
| Scheduler | `node-cron` |
| Logging | Winston |

---

## 📦 Project Structure

```
netwave-hotspot/
├── backend/
│   ├── prisma/schema.prisma       # Database schema
│   ├── src/
│   │   ├── server.js              # Express entry point
│   │   ├── config/database.js     # Prisma client
│   │   ├── controllers/           # Business logic
│   │   │   ├── auth.js
│   │   │   ├── vouchers.js
│   │   │   ├── payments.js
│   │   │   ├── routers.js
│   │   │   ├── hotspot.js
│   │   │   └── dashboard.js
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT + role guards
│   │   │   └── errorHandler.js
│   │   ├── routes/                # All API routes
│   │   ├── services/
│   │   │   ├── email.js           # Email templates
│   │   │   ├── scheduler.js       # Cron jobs
│   │   │   └── export.js          # PDF + Excel
│   │   └── utils/
│   │       ├── logger.js
│   │       └── seed.js
│   └── .env.example
├── frontend/
│   ├── public/index.html
│   └── src/
│       ├── App.js                 # Routes
│       ├── context/AuthContext.js
│       ├── utils/api.js           # All API calls
│       └── pages/
│           ├── admin/             # Dashboard, Vouchers, Settings, etc.
│           ├── auth/              # Login, Register, Forgot/Reset
│           ├── public/            # Homepage, Buy, Legal
│           └── customer/          # Customer portal
└── captive-portal/
    └── index.html                 # Standalone MikroTik captive portal
```

---

## ⚙️ Setup

### 1. Clone & Install

```bash
git clone https://github.com/your-username/netwave-hotspot
cd netwave-hotspot
npm run install:all
```

### 2. Backend Configuration

```bash
cd backend
cp .env.example .env
# Edit .env with your values
```

Key `.env` settings:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET=your_32_char_secret_here
PAYSTACK_SECRET_KEY=sk_live_xxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_xxxx
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
FRONTEND_URL=https://your-domain.com
```

### 3. Database Setup

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
node src/utils/seed.js
```

### 4. Start Development

```bash
# From root
npm run dev

# Backend: http://localhost:5000
# Frontend: http://localhost:3000
```

### 5. Admin Login
- URL: `http://localhost:3000/login`
- Email: `admin@netwave.ng`
- Password: `Admin@123`

---

## 🌐 MikroTik Router Setup

### Enable API on Router
```
/ip service enable api
/ip service set api port=8728
```

### Captive Portal Configuration
1. Upload `captive-portal/index.html` to your router or hosting
2. In RouterOS: `/ip hotspot` → Set login page URL to your captive portal
3. Add your server IP to walled garden (no authentication needed):
```
/ip hotspot walled-garden ip add dst-address=YOUR_SERVER_IP
```

### Router API in Admin
Add router in **Admin → Routers** with:
- IP Address of your MikroTik
- API Port: `8728`
- Username: `admin`
- Password: your router password

---

## 💳 Payment Setup

### Paystack
1. Create account at [paystack.com](https://paystack.com)
2. Go to **Settings → API Keys**
3. Copy Public Key and Secret Key to Admin → Settings → Payment
4. Set webhook URL: `https://your-domain.com/api/v1/payments/webhook/paystack`

### Flutterwave
1. Create account at [flutterwave.com](https://flutterwave.com)
2. Go to **Settings → API → Webhooks**
3. Add webhook URL: `https://your-domain.com/api/v1/payments/webhook/flutterwave`

---

## 🚀 Production Deployment (Wafer / Railway / Render)

### Backend
```bash
cd backend
npm install --production
npx prisma generate
npx prisma migrate deploy
npm start
```

### Frontend Build
```bash
cd frontend
REACT_APP_API_URL=https://your-api.com/api/v1 npm run build
# Serve the /build folder as static site
```

### Environment Variables (Production)
```
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host/dbname
FRONTEND_URL=https://your-frontend.com
APP_URL=https://your-api.com
```

---

## 🔐 Security Features

- ✅ Password hashing with bcrypt (12 rounds)
- ✅ JWT authentication with expiry
- ✅ Rate limiting on auth endpoints (20 req/15min)
- ✅ Helmet.js security headers
- ✅ CORS with whitelist
- ✅ Webhook signature verification (Paystack + Flutterwave)
- ✅ Role-based access control (SUPER_ADMIN, ADMIN, MANAGER, CASHIER, SUPPORT, CUSTOMER)
- ✅ Activity audit logs
- ✅ SQL injection protection via Prisma parameterized queries
- ✅ Raw body preserved for webhook verification

---

## 📧 Support

For support, open a ticket in the Admin Portal or email the configured support address.

---

**Built with ❤️ for Nigeria's digital future.**
