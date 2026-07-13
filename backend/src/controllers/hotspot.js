/**
 * Hotspot Controller — Fixed
 * Fix 1: Voucher can only be used ONCE — ACTIVE status blocks reuse
 * Fix 2: Correct session tracking per voucher
 */

const { prisma }         = require('../config/database');
const { MikroTikService } = require('./routers');
const { logger }          = require('../utils/logger');

// ─── HOTSPOT LOGIN ─────────────────────────────────────────────────────────
exports.hotspotLogin = async (req, res, next) => {
  try {
    const { code, username, password, mac, ip, routerId } = req.body;
    let voucher = null;

    if (code) {
      voucher = await prisma.voucher.findUnique({
        where:   { code: code.toUpperCase().trim() },
        include: { plan: true, router: true },
      });

      if (!voucher)
        return res.status(404).json({ success: false, message: 'Invalid voucher code. Please check and try again.' });

      if (voucher.status === 'SUSPENDED')
        return res.status(400).json({ success: false, message: 'This voucher has been suspended. Contact support.' });

      // ── ALREADY EXPIRED ───────────────────────────────────────────────
      if (voucher.status === 'EXPIRED')
        return res.status(400).json({ success: false, message: 'This voucher has already expired. Please purchase a new one.' });

      // ── ALREADY ACTIVE — check if it has timed out ────────────────────
      if (voucher.status === 'ACTIVE') {
        if (voucher.expiresAt && new Date() > new Date(voucher.expiresAt)) {
          // Time is up — mark expired and reject
          await prisma.voucher.update({ where: { id: voucher.id }, data: { status: 'EXPIRED' } });
          return res.status(400).json({ success: false, message: 'This voucher has expired. Please purchase a new one.' });
        }
        // ── CRITICAL: Voucher already ACTIVE = already in use. BLOCK reuse ──
        return res.status(400).json({
          success: false,
          message: 'This voucher has already been used and is still active. Each voucher can only be used once.',
        });
      }

      // ── ACTIVATE on first use (UNUSED → ACTIVE) ───────────────────────
      if (voucher.status === 'UNUSED') {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (voucher.plan?.validity || 1));

        voucher = await prisma.voucher.update({
          where:   { id: voucher.id },
          data:    { status: 'ACTIVE', activatedAt: new Date(), expiresAt },
          include: { plan: true, router: true },
        });

        logger.info(`Voucher activated: ${voucher.code} → expires ${expiresAt.toISOString()}`);
      }

    } else if (username && password) {
      const bcrypt = require('bcryptjs');
      const user   = await prisma.user.findFirst({
        where:   { OR: [{ username }, { email: username }] },
        include: { plan: true },
      });
      if (!user || !(await bcrypt.compare(password, user.password)))
        return res.status(401).json({ success: false, message: 'Invalid username or password.' });
      if (!user.isActive)
        return res.status(401).json({ success: false, message: 'Account suspended. Contact support.' });
    } else {
      return res.status(400).json({ success: false, message: 'Please provide a voucher code or login credentials.' });
    }

    // ── Create session record ─────────────────────────────────────────────
    const session = await prisma.hotspotSession.create({
      data: {
        voucherId: voucher?.id   || null,
        routerId:  voucher?.routerId || routerId || null,
        macAddress: mac  || null,
        ipAddress:  ip   || req.ip,
        isActive:   true,
      },
    });

    // ── MikroTik provisioning ─────────────────────────────────────────────
    const targetRouterId = voucher?.routerId || routerId;
    if (targetRouterId) {
      try {
        const router = await prisma.router.findUnique({ where: { id: targetRouterId } });
        if (router) {
          const mk = new MikroTikService(router);
          await mk.addHotspotUser({
            username:        voucher ? voucher.code : username,
            password:        voucher ? voucher.code : username,
            profile:         `plan_${voucher?.plan?.id?.slice(0, 8) || 'default'}`,
            limitUptime:     voucher?.plan ? `${voucher.plan.validity}h` : undefined,
            limitBytesTotal: voucher?.plan?.dataLimit,
            macAddress:      mac,
          });
        }
      } catch (e) { logger.warn('MikroTik provisioning error:', e.message); }
    }

    res.json({
      success: true,
      message: 'Login successful! You are now connected.',
      data: {
        sessionId: session.id,
        voucher: voucher ? {
          code:      voucher.code,
          status:    voucher.status,
          expiresAt: voucher.expiresAt,
          plan:      voucher.plan,
        } : null,
      },
    });
  } catch (error) { next(error); }
};

