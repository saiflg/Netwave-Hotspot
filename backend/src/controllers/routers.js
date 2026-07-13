/**
 * Router Controller — Blue Dot Networks
 * Uses MikroTikService from services/mikrotik.js
 * All DB + API logic here; transport abstraction in mikrotik.js
 */

const { prisma }           = require('../config/database');
const { MikroTikService }  = require('../services/mikrotik');
const { logger }           = require('../utils/logger');

// ─── GET ALL ROUTERS ──────────────────────────────────────────────────────────
exports.getRouters = async (req, res, next) => {
  try {
    const routers = await prisma.router.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { routers } });
  } catch (err) { next(err); }
};

// ─── GET SINGLE ROUTER ────────────────────────────────────────────────────────
exports.getRouter = async (req, res, next) => {
  try {
    const router = await prisma.router.findUnique({ where: { id: req.params.id } });
    if (!router) return res.status(404).json({ success: false, message: 'Router not found.' });
    res.json({ success: true, data: { router } });
  } catch (err) { next(err); }
};

// ─── TEST CONNECTION (before saving) ─────────────────────────────────────────
exports.testConnectionRaw = async (req, res, next) => {
  try {
    const { ipAddress, apiPort, username, password, useSSL, connectionType, vpnEndpoint } = req.body;

    if (!ipAddress || !username || !password) {
      return res.status(400).json({ success: false, message: 'ipAddress, username and password are required.' });
    }

    const tempRouter = {
      id:             'test',
      name:           'Test',
      ipAddress,
      apiPort:        parseInt(apiPort) || 8728,
      username,
      password,
      useSSL:         !!useSSL,
      connectionType: connectionType || 'PUBLIC_IP',
      vpnEndpoint:    vpnEndpoint || null,
    };

    const svc    = new MikroTikService(tempRouter);
    const result = await svc.testConnection();

    res.json({
      success: result.success,
      status:  result.status,
      message: result.message,
      data:    result,
    });
  } catch (err) { next(err); }
};

// ─── TEST CONNECTION (saved router) ──────────────────────────────────────────
exports.testConnection = async (req, res, next) => {
  try {
    const router = await prisma.router.findUnique({ where: { id: req.params.id } });
    if (!router) return res.status(404).json({ success: false, message: 'Router not found.' });

    const svc    = new MikroTikService(router);
    const result = await svc.testConnection();

    // Update router status in DB
    await prisma.router.update({
      where: { id: router.id },
      data: {
        isOnline:        result.success,
        lastSeen:        result.success ? new Date() : router.lastSeen,
        identity:        result.identity        || router.identity,
        routerOSVersion: result.version         || router.routerOSVersion,
        cpuLoad:         result.cpuLoad         ?? router.cpuLoad,
        uptime:          result.uptime          || router.uptime,
        hotspotRunning:  result.hotspotPackage  ?? router.hotspotRunning,
      },
    });

    res.json({ success: result.success, status: result.status, message: result.message, data: result });
  } catch (err) { next(err); }
};

// ─── CREATE ROUTER (only after successful test) ───────────────────────────────
exports.createRouter = async (req, res, next) => {
  try {
    const {
      name, ipAddress, apiPort, username, password, useSSL,
      location, description, connectionType, vpnEndpoint,
    } = req.body;

    if (!name || !ipAddress || !username || !password) {
      return res.status(400).json({ success: false, message: 'name, ipAddress, username and password are required.' });
    }

    // Test connection before saving
    const tempRouter = {
      id: 'new', name, ipAddress,
      apiPort:        parseInt(apiPort) || 8728,
      username, password,
      useSSL:         !!useSSL,
      connectionType: connectionType || 'PUBLIC_IP',
      vpnEndpoint:    vpnEndpoint || null,
    };

    const svc    = new MikroTikService(tempRouter);
    const test   = await svc.testConnection();

    if (!test.success) {
      return res.status(400).json({
        success: false,
        message: `Cannot save router — connection failed: ${test.message}`,
        status:  test.status,
      });
    }

    const router = await prisma.router.create({
      data: {
        name, ipAddress,
        apiPort:         parseInt(apiPort) || 8728,
        username, password,
        useSSL:          !!useSSL,
        location,
        description,
        connectionType:  connectionType || 'PUBLIC_IP',
        vpnEndpoint:     vpnEndpoint || null,
        isOnline:        true,
        lastSeen:        new Date(),
        identity:        test.identity,
        routerOSVersion: test.version,
        cpuLoad:         test.cpuLoad,
        uptime:          test.uptime,
        hotspotRunning:  test.hotspotPackage,
      },
    });

    logger.info(`[Router] Added: ${router.name} (${router.ipAddress}) — ${test.identity} RouterOS ${test.version}`);

    await prisma.activityLog.create({
      data: { userId: req.user?.id, action: 'ROUTER_ADDED', entity: 'Router', entityId: router.id, ipAddress: req.ip, details: JSON.stringify({ name, ipAddress }) },
    }).catch(() => {});

    // ── Auto-configure hotspot portal redirect ────────────────────────────
    // Tell MikroTik to use our custom captive portal instead of the built-in page
    let portalConfigured = false;
    let portalMessage    = '';
    try {
      const portalUrl = `${process.env.APP_URL || 'http://localhost:5000'}/portal`;
      const svcNew    = new MikroTikService(router);
      const cfgResult = await svcNew.configureHotspotServer(portalUrl);
      portalConfigured = cfgResult.success;
      portalMessage    = cfgResult.message;
      if (cfgResult.success) {
        logger.info(`[Router] Portal configured: ${router.name} → ${portalUrl}`);
        await prisma.activityLog.create({
          data: { userId: req.user?.id, action: 'ROUTER_PORTAL_CONFIGURED', entity: 'Router', entityId: router.id, details: JSON.stringify({ portalUrl }) },
        }).catch(() => {});
      } else {
        logger.warn(`[Router] Portal config failed for ${router.name}: ${portalMessage}`);
      }
    } catch (e) {
      logger.warn(`[Router] Portal config error: ${e.message}`);
      portalMessage = e.message;
    }

    res.status(201).json({
      success: true,
      message: `Router "${name}" added successfully.${portalConfigured ? ' Hotspot portal configured.' : ''}`,
      data:    { router, portalConfigured, portalMessage },
    });
  } catch (err) { next(err); }
};

