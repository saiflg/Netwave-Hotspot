/**
 * Blue Dot Networks — Scheduler
 *
 * Reconnection state machine (runs inside existing 30s heartbeat):
 *
 *   ONLINE  → heartbeat fails  → mark OFFLINE, log disconnect, set offlineSince
 *   OFFLINE → heartbeat fails  → increment reconnectAttempts, log retry
 *   OFFLINE → heartbeat passes → mark ONLINE, log reconnect, clear counters
 *
 * No manual intervention required. Runs entirely in the background.
 */

const cron = require('node-cron');
const { prisma }          = require('../config/database');
const emailSvc            = require('./email');
const { MikroTikService } = require('./mikrotik');
const { logger }          = require('../utils/logger');

// ─── Log a router connection event to ActivityLog ────────────────────────────
async function logRouterEvent(routerId, action, details) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        entity:   'Router',
        entityId: routerId,
        details:  JSON.stringify(details),
      },
    });
  } catch (e) {
    logger.error('[Reconnect] Failed to write activity log:', e.message);
  }
}

// ─── Process one router — returns updated DB record ──────────────────────────
async function processRouter(router) {
  const svc    = new MikroTikService(router);
  const health = await svc.heartbeat();

  if (health.success) {
    // ── SUCCESSFUL CONNECTION ──────────────────────────────────────────────
    const wasOffline = !router.isOnline;

    const updated = await prisma.router.update({
      where: { id: router.id },
      data: {
        isOnline:             true,
        lastSeen:             new Date(),
        // Clear reconnection state
        offlineSince:         null,
        reconnectAttempts:    0,
        lastDisconnectReason: null,
        // Update health fields
        identity:             health.identity        || router.identity,
        routerOSVersion:      health.routerOSVersion || router.routerOSVersion,
        cpuLoad:              health.cpuLoad         ?? router.cpuLoad,
        memoryUsage:          health.memoryUsage     ?? router.memoryUsage,
        totalMemory:          health.totalMemory     ?? router.totalMemory,
        uptime:               health.uptime          || router.uptime,
        hotspotRunning:       health.hotspotRunning  ?? router.hotspotRunning,
        wanActive:            health.wanActive       ?? router.wanActive,
        activeUsers:          health.activeUsers     ?? router.activeUsers,
      },
    });

    // Log reconnection event if router was previously offline
    if (wasOffline) {
      const downTime = router.offlineSince
        ? Math.round((Date.now() - new Date(router.offlineSince)) / 1000)
        : null;

      const msg = downTime
        ? `Router "${router.name}" reconnected after ${downTime}s offline (${router.reconnectAttempts} retries)`
        : `Router "${router.name}" reconnected`;

      logger.info(`[Reconnect] ✅ ${msg}`);

      await logRouterEvent(router.id, 'ROUTER_RECONNECTED', {
        routerName:        router.name,
        ipAddress:         router.ipAddress,
        downtimeSeconds:   downTime,
        reconnectAttempts: router.reconnectAttempts,
        disconnectReason:  router.lastDisconnectReason,
        reconnectedAt:     new Date().toISOString(),
        identity:          health.identity,
        routerOSVersion:   health.routerOSVersion,
      });
    }

    return updated;

  } else {
    // ── FAILED CONNECTION ──────────────────────────────────────────────────
    const wasOnline  = router.isOnline;
    const newAttempts = (router.reconnectAttempts || 0) + 1;
    const now         = new Date();

    const updated = await prisma.router.update({
      where: { id: router.id },
      data: {
        isOnline:             false,
        reconnectAttempts:    newAttempts,
        lastDisconnectReason: health.message || health.status || 'Unknown',
        // Set offlineSince only on the first failure
        offlineSince: router.offlineSince || (wasOnline ? now : router.offlineSince),
      },
    });

    if (wasOnline) {
      // First failure — router just went offline
      logger.warn(`[Reconnect] ❌ Router OFFLINE: "${router.name}" (${router.ipAddress}) — ${health.message}`);

      await logRouterEvent(router.id, 'ROUTER_DISCONNECTED', {
        routerName:   router.name,
        ipAddress:    router.ipAddress,
        reason:       health.message || health.status,
        errorCode:    health.status,
        disconnectedAt: now.toISOString(),
      });

    } else {
      // Subsequent failure — still offline, log retry every 5 attempts to avoid log spam
      if (newAttempts % 5 === 0 || newAttempts <= 3) {
        logger.warn(`[Reconnect] 🔄 Retry #${newAttempts} for "${router.name}" — ${health.message}`);

        await logRouterEvent(router.id, 'ROUTER_RECONNECT_RETRY', {
          routerName:    router.name,
          ipAddress:     router.ipAddress,
          attempt:       newAttempts,
          reason:        health.message,
          offlineSince:  router.offlineSince?.toISOString(),
          nextRetryIn:   '30 seconds',
        });
      } else {
        // Silent log (not written to DB) to avoid flooding ActivityLog
        logger.debug(`[Reconnect] Retry #${newAttempts} for "${router.name}" — still offline`);
      }
    }

    return updated;
  }
}

