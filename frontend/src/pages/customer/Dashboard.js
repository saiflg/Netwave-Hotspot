import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notifAPI, publicFetch } from '../../utils/api';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || '/api/v1';

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const [payments,  setPayments]  = useState([]);
  const [notifs,    setNotifs]    = useState([]);
  const [voucher,   setVoucher]   = useState('');
  const [checking,  setChecking]  = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  useEffect(() => {
    // Fetch payment history
    const token = localStorage.getItem('bdn_token');
    fetch(`${API}/payments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(r => { if (r.success) setPayments(r.data?.payments || []); })
      .catch(() => {});
    // Fetch notifications
    notifAPI.getAll().then(r => setNotifs(r.data?.data?.notifications || [])).catch(() => {});
  }, []);

  const checkVoucher = async () => {
    if (!voucher.trim()) { toast.error('Enter a voucher code'); return; }
    setChecking(true); setCheckResult(null);
    try {
      const res = await publicFetch('/vouchers/validate', {
        method: 'POST',
        body: JSON.stringify({ code: voucher.trim().toUpperCase() }),
      }).then(r => r.json());
      setCheckResult(res);
      if (res.success) toast.success('Valid voucher!');
      else toast.error(res.message);
    } catch { toast.error('Network error'); }
    finally { setChecking(false); }
  };

  const avatar = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div style={{ minHeight:'100vh', background:'#0A0A14', fontFamily:"'Inter','Segoe UI',sans-serif", color:'#F1F5F9' }}>
      {/* Top bar */}
      <header style={{ background:'#0D0D1A', borderBottom:'1px solid #1E1E2E', padding:'0 5%', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ background:'linear-gradient(135deg,#6366F1,#EC4899)', borderRadius:9, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>📡</div>
          <span style={{ fontWeight:900, fontSize:15, background:'linear-gradient(135deg,#A5B4FC,#F9A8D4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Blue Dot Networks</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Link to="/portal/profile" style={{ color:'#64748B', fontSize:13, fontWeight:600, textDecoration:'none' }}>👤 Profile</Link>
          <Link to="/buy"            style={{ color:'#64748B', fontSize:13, fontWeight:600, textDecoration:'none' }}>🛒 Buy Voucher</Link>
          <button onClick={logout}   style={{ background:'#EF444411', border:'1px solid #EF444433', borderRadius:8, color:'#EF4444', padding:'7px 14px', fontWeight:700, fontSize:12, cursor:'pointer' }}>Logout</button>
        </div>
      </header>

      <main style={{ padding:'32px 5%', maxWidth:1100, margin:'0 auto' }}>
        {/* Welcome */}
        <div style={{ background:'linear-gradient(135deg,#6366F122,#8B5CF611)', border:'1px solid #6366F133', borderRadius:16, padding:24, marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,#6366F1,#EC4899)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:900 }}>{avatar}</div>
            <div>
              <h2 style={{ margin:'0 0 4px', fontSize:20, fontWeight:900 }}>Welcome, {user?.firstName}! 👋</h2>
              <p style={{ color:'#64748B', margin:0, fontSize:13 }}>{user?.email}</p>
            </div>
          </div>
          <Link to="/buy" style={{ background:'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'#fff', borderRadius:9, padding:'11px 22px', fontWeight:700, fontSize:14, textDecoration:'none' }}>
            🛒 Buy New Voucher →
          </Link>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
          {/* Voucher checker */}
          <div style={{ background:'#12121E', border:'1px solid #2D2D3F', borderRadius:14, padding:22 }}>
            <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:800 }}>🎟 Check Voucher</h3>
            <div style={{ display:'flex', gap:10, marginBottom:16 }}>
              <input
                value={voucher}
                onChange={e => { setVoucher(e.target.value.toUpperCase()); setCheckResult(null); }}
                onKeyDown={e => e.key === 'Enter' && checkVoucher()}
                placeholder="Enter voucher code..."
                style={{ flex:1, background:'#0D0D1A', border:'1px solid #2D2D3F', borderRadius:8, color:'#F1F5F9', padding:'10px 12px', fontSize:13, outline:'none', fontFamily:'monospace', letterSpacing:1 }}
              />
              <button onClick={checkVoucher} disabled={checking}
                style={{ background:'linear-gradient(135deg,#6366F1,#8B5CF6)', border:'none', borderRadius:8, color:'#fff', padding:'10px 18px', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                {checking ? '...' : 'Check'}
              </button>
            </div>
            {checkResult && (
              <div style={{ background: checkResult.success ? '#10B98111' : '#EF444411', border:`1px solid ${checkResult.success ? '#10B98133' : '#EF444433'}`, borderRadius:10, padding:14 }}>
                {checkResult.success ? (
                  <div>
                    <div style={{ color:'#10B981', fontWeight:800, marginBottom:8 }}>✓ Valid Voucher</div>
                    {[
                      ['Plan',     checkResult.data?.voucher?.plan?.name || '—'],
                      ['Duration', checkResult.data?.voucher?.plan?.validityLabel || '—'],
                      ['Status',   checkResult.data?.voucher?.status || '—'],
                    ].map(([l, v]) => (
                      <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#94A3B8', marginBottom:4 }}>
                        <span>{l}:</span><strong style={{ color:'#F1F5F9' }}>{v}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color:'#EF4444', fontWeight:700, fontSize:13 }}>✗ {checkResult.message}</div>
                )}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div style={{ background:'#12121E', border:'1px solid #2D2D3F', borderRadius:14, padding:22 }}>
            <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:800 }}>🔔 Notifications</h3>
            {notifs.length === 0
              ? <div style={{ color:'#64748B', fontSize:13 }}>No notifications</div>
              : notifs.slice(0, 5).map(n => (
                  <div key={n.id} style={{ padding:'8px 0', borderBottom:'1px solid #1E1E2E', display:'flex', gap:10, alignItems:'flex-start' }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background: n.isRead ? '#334155' : '#6366F1', marginTop:5, flexShrink:0 }} />
                    <div>
                      <div style={{ fontSize:13, fontWeight:700 }}>{n.title}</div>
                      <div style={{ fontSize:11, color:'#64748B' }}>{n.message}</div>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Payment History */}
        <div style={{ background:'#12121E', border:'1px solid #2D2D3F', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #2D2D3F' }}>
            <h3 style={{ margin:0, fontSize:15, fontWeight:800 }}>💳 Payment History</h3>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#0D0D1A' }}>
                  {['Reference','Amount','Voucher Code','Status','Date'].map(h => (
                    <th key={h} style={{ padding:'9px 14px', textAlign:'left', color:'#64748B', fontWeight:700, textTransform:'uppercase', fontSize:10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.length === 0
                  ? <tr><td colSpan={5} style={{ padding:28, textAlign:'center', color:'#64748B' }}>
                      No payments yet. <Link to="/buy" style={{ color:'#6366F1', textDecoration:'none' }}>Buy a voucher →</Link>
                    </td></tr>
                  : payments.map(p => (
                      <tr key={p.id} style={{ borderTop:'1px solid #1E1E2E' }}>
                        <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:'#A5B4FC' }}>{p.reference?.slice(0,18)}…</td>
                        <td style={{ padding:'10px 14px', color:'#10B981', fontWeight:700 }}>₦{Number(p.amount).toLocaleString()}</td>
                        <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:'#6366F1' }}>{p.voucher?.code || '—'}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ background: p.status==='SUCCESS' ? '#10B98122' : '#64748B22', color: p.status==='SUCCESS' ? '#10B981' : '#64748B', borderRadius:6, fontSize:10, fontWeight:700, padding:'2px 7px' }}>{p.status}</span>
                        </td>
                        <td style={{ padding:'10px 14px', color:'#64748B', fontSize:11 }}>{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