// ─── UPDATE ROUTER ────────────────────────────────────────────────────────────
exports.updateRouter = async (req, res, next) => {
  try {
    const { name, ipAddress, apiPort, username, password, useSSL, location, description, connectionType, vpnEndpoint } = req.body;
    const router = await prisma.router.update({
      where: { id: req.params.id },
      data: {
        ...(name           && { name }),
        ...(ipAddress      && { ipAddress }),
        ...(apiPort        && { apiPort: parseInt(apiPort) }),
        ...(username       && { username }),
        ...(password       && { password }),
        ...(useSSL !== undefined && { useSSL: !!useSSL }),
        ...(location       && { location }),
        ...(description    && { description }),
        ...(connectionType && { connectionType }),
        ...(vpnEndpoint    && { vpnEndpoint }),
      },
    });
    res.json({ success: true, message: 'Router updated.', data: { router } });
  } catch (err) { next(err); }
};

// ─── DELETE ROUTER ────────────────────────────────────────────────────────────
exports.deleteRouter = async (req, res, next) => {
  try {
    await prisma.router.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Router deleted.' });
  } catch (err) { next(err); }
};

// ─── HEARTBEAT (called by frontend every 30s + scheduler) ────────────────────
exports.heartbeat = async (req, res, next) => {
  try {
    const router = await prisma.router.findUnique({ where: { id: req.params.id } });
    if (!router) return res.status(404).json({ success: false, message: 'Router not found.' });

    const svc    = new MikroTikService(router);
    const health = await svc.heartbeat();

    const updateData = health.success
      ? {
          isOnline:        true,
          lastSeen:        new Date(),
          identity:        health.identity        || router.identity,
          routerOSVersion: health.routerOSVersion || router.routerOSVersion,
          cpuLoad:         health.cpuLoad         ?? router.cpuLoad,
          memoryUsage:     health.memoryUsage     ?? router.memoryUsage,
          totalMemory:     health.totalMemory     ?? router.totalMemory,
          uptime:          health.uptime          || router.uptime,
          hotspotRunning:  health.hotspotRunning  ?? router.hotspotRunning,
          wanActive:       health.wanActive       ?? router.wanActive,
          activeUsers:     health.activeUsers     ?? router.activeUsers,
        }
      : { isOnline: false };

    const updated = await prisma.router.update({ where: { id: router.id }, data: updateData });
    res.json({ success: true, data: { router: updated, health } });
  } catch (err) { next(err); }
};

// ─── ISP AVAILABILITY CHECK (called before payment init) ─────────────────────
exports.checkISP = async (req, res, next) => {
  try {
    // Check the first active, online router (or specific routerId)
    const routerId = req.query.routerId;
    const where    = routerId
      ? { id: routerId, isActive: true }
      : { isActive: true, isOnline: true };

    const router = await prisma.router.findFirst({ where, orderBy: { lastSeen: 'desc' } });

    if (!router) {
      return res.json({
        available: false,
        message:   'No routers are currently online. Please contact support.',
        code:      'NO_ROUTER',
      });
    }

    const svc    = new MikroTikService(router);
    const result = await svc.checkISPAvailability();

    // Update router ISP status
    await prisma.router.update({
      where: { id: router.id },
      data: {
        wanActive:     result.wanActive,
        hotspotRunning: result.hotspotRunning,
        internetActive: result.internetActive,
        isOnline:      result.available || result.wanActive,
        lastSeen:      new Date(),
      },
    }).catch(() => {});

    res.json({ available: result.available, message: result.message, data: result });
  } catch (err) { next(err); }
};

