// ── Shared styles ────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { routersAPI, plansAPI, usersAPI, sessionsAPI, paymentsAPI, reportsAPI, ticketsAPI, announcAPI, downloadBlob } from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const S = {
  card: { background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, overflow: 'hidden' },
  btn: (v = 'primary', sz = 'md') => ({
    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
    fontSize: sz === 'sm' ? 12 : 13,
    padding: sz === 'sm' ? '5px 11px' : '9px 18px',
    background: v === 'primary' ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : v === 'danger' ? '#EF444422' : v === 'success' ? '#10B98122' : '#2D2D3F',
    color: v === 'primary' ? '#fff' : v === 'danger' ? '#EF4444' : v === 'success' ? '#10B981' : '#94A3B8',
    ...(v === 'danger' && { border: '1px solid #EF444433' }),
    ...(v === 'success' && { border: '1px solid #10B98133' }),
  }),
  input: { width: '100%', background: '#0D0D1A', border: '1px solid #2D2D3F', borderRadius: 8, color: '#F1F5F9', padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  label: { display: 'block', color: '#94A3B8', fontSize: 11, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' },
  badge: (c) => ({ background: c + '22', color: c, border: `1px solid ${c}44`, borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '2px 7px', textTransform: 'uppercase' }),
  th: { padding: '9px 14px', textAlign: 'left', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em', whiteSpace: 'nowrap' },
  td: { padding: '11px 14px', fontSize: 13 },
};

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#1E1E2E', borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #334155' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: '#2D2D3F', border: 'none', borderRadius: 7, color: '#94A3B8', cursor: 'pointer', padding: '5px 9px' }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => <div style={{ marginBottom: 13 }}><label style={S.label}>{label}</label>{children}</div>;

const PageHeader = ({ title, sub, children }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
    <div><h1 style={{ margin: '0 0 3px', fontSize: 23, fontWeight: 900 }}>{title}</h1><p style={{ color: '#64748B', margin: 0, fontSize: 13 }}>{sub}</p></div>
    <div style={{ display: 'flex', gap: 10 }}>{children}</div>
  </div>
);

const Table = ({ headers, children, loading, empty }) => (
  <div style={S.card}>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ background: '#0D0D1A' }}>{headers.map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {loading ? Array(5).fill(0).map((_, i) => <tr key={i} style={{ borderTop: '1px solid #1E1E2E' }}>{headers.map((_, j) => <td key={j} style={S.td}><div style={{ background: '#1E1E2E', borderRadius: 4, height: 14, width: '75%' }} /></td>)}</tr>)
            : children}
          {!loading && empty && <tr><td colSpan={headers.length} style={{ padding: 32, textAlign: 'center', color: '#64748B' }}>{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// ROUTERS PAGE
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// PLANS PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function Plans() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', downloadSpeed: '', uploadSpeed: '', dataLimit: '', unlimited: false, validity: '', validityLabel: '', priority: 8, burstSpeed: '', description: '', sortOrder: 0 });

  const { data, isLoading } = useQuery('plans-all', () => plansAPI.getAllAdmin().then(r => r.data.data.plans));

  const saveMut = useMutation((d) => editing ? plansAPI.update(editing, d) : plansAPI.create(d), {
    onSuccess: () => { toast.success(editing ? 'Plan updated!' : 'Plan created!'); qc.invalidateQueries('plans-all'); setModal(false); setEditing(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const deleteMut = useMutation((id) => plansAPI.delete(id), { onSuccess: () => { toast.success('Plan deleted'); qc.invalidateQueries('plans-all'); } });

  const openEdit = (p) => { setEditing(p.id); setForm({ ...p, dataLimit: p.dataLimit || '', burstSpeed: p.burstSpeed || '' }); setModal(true); };
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const VALIDITY_OPTIONS = [
    { label: '1 Hour', hours: 1 }, { label: '3 Hours', hours: 3 }, { label: '6 Hours', hours: 6 },
    { label: '12 Hours', hours: 12 }, { label: '1 Day', hours: 24 }, { label: '3 Days', hours: 72 },
    { label: '7 Days', hours: 168 }, { label: '30 Days', hours: 720 }, { label: 'Unlimited', hours: 87600 },
  ];

  return (
    <div>
      <PageHeader title="Internet Plans" sub="Create and manage subscription plans">
        <button style={S.btn()} onClick={() => { setEditing(null); setForm({ name: '', price: '', downloadSpeed: '', uploadSpeed: '', dataLimit: '', unlimited: false, validity: '', validityLabel: '', priority: 8, burstSpeed: '', description: '', sortOrder: 0 }); setModal(true); }}>+ New Plan</button>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
        {isLoading ? Array(4).fill(0).map((_, i) => <div key={i} style={{ background: '#12121E', borderRadius: 14, height: 200, animation: 'pulse 1.5s infinite' }} />) :
          (data || []).map(p => (
            <div key={p.id} style={{ background: '#12121E', border: `1px solid ${p.isActive ? '#6366F133' : '#2D2D3F'}`, borderRadius: 14, padding: 18, opacity: p.isActive ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{p.name}</div>
                  <div style={{ color: '#64748B', fontSize: 12 }}>{p.validityLabel}</div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#6366F1' }}>₦{p.price?.toLocaleString()}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
                {[['⬇️ Download', `${p.downloadSpeed} Mbps`], ['⬆️ Upload', `${p.uploadSpeed} Mbps`], ['📦 Data', p.unlimited ? 'Unlimited' : `${p.dataLimit}MB`], ['⏱ Validity', p.validityLabel]].map(([l, v]) => (
                  <div key={l} style={{ background: '#0D0D1A', borderRadius: 8, padding: '7px 10px' }}>
                    <div style={{ fontSize: 10, color: '#64748B' }}>{l}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9' }}>{v}</div>
                  </div>
                ))}
              </div>
              {p.description && <div style={{ color: '#64748B', fontSize: 12, marginBottom: 12 }}>{p.description}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...S.btn('ghost', 'sm'), flex: 1, justifyContent: 'center' }} onClick={() => openEdit(p)}>✏️ Edit</button>
                <button style={S.btn('danger', 'sm')} onClick={() => deleteMut.mutate(p.id)}>🗑</button>
              </div>
            </div>
          ))}
      </div>

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? 'Edit Plan' : 'Create Internet Plan'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Plan Name *"><input style={S.input} value={form.name} onChange={f('name')} placeholder="Daily Plan" /></Field>
          <Field label="Price (₦) *"><input style={S.input} type="number" value={form.price} onChange={f('price')} /></Field>
          <Field label="Download Speed (Mbps) *"><input style={S.input} type="number" value={form.downloadSpeed} onChange={f('downloadSpeed')} /></Field>
          <Field label="Upload Speed (Mbps) *"><input style={S.input} type="number" value={form.uploadSpeed} onChange={f('uploadSpeed')} /></Field>
          <Field label="Validity">
            <select style={S.input} onChange={e => { const opt = VALIDITY_OPTIONS.find(o => o.label === e.target.value); if (opt) setForm(p => ({ ...p, validity: opt.hours, validityLabel: opt.label })); }}>
              <option value="">Select duration...</option>
              {VALIDITY_OPTIONS.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Priority (1-8)"><input style={S.input} type="number" value={form.priority} onChange={f('priority')} min={1} max={8} /></Field>
          <Field label="Data Limit (MB)"><input style={S.input} type="number" value={form.dataLimit} onChange={f('dataLimit')} disabled={form.unlimited} placeholder="Leave blank = unlimited" /></Field>
          <Field label="Burst Speed (Mbps)"><input style={S.input} type="number" value={form.burstSpeed} onChange={f('burstSpeed')} /></Field>
        </div>
        <Field label="Description"><textarea style={{ ...S.input, resize: 'vertical' }} rows={2} value={form.description} onChange={f('description')} /></Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#94A3B8', marginBottom: 16 }}>
          <input type="checkbox" checked={form.unlimited} onChange={f('unlimited')} /> Unlimited Data
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...S.btn('ghost'), flex: 1, justifyContent: 'center' }} onClick={() => setModal(false)}>Cancel</button>
          <button style={{ ...S.btn(), flex: 2, justifyContent: 'center' }} onClick={() => saveMut.mutate({ ...form, price: parseFloat(form.price), downloadSpeed: parseInt(form.downloadSpeed), uploadSpeed: parseInt(form.uploadSpeed), dataLimit: form.unlimited ? null : parseInt(form.dataLimit) || null, validity: parseInt(form.validity) || 24, burstSpeed: form.burstSpeed ? parseInt(form.burstSpeed) : null })} disabled={saveMut.isLoading}>
            {saveMut.isLoading ? 'Saving...' : editing ? '✓ Update Plan' : '✓ Create Plan'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function Customers() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ search: '', role: 'CUSTOMER', page: 1 });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', username: '', phone: '', password: '', role: 'CUSTOMER', address: '' });
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery(['customers', filters], () => usersAPI.getAll(filters).then(r => r.data.data), { keepPreviousData: true });

  const saveMut = useMutation((d) => editing ? usersAPI.update(editing, d) : usersAPI.create(d), {
    onSuccess: () => { toast.success(editing ? 'Customer updated!' : 'Customer created!'); qc.invalidateQueries('customers'); setModal(null); setEditing(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const toggleMut = useMutation((id) => usersAPI.toggle(id), { onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries('customers'); } });
  const deleteMut = useMutation((id) => usersAPI.delete(id), { onSuccess: () => { toast.success('Customer deleted'); qc.invalidateQueries('customers'); } });

  const openEdit = (u) => { setEditing(u.id); setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, username: u.username, phone: u.phone || '', password: '', role: u.role, address: u.address || '' }); setModal('form'); };
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const users = data?.users || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      <PageHeader title="Customers" sub={`${pagination.total || 0} total customers`}>
        <button style={S.btn()} onClick={() => { setEditing(null); setForm({ firstName: '', lastName: '', email: '', username: '', phone: '', password: '', role: 'CUSTOMER', address: '' }); setModal('form'); }}>+ New Customer</button>
      </PageHeader>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))} placeholder="Search name, email..." style={{ ...S.input, width: 240 }} />
        <select value={filters.role} onChange={e => setFilters(p => ({ ...p, role: e.target.value, page: 1 }))} style={{ ...S.input, width: 160 }}>
          <option value="">All Roles</option>
          {['CUSTOMER', 'ADMIN', 'MANAGER', 'CASHIER', 'SUPPORT'].map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      <Table headers={['Name', 'Email', 'Phone', 'Role', 'Plan', 'Status', 'Last Login', 'Actions']} loading={isLoading} empty="No customers found">
        {users.map(u => (
          <tr key={u.id} style={{ borderTop: '1px solid #1E1E2E' }}>
            <td style={{ ...S.td, fontWeight: 700 }}>{u.firstName} {u.lastName}</td>
            <td style={{ ...S.td, color: '#94A3B8' }}>{u.email}</td>
            <td style={{ ...S.td, color: '#64748B' }}>{u.phone || '—'}</td>
            <td style={S.td}><span style={S.badge(u.role === 'CUSTOMER' ? '#64748B' : '#8B5CF6')}>{u.role}</span></td>
            <td style={{ ...S.td, color: '#64748B' }}>{u.plan?.name || '—'}</td>
            <td style={S.td}><span style={S.badge(u.isActive ? '#10B981' : '#EF4444')}>{u.isActive ? 'Active' : 'Suspended'}</span></td>
            <td style={{ ...S.td, color: '#64748B', fontSize: 11 }}>{u.lastLogin ? format(new Date(u.lastLogin), 'MMM d HH:mm') : '—'}</td>
            <td style={S.td}>
              <div style={{ display: 'flex', gap: 5 }}>
                <button style={S.btn('ghost', 'sm')} onClick={() => openEdit(u)}>✏️</button>
                <button style={S.btn(u.isActive ? 'ghost' : 'success', 'sm')} onClick={() => toggleMut.mutate(u.id)}>{u.isActive ? 'Suspend' : 'Activate'}</button>
                <button style={S.btn('danger', 'sm')} onClick={() => deleteMut.mutate(u.id)}>🗑</button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button style={S.btn('ghost', 'sm')} disabled={filters.page <= 1} onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}>← Prev</button>
          <span style={{ padding: '5px 12px', color: '#64748B', fontSize: 12 }}>Page {pagination.page} of {pagination.pages}</span>
          <button style={S.btn('ghost', 'sm')} disabled={filters.page >= pagination.pages} onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}>Next →</button>
        </div>
      )}

      <Modal open={modal === 'form'} onClose={() => { setModal(null); setEditing(null); }} title={editing ? 'Edit Customer' : 'Create Customer'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="First Name *"><input style={S.input} value={form.firstName} onChange={f('firstName')} /></Field>
          <Field label="Last Name *"><input style={S.input} value={form.lastName} onChange={f('lastName')} /></Field>
          <Field label="Email *"><input style={S.input} type="email" value={form.email} onChange={f('email')} /></Field>
          <Field label="Username *"><input style={S.input} value={form.username} onChange={f('username')} /></Field>
          <Field label="Phone"><input style={S.input} value={form.phone} onChange={f('phone')} /></Field>
          <Field label="Password *"><input style={S.input} type="password" value={form.password} onChange={f('password')} placeholder={editing ? 'Leave blank to keep' : 'Password'} /></Field>
          <Field label="Role">
            <select style={S.input} value={form.role} onChange={f('role')}>
              {['CUSTOMER', 'CASHIER', 'SUPPORT', 'MANAGER', 'ADMIN'].map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Address"><input style={S.input} value={form.address} onChange={f('address')} /></Field>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button style={{ ...S.btn('ghost'), flex: 1, justifyContent: 'center' }} onClick={() => setModal(null)}>Cancel</button>
          <button style={{ ...S.btn(), flex: 2, justifyContent: 'center' }} onClick={() => saveMut.mutate(form)} disabled={saveMut.isLoading}>
            {saveMut.isLoading ? 'Saving...' : editing ? '✓ Update' : '✓ Create Customer'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSIONS PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function Sessions() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ isActive: 'true', page: 1 });
  const { data, isLoading } = useQuery(['sessions', filters], () => sessionsAPI.getAll(filters).then(r => r.data.data), { refetchInterval: 15000, keepPreviousData: true });
  const terminateMut = useMutation((id) => sessionsAPI.terminate(id), { onSuccess: () => { toast.success('Session terminated'); qc.invalidateQueries('sessions'); } });

  const sessions = data?.sessions || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      <PageHeader title="Sessions" sub={`${pagination.total || 0} sessions · Auto-refresh every 15s`}>
        <button style={S.btn('ghost')} onClick={() => qc.invalidateQueries('sessions')}>🔄 Refresh</button>
      </PageHeader>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['Active', 'true'], ['All', ''], ['Inactive', 'false']].map(([l, v]) => (
          <button key={l} style={{ ...S.btn(filters.isActive === v ? 'primary' : 'ghost', 'sm') }} onClick={() => setFilters(p => ({ ...p, isActive: v, page: 1 }))}>{l}</button>
        ))}
      </div>
      <Table headers={['Voucher Code', 'MAC Address', 'IP', 'Router', 'Plan', 'Started', 'Duration', 'Data', 'Actions']} loading={isLoading} empty="No sessions found">
        {sessions.map(s => {
          const dur = s.logoutAt ? s.duration : Math.floor((new Date() - new Date(s.loginAt)) / 1000);
          const durStr = `${Math.floor(dur / 3600)}h ${Math.floor((dur % 3600) / 60)}m`;
          return (
            <tr key={s.id} style={{ borderTop: '1px solid #1E1E2E' }}>
              <td style={{ ...S.td, fontFamily: 'monospace', color: '#A5B4FC', fontSize: 12 }}>{s.voucher?.code || '—'}</td>
              <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11, color: '#64748B' }}>{s.macAddress || '—'}</td>
              <td style={{ ...S.td, fontSize: 11, color: '#64748B' }}>{s.ipAddress || '—'}</td>
              <td style={{ ...S.td, color: '#94A3B8' }}>{s.router?.name || '—'}</td>
              <td style={{ ...S.td, color: '#94A3B8' }}>{s.voucher?.plan?.name || '—'}</td>
              <td style={{ ...S.td, color: '#64748B', fontSize: 11 }}>{format(new Date(s.loginAt), 'MMM d HH:mm')}</td>
              <td style={{ ...S.td, color: '#F59E0B', fontWeight: 700 }}>{durStr}</td>
              <td style={{ ...S.td, color: '#64748B', fontSize: 11 }}>{((s.dataDownload + s.dataUpload) / 1024).toFixed(1)}GB</td>
              <td style={S.td}>
                {s.isActive && <button style={S.btn('danger', 'sm')} onClick={() => terminateMut.mutate(s.id)}>Terminate</button>}
              </td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENTS PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function Payments() {
  const [filters, setFilters] = useState({ status: '', gateway: '', page: 1 });
  const { data, isLoading } = useQuery(['payments', filters], () => paymentsAPI.getAll(filters).then(r => r.data.data), { keepPreviousData: true });

  const STATUS_COLORS = { SUCCESS: '#10B981', PENDING: '#F59E0B', FAILED: '#EF4444', CANCELLED: '#64748B', REFUNDED: '#8B5CF6' };
  const payments = data?.payments || [];
  const pagination = data?.pagination || {};

  return (
    <div>
      <PageHeader title="Payments" sub={`${pagination.total || 0} total transactions`} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value, page: 1 }))} style={{ ...S.input, width: 160 }}>
          <option value="">All Status</option>
          {['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.gateway} onChange={e => setFilters(p => ({ ...p, gateway: e.target.value, page: 1 }))} style={{ ...S.input, width: 180 }}>
          <option value="">All Gateways</option>
          <option>PAYSTACK</option><option>FLUTTERWAVE</option>
        </select>
      </div>
      <Table headers={['Reference', 'Customer', 'Amount', 'Gateway', 'Voucher', 'Status', 'Date']} loading={isLoading} empty="No payments found">
        {payments.map(p => (
          <tr key={p.id} style={{ borderTop: '1px solid #1E1E2E' }}>
            <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11, color: '#A5B4FC' }}>{p.reference}</td>
            <td style={{ ...S.td, fontWeight: 600 }}>{p.user ? `${p.user.firstName} ${p.user.lastName}` : 'Guest'}</td>
            <td style={{ ...S.td, color: '#10B981', fontWeight: 700 }}>₦{p.amount?.toLocaleString()}</td>
            <td style={{ ...S.td, color: '#64748B' }}>{p.gateway}</td>
            <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11, color: '#6366F1' }}>{p.voucher?.code || '—'}</td>
            <td style={S.td}><span style={S.badge(STATUS_COLORS[p.status] || '#64748B')}>{p.status}</span></td>
            <td style={{ ...S.td, color: '#64748B', fontSize: 11 }}>{p.paidAt ? format(new Date(p.paidAt), 'MMM d HH:mm') : '—'}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REPORTS PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function Reports() {
  const [range, setRange] = useState({ from: '', to: '' });
  const { data, refetch, isLoading } = useQuery(['report', range], () => reportsAPI.summary(range).then(r => r.data.data), { enabled: false });

  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (range.from) params.set('from', range.from);
      if (range.to)   params.set('to',   range.to);
      await downloadBlob(
        `/reports/export/pdf?${params.toString()}`,
        `report-${range.from || 'all'}-to-${range.to || 'now'}.pdf`
      );
      toast.success('Report downloaded!');
    } catch (e) {
      toast.error(e.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Reports" sub="Generate revenue, customer and network reports">
        <button style={{ ...S.btn('ghost'), opacity: exporting ? 0.6 : 1 }} onClick={handleExportPDF} disabled={exporting}>{exporting ? '⏳ Generating...' : '📄 Export PDF'}</button>
        <button style={S.btn()} onClick={() => refetch()}>📊 Generate Report</button>
      </PageHeader>

      <div style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800 }}>Date Range Filter</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}><label style={S.label}>From</label><input type="date" style={S.input} value={range.from} onChange={e => setRange(p => ({ ...p, from: e.target.value }))} /></div>
          <div style={{ flex: 1 }}><label style={S.label}>To</label><input type="date" style={S.input} value={range.to} onChange={e => setRange(p => ({ ...p, to: e.target.value }))} /></div>
          {[['Today', 0], ['Last 7 Days', 7], ['Last 30 Days', 30], ['This Month', -1]].map(([l, d]) => (
            <button key={l} style={S.btn('ghost', 'sm')} onClick={() => {
              const to = new Date().toISOString().split('T')[0];
              const from = d === -1 ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
                : d === 0 ? to : new Date(Date.now() - d * 86400000).toISOString().split('T')[0];
              setRange({ from, to });
            }}>{l}</button>
          ))}
        </div>
      </div>

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14 }}>
          {[
            ['Total Revenue', `₦${(data.revenue || 0).toLocaleString()}`, '#10B981'],
            ['Transactions', data.paymentCount || 0, '#6366F1'],
            ['New Customers', data.customers || 0, '#8B5CF6'],
            ['Sessions', data.sessions || 0, '#F59E0B'],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: '#12121E', border: `1px solid ${c}33`, borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ color: '#64748B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>{l}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: c }}>{v}</div>
            </div>
          ))}
        </div>
      )}
      {isLoading && <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Generating report...</div>}
      {!data && !isLoading && <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Select a date range and click "Generate Report"</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TICKETS PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function Tickets() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const { data, isLoading } = useQuery('tickets', () => ticketsAPI.getAll().then(r => r.data.data.tickets));
  const replyMut = useMutation(() => ticketsAPI.reply(selected.id, reply), { onSuccess: () => { toast.success('Reply sent'); qc.invalidateQueries('tickets'); setReply(''); } });
  const statusMut = useMutation(({ id, status }) => ticketsAPI.updateStatus(id, status), { onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries('tickets'); } });

  const STATUS_COLORS = { OPEN: '#EF4444', IN_PROGRESS: '#F59E0B', RESOLVED: '#10B981', CLOSED: '#64748B' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, height: 'calc(100vh - 160px)' }}>
      <div style={{ ...S.card, overflowY: 'auto' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #2D2D3F' }}><h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Support Tickets</h3></div>
        {isLoading ? <div style={{ padding: 20, color: '#64748B' }}>Loading...</div> :
          (data || []).map(t => (
            <div key={t.id} onClick={() => setSelected(t)} style={{ padding: '14px 18px', borderBottom: '1px solid #1E1E2E', cursor: 'pointer', background: selected?.id === t.id ? '#6366F108' : 'transparent', transition: 'background 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{t.subject}</span>
                <span style={S.badge(STATUS_COLORS[t.status] || '#64748B')}>{t.status}</span>
              </div>
              <div style={{ color: '#64748B', fontSize: 11 }}>{t.user?.firstName} {t.user?.lastName} · #{t.ticketNo}</div>
            </div>
          ))}
        {!isLoading && !data?.length && <div style={{ padding: 32, textAlign: 'center', color: '#64748B' }}>No tickets yet</div>}
      </div>

      <div style={S.card}>
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #2D2D3F' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div><h4 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{selected.subject}</h4><div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>#{selected.ticketNo} · {selected.priority} priority</div></div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => <button key={s} style={S.btn('ghost', 'sm')} onClick={() => statusMut.mutate({ id: selected.id, status: s })}>{s.replace('_', ' ')}</button>)}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              <div style={{ background: '#0D0D1A', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 6 }}>Original Message</div>
                <div style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>{selected.description}</div>
              </div>
              {(selected.replies || []).map(r => (
                <div key={r.id} style={{ background: r.isAdmin ? '#6366F111' : '#0D0D1A', borderRadius: 10, padding: 12, marginBottom: 10, border: r.isAdmin ? '1px solid #6366F122' : 'none' }}>
                  <div style={{ fontSize: 10, color: '#64748B', marginBottom: 4 }}>{r.isAdmin ? '🛡 Staff' : '👤 Customer'} · {format(new Date(r.createdAt), 'MMM d HH:mm')}</div>
                  <div style={{ fontSize: 13, color: '#F1F5F9', lineHeight: 1.6 }}>{r.message}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: 16, borderTop: '1px solid #2D2D3F' }}>
              <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Type a reply..." rows={3} style={{ ...S.input, resize: 'none', marginBottom: 10 }} />
              <button style={S.btn()} onClick={() => replyMut.mutate()} disabled={!reply.trim()}>Send Reply</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748B' }}>Select a ticket to view</div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function Announcements() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'INFO', isActive: true });
  const { data, isLoading } = useQuery('announcements', () => announcAPI.getAll().then(r => r.data.data.announcements));
  const createMut = useMutation((d) => announcAPI.create(d), { onSuccess: () => { toast.success('Announcement created!'); qc.invalidateQueries('announcements'); setModal(false); } });
  const deleteMut = useMutation((id) => announcAPI.delete(id), { onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries('announcements'); } });

  const TYPE_COLORS = { INFO: '#6366F1', WARNING: '#F59E0B', SUCCESS: '#10B981', DANGER: '#EF4444' };

  return (
    <div>
      <PageHeader title="Announcements" sub="Manage site-wide announcements">
        <button style={S.btn()} onClick={() => setModal(true)}>+ New Announcement</button>
      </PageHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isLoading ? <div style={{ color: '#64748B' }}>Loading...</div> :
          (data || []).map(a => (
            <div key={a.id} style={{ background: '#12121E', border: `1px solid ${TYPE_COLORS[a.type] || '#2D2D3F'}33`, borderRadius: 12, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={S.badge(TYPE_COLORS[a.type] || '#64748B')}>{a.type}</span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{a.title}</span>
                  {!a.isActive && <span style={S.badge('#64748B')}>Hidden</span>}
                </div>
                <div style={{ color: '#64748B', fontSize: 13, lineHeight: 1.6 }}>{a.content}</div>
              </div>
              <button style={{ ...S.btn('danger', 'sm'), marginLeft: 16, flexShrink: 0 }} onClick={() => deleteMut.mutate(a.id)}>🗑</button>
            </div>
          ))}
        {!isLoading && !data?.length && <div style={{ padding: 32, textAlign: 'center', color: '#64748B' }}>No announcements yet</div>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Announcement">
        <Field label="Title"><input style={S.input} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></Field>
        <Field label="Content"><textarea style={{ ...S.input, resize: 'vertical' }} rows={4} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} /></Field>
        <Field label="Type">
          <select style={S.input} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            <option>INFO</option><option>WARNING</option><option>SUCCESS</option><option>DANGER</option>
          </select>
        </Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#94A3B8', marginBottom: 16 }}>
          <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} /> Show on site
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...S.btn('ghost'), flex: 1, justifyContent: 'center' }} onClick={() => setModal(false)}>Cancel</button>
          <button style={{ ...S.btn(), flex: 2, justifyContent: 'center' }} onClick={() => createMut.mutate(form)} disabled={!form.title}>Publish</button>
        </div>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY LOGS PAGE
// ══════════════════════════════════════════════════════════════════════════════
export function ActivityLogs() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery(['activity', page], () =>
    fetch(`${process.env.REACT_APP_API_URL || '/api/v1'}/activity?page=${page}&limit=50`, { headers: { Authorization: `Bearer ${localStorage.getItem('bdn_token')}` } }).then(r => r.json()).then(r => r.data),
    { keepPreviousData: true }
  );

  return (
    <div>
      <PageHeader title="Activity Logs" sub="Track all admin and user actions" />
      <Table headers={['Action', 'User', 'Entity', 'IP Address', 'Time']} loading={isLoading} empty="No activity logs">
        {(data?.logs || []).map(l => (
          <tr key={l.id} style={{ borderTop: '1px solid #1E1E2E' }}>
            <td style={{ ...S.td, fontWeight: 700, color: '#A5B4FC' }}>{l.action}</td>
            <td style={{ ...S.td, color: '#94A3B8' }}>{l.user ? `${l.user.firstName} ${l.user.lastName}` : 'System'}</td>
            <td style={{ ...S.td, color: '#64748B' }}>{l.entity || '—'} {l.entityId ? `(${l.entityId.slice(0, 8)})` : ''}</td>
            <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11, color: '#64748B' }}>{l.ipAddress || '—'}</td>
            <td style={{ ...S.td, color: '#64748B', fontSize: 11 }}>{format(new Date(l.createdAt), 'MMM d HH:mm:ss')}</td>
          </tr>
        ))}
      </Table>
      {data?.pagination?.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button style={S.btn('ghost', 'sm')} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ padding: '5px 12px', color: '#64748B', fontSize: 12 }}>Page {page}</span>
          <button style={S.btn('ghost', 'sm')} disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

// Placeholder pages
export function CustomerDetail() { return <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Customer detail page — Coming soon</div>; }
export function LegalPages() { return <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Use Settings → Legal Pages to manage content</div>; }
