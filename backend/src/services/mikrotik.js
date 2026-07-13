/**
 * Blue Dot Networks — MikroTik RouterOS Service
 *
 * Architecture:
 *   MikroTikService (business logic)
 *     └── RouterTransport (abstraction layer — Phase 2 VPN-ready)
 *           ├── PublicIPTransport   (current — direct RouterOS API)
 *           ├── WireGuardTransport  (Phase 2 — swap without changing business logic)
 *           └── ConnectorTransport  (Phase 3 — cloud connector)
 *
 * Never import routeros-client outside this file.
 * All callers use MikroTikService only.
 */

const { logger } = require('../utils/logger');

// ── Safe lazy-load routeros-client ────────────────────────────────────────────
let RouterOSClient;
try {
  RouterOSClient = require('routeros-client').RouterOSClient;
} catch {
  logger.warn('[MikroTik] routeros-client not installed — API calls will fail gracefully');
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSPORT LAYER (Phase 2 abstraction)
// ─────────────────────────────────────────────────────────────────────────────

class PublicIPTransport {
  constructor(router) {
    this.host     = router.ipAddress;
    this.port     = router.apiPort || 8728;
    this.user     = router.username;
    this.password = router.password;
    this.useSSL   = router.useSSL || false;
    this.client   = null;
  }

  async connect() {
    if (!RouterOSClient) throw new Error('routeros-client module not installed. Run: npm install routeros-client');
    this.client = new RouterOSClient({
      host:     this.host,
      user:     this.user,
      password: this.password,
      port:     this.port,
      tls:      this.useSSL,
      timeout:  10000,
    });
    await this.client.connect();
    return this.client;
  }

  async disconnect() {
    try { if (this.client) await this.client.disconnect(); } catch {}
    this.client = null;
  }
}

// Phase 2 — placeholder (swap transport without touching MikroTikService)
class WireGuardTransport extends PublicIPTransport {
  constructor(router) {
    super({ ...router, ipAddress: router.vpnEndpoint || router.ipAddress });
  }
}

// Factory — picks transport based on router.connectionType
function createTransport(router) {
  switch (router.connectionType) {
    case 'WIREGUARD': return new WireGuardTransport(router);
    default:          return new PublicIPTransport(router);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

function classifyError(err) {
  const msg = (err.message || '').toLowerCase();
  if (msg.includes('econnrefused'))              return { code: 'API_DISABLED',    message: 'Router API port is closed or disabled' };
  if (msg.includes('etimedout') || msg.includes('timeout')) return { code: 'TIMEOUT', message: 'Router did not respond in time' };
  if (msg.includes('enotfound') || msg.includes('enoent'))  return { code: 'OFFLINE',  message: 'Router IP not reachable' };
  if (msg.includes('wrong credentials') || msg.includes('invalid user') || msg.includes('authentication')) return { code: 'INVALID_CREDENTIALS', message: 'Wrong username or password' };
  if (msg.includes('econnreset') || msg.includes('socket'))  return { code: 'CONNECTION_RESET', message: 'Connection was reset by router' };
  return { code: 'UNKNOWN', message: err.message || 'Unknown error' };
}

// ─────────────────────────────────────────────────────────────────────────────
// MIKROTIK SERVICE — all business logic lives here
// ─────────────────────────────────────────────────────────────────────────────

class MikroTikService {
  constructor(router) {
    this.router    = router;
    this.transport = createTransport(router);
    this.client    = null;
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  async _connect() {
    this.client = await this.transport.connect();
  }

  async _disconnect() {
    await this.transport.disconnect();
    this.client = null;
  }

  async _run(fn) {
    await this._connect();
    try {
      const result = await fn(this.client);
      return result;
    } finally {
      await this._disconnect();
    }
  }

  // ── TEST CONNECTION ───────────────────────────────────────────────────────
  async testConnection() {
    try {
      const data = await this._run(async (c) => {
        const [identity, resource, packages] = await Promise.all([
          c.menu('/system/identity').getAll(),
          c.menu('/system/resource').getAll(),
          c.menu('/system/package').getAll(),
        ]);

        const hotspotPkg = packages.find(p => p.name === 'hotspot' || p.name === 'dhcp');
        const res        = resource[0] || {};

        return {
          identity:       identity[0]?.name || 'Unknown',
          version:        res.version       || 'Unknown',
          board:          res['board-name'] || 'Unknown',
          cpuLoad:        parseInt(res['cpu-load']) || 0,
          memoryFree:     parseInt(res['free-memory']) || 0,
          memoryTotal:    parseInt(res['total-memory']) || 0,
          uptime:         res.uptime || 'Unknown',
          hotspotPackage: !!hotspotPkg,
        };
      });

      return {
        success:  true,
        status:   'CONNECTED',
        message:  `Connected to ${data.identity} (RouterOS ${data.version})`,
        ...data,
      };
    } catch (err) {
      const classified = classifyError(err);
      logger.warn(`[MikroTik] testConnection failed [${this.router.name}]: ${classified.code} — ${classified.message}`);
      return { success: false, status: classified.code, message: classified.message };
    }
  }

  // ── HEARTBEAT — full health snapshot ────────────────────────────────────
  async heartbeat() {
    try {
      const data = await this._run(async (c) => {
        const [identity, resource, hotspotActive, interfaces] = await Promise.all([
          c.menu('/system/identity').getAll(),
          c.menu('/system/resource').getAll(),
          c.menu('/ip/hotspot/active').getAll().catch(() => []),
          c.menu('/interface').getAll().catch(() => []),
        ]);

        const res = resource[0] || {};
        const wan = interfaces.find(i =>
          (i.name === 'ether1' || i.name === 'wan' || i.name === 'ether-WAN' || i.comment?.toLowerCase().includes('wan')) &&
          i.running === 'true'
        );

        // Check hotspot service
        let hotspotRunning = false;
        try {
          const hsService = await c.menu('/ip/hotspot').getAll();
          hotspotRunning  = hsService.some(h => h.disabled === 'false' || h.disabled === false);
        } catch {}

        return {
          identity:       identity[0]?.name || 'Unknown',
          routerOSVersion: res.version || 'Unknown',
          cpuLoad:        parseInt(res['cpu-load'])     || 0,
          memoryUsage:    parseInt(res['free-memory'])  || 0,
          totalMemory:    parseInt(res['total-memory']) || 0,
          uptime:         res.uptime || 'Unknown',
          hotspotRunning,
          wanActive:      !!wan,
          activeUsers:    hotspotActive.length,
        };
      });

      return { success: true, ...data };
    } catch (err) {
      const classified = classifyError(err);
      return { success: false, status: classified.code, message: classified.message };
    }
  }

  // ── ISP AVAILABILITY CHECK ───────────────────────────────────────────────
  async checkISPAvailability() {
    try {
      const result = await this._run(async (c) => {
        const [interfaces, hotspots] = await Promise.all([
          c.menu('/interface').getAll().catch(() => []),
          c.menu('/ip/hotspot').getAll().catch(() => []),
        ]);

        const wanUp = interfaces.some(i =>
          (i.name === 'ether1' || i.name === 'wan' ||
           i.name?.toLowerCase().includes('wan') ||
           i.comment?.toLowerCase().includes('wan')) &&
          (i.running === 'true' || i.running === true)
        );

        const hotspotUp = hotspots.some(h =>
          h.disabled === 'false' || h.disabled === false
        );

        // Quick internet check — ping google DNS via RouterOS
        let internetUp = false;
        try {
          await c.menu('/tool/ping').add({
            address: '8.8.8.8',
            count:   '1',
            interval: '500ms',
          });
          internetUp = true;
        } catch {
          internetUp = wanUp; // fallback: assume internet if WAN is up
        }

        return { wanUp, hotspotUp, internetUp };
      });

      const available = result.wanUp && result.hotspotUp;
      return {
        available,
        wanActive:      result.wanUp,
        hotspotRunning: result.hotspotUp,
        internetActive: result.internetUp,
        message:        available
          ? 'Internet service is available'
          : !result.hotspotUp
            ? 'Hotspot service is not running on this router'
            : 'WAN interface is down — internet unavailable',
      };
    } catch (err) {
      const classified = classifyError(err);
      logger.warn(`[MikroTik] ISP check failed [${this.router.name}]: ${classified.message}`);
      return {
        available:      false,
        wanActive:      false,
        hotspotRunning: false,
        internetActive: false,
        message:        `Router unreachable: ${classified.message}`,
        code:           classified.code,
      };
    }
  }

  // ── HOTSPOT USER MANAGEMENT ──────────────────────────────────────────────

  async addHotspotUser({ username, password, profile, limitUptime, limitBytesTotal, macAddress }) {
    return this._run(async (c) => {
      const data = {
        name:     username,
        password: password || username,
        profile:  profile  || 'default',
      };
      if (limitUptime)     data['limit-uptime']      = limitUptime;
      if (limitBytesTotal) data['limit-bytes-total']  = String(limitBytesTotal * 1024 * 1024);
      if (macAddress)      data['mac-address']        = macAddress;
      await c.menu('/ip/hotspot/user').add(data);
      return { success: true };
    }).catch(err => ({ success: false, error: err.message }));
  }

  async removeHotspotUser(username) {
    return this._run(async (c) => {
      await c.menu('/ip/hotspot/user').where({ name: username }).remove();
      return { success: true };
    }).catch(err => ({ success: false, error: err.message }));
  }

  async enableHotspotUser(username) {
    return this._run(async (c) => {
      await c.menu('/ip/hotspot/user').where({ name: username }).set({ disabled: 'no' });
      return { success: true };
    }).catch(err => ({ success: false, error: err.message }));
  }

  async disableHotspotUser(username) {
    return this._run(async (c) => {
      await c.menu('/ip/hotspot/user').where({ name: username }).set({ disabled: 'yes' });
      return { success: true };
    }).catch(err => ({ success: false, error: err.message }));
  }

  async disconnectUser(macOrUsername) {
    return this._run(async (c) => {
      // Try MAC address first, then username
      const byMac  = await c.menu('/ip/hotspot/active').where({ 'mac-address': macOrUsername }).getAll().catch(() => []);
      const byUser = await c.menu('/ip/hotspot/active').where({ user: macOrUsername }).getAll().catch(() => []);
      const target = [...byMac, ...byUser];
      for (const t of target) {
        await c.menu('/ip/hotspot/active').where({ '.id': t['.id'] }).remove().catch(() => {});
      }
      return { success: true, disconnected: target.length };
    }).catch(err => ({ success: false, error: err.message }));
  }

  // ── READ OPERATIONS ──────────────────────────────────────────────────────

  async getActiveUsers() {
    return this._run(async (c) => {
      return c.menu('/ip/hotspot/active').getAll();
    }).catch(() => []);
  }

  async getHotspotUsers() {
    return this._run(async (c) => {
      return c.menu('/ip/hotspot/user').getAll();
    }).catch(() => []);
  }

  async getProfiles() {
    return this._run(async (c) => {
      return c.menu('/ip/hotspot/user/profile').getAll();
    }).catch(() => []);
  }

  async getResourceInfo() {
    return this._run(async (c) => {
      const [res, id] = await Promise.all([
        c.menu('/system/resource').getAll(),
        c.menu('/system/identity').getAll(),
      ]);
      return { ...res[0], identity: id[0]?.name };
    }).catch(() => null);
  }

  async getBandwidth(interfaceName = 'ether1') {
    return this._run(async (c) => {
      const ifaces = await c.menu('/interface').where({ name: interfaceName }).getAll();
      return ifaces[0] || null;
    }).catch(() => null);
  }

  // ── USER PROFILE MANAGEMENT ──────────────────────────────────────────────

  async createProfile(plan) {
    return this._run(async (c) => {
      const profileName = `bdn_${plan.id.slice(0, 8)}`;
      const existing    = await c.menu('/ip/hotspot/user/profile').where({ name: profileName }).getAll();
      if (existing.length > 0) return { success: true, profileName, existed: true };

      const data = {
        name:             profileName,
        'rate-limit':     `${plan.uploadSpeed}M/${plan.downloadSpeed}M`,
        'session-timeout': `${plan.validity}h`,
        'shared-users':   '1',
      };
      if (plan.dataLimit)  data['limit-bytes-total'] = String(plan.dataLimit * 1024 * 1024);
      if (plan.burstSpeed) data['burst-limit']        = `${plan.burstSpeed}M/${plan.burstSpeed}M`;

      await c.menu('/ip/hotspot/user/profile').add(data);
      return { success: true, profileName, existed: false };
    }).catch(err => ({ success: false, error: err.message }));
  }

  // ── ROUTER OPERATIONS ────────────────────────────────────────────────────

  async reboot() {
    return this._run(async (c) => {
      // Send reboot command — connection will drop immediately
      c.menu('/system/reboot').add({}).catch(() => {});
      return { success: true, message: 'Reboot command sent' };
    }).catch(err => ({ success: false, error: err.message }));
  }

  async backup() {
    return this._run(async (c) => {
      const name = `bdn-backup-${Date.now()}`;
      await c.menu('/system/backup').add({ name });
      return { success: true, filename: `${name}.backup`, message: 'Backup created on router' };
    }).catch(err => ({ success: false, error: err.message }));
  }

  // ── CONFIGURE HOTSPOT SERVER (called when router is added) ───────────────
  // Sets the login-page URL so MikroTik redirects customers to our portal
  // instead of the built-in page.
  async configureHotspotServer(portalUrl) {
    return this._run(async (c) => {
      // Get all hotspot servers on this router
      const servers = await c.menu('/ip/hotspot').getAll().catch(() => []);

      if (servers.length === 0) {
        return { success: false, message: 'No hotspot server found on this router. Enable hotspot first in Winbox.' };
      }

      const results = [];
      for (const server of servers) {
        try {
          // Set the login-page to our custom portal URL
          // MikroTik appends $(mac), $(ip), $(username), $(link-orig) automatically
          await c.menu('/ip/hotspot').where({ '.id': server['.id'] }).set({
            'login-by': 'http-chap,http-pap,mac-cookie',
          });

          // Set the hotspot profile login page
          if (server.profile) {
            await c.menu('/ip/hotspot/profile').where({ name: server.profile }).set({
              'login-page':     portalUrl,
              'status-page':    portalUrl + '?status=1',
              'logout-page':    portalUrl + '?error=logout',
              'mac-cookie-timeout': '3d',
            }).catch(() => {
              // Some RouterOS versions use different field names — try alternate
            });
          }

          results.push({ server: server.name, success: true });
          logger.info(`[MikroTik] Hotspot server "${server.name}" configured → ${portalUrl}`);
        } catch (e) {
          results.push({ server: server.name, success: false, error: e.message });
          logger.warn(`[MikroTik] Could not configure server "${server.name}": ${e.message}`);
        }
      }

      // Also add our portal domain/IP to walled garden so devices can reach it before login
      try {
        const portalHost = new URL(portalUrl).hostname;
        const existing   = await c.menu('/ip/hotspot/walled-garden').getAll().catch(() => []);
        const alreadyAdded = existing.some(e => e.dst === portalHost || e.server === portalHost);
        if (!alreadyAdded) {
          await c.menu('/ip/hotspot/walled-garden').add({ dst: portalHost, action: 'allow' });
          logger.info(`[MikroTik] Added ${portalHost} to walled garden`);
        }
      } catch (e) {
        logger.warn('[MikroTik] Walled garden update failed (non-fatal):', e.message);
      }

      const allOk = results.every(r => r.success);
      return {
        success: allOk,
        message: allOk
          ? `Hotspot server(s) configured to use Blue Dot Networks portal`
          : `Partial configuration: ${results.filter(r => !r.success).map(r => r.error).join(', ')}`,
        results,
      };
    }).catch(err => ({
      success: false,
      error:   err.message,
      message: `Could not configure hotspot server: ${err.message}`,
    }));
  }

  // ── GET WALLED GARDEN ────────────────────────────────────────────────────
  async getWalledGarden() {
    return this._run(async (c) => {
      return c.menu('/ip/hotspot/walled-garden').getAll();
    }).catch(() => []);
  }

  // ── ADD WALLED GARDEN ENTRY ──────────────────────────────────────────────
  async addWalledGarden(dst) {
    return this._run(async (c) => {
      await c.menu('/ip/hotspot/walled-garden').add({ dst, action: 'allow' });
      return { success: true };
    }).catch(err => ({ success: false, error: err.message }));
  }
}

module.exports = { MikroTikService, classifyError };