// ─── ONLINE USERS ─────────────────────────────────────────────────────────────
exports.getOnlineUsers = async (req, res, next) => {
  try {
    const router = await prisma.router.findUnique({ where: { id: req.params.id } });
    if (!router) return res.status(404).json({ success: false, message: 'Router not found.' });
    const svc   = new MikroTikService(router);
    const users = await svc.getActiveUsers();
    res.json({ success: true, data: { users, count: users.length } });
  } catch (err) { next(err); }
};

// ─── ROUTER STATS ─────────────────────────────────────────────────────────────
exports.getRouterStats = async (req, res, next) => {
  try {
    const router = await prisma.router.findUnique({ where: { id: req.params.id } });
    if (!router) return res.status(404).json({ success: false, message: 'Router not found.' });
    const svc  = new MikroTikService(router);
    const info = await svc.getResourceInfo();
    res.json({ success: true, data: { info } });
  } catch (err) { next(err); }
};

// ─── PROFILES ─────────────────────────────────────────────────────────────────
exports.getProfiles = async (req, res, next) => {
  try {
    const router = await prisma.router.findUnique({ where: { id: req.params.id } });
    if (!router) return res.status(404).json({ success: false, message: 'Router not found.' });
    const svc      = new MikroTikService(router);
    const profiles = await svc.getProfiles();
    res.json({ success: true, data: { profiles } });
  } catch (err) { next(err); }
};

// ─── REBOOT ───────────────────────────────────────────────────────────────────
exports.rebootRouter = async (req, res, next) => {
  try {
    const router = await prisma.router.findUnique({ where: { id: req.params.id } });
    if (!router) return res.status(404).json({ success: false, message: 'Router not found.' });
    const svc    = new MikroTikService(router);
    const result = await svc.reboot();
    await prisma.activityLog.create({
      data: { userId: req.user?.id, action: 'ROUTER_REBOOT', entity: 'Router', entityId: router.id, ipAddress: req.ip },
    }).catch(() => {});
    res.json({ success: result.success, message: result.message || result.error });
  } catch (err) { next(err); }
};

// ─── BACKUP ───────────────────────────────────────────────────────────────────
exports.backupRouter = async (req, res, next) => {
  try {
    const router = await prisma.router.findUnique({ where: { id: req.params.id } });
    if (!router) return res.status(404).json({ success: false, message: 'Router not found.' });
    const svc    = new MikroTikService(router);
    const result = await svc.backup();
    await prisma.activityLog.create({
      data: { userId: req.user?.id, action: 'ROUTER_BACKUP', entity: 'Router', entityId: router.id, ipAddress: req.ip },
    }).catch(() => {});
    res.json({ success: result.success, message: result.message || result.error, data: result });
  } catch (err) { next(err); }
};

// ─── DISCONNECT USER ──────────────────────────────────────────────────────────
// ─── CONFIGURE PORTAL (manual — if auto-config failed on router add) ─────────
exports.configurePortal = async (req, res, next) => {
  try {
    const router = await prisma.router.findUnique({ where: { id: req.params.id } });
    if (!router) return res.status(404).json({ success: false, message: 'Router not found.' });

    const portalUrl = process.env.APP_URL
      ? `${process.env.APP_URL}/portal`
      : `http://${router.ipAddress}/portal`;

    const svc    = new MikroTikService(router);
    const result = await svc.configureHotspotServer(portalUrl);

    if (result.success) {
      await prisma.activityLog.create({
        data: { userId: req.user?.id, action: 'ROUTER_PORTAL_CONFIGURED', entity: 'Router', entityId: router.id, ipAddress: req.ip, details: JSON.stringify({ portalUrl }) },
      }).catch(() => {});
    }

    res.json({
      success: result.success,
      message: result.message,
      data:    { portalUrl, results: result.results },
    });
  } catch (err) { next(err); }
};

// ─── GET WALLED GARDEN ────────────────────────────────────────────────────────
exports.getWalledGarden = async (req, res, next) => {
  try {
    const router = await prisma.router.findUnique({ where: { id: req.params.id } });
    if (!router) return res.status(404).json({ success: false, message: 'Router not found.' });
    const svc     = new MikroTikService(router);
    const entries = await svc.getWalledGarden();
    res.json({ success: true, data: { entries } });
  } catch (err) { next(err); }
};

exports.disconnectUser = async (req, res, next) => {
  try {
    const router = await prisma.router.findUnique({ where: { id: req.params.id } });
    if (!router) return res.status(404).json({ success: false, message: 'Router not found.' });
    const { macOrUsername } = req.body;
    if (!macOrUsername) return res.status(400).json({ success: false, message: 'macOrUsername required.' });
    const svc    = new MikroTikService(router);
    const result = await svc.disconnectUser(macOrUsername);
    res.json({ success: result.success, message: `Disconnected ${result.disconnected || 0} session(s).` });
  } catch (err) { next(err); }
};

// Keep backward compat — used in hotspot.js
exports.MikroTikService = MikroTikService;
