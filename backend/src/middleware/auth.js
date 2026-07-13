const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { logger } = require('../utils/logger');

// ─── Resolve token from request (header, cookie, or query param) ─────────────
const extractToken = (req) => {
  // 1. Authorization header (standard)
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  // 2. Cookie (optional)
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  // 3. Query param — needed for file downloads (PDF/Excel) opened via window.open or <a href>
  //    e.g. GET /api/v1/vouchers/export/pdf?token=xxx
  if (req.query?.token) {
    return req.query.token;
  }
  return null;
};

// ─── Verify JWT ───────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true, email: true, username: true,
        firstName: true, lastName: true,
        role: true, isActive: true, isVerified: true,
        avatar: true, phone: true,
      },
    });

    if (!user)           return res.status(401).json({ success: false, message: 'User no longer exists.' });
    if (!user.isActive)  return res.status(401).json({ success: false, message: 'Account suspended. Contact support.' });

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
  }
};

// ─── Role-Based Access ────────────────────────────────────────────────────────
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}`,
    });
  }
  next();
};

const adminOnly     = authorize('SUPER_ADMIN', 'ADMIN');
const staffOnly     = authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SUPPORT');
const superAdminOnly = authorize('SUPER_ADMIN');

// ─── Optional Auth ────────────────────────────────────────────────────────────
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (user && user.isActive) req.user = user;
    }
  } catch (e) { /* ignore */ }
  next();
};

// ─── Activity Logger ──────────────────────────────────────────────────────────
const logActivity = (action, entity) => async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode < 400) {
      try {
        await prisma.activityLog.create({
          data: {
            userId:    req.user?.id,
            action,
            entity,
            entityId:  req.params?.id,
            details:   JSON.stringify({ method: req.method }),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });
      } catch (e) { logger.error('Activity log error:', e); }
    }
  });
  next();
};

module.exports = { protect, authorize, adminOnly, staffOnly, superAdminOnly, optionalAuth, logActivity };