// ─── EXPORTED: start all scheduled jobs ─────────────────────────────────────
exports.scheduleJobs = () => {

  // ── Every 30 seconds: heartbeat + reconnection state machine ────────────
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const routers = await prisma.router.findMany({ where: { isActive: true } });
      if (routers.length === 0) return;

      // Run all routers in parallel, never let one failure affect others
      await Promise.allSettled(
        routers.map(router =>
          processRouter(router).catch(err => {
            logger.error(`[Heartbeat] Unexpected error for "${router.name}":`, err.message);
            // Mark offline on unexpected crash — don't lose track
            return prisma.router.update({
              where: { id: router.id },
              data:  {
                isOnline:             false,
                reconnectAttempts:    (router.reconnectAttempts || 0) + 1,
                lastDisconnectReason: `Internal error: ${err.message}`,
                offlineSince:         router.offlineSince || new Date(),
              },
            }).catch(() => {});
          })
        )
      );
    } catch (e) {
      logger.error('[Heartbeat] Scheduler tick error:', e.message);
    }
  });

  // ── Every 5 minutes: expire vouchers ────────────────────────────────────
  cron.schedule('*/5 * * * *', async () => {
    try {
      const expired = await prisma.voucher.updateMany({
        where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
        data:  { status: 'EXPIRED' },
      });
      if (expired.count > 0) logger.info(`[Scheduler] Expired ${expired.count} vouchers`);
    } catch (e) { logger.error('[Scheduler] Voucher expiry error:', e.message); }
  });

  // ── Every hour: close stale sessions ────────────────────────────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await prisma.hotspotSession.updateMany({
        where: { isActive: true, loginAt: { lt: cutoff } },
        data:  { isActive: false, logoutAt: new Date() },
      });
    } catch (e) { logger.error('[Scheduler] Session expiry error:', e.message); }
  });

  // ── Daily 8am: expiry warning emails ────────────────────────────────────
  cron.schedule('0 8 * * *', async () => {
    try {
      const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const soonExpiring = await prisma.voucher.findMany({
        where:   { status: 'ACTIVE', expiresAt: { gte: new Date(), lte: in24h } },
        include: { customer: true },
      });
      for (const v of soonExpiring) {
        if (v.customer?.email) {
          await emailSvc.sendExpiryWarning(v.customer.email, v.customer.firstName || 'Customer', v).catch(() => {});
        }
      }
      logger.info(`[Scheduler] Sent ${soonExpiring.length} expiry warning emails`);
    } catch (e) { logger.error('[Scheduler] Expiry email error:', e.message); }
  });

  // ── Daily midnight: clean old logs ──────────────────────────────────────
  cron.schedule('0 0 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      await prisma.activityLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
      logger.info('[Scheduler] Old activity logs cleaned');
    } catch (e) { logger.error('[Scheduler] Log cleanup error:', e.message); }
  });

  logger.info('[Scheduler] All jobs started — 30s reconnection heartbeat active');
};
