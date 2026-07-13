// ─── PublicLayout ─────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import { authAPI, notifAPI, publicFetch } from '../../utils/api';
import toast from 'react-hot-toast';

export function PublicLayout() {
  return <Outlet />;
}

// ─── LoadingScreen ────────────────────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,#6366F1,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26, animation: 'pulse 1.5s infinite' }}>📡</div>
        <div style={{ color: '#64748B', fontSize: 14, fontWeight: 600 }}>Loading Blue Dot Networks...</div>
        <style>{`@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}`}</style>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMER DASHBOARD (Portal)
// ══════════════════════════════════════════════════════════════════════════════
export function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = typeof window !== 'undefined' ? { push: (p) => window.location.href = p } : {};
  const [voucherCode, setVoucherCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [voucherResult, setVoucherResult] = useState(null);
  const [myPayments, setMyPayments] = useState([]);
  const [myNotifs, setMyNotifs] = useState([]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL || '/api/v1'}/payments`, { headers: { Authorization: `Bearer ${localStorage.getItem('bdn_token')}` } })
      .then(r => r.json()).then(r => setMyPayments(r.data?.payments || [])).catch(() => {});
    notifAPI.getAll().then(r => setMyNotifs(r.data.data?.notifications || [])).catch(() => {});
  }, []);

  const checkVoucher = async () => {
    if (!voucherCode.trim()) return;
    setValidating(true);
    try {
      const res = await publicFetch('/vouchers/validate', { method: 'POST', body: JSON.stringify({ code: voucherCode.toUpperCase() }) }).then(r => r.json());
      setVoucherResult(res);
      if (res.success) toast.success('Voucher is valid!');
      else toast.error(res.message);
    } catch { toast.error('Check failed'); }
    finally { setValidating(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A14', fontFamily: "'Inter','Segoe UI',sans-serif", color: '#F1F5F9' }}>
      {/* Topbar */}
      <header style={{ background: '#0D0D1A', borderBottom: '1px solid #1E1E2E', padding: '0 5%', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'linear-gradient(135deg,#6366F1,#EC4899)', borderRadius: 9, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📡</div>
          <span style={{ fontWeight: 900, fontSize: 15, background: 'linear-gradient(135deg,#A5B4FC,#F9A8D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Blue Dot Networks</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ color: '#64748B', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Buy Voucher</a>
          <button onClick={logout} style={{ background: '#EF444411', border: '1px solid #EF444433', borderRadius: 8, color: '#EF4444', padding: '7px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Logout</button>
        </div>
      </header>

      <main style={{ padding: '32px 5%', maxWidth: 1100, margin: '0 auto' }}>
        {/* Welcome */}
        <div style={{ background: 'linear-gradient(135deg,#6366F122,#8B5CF611)', border: '1px solid #6366F133', borderRadius: 16, padding: 24, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900 }}>Welcome, {user?.firstName}! 👋</h2>
            <p style={{ color: '#64748B', margin: 0, fontSize: 14 }}>{user?.email} · {user?.role}</p>
          </div>
          <a href="/buy" style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', borderRadius: 9, padding: '11px 22px', fontWeight: 700, fontSize: 14, textDecoration: 'none', display: 'inline-block' }}>Buy New Voucher →</a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Voucher Checker */}
          <div style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, padding: 22 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800 }}>🎟 Check Voucher</h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                placeholder="Enter voucher code..." onKeyDown={e => e.key === 'Enter' && checkVoucher()}
                style={{ flex: 1, background: '#0D0D1A', border: '1px solid #2D2D3F', borderRadius: 8, color: '#F1F5F9', padding: '10px 12px', fontSize: 13, outline: 'none', fontFamily: 'monospace', letterSpacing: 1 }} />
              <button onClick={checkVoucher} disabled={validating}
                style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', border: 'none', borderRadius: 8, color: '#fff', padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {validating ? '...' : 'Check'}
              </button>
            </div>
            {voucherResult && (
              <div style={{ background: voucherResult.success ? '#10B98111' : '#EF444411', border: `1px solid ${voucherResult.success ? '#10B98133' : '#EF444433'}`, borderRadius: 10, padding: 14 }}>
                {voucherResult.success ? (
                  <>
                    <div style={{ color: '#10B981', fontWeight: 800, marginBottom: 8 }}>✓ Valid Voucher</div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>Plan: {voucherResult.data?.voucher?.plan?.name}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>Duration: {voucherResult.data?.voucher?.plan?.validityLabel}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>Status: {voucherResult.data?.voucher?.status}</div>
                  </>
                ) : (
                  <div style={{ color: '#EF4444', fontWeight: 700 }}>✗ {voucherResult.message}</div>
                )}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, padding: 22 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800 }}>🔔 Notifications</h3>
            {myNotifs.length === 0 ? (
              <div style={{ color: '#64748B', fontSize: 13 }}>No notifications</div>
            ) : myNotifs.slice(0, 5).map(n => (
              <div key={n.id} style={{ padding: '10px 0', borderBottom: '1px solid #1E1E2E', display: 'flex', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.isRead ? '#334155' : '#6366F1', marginTop: 5, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{n.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        <div style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, marginTop: 20, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #2D2D3F' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>💳 Payment History</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0D0D1A' }}>
                  {['Reference', 'Amount', 'Gateway', 'Voucher', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myPayments.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: '#64748B' }}>No payments yet. <a href="/buy" style={{ color: '#6366F1' }}>Buy a voucher →</a></td></tr>
                ) : myPayments.map(p => (
                  <tr key={p.id} style={{ borderTop: '1px solid #1E1E2E' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: '#A5B4FC' }}>{p.reference?.slice(0, 18)}...</td>
                    <td style={{ padding: '10px 14px', color: '#10B981', fontWeight: 700 }}>₦{p.amount?.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', color: '#64748B' }}>{p.gateway}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: '#6366F1' }}>{p.voucher?.code || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: p.status === 'SUCCESS' ? '#10B98122' : '#64748B22', color: p.status === 'SUCCESS' ? '#10B981' : '#64748B', borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '2px 7px' }}>{p.status}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748B', fontSize: 11 }}>{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Customer Profile ──────────────────────────────────────────────────────────
export function CustomerProfile() {
  const { user, fetchMe } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const navigate = { push: (p) => window.location.href = p };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await authAPI.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A14', fontFamily: "'Inter','Segoe UI',sans-serif", color: '#F1F5F9', padding: '40px 5%' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <a href="/portal" style={{ color: '#64748B', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, textDecoration: 'none' }}>← Back</a>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 24 }}>My Profile</h1>
        <div style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, padding: 24, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontWeight: 800 }}>Account Info</h3>
          {[['Name', `${user?.firstName} ${user?.lastName}`], ['Email', user?.email], ['Username', user?.username], ['Phone', user?.phone || '—'], ['Role', user?.role]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1E1E2E', fontSize: 14 }}>
              <span style={{ color: '#64748B' }}>{l}</span>
              <span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontWeight: 800 }}>Change Password</h3>
          <form onSubmit={handleChangePassword}>
            {[['Current Password', 'currentPassword'], ['New Password', 'newPassword'], ['Confirm New Password', 'confirmPassword']].map(([l, k]) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: 11, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase' }}>{l}</label>
                <input type="password" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  style={{ width: '100%', background: '#0D0D1A', border: '1px solid #2D2D3F', borderRadius: 8, color: '#F1F5F9', padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <button type="submit" disabled={loading}
              style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', border: 'none', borderRadius: 8, color: '#fff', padding: '11px 24px', fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
              {loading ? 'Saving...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