// ─── QR CODE AUTO LOGIN ───────────────────────────────────────────────────
exports.qrLogin = async (req, res, next) => {
  try {
    const { token }    = req.params;
    const { mac, ip }  = req.body;

    const voucher = await prisma.voucher.findUnique({
      where:   { qrToken: token },
      include: { plan: true, router: true },
    });

    if (!voucher)
      return res.status(404).json({ success: false, message: 'Invalid or expired QR code.' });

    // Re-use main login logic
    req.body.code = voucher.code;
    req.body.mac  = mac;
    req.body.ip   = ip;
    return exports.hotspotLogin(req, res, next);
  } catch (error) { next(error); }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────
exports.hotspotLogout = async (req, res, next) => {
  try {
    const { sessionId, mac } = req.body;
    const session = await prisma.hotspotSession.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    const logoutAt = new Date();
    const duration = Math.floor((logoutAt - session.loginAt) / 1000);
    await prisma.hotspotSession.update({ where: { id: sessionId }, data: { isActive: false, logoutAt, duration } });

    if (session.routerId && mac) {
      try {
        const router = await prisma.router.findUnique({ where: { id: session.routerId } });
        if (router) { const mk = new MikroTikService(router); await mk.disconnectUser(mac); }
      } catch (e) { logger.warn('MikroTik disconnect error:', e.message); }
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) { next(error); }
};

// ─── SESSION STATUS ───────────────────────────────────────────────────────
exports.sessionStatus = async (req, res, next) => {
  try {
    const session = await prisma.hotspotSession.findUnique({
      where:   { id: req.params.sessionId },
      include: { voucher: { include: { plan: true } } },
    });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    const remaining   = session.voucher?.expiresAt ? Math.max(0, new Date(session.voucher.expiresAt) - new Date()) : null;
    const dataUsed    = session.dataDownload + session.dataUpload;
    const dataRemain  = session.voucher?.plan?.dataLimit
      ? Math.max(0, session.voucher.plan.dataLimit - dataUsed) : null;

    res.json({
      success: true,
      data: {
        session:   { ...session, duration: session.logoutAt ? session.duration : Math.floor((new Date() - session.loginAt) / 1000) },
        remaining: { timeMs: remaining, dataRemainingMB: dataRemain },
        plan:      session.voucher?.plan,
      },
    });
  } catch (error) { next(error); }
};

// ─── CAPTIVE PORTAL CONFIG (public) ──────────────────────────────────────
exports.getPortalConfig = async (req, res, next) => {
  try {
    const settings      = await prisma.setting.findMany({ where: { group: { in: ['general', 'branding', 'captive'] } } });
    const config        = settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
    const plans         = await prisma.internetPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    const ads           = await prisma.advertisement.findMany({ where: { isActive: true } });
    const announcements = await prisma.announcement.findMany({ where: { isActive: true }, take: 3 });
    res.json({ success: true, data: { config, plans, ads, announcements } });
  } catch (error) { next(error); }
};

// ─── ACTIVE SESSIONS LIST ────────────────────────────────────────────────
exports.getActiveSessions = async (req, res, next) => {
  try {
    const { routerId, page = 1, limit = 20 } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const where = { isActive: true };
    if (routerId) where.routerId = routerId;

    const [sessions, total] = await Promise.all([
      prisma.hotspotSession.findMany({ where, skip, take: parseInt(limit), include: { voucher: { include: { plan: true } } }, orderBy: { loginAt: 'desc' } }),
      prisma.hotspotSession.count({ where }),
    ]);
    res.json({ success: true, data: { sessions, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } } });
  } catch (error) { next(error); }
};
