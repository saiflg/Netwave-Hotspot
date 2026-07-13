/**
 * Blue Dot Networks — Admin Dashboard
 * Shows router heartbeat, ISP status, revenue, active users
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { dashboardAPI, routersAPI } from '../../utils/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color = '#6366F1', trend }) => (
  <div style={{ background: '#12121E', border: `1px solid ${color}33`, borderRadius: 14, padding: '18px 20px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
        {sub && <div style={{ color: '#64748B', fontSize: 11, marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 28, opacity: .85 }}>{icon}</div>
    </div>
    {trend !== undefined && (
      <div style={{ marginTop: 10, height: 2, background: '#1E1E2E', borderRadius: 1 }}>
        <div style={{ height: '100%', width: `${Math.min(100, trend)}%`, background: color, borderRadius: 1, transition: 'width .5s ease' }} />
      </div>
    )}
  </div>
);

// ── Router Status Row ─────────────────────────────────────────────────────────
const RouterStatusRow = ({ router }) => {
  const online = router.isOnline;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid #1E1E2E', background: '#0D0D1A08' }}>
      {/* Status dot */}
      <div style={{ width: 9, height: 9, borderRadius: '50%', background: online ? '#10B981' : '#EF4444', boxShadow: online ? '0 0 6px #10B981' : 'none', flexShrink: 0 }} />

      {/* Name + IP */}
      <div style={{ minWidth: 140 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{router.name}</div>
        <div style={{ color: '#64748B', fontSize: 10, fontFamily: 'monospace' }}>{router.ipAddress}</div>
      </div>

      {/* Identity + version */}
      <div style={{ minWidth: 120, flex: 1 }}>
        {router.identity && <div style={{ color: '#94A3B8', fontSize: 11 }}>{router.identity}</div>}
        {router.routerOSVersion && <div style={{ color: '#64748B', fontSize: 10 }}>v{router.routerOSVersion}</div>}
      </div>

      {/* CPU bar */}
      <div style={{ minWidth: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ color: '#64748B', fontSize: 9, fontWeight: 700 }}>CPU</span>
          <span style={{ color: router.cpuLoad > 80 ? '#EF4444' : '#94A3B8', fontSize: 9, fontWeight: 700 }}>{router.cpuLoad ?? '—'}%</span>
        </div>
        <div style={{ height: 4, background: '#1E1E2E', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${router.cpuLoad || 0}%`, background: router.cpuLoad > 80 ? '#EF4444' : router.cpuLoad > 60 ? '#F59E0B' : '#10B981', borderRadius: 2, transition: 'width .5s' }} />
        </div>
      </div>

      {/* RAM bar */}
      <div style={{ minWidth: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ color: '#64748B', fontSize: 9, fontWeight: 700 }}>RAM</span>
          <span style={{ color: '#94A3B8', fontSize: 9, fontWeight: 700 }}>
            {router.totalMemory ? `${Math.round((1 - router.memoryUsage / router.totalMemory) * 100)}%` : '—'}
          </span>
        </div>
        <div style={{ height: 4, background: '#1E1E2E', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${router.totalMemory ? Math.round((1 - router.memoryUsage / router.totalMemory) * 100) : 0}%`, background: '#6366F1', borderRadius: 2, transition: 'width .5s' }} />
        </div>
      </div>

      {/* Indicators */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <span title="Hotspot" style={{ fontSize: 14 }}>{router.hotspotRunning ? '📶' : '❌'}</span>
        <span title="WAN"     style={{ fontSize: 14 }}>{router.wanActive      ? '🌐' : '❌'}</span>
      </div>

      {/* Users */}
      <div style={{ minWidth: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#10B981' }}>{router.activeUsers ?? '—'}</div>
        <div style={{ color: '#64748B', fontSize: 9, textTransform: 'uppercase' }}>Users</div>
      </div>

      {/* Uptime */}
      <div style={{ minWidth: 70, textAlign: 'right' }}>
        <div style={{ color: '#64748B', fontSize: 10 }}>{router.uptime || '—'}</div>
        <div style={{ color: '#334155', fontSize: 9 }}>{router.lastSeen ? new Date(router.lastSeen).toLocaleTimeString() : '—'}</div>
      </div>
    </div>
  );
};


// ── Router Reconnection Events Panel ─────────────────────────────────────────
function RouterReconnectionEvents({ routers }) {
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const token = localStorage.getItem('bdn_token');
    const api   = process.env.REACT_APP_API_URL || '/api/v1';
    fetch(`${api}/activity?limit=30`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(r => {
        const routerEvents = (r.data?.logs || []).filter(l =>
          ['ROUTER_DISCONNECTED','ROUTER_RECONNECTED','ROUTER_RECONNECT_RETRY'].includes(l.action)
        ).slice(0, 15);
        setEvents(routerEvents);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [routers]); // re-fetch when routers update

  const EVENT_STYLE = {
    ROUTER_RECONNECTED:      { icon: '✅', color: '#10B981', label: 'Reconnected'  },
    ROUTER_DISCONNECTED:     { icon: '🔴', color: '#EF4444', label: 'Disconnected' },
    ROUTER_RECONNECT_RETRY:  { icon: '🔄', color: '#F59E0B', label: 'Retry'        },
  };

  // Also show current offline routers
  const offlineRouters = routers.filter(r => !r.isOnline);

  if (!loading && events.length === 0 && offlineRouters.length === 0) return null;

  return (
    <div style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, marginBottom: 22, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #2D2D3F', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>🔌 Connection Events</h3>
        <span style={{ color: '#64748B', fontSize: 11 }}>Auto-reconnection is active · retries every 30s</span>
      </div>

      {/* Currently offline routers */}
      {offlineRouters.map(r => (
        <div key={r.id} style={{ padding: '10px 18px', background: '#EF444411', borderBottom: '1px solid #EF444422', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 16 }}>🔴</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, color: '#EF4444', fontSize: 13 }}>{r.name}</span>
            <span style={{ color: '#64748B', fontSize: 11, marginLeft: 8 }}>({r.ipAddress})</span>
            {r.offlineSince && (
              <span style={{ color: '#64748B', fontSize: 11, marginLeft: 8 }}>
                offline since {new Date(r.offlineSince).toLocaleTimeString()}
              </span>
            )}
          </div>
          {r.reconnectAttempts > 0 && (
            <span style={{ background: '#F59E0B22', color: '#F59E0B', border: '1px solid #F59E0B33', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '2px 8px' }}>
              {r.reconnectAttempts} retries
            </span>
          )}
          {r.lastDisconnectReason && (
            <span style={{ color: '#64748B', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.lastDisconnectReason}
            </span>
          )}
          <span style={{ background: '#F59E0B22', color: '#F59E0B', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '2px 8px' }}>
            🔄 Retrying in 30s
          </span>
        </div>
      ))}

      {/* Event log */}
      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: 13 }}>Loading events...</div>
      ) : events.length === 0 ? (
        <div style={{ padding: '16px 18px', color: '#64748B', fontSize: 13 }}>
          ✅ No recent connection events — all routers stable
        </div>
      ) : (
        events.map((e, i) => {
          const style  = EVENT_STYLE[e.action] || { icon: '📋', color: '#64748B', label: e.action };
          let details  = {};
          try { details = JSON.parse(e.details || '{}'); } catch {}
          return (
            <div key={e.id || i} style={{ padding: '9px 18px', borderTop: '1px solid #1E1E2E', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{style.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 700, color: style.color, fontSize: 12 }}>{style.label}</span>
                <span style={{ color: '#94A3B8', fontSize: 12, marginLeft: 8 }}>{details.routerName || '—'}</span>
                {details.downtimeSeconds && (
                  <span style={{ color: '#64748B', fontSize: 11, marginLeft: 8 }}>
                    (down {details.downtimeSeconds}s · {details.reconnectAttempts} retries)
                  </span>
                )}
                {details.reason && e.action === 'ROUTER_DISCONNECTED' && (
                  <span style={{ color: '#64748B', fontSize: 11, marginLeft: 8 }}>{details.reason}</span>
                )}
                {details.attempt && e.action === 'ROUTER_RECONNECT_RETRY' && (
                  <span style={{ color: '#64748B', fontSize: 11, marginLeft: 8 }}>attempt #{details.attempt}</span>
                )}
              </div>
              <span style={{ color: '#334155', fontSize: 10, flexShrink: 0 }}>
                {e.createdAt ? new Date(e.createdAt).toLocaleTimeString() : '—'}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [now, setNow] = useState(new Date());

  // Tick clock every second
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Dashboard stats
  const { data: stats } = useQuery('dashboard', () =>
    dashboardAPI.get().then(r => r.data?.data || {}),
    { refetchInterval: 30000 }
  );

  // Routers (auto-refresh every 30s)
  const { data: routersData, dataUpdatedAt } = useQuery('routers', () =>
    routersAPI.getAll().then(r => r.data?.data?.routers || []),
    { refetchInterval: 30000 }
  );
  const routers       = routersData || [];
  const onlineRouters = routers.filter(r => r.isOnline);
  const ispOk         = onlineRouters.some(r => r.hotspotRunning && r.wanActive);

  // Revenue chart data from stats
  const revenueChart = stats?.revenueChart || [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 900 }}>Dashboard</h1>
          <p style={{ color: '#64748B', margin: 0, fontSize: 13 }}>
            {now.toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' · '}
            <span style={{ fontFamily: 'monospace', color: '#A5B4FC' }}>{now.toLocaleTimeString()}</span>
          </p>
        </div>

        {/* ISP Status indicator */}
        <div style={{
          background: ispOk ? '#10B98122' : '#EF444422',
          border:     `1px solid ${ispOk ? '#10B98144' : '#EF444444'}`,
          borderRadius: 10, padding: '10px 16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, marginBottom: 3 }}>{ispOk ? '🌐' : '⚠️'}</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: ispOk ? '#10B981' : '#EF4444', textTransform: 'uppercase' }}>
            ISP {ispOk ? 'Online' : 'Issues'}
          </div>
        </div>
      </div>

      {/* Stat cards row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14, marginBottom: 22 }}>
        <StatCard icon="💰" label="Revenue Today"    value={`₦${Number(stats?.revenueToday  || 0).toLocaleString()}`} color="#10B981" />
        <StatCard icon="📅" label="Revenue This Month" value={`₦${Number(stats?.revenueMonth || 0).toLocaleString()}`} color="#6366F1" />
        <StatCard icon="🎟" label="Vouchers Sold"    value={stats?.vouchersSold    || 0} color="#8B5CF6" />
        <StatCard icon="👥" label="Active Sessions"  value={stats?.activeSessions  || 0} color="#10B981" />
        <StatCard icon="👤" label="Total Customers"  value={stats?.totalCustomers  || 0} color="#6366F1" />
        <StatCard icon="💳" label="Payments Today"   value={stats?.paymentsToday   || 0} color="#F59E0B" />
      </div>

      {/* Router Heartbeat Panel */}
      <div style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, marginBottom: 22, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #2D2D3F', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>📡 Router Heartbeat</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ background: '#10B98122', color: '#10B981', border: '1px solid #10B98133', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '2px 8px' }}>
                {onlineRouters.length} online
              </span>
              <span style={{ background: '#EF444422', color: '#EF4444', border: '1px solid #EF444433', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '2px 8px' }}>
                {routers.length - onlineRouters.length} offline
              </span>
            </div>
          </div>
          <div style={{ color: '#64748B', fontSize: 11 }}>
            Last updated: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'} · Auto-refresh 30s
          </div>
        </div>

        {routers.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📡</div>
            <p>No routers configured yet. Go to <strong>Routers</strong> to add your first MikroTik.</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 16px', background: '#0A0A14', borderBottom: '1px solid #1E1E2E' }}>
              {['', 'Router', 'Identity', 'CPU', 'RAM', 'Status', 'Users', 'Uptime'].map((h, i) => (
                <div key={h+i} style={{ color: '#334155', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em',
                  minWidth: h===''?9 : h==='Router'?140 : h==='Identity'?120 : h==='CPU'||h==='RAM'?80 : h==='Status'?64 : h==='Users'?48 : 70,
                  flex: h==='Identity' ? 1 : undefined }}>
                  {h}
                </div>
              ))}
            </div>
            {routers.map(r => <RouterStatusRow key={r.id} router={r} />)}
          </>
        )}
      </div>

      {/* Revenue chart + recent payments side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginBottom: 22 }}>
        {/* Revenue chart */}
        <div style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 800 }}>📈 Revenue (7 days)</h3>
          {revenueChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" />
                <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 10 }} tickFormatter={v => `₦${v}`} />
                <Tooltip contentStyle={{ background: '#1E1E2E', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#F1F5F9' }} formatter={v => [`₦${Number(v).toLocaleString()}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2} dot={{ fill: '#6366F1', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>No revenue data yet</div>
          )}
        </div>

        {/* Voucher status breakdown */}
        <div style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, padding: 20 }}>
          <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 800 }}>🎟 Voucher Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['Unused',    stats?.voucherBreakdown?.UNUSED    || 0, '#6366F1'],
              ['Active',    stats?.voucherBreakdown?.ACTIVE    || 0, '#10B981'],
              ['Expired',   stats?.voucherBreakdown?.EXPIRED   || 0, '#EF4444'],
              ['Suspended', stats?.voucherBreakdown?.SUSPENDED || 0, '#F59E0B'],
            ].map(([label, count, color]) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#94A3B8', fontSize: 13 }}>{label}</span>
                  <span style={{ color, fontWeight: 700, fontSize: 13 }}>{count}</span>
                </div>
                <div style={{ height: 6, background: '#1E1E2E', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${stats?.totalVouchers ? (count / stats.totalVouchers) * 100 : 0}%`, background: color, borderRadius: 3, transition: 'width .5s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reconnection Events */}
      <RouterReconnectionEvents routers={routers} />

      {/* Recent payments */}
      <div style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #2D2D3F' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>💳 Recent Payments</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0D0D1A' }}>
                {['Reference', 'Customer', 'Plan', 'Amount', 'Gateway', 'Date'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats?.recentPayments || []).length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: '#64748B' }}>No payments yet</td></tr>
              ) : (stats?.recentPayments || []).map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid #1E1E2E' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: '#A5B4FC' }}>{p.reference?.slice(0, 16)}…</td>
                  <td style={{ padding: '10px 14px', color: '#94A3B8' }}>{p.user ? `${p.user.firstName} ${p.user.lastName}` : 'Guest'}</td>
                  <td style={{ padding: '10px 14px', color: '#64748B' }}>{p.voucher?.plan?.name || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#10B981', fontWeight: 700 }}>₦{Number(p.amount).toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', color: '#64748B' }}>{p.gateway}</td>
                  <td style={{ padding: '10px 14px', color: '#64748B', fontSize: 11 }}>{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
