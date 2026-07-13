import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notifAPI } from '../../utils/api';
import { useQuery } from 'react-query';

const NAV = [
  { label: 'Dashboard',    path: '/admin',                icon: '📊', exact: true },
  { label: 'Routers',      path: '/admin/routers',        icon: '📡' },
  { label: 'Plans',        path: '/admin/plans',          icon: '📋' },
  { label: 'Vouchers',     path: '/admin/vouchers',       icon: '🎟️' },
  { label: 'Customers',    path: '/admin/customers',      icon: '👥' },
  { label: 'Sessions',     path: '/admin/sessions',       icon: '⚡' },
  { label: 'Payments',     path: '/admin/payments',       icon: '💳' },
  { label: 'Reports',      path: '/admin/reports',        icon: '📈' },
  { label: 'Tickets',      path: '/admin/tickets',        icon: '🎫' },
  { label: 'Announcements',path: '/admin/announcements',  icon: '📢' },
  { label: 'Legal Pages',  path: '/admin/legal',          icon: '📜' },
  { label: 'Activity Logs',path: '/admin/activity',       icon: '📝' },
  { label: 'Settings',     path: '/admin/settings',       icon: '⚙️' },
  { label: 'My Profile',   path: '/admin/profile',        icon: '🧑‍💼' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: notifData } = useQuery('notifications', () => notifAPI.getAll().then(r => r.data.data), { refetchInterval: 30000 });
  const unread = notifData?.unread || 0;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0A0A14', fontFamily: "'Inter','Segoe UI',sans-serif", color: '#F1F5F9', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 240 : 64, transition: 'width 0.2s ease',
        background: '#0D0D1A', borderRight: '1px solid #1E1E2E',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '16px 12px', borderBottom: '1px solid #1E1E2E', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366F1,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>📡</div>
          {sidebarOpen && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', background: 'linear-gradient(135deg,#A5B4FC,#F9A8D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Blue Dot Networks</div>
              <div style={{ color: '#64748B', fontSize: 10 }}>Admin Portal</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 6px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.map(item => (
            <NavLink key={item.path} to={item.path} end={item.exact}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: 'all 0.15s', whiteSpace: 'nowrap',
                background: isActive ? 'linear-gradient(135deg,#6366F122,#8B5CF611)' : 'transparent',
                color: isActive ? '#A5B4FC' : '#64748B',
                borderLeft: isActive ? '3px solid #6366F1' : '3px solid transparent',
              })}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '10px 6px', borderTop: '1px solid #1E1E2E' }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', background: '#1E1E2E', color: '#64748B', cursor: 'pointer', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            <span>{sidebarOpen ? '◀' : '▶'}</span>
            {sidebarOpen && 'Collapse'}
          </button>
          <button onClick={logout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', background: '#EF444411', color: '#EF4444', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            <span>🚪</span>
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ height: 56, background: '#0D0D1A', borderBottom: '1px solid #1E1E2E', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#94A3B8' }}>
            Welcome, {user?.firstName} 👋
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Notification bell */}
            <button onClick={() => setNotifOpen(!notifOpen)}
              style={{ position: 'relative', background: '#1E1E2E', border: 'none', borderRadius: 8, color: '#94A3B8', cursor: 'pointer', padding: '7px 10px', fontSize: 16 }}>
              🔔
              {unread > 0 && (
                <span style={{ position: 'absolute', top: 2, right: 2, background: '#EF4444', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>
              )}
            </button>

            <button onClick={() => navigate('/')}
              style={{ background: '#1E1E2E', border: 'none', borderRadius: 8, color: '#94A3B8', cursor: 'pointer', padding: '7px 12px', fontSize: 12, fontWeight: 600 }}>
              🌐 View Site
            </button>

            <div onClick={() => navigate('/admin/profile')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1E1E2E', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }} title="Edit Profile">
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9' }}>{user?.firstName} {user?.lastName}</div>
                <div style={{ fontSize: 10, color: '#A5B4FC' }}>✏️ Edit Profile</div>
              </div>
            </div>
          </div>
        </header>

        {/* Notifications Dropdown */}
        {notifOpen && (
          <div style={{ position: 'absolute', top: 56, right: 16, width: 320, background: '#1E1E2E', border: '1px solid #334155', borderRadius: 12, zIndex: 999, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
              <button onClick={() => { notifAPI.readAll(); setNotifOpen(false); }}
                style={{ background: 'none', border: 'none', color: '#6366F1', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Mark all read</button>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {!notifData?.notifications?.length ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#64748B', fontSize: 13 }}>No notifications</div>
              ) : notifData.notifications.slice(0, 8).map(n => (
                <div key={n.id} style={{ padding: '10px 16px', borderBottom: '1px solid #0D0D1A', background: n.isRead ? 'transparent' : '#6366F108' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{n.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Page Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
