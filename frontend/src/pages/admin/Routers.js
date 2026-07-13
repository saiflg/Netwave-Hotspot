/**
 * Blue Dot Networks — Router Management Page
 * Full CRUD + test connection + live heartbeat + online users
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { routersAPI } from '../../utils/api';
import toast from 'react-hot-toast';

// ── Shared styles ─────────────────────────────────────────────────────────────
const S = {
  card:  { background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, overflow: 'hidden' },
  input: { width: '100%', background: '#0D0D1A', border: '1px solid #2D2D3F', borderRadius: 8, color: '#F1F5F9', padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  label: { display: 'block', color: '#94A3B8', fontSize: 11, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' },
  btn:   (v = 'primary', sm) => ({
    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'opacity .15s',
    padding:    sm ? '7px 14px' : '10px 20px',
    fontSize:   sm ? 12 : 14,
    background: v === 'primary'  ? 'linear-gradient(135deg,#6366F1,#8B5CF6)'
              : v === 'danger'   ? '#EF444422'
              : v === 'success'  ? '#10B98122'
              : v === 'warning'  ? '#F59E0B22'
              : '#2D2D3F',
    color:      v === 'primary'  ? '#fff'
              : v === 'danger'   ? '#EF4444'
              : v === 'success'  ? '#10B981'
              : v === 'warning'  ? '#F59E0B'
              : '#94A3B8',
    ...(v === 'danger'  && { border: '1px solid #EF444433' }),
    ...(v === 'success' && { border: '1px solid #10B98133' }),
    ...(v === 'warning' && { border: '1px solid #F59E0B33' }),
  }),
  badge: (color) => ({
    background: color + '22', color, border: `1px solid ${color}44`,
    borderRadius: 6, fontSize: 10, fontWeight: 700,
    padding: '2px 8px', textTransform: 'uppercase',
  }),
};

const STATUS_COLOR = { CONNECTED: '#10B981', TIMEOUT: '#F59E0B', OFFLINE: '#EF4444', INVALID_CREDENTIALS: '#EF4444', API_DISABLED: '#F59E0B', CONNECTION_RESET: '#EF4444', UNKNOWN: '#64748B' };

// ── Gauge component ───────────────────────────────────────────────────────────
const Gauge = ({ value, label, color = '#6366F1' }) => {
  const pct = Math.min(100, Math.max(0, value || 0));
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={64} height={64} viewBox="0 0 64 64">
        <circle cx={32} cy={32} r={26} fill="none" stroke="#1E1E2E" strokeWidth={7} />
        <circle cx={32} cy={32} r={26} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={`${2 * Math.PI * 26 * pct / 100} ${2 * Math.PI * 26 * (100 - pct) / 100}`}
          strokeLinecap="round" strokeDashoffset={2 * Math.PI * 26 * 0.25}
          style={{ transition: 'stroke-dasharray .5s ease' }} />
        <text x={32} y={36} textAnchor="middle" fill={color} fontSize={13} fontWeight={800}>{pct}%</text>
      </svg>
      <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
};

// ── Modal wrapper ─────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#1E1E2E', borderRadius: 16, width: '100%', maxWidth: wide ? 780 : 540, maxHeight: '90vh', overflow: 'auto', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: '1px solid #334155', position: 'sticky', top: 0, background: '#1E1E2E', zIndex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: '#2D2D3F', border: 'none', borderRadius: 7, color: '#94A3B8', cursor: 'pointer', padding: '6px 10px', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
};

const Field = ({ label, note, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={S.label}>{label}</label>
    {children}
    {note && <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 11 }}>{note}</p>}
  </div>
);

// ── Router Card ───────────────────────────────────────────────────────────────
function RouterCard({ router, onEdit, onDelete, onView }) {
  const onlineColor = router.isOnline ? '#10B981' : '#EF4444';

  return (
    <div style={{ ...S.card, border: `1px solid ${onlineColor}33` }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #2D2D3F', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: onlineColor, boxShadow: router.isOnline ? `0 0 8px ${onlineColor}` : 'none', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{router.name}</div>
            <div style={{ color: '#64748B', fontSize: 11, fontFamily: 'monospace' }}>{router.ipAddress}:{router.apiPort}</div>
          </div>
        </div>
        <span style={S.badge(onlineColor)}>{router.isOnline ? 'Online' : 'Offline'}</span>
      </div>

      {/* Identity */}
      {router.identity && (
        <div style={{ padding: '10px 18px', background: '#0D0D1A', borderBottom: '1px solid #1E1E2E', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ color: '#64748B', fontSize: 11 }}>🖥 <strong style={{ color: '#94A3B8' }}>{router.identity}</strong></span>
          {router.routerOSVersion && <span style={{ color: '#64748B', fontSize: 11 }}>🔧 RouterOS <strong style={{ color: '#94A3B8' }}>{router.routerOSVersion}</strong></span>}
          {router.uptime          && <span style={{ color: '#64748B', fontSize: 11 }}>⏱ <strong style={{ color: '#94A3B8' }}>{router.uptime}</strong></span>}
        </div>
      )}

      {/* Gauges */}
      <div style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-around', borderBottom: '1px solid #1E1E2E' }}>
        <Gauge value={router.cpuLoad}
          label="CPU"
          color={router.cpuLoad > 80 ? '#EF4444' : router.cpuLoad > 60 ? '#F59E0B' : '#10B981'} />
        <Gauge
          value={router.totalMemory ? Math.round((1 - router.memoryUsage / router.totalMemory) * 100) : 0}
          label="RAM Used"
          color={router.totalMemory && (1 - router.memoryUsage / router.totalMemory) > 0.8 ? '#EF4444' : '#6366F1'} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>{router.hotspotRunning ? '🟢' : '🔴'}</div>
          <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600 }}>Hotspot</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>{router.wanActive ? '🌐' : '❌'}</div>
          <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600 }}>WAN</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ padding: '10px 18px', borderBottom: '1px solid #1E1E2E', display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#10B981' }}>{router.activeUsers ?? '—'}</div>
          <div style={{ color: '#64748B', fontSize: 10, textTransform: 'uppercase' }}>Active Users</div>
        </div>
        {router.location && (
          <div style={{ color: '#64748B', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            📍 {router.location}
          </div>
        )}
        {/* Offline state info */}
        {!router.isOnline && router.offlineSince && (
          <div style={{ background: '#EF444411', border: '1px solid #EF444422', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#EF4444' }}>
            ⏱ Offline since {new Date(router.offlineSince).toLocaleTimeString()}
          </div>
        )}
        {!router.isOnline && router.reconnectAttempts > 0 && (
          <div style={{ background: '#F59E0B11', border: '1px solid #F59E0B22', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#F59E0B' }}>
            🔄 {router.reconnectAttempts} retries · Next in ~30s
          </div>
        )}
        {router.lastSeen && (
          <div style={{ color: '#64748B', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
            🕐 {new Date(router.lastSeen).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 18px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={S.btn('ghost', true)} onClick={() => onView(router)}>👁 View</button>
        <button style={S.btn('ghost', true)} onClick={() => onEdit(router)}>✏️ Edit</button>
        <button style={S.btn('danger', true)} onClick={() => onDelete(router)}>🗑 Delete</button>
      </div>
    </div>
  );
}

// ── Router Form (Add / Edit) ──────────────────────────────────────────────────
function RouterForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    name: '', ipAddress: '', apiPort: '8728', username: 'admin',
    password: '', useSSL: false, location: '', description: '',
    connectionType: 'PUBLIC_IP',
    ...initial,
  });
  const [testing,    setTesting]    = useState(false);
  const [testResult, setTestResult] = useState(null);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const isEdit = !!initial?.id;

  const testConn = async () => {
    if (!form.ipAddress || !form.username || !form.password) {
      toast.error('Fill in IP address, username and password first'); return;
    }
    setTesting(true); setTestResult(null);
    try {
      const res = await routersAPI.testRaw({
        ipAddress:      form.ipAddress,
        apiPort:        parseInt(form.apiPort) || 8728,
        username:       form.username,
        password:       form.password,
        useSSL:         form.useSSL,
        connectionType: form.connectionType,
      });
      const data = res.data;
      setTestResult(data);
      if (data.success) toast.success(`Connected: ${data.message}`);
      else              toast.error(`Failed: ${data.message}`);
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Connection test failed';
      setTestResult({ success: false, status: 'UNKNOWN', message: msg });
      toast.error(msg);
    } finally { setTesting(false); }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Router Name *">
          <input style={S.input} value={form.name} onChange={set('name')} placeholder="Main Router" />
        </Field>
        <Field label="Connection Type">
          <select style={S.input} value={form.connectionType} onChange={set('connectionType')}>
            <option value="PUBLIC_IP">Public IP (Phase 1)</option>
            <option value="WIREGUARD" disabled>WireGuard VPN (Phase 2)</option>
          </select>
        </Field>
        <Field label="IP Address *" note="Public IP of your MikroTik">
          <input style={S.input} value={form.ipAddress} onChange={set('ipAddress')} placeholder="197.x.x.x" />
        </Field>
        <Field label="API Port" note="8729 = SSL (recommended), 8728 = plain">
          <input style={S.input} type="number" value={form.apiPort} onChange={set('apiPort')} placeholder="8729" />
        </Field>
        <Field label="Username *">
          <input style={S.input} value={form.username} onChange={set('username')} placeholder="admin" />
        </Field>
        <Field label="Password *">
          <input type="password" style={S.input} value={form.password} onChange={set('password')} placeholder="••••••••" />
        </Field>
        <Field label="Location">
          <input style={S.input} value={form.location} onChange={set('location')} placeholder="Main Office" />
        </Field>
        <Field label="Description">
          <input style={S.input} value={form.description} onChange={set('description')} placeholder="Optional note" />
        </Field>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#94A3B8', fontSize: 13 }}>
          <input type="checkbox" checked={form.useSSL} onChange={e => setForm(p => ({ ...p, useSSL: e.target.checked }))} style={{ width: 16, height: 16 }} />
          Use SSL/TLS (API-SSL port 8729 — recommended)
        </label>
      </div>

      {/* Test result */}
      {testResult && (
        <div style={{
          background: testResult.success ? '#10B98111' : '#EF444411',
          border:     `1px solid ${testResult.success ? '#10B98133' : '#EF444433'}`,
          borderRadius: 10, padding: 16, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: testResult.success ? 10 : 0 }}>
            <span style={{ fontSize: 18 }}>{testResult.success ? '✅' : '❌'}</span>
            <strong style={{ color: testResult.success ? '#10B981' : '#EF4444', fontSize: 14 }}>
              {testResult.status || (testResult.success ? 'CONNECTED' : 'FAILED')}
            </strong>
          </div>
          <div style={{ color: '#94A3B8', fontSize: 13, marginBottom: testResult.success ? 10 : 0 }}>{testResult.message}</div>
          {testResult.success && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8, marginTop: 10 }}>
              {[
                ['Identity',   testResult.identity],
                ['RouterOS',   testResult.version],
                ['Board',      testResult.board],
                ['CPU',        testResult.cpuLoad !== undefined ? `${testResult.cpuLoad}%` : '—'],
                ['Uptime',     testResult.uptime],
                ['Hotspot Pkg',testResult.hotspotPackage ? 'Present ✓' : 'Not found'],
              ].map(([l, v]) => v && (
                <div key={l} style={{ background: '#0D0D1A', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9', marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button style={S.btn('ghost')} onClick={onCancel} disabled={loading}>Cancel</button>
        <button style={{ ...S.btn('warning'), flex: 1, justifyContent: 'center' }} onClick={testConn} disabled={testing}>
          {testing ? '⏳ Testing...' : '🔌 Test Connection'}
        </button>
        <button
          style={{ ...S.btn(), flex: 1, justifyContent: 'center', opacity: loading ? .7 : 1 }}
          onClick={() => onSubmit(form)} disabled={loading}>
          {loading ? 'Saving...' : isEdit ? '💾 Update Router' : '➕ Add Router'}
        </button>
      </div>

      {!isEdit && (
        <p style={{ color: '#64748B', fontSize: 11, textAlign: 'center', marginTop: 10 }}>
          ⚠️ Router will only be saved after a successful connection test.
        </p>
      )}
    </div>
  );
}

// ── Router Detail View ────────────────────────────────────────────────────────
function RouterDetail({ router, onClose }) {
  const qc = useQueryClient();
  const [activeTab,   setActiveTab]   = useState('status');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loadingUsers,setLoadingUsers]= useState(false);
  const [rebooting,   setRebooting]   = useState(false);
  const [backingUp,   setBackingUp]   = useState(false);
  const [heartbeat,   setHeartbeat]   = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await routersAPI.heartbeat(router.id);
      setHeartbeat(res.data?.data);
      qc.invalidateQueries('routers');
    } catch {}
    finally { setRefreshing(false); }
  }, [router.id, qc]);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-refresh every 30s while modal is open
  useEffect(() => {
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await routersAPI.onlineUsers(router.id);
      setOnlineUsers(res.data?.data?.users || []);
    } catch { toast.error('Could not fetch online users'); }
    finally { setLoadingUsers(false); }
  };

  useEffect(() => { if (activeTab === 'users') loadUsers(); }, [activeTab]);

  const live = heartbeat?.health || heartbeat?.router || {};
  const data  = heartbeat?.router || router;

  const TABS = [
    { id: 'status',  label: '📊 Status'       },
    { id: 'users',   label: '👥 Online Users'  },
    { id: 'actions', label: '⚙️ Actions'       },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid #2D2D3F', paddingBottom: 14 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ ...S.btn(activeTab === t.id ? 'primary' : 'ghost', true) }}>
            {t.label}
          </button>
        ))}
        <button style={{ ...S.btn('ghost', true), marginLeft: 'auto', opacity: refreshing ? .5 : 1 }}
          onClick={refresh} disabled={refreshing}>
          {refreshing ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      {/* Status tab */}
      {activeTab === 'status' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              ['Status',      data.isOnline    ? '🟢 Online'   : '🔴 Offline'],
              ['Identity',    data.identity    || '—'],
              ['RouterOS',    data.routerOSVersion || '—'],
              ['Uptime',      data.uptime      || '—'],
              ['Location',    data.location    || '—'],
              ['API Port',    `${data.apiPort} ${data.useSSL ? '(SSL)' : '(Plain)'}`],
              ['IP Address',  data.ipAddress],
              ['Hotspot',     data.hotspotRunning ? '✅ Running' : '❌ Stopped'],
              ['WAN',         data.wanActive   ? '✅ Active'  : '❌ Down'],
              ['Last Seen',   data.lastSeen    ? new Date(data.lastSeen).toLocaleString() : '—'],
              ['Active Users',    String(data.activeUsers ?? '—')],
              ['Connection',      data.connectionType || 'PUBLIC_IP'],
              ['Reconnect Tries', data.isOnline ? '—' : String(data.reconnectAttempts || 0)],
              ['Offline Since',   !data.isOnline && data.offlineSince ? new Date(data.offlineSince).toLocaleString() : '—'],
              ['Last Error',      data.lastDisconnectReason || '—'],
            ].map(([l, v]) => (
              <div key={l} style={{ background: '#0D0D1A', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Gauges */}
          <div style={{ background: '#0D0D1A', borderRadius: 10, padding: 20, display: 'flex', justifyContent: 'space-around' }}>
            <Gauge value={data.cpuLoad} label="CPU Load"
              color={data.cpuLoad > 80 ? '#EF4444' : data.cpuLoad > 60 ? '#F59E0B' : '#10B981'} />
            <Gauge
              value={data.totalMemory ? Math.round((1 - data.memoryUsage / data.totalMemory) * 100) : 0}
              label="RAM Used"
              color="#6366F1" />
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 36 }}>{data.hotspotRunning ? '🟢' : '🔴'}</div>
              <div style={{ color: '#64748B', fontSize: 12, fontWeight: 600, marginTop: 4 }}>Hotspot</div>
            </div>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 36 }}>{data.wanActive ? '🌐' : '❌'}</div>
              <div style={{ color: '#64748B', fontSize: 12, fontWeight: 600, marginTop: 4 }}>WAN / Internet</div>
            </div>
          </div>
        </div>
      )}

      {/* Users tab */}
      {activeTab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ color: '#64748B', fontSize: 13 }}>{onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''} online</span>
            <button style={S.btn('ghost', true)} onClick={loadUsers} disabled={loadingUsers}>🔄 Refresh</button>
          </div>
          {loadingUsers ? (
            <div style={{ textAlign: 'center', color: '#64748B', padding: 32 }}>Loading...</div>
          ) : onlineUsers.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748B', padding: 32 }}>No active users right now</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#0D0D1A' }}>
                    {['User', 'MAC Address', 'IP', 'Uptime', 'Action'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {onlineUsers.map((u, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #1E1E2E' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 700 }}>{u.user || u.name || '—'}</td>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: '#94A3B8' }}>{u['mac-address'] || '—'}</td>
                      <td style={{ padding: '9px 12px', color: '#64748B' }}>{u.address || '—'}</td>
                      <td style={{ padding: '9px 12px', color: '#64748B' }}>{u.uptime || '—'}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <button style={S.btn('danger', true)} onClick={async () => {
                          const target = u['mac-address'] || u.user;
                          if (!target) return;
                          try {
                            await routersAPI.disconnectUser(router.id, { macOrUsername: target });
                            toast.success(`Disconnected ${target}`);
                            loadUsers();
                          } catch { toast.error('Failed to disconnect'); }
                        }}>Disconnect</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Actions tab */}
      {activeTab === 'actions' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { label: '🔄 Test Connection', variant: 'success', action: async () => {
                try {
                  const res = await routersAPI.test(router.id);
                  toast.success(res.data?.message || 'Connected');
                  qc.invalidateQueries('routers');
                } catch { toast.error('Test failed'); }
              }
            },
            { label: '💾 Backup Router',  variant: 'ghost', loading: backingUp, action: async () => {
                setBackingUp(true);
                try {
                  const res = await routersAPI.backup(router.id);
                  toast.success(res.data?.message || 'Backup created');
                } catch { toast.error('Backup failed'); }
                finally { setBackingUp(false); }
              }
            },
            { label: '🔁 Reboot Router', variant: 'warning', loading: rebooting, action: async () => {
                if (!window.confirm(`Reboot "${router.name}"? This will disconnect all users!`)) return;
                setRebooting(true);
                try {
                  await routersAPI.reboot(router.id);
                  toast.success('Reboot command sent. Router will be back in ~60 seconds.');
                  qc.invalidateQueries('routers');
                } catch { toast.error('Reboot failed'); }
                finally { setRebooting(false); }
              }
            },
            { label: '👥 Reload Users',      variant: 'ghost',   action: () => { setActiveTab('users'); } },
            { label: '🌐 Configure Portal',    variant: 'success', action: async () => {
                try {
                  const res = await routersAPI.configurePortal(router.id);
                  if (res.data?.success) toast.success('Portal configured! MikroTik now redirects to Blue Dot Networks portal.');
                  else toast.error(res.data?.message || 'Portal config failed. Check router hotspot is enabled.');
                } catch (e) { toast.error(e.response?.data?.message || 'Configure portal failed'); }
              }
            },
          ].map(({ label, variant, action, loading: ld }) => (
            <button key={label} style={{ ...S.btn(variant), justifyContent: 'center', padding: 16, fontSize: 14 }}
              onClick={action} disabled={ld}>
              {ld ? '⏳ Please wait...' : label}
            </button>
          ))}

          <div style={{ gridColumn: '1 / -1', background: '#F59E0B11', border: '1px solid #F59E0B33', borderRadius: 10, padding: 14 }}>
            <div style={{ color: '#F59E0B', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>⚠️ Important Notes</div>
            <ul style={{ color: '#64748B', fontSize: 12, margin: 0, paddingLeft: 16, lineHeight: 2 }}>
              <li>Reboot will disconnect ALL online users immediately</li>
              <li>Backup creates a file on the router's internal storage</li>
              <li>All actions are logged in Activity Logs</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function Routers() {
  const qc = useQueryClient();
  const [modal,    setModal]    = useState(null); // 'add' | 'edit' | 'view'
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery('routers', () =>
    routersAPI.getAll().then(r => r.data.data?.routers || []),
    { refetchInterval: 30000 }
  );
  const routers = data || [];

  const createMut = useMutation(routersAPI.create, {
    onSuccess: (res) => {
      const d = res.data;
      toast.success(d?.message || 'Router added!');
      if (d?.data?.portalConfigured === false) {
        setTimeout(() => toast('💡 Tip: Go to View → Actions → Configure Portal to set up captive portal redirect.', { duration: 6000, icon: 'ℹ️' }), 1000);
      }
      qc.invalidateQueries('routers');
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to add router'),
  });

  const updateMut = useMutation(({ id, ...data }) => routersAPI.update(id, data), {
    onSuccess: () => { toast.success('Router updated!'); qc.invalidateQueries('routers'); setModal(null); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Update failed'),
  });

  const deleteMut = useMutation(routersAPI.delete, {
    onSuccess: () => { toast.success('Router deleted.'); qc.invalidateQueries('routers'); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Delete failed'),
  });

  const online  = routers.filter(r => r.isOnline).length;
  const offline = routers.length - online;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 900 }}>MikroTik Routers</h1>
          <p style={{ color: '#64748B', margin: 0, fontSize: 13 }}>
            {routers.length} router{routers.length !== 1 ? 's' : ''} ·
            <span style={{ color: '#10B981' }}> {online} online</span> ·
            <span style={{ color: offline > 0 ? '#EF4444' : '#64748B' }}> {offline} offline</span>
            {' '}· Auto-refreshes every 30s
          </p>
        </div>
        <button style={S.btn()} onClick={() => { setSelected(null); setModal('add'); }}>
          + Add Router
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 22 }}>
        {[
          ['Total Routers', routers.length,                           '📡', '#6366F1'],
          ['Online',        online,                                   '🟢', '#10B981'],
          ['Offline',       offline,                                  '🔴', '#EF4444'],
          ['Hotspot Up',    routers.filter(r => r.hotspotRunning).length, '📶', '#10B981'],
          ['WAN Active',    routers.filter(r => r.wanActive).length, '🌐', '#6366F1'],
        ].map(([label, value, icon, color]) => (
          <div key={label} style={{ background: '#12121E', border: `1px solid ${color}33`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 24, fontWeight: 900, color }}>{value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Router grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
          {[1,2,3].map(i => <div key={i} style={{ background: '#12121E', borderRadius: 14, height: 280, opacity: .5 }} />)}
        </div>
      ) : routers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#12121E', borderRadius: 14, border: '1px solid #2D2D3F' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
          <h3 style={{ color: '#F1F5F9', margin: '0 0 8px' }}>No Routers Added Yet</h3>
          <p style={{ color: '#64748B', marginBottom: 22, fontSize: 14 }}>Add your first MikroTik router to start managing your hotspot network.</p>
          <button style={S.btn()} onClick={() => { setSelected(null); setModal('add'); }}>+ Add First Router</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
          {routers.map(r => (
            <RouterCard key={r.id} router={r}
              onEdit={router => { setSelected(router); setModal('edit'); }}
              onDelete={router => { if (window.confirm(`Delete "${router.name}"?`)) deleteMut.mutate(router.id); }}
              onView={router => { setSelected(router); setModal('view'); }}
            />
          ))}
        </div>
      )}

      {/* Add Router Modal */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="➕ Add MikroTik Router" wide>
        <RouterForm
          onSubmit={(form) => createMut.mutate(form)}
          onCancel={() => setModal(null)}
          loading={createMut.isLoading}
        />
      </Modal>

      {/* Edit Router Modal */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="✏️ Edit Router" wide>
        {selected && (
          <RouterForm
            initial={selected}
            onSubmit={(form) => updateMut.mutate({ id: selected.id, ...form })}
            onCancel={() => setModal(null)}
            loading={updateMut.isLoading}
          />
        )}
      </Modal>

      {/* View Router Modal */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title={`📡 ${selected?.name || 'Router'}`} wide>
        {selected && <RouterDetail router={selected} onClose={() => setModal(null)} />}
      </Modal>
    </div>
  );
}
