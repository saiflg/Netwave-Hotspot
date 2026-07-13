/**
 * Blue Dot Networks Management System
 * Main Server — Auto-setup on every start (no shell needed)
 */

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
require('dotenv').config();

const { logger }       = require('./utils/logger');
const { connectDB }    = require('./config/database');
const { autoSetup }    = require('./utils/autoSetup');
const errorHandler     = require('./middleware/errorHandler');
const { scheduleJobs } = require('./services/scheduler');

// ── Routes ───────────────────────────────────────────────────────────────────
const authRoutes       = require('./routes/auth');
const userRoutes       = require('./routes/users');
const routerRoutes     = require('./routes/routers');
const planRoutes       = require('./routes/plans');
const voucherRoutes    = require('./routes/vouchers');
const paymentRoutes    = require('./routes/payments');
const sessionRoutes    = require('./routes/sessions');
const settingRoutes    = require('./routes/settings');
const reportRoutes     = require('./routes/reports');
const hotspotRoutes    = require('./routes/hotspot');
const ticketRoutes     = require('./routes/tickets');
const notifRoutes      = require('./routes/notifications');
const dashboardRoutes  = require('./routes/dashboard');
const legalRoutes      = require('./routes/legal');
const adRoutes         = require('./routes/advertisements');
const announcRoutes    = require('./routes/announcements');
const uploadRoutes     = require('./routes/uploads');
const activityRoutes   = require('./routes/activity');

const app = express();

// ── CORS — allow Vercel frontend + Render backend + localhost ─────────────────
const allowedOrigins = [
  // Production — set these in Render environment variables
  process.env.FRONTEND_URL,
  process.env.CAPTIVE_PORTAL_URL,
  // Vercel patterns (wildcard handled below)
  // Local dev
  'http://localhost:3000',
  'http://localhost:4000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
].filter(Boolean); // remove undefined entries

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Render health checks, curl, mobile apps)
    if (!origin) return callback(null, true);

    // Allow exact matches
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Allow any Vercel deployment (*.vercel.app)
    if (origin.endsWith('.vercel.app')) return callback(null, true);

    // Allow any Render deployment (*.onrender.com)
    if (origin.endsWith('.onrender.com')) return callback(null, true);

    // Allow any custom domain set via env
    const customDomain = process.env.ALLOWED_DOMAIN;
    if (customDomain && origin.includes(customDomain)) return callback(null, true);

    logger.warn(`CORS blocked origin: ${origin}`);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// ── Body parsing — raw body FIRST for webhooks ────────────────────────────────
app.use('/api/v1/payments/webhook/paystack',    express.raw({ type: 'application/json' }));
app.use('/api/v1/payments/webhook/flutterwave', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      200,
  message:  { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
}));

app.use('/api/v1/auth/login',    rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use('/api/v1/auth/register', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Captive portal
const fs          = require('fs');
const PORTAL_HTML = path.join(__dirname, '../../captive-portal/index.html');
const servePortal = (req, res) => {
  if (fs.existsSync(PORTAL_HTML)) res.sendFile(PORTAL_HTML);
  else res.status(404).json({ error: 'Portal HTML not found' });
};
app.get('/portal',        servePortal);
app.get('/hotspot-login', servePortal);
app.get('/hotspot',       servePortal);

// ── Health check (Render pings this to keep service alive) ────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    service:   'Blue Dot Networks Hotspot API',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()),
    env:       process.env.NODE_ENV,
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`,          authRoutes);
app.use(`${API}/users`,         userRoutes);
app.use(`${API}/routers`,       routerRoutes);
app.use(`${API}/plans`,         planRoutes);
app.use(`${API}/vouchers`,      voucherRoutes);
app.use(`${API}/payments`,      paymentRoutes);
app.use(`${API}/sessions`,      sessionRoutes);
app.use(`${API}/settings`,      settingRoutes);
app.use(`${API}/reports`,       reportRoutes);
app.use(`${API}/hotspot`,       hotspotRoutes);
app.use(`${API}/tickets`,       ticketRoutes);
app.use(`${API}/notifications`, notifRoutes);
app.use(`${API}/dashboard`,     dashboardRoutes);
app.use(`${API}/legal`,         legalRoutes);
app.use(`${API}/ads`,           adRoutes);
app.use(`${API}/announcements`, announcRoutes);
app.use(`${API}/uploads`,       uploadRoutes);
app.use(`${API}/activity`,      activityRoutes);

// ── Root info ─────────────────────────────────────────────────────────────────
app.get(`${API}`, (req, res) => {
  res.json({ success: true, message: 'Blue Dot Networks API v1', service: 'Blue Dot Networks Hotspot Management', status: 'running' });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Connect DB
    await connectDB();

    // 2. Auto-run migrations + seed (safe to run every time)
    await autoSetup();

    // 3. Start listening
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Blue Dot Networks API running on port ${PORT}`);
      logger.info(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
      logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'not set'}`);
      logger.info(`📡 Health check: http://0.0.0.0:${PORT}/health`);
    });

    // 4. Start cron jobs
    scheduleJobs();
    logger.info('⏰ Scheduler started');

  } catch (error) {
    logger.error('❌ Server failed to start:', error);
    process.exit(1);
  }
}

startServer();
module.exports = app;
