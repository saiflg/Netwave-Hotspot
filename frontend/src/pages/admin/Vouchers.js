import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { vouchersAPI, plansAPI, routersAPI, PUBLIC_API } from '../../utils/api';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';

// ─── Shared styles ────────────────────────────────────────────────────────────
const S = {
  card:  { background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, overflow: 'hidden' },
  btn:   (v = 'primary', sz = 'md') => ({
    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
    fontSize:  sz === 'sm' ? 12 : 14,
    padding:   sz === 'sm' ? '6px 12px' : '10px 18px',
    background: v === 'primary' ? 'linear-gradient(135deg,#6366F1,#8B5CF6)'
              : v === 'danger'  ? '#EF444422'
              : v === 'success' ? '#10B98122'
              : '#2D2D3F',
    color: v === 'primary' ? '#fff'
         : v === 'danger'  ? '#EF4444'
         : v === 'success' ? '#10B981'
         : '#94A3B8',
    ...(v === 'danger'  && { border: '1px solid #EF444433' }),
    ...(v === 'success' && { border: '1px solid #10B98133' }),
  }),
  input: { width: '100%', background: '#0D0D1A', border: '1px solid #2D2D3F', borderRadius: 8, color: '#F1F5F9', padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  label: { display: 'block', color: '#94A3B8', fontSize: 11, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' },
  badge: (c) => ({ background: c + '22', color: c, border: `1px solid ${c}44`, borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }),
};

const STATUS_COLORS = { UNUSED: '#6366F1', ACTIVE: '#10B981', EXPIRED: '#EF4444', SUSPENDED: '#F59E0B' };

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={S.label}>{label}</label>
    {children}
  </div>
);

const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#1E1E2E', borderRadius: 16, width: '100%', maxWidth: wide ? 700 : 520, maxHeight: '90vh', overflow: 'auto', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #334155' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: '#2D2D3F', border: 'none', borderRadius: 7, color: '#94A3B8', cursor: 'pointer', padding: '6px 10px' }}>✕</button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
};

// ─── Core download helper — uses fetch + blob, works with auth ────────────────
async function downloadFile(url, filename, token) {
  try {
    toast.loading(`Preparing ${filename}...`, { id: 'export' });

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      toast.error('Session expired. Please log in again.', { id: 'export' });
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || 'Export failed.', { id: 'export' });
      return;
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href     = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);

    toast.success(`${filename} downloaded!`, { id: 'export' });
  } catch (err) {
    console.error('Export error:', err);
    toast.error('Download failed. Please try again.', { id: 'export' });
  }
}

export default function Vouchers() {
  const qc = useQueryClient();
  const [filters, setFilters]   = useState({ status: '', search: '', page: 1 });
  const [modal, setModal]       = useState(null); // 'create'|'bulk'|'view'|'qr'
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [exporting, setExporting]     = useState('');
  const [pdfCount,  setPdfCount]      = useState(50);   // max vouchers in PDF
  const [showPdfOpts, setShowPdfOpts] = useState(false);

  const [form, setForm] = useState({
    planId: '', routerId: '', prefix: '', customCode: '',
    price: '', type: 'TIME', deviceLimit: 1,
  });
  const [bulk, setBulk] = useState({
    planId: '', routerId: '', prefix: '', count: 10, batchName: '',
  });

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery(
    ['vouchers', filters],
    () => vouchersAPI.getAll(filters).then(r => r.data.data),
    { keepPreviousData: true }
  );
  const { data: plansData }   = useQuery('plans-all',  () => plansAPI.getAllAdmin().then(r => r.data.data));
  const { data: routersData } = useQuery('routers',    () => routersAPI.getAll().then(r => r.data.data));

  const plans   = plansData?.plans   || [];
  const routers = routersData?.routers || [];

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMut = useMutation((d) => vouchersAPI.create(d), {
    onSuccess: () => {
      toast.success('Voucher created!');
      qc.invalidateQueries('vouchers');
      setModal(null);
      setForm({ planId: '', routerId: '', prefix: '', customCode: '', price: '', type: 'TIME', deviceLimit: 1 });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create voucher'),
  });

  const bulkMut = useMutation((d) => vouchersAPI.bulkGenerate(d), {
    onSuccess: (res) => {
      toast.success(`${res.data.data.count} vouchers generated!`);
      qc.invalidateQueries('vouchers');
      setModal(null);
      setBulk({ planId: '', routerId: '', prefix: '', count: 10, batchName: '' });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Bulk generation failed'),
  });

  const statusMut = useMutation(({ id, status }) => vouchersAPI.updateStatus(id, status), {
    onSuccess: (_, { status }) => { toast.success(`Voucher ${status.toLowerCase()}`); qc.invalidateQueries('vouchers'); },
  });

  const deleteMut = useMutation((id) => vouchersAPI.delete(id), {
    onSuccess: () => { toast.success('Voucher deleted'); qc.invalidateQueries('vouchers'); setModal(null); },
    onError:   (e) => toast.error(e.response?.data?.message || 'Cannot delete active voucher'),
  });

  // ── Export handlers — fetch+blob approach ──────────────────────────────────
  const handleExport = async (type) => {
    const token = localStorage.getItem('bdn_token');
    if (!token) { toast.error('Please log in to export.'); return; }
    setShowPdfOpts(false);

    // Build query string
    const params = new URLSearchParams();
    if (selectedIds.length > 0) {
      params.set('ids', selectedIds.join(','));
    } else {
      // Respect the chosen PDF count limit
      if (type === 'pdf') params.set('limit', String(pdfCount));
      if (filters.status)  params.set('status', filters.status);
    }

    // MUST use absolute URL — relative URLs hit Vercel, not the Render backend
    const base      = type === 'pdf' ? `${PUBLIC_API}/vouchers/export/pdf` : `${PUBLIC_API}/vouchers/export/excel`;
    const url       = `${base}?${params.toString()}`;
    const filename  = type === 'pdf'
      ? `vouchers-${Date.now()}.pdf`
      : `vouchers-${Date.now()}.xlsx`;

    setExporting(type);
    await downloadFile(url, filename, token);
    setExporting('');
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const vouchers   = data?.vouchers   || [];
  const pagination = data?.pagination || {};
  const f  = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const bf = (k) => (e) => setBulk(p => ({ ...p, [k]: e.target.value }));

  const selectedPlanInfo = bulk.planId ? plans.find(p => p.id === bulk.planId) : null;

  // Close options dropdown when clicking outside
  React.useEffect(() => {
    if (!showPdfOpts) return;
    const close = () => setShowPdfOpts(false);
    document.addEventListener('click', close, { once: true });
    return () => document.removeEventListener('click', close);
  }, [showPdfOpts]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 900 }}>Vouchers</h1>
          <p style={{ color: '#64748B', margin: 0, fontSize: 13 }}>{pagination.total || 0} vouchers total</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <button style={{ ...S.btn('ghost'), opacity: exporting === 'pdf' ? 0.6 : 1, borderRadius: '8px 0 0 8px' }}
              onClick={() => handleExport('pdf')} disabled={exporting === 'pdf'}>
              {exporting === 'pdf' ? '⏳ Generating...' : '📄 Export PDF'}
            </button>
            <button
              style={{ ...S.btn('ghost'), borderLeft: '1px solid #334155', borderRadius: '0 8px 8px 0', padding: '10px 10px' }}
              onClick={() => setShowPdfOpts(v => !v)}
              title="PDF options">
              ▾
            </button>
            {showPdfOpts && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#1E1E2E', border: '1px solid #334155', borderRadius: 10, padding: 16, zIndex: 200, minWidth: 220, boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>PDF Options</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    Max vouchers per PDF
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                    {[10, 20, 30, 50, 100, 200].map(n => (
                      <button key={n}
                        onClick={() => { setPdfCount(n); setShowPdfOpts(false); }}
                        style={{
                          border: `1px solid ${pdfCount === n ? '#6366F1' : '#2D2D3F'}`,
                          background: pdfCount === n ? '#6366F122' : 'transparent',
                          color: pdfCount === n ? '#A5B4FC' : '#64748B',
                          borderRadius: 6, padding: '6px 4px', fontSize: 12,
                          fontWeight: pdfCount === n ? 800 : 400, cursor: 'pointer',
                        }}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <div style={{ color: '#64748B', fontSize: 11, marginTop: 8 }}>
                    Currently: <strong style={{ color: '#A5B4FC' }}>{pdfCount}</strong> vouchers per PDF
                    {selectedIds.length > 0 && <span> (overridden by selection: {selectedIds.length})</span>}
                  </div>
                </div>
                <button
                  onClick={() => { setShowPdfOpts(false); handleExport('pdf'); }}
                  disabled={exporting === 'pdf'}
                  style={{ ...S.btn(), width: '100%', justifyContent: 'center', fontSize: 13 }}>
                  📄 Export {selectedIds.length > 0 ? selectedIds.length : pdfCount} Vouchers
                </button>
              </div>
            )}
          </div>
          <button style={{ ...S.btn('ghost'), opacity: exporting === 'excel' ? 0.6 : 1 }}
            onClick={() => handleExport('excel')} disabled={exporting === 'excel'}>
            {exporting === 'excel' ? '⏳ Generating...' : '📊 Export Excel'}
          </button>
          <button style={S.btn('ghost')} onClick={() => setModal('bulk')}>⚡ Bulk Generate</button>
          <button style={S.btn()}        onClick={() => setModal('create')}>+ New Voucher</button>
        </div>
      </div>

      {/* Selected bar */}
      {selectedIds.length > 0 && (
        <div style={{ background: '#6366F122', border: '1px solid #6366F144', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: '#A5B4FC', fontWeight: 700, fontSize: 13 }}>{selectedIds.length} voucher{selectedIds.length > 1 ? 's' : ''} selected</span>
          <button style={S.btn('primary', 'sm')} onClick={() => handleExport('pdf')}  disabled={exporting === 'pdf'}>📄 Export PDF</button>
          <button style={S.btn('primary', 'sm')} onClick={() => handleExport('excel')} disabled={exporting === 'excel'}>📊 Export Excel</button>
          <button onClick={() => setSelectedIds([])} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 18, marginLeft: 'auto' }}>✕</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={filters.search}
          onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
          placeholder="Search by code..." style={{ ...S.input, width: 220 }} />
        <select value={filters.status}
          onChange={e => setFilters(p => ({ ...p, status: e.target.value, page: 1 }))}
          style={{ ...S.input, width: 150 }}>
          <option value="">All Status</option>
          {['UNUSED','ACTIVE','EXPIRED','SUSPENDED'].map(s => <option key={s}>{s}</option>)}
        </select>
        {filters.status || filters.search ? (
          <button style={S.btn('ghost', 'sm')} onClick={() => setFilters({ status: '', search: '', page: 1 })}>
            ✕ Clear
          </button>
        ) : null}
      </div>

      {/* Table */}
      <div style={S.card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0D0D1A' }}>
                <th style={{ padding: '10px 14px', width: 36 }}>
                  <input type="checkbox"
                    checked={selectedIds.length === vouchers.length && vouchers.length > 0}
                    onChange={e => setSelectedIds(e.target.checked ? vouchers.map(v => v.id) : [])} />
                </th>
                {['Code','Plan','Price','Type','Status','Expires','Router','Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(6).fill(0).map((_, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #1E1E2E' }}>
                      {Array(9).fill(0).map((_, j) => (
                        <td key={j} style={{ padding: '12px 14px' }}>
                          <div style={{ background: '#1E1E2E', borderRadius: 4, height: 14, width: j === 0 ? 20 : '80%' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : vouchers.map((v, i) => (
                    <tr key={v.id} style={{ borderTop: '1px solid #1E1E2E', background: selectedIds.includes(v.id) ? '#6366F108' : i % 2 === 0 ? 'transparent' : '#0D0D1A08' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <input type="checkbox" checked={selectedIds.includes(v.id)}
                          onChange={e => setSelectedIds(p => e.target.checked ? [...p, v.id] : p.filter(x => x !== v.id))} />
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 800, color: '#A5B4FC', fontSize: 13, letterSpacing: 1 }}>{v.code}</td>
                      <td style={{ padding: '10px 14px', color: '#94A3B8' }}>{v.plan?.name || '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#10B981', fontWeight: 700 }}>₦{Number(v.price).toLocaleString()}</td>
                      <td style={{ padding: '10px 14px', color: '#64748B' }}>{v.type}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={S.badge(STATUS_COLORS[v.status] || '#64748B')}>{v.status}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748B', fontSize: 11 }}>
                        {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : 'On first use'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748B', fontSize: 11 }}>{v.router?.name || 'Any'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button style={S.btn('ghost', 'sm')} onClick={() => { setSelected(v); setModal('view'); }}>👁</button>
                          <button style={S.btn('ghost', 'sm')} onClick={() => { setSelected(v); setModal('qr');  }}>QR</button>
                          {v.status === 'ACTIVE'    && <button style={S.btn('ghost',   'sm')} onClick={() => statusMut.mutate({ id: v.id, status: 'SUSPENDED' })}>Suspend</button>}
                          {v.status === 'SUSPENDED' && <button style={S.btn('success', 'sm')} onClick={() => statusMut.mutate({ id: v.id, status: 'UNUSED'    })}>Activate</button>}
                          {v.status === 'EXPIRED'   && <button style={S.btn('success', 'sm')} onClick={() => statusMut.mutate({ id: v.id, status: 'UNUSED'    })}>Reset</button>}
                          <button style={S.btn('danger', 'sm')} onClick={() => { if (window.confirm('Delete this voucher?')) deleteMut.mutate(v.id); }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
              {!isLoading && vouchers.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                  No vouchers found. {!filters.status && !filters.search && 'Create your first voucher or generate in bulk.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ padding: '14px 18px', borderTop: '1px solid #2D2D3F', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748B', fontSize: 12 }}>
              Page {pagination.page} of {pagination.pages} · {pagination.total} total
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={S.btn('ghost', 'sm')} disabled={filters.page <= 1}
                onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}>← Prev</button>
              <button style={S.btn('ghost', 'sm')} disabled={filters.page >= pagination.pages}
                onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE MODAL ─────────────────────────────────────────────────── */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Create Single Voucher">
        <Field label="Plan *">
          <select style={S.input} value={form.planId} onChange={f('planId')}>
            <option value="">Select a plan...</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ₦{Number(p.price).toLocaleString()} / {p.validityLabel}</option>)}
          </select>
        </Field>
        <Field label="Router (optional)">
          <select style={S.input} value={form.routerId} onChange={f('routerId')}>
            <option value="">All routers</option>
            {routers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Custom Code (optional)">
            <input style={{ ...S.input, fontFamily: 'monospace', textTransform: 'uppercase' }}
              value={form.customCode} onChange={f('customCode')} placeholder="Leave blank = random" />
          </Field>
          <Field label="Code Prefix (optional)">
            <input style={S.input} value={form.prefix} onChange={f('prefix')} placeholder="e.g. VIP" />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Price Override (₦)">
            <input style={S.input} type="number" value={form.price} onChange={f('price')} placeholder="Leave blank = plan price" />
          </Field>
          <Field label="Device Limit">
            <input style={S.input} type="number" value={form.deviceLimit} onChange={f('deviceLimit')} min={1} max={10} />
          </Field>
        </div>
        <Field label="Voucher Type">
          <select style={S.input} value={form.type} onChange={f('type')}>
            <option value="TIME">Time-Based</option>
            <option value="DATA">Data-Based</option>
            <option value="SPEED">Speed-Based</option>
          </select>
        </Field>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button style={{ ...S.btn('ghost'), flex: 1, justifyContent: 'center' }} onClick={() => setModal(null)}>Cancel</button>
          <button style={{ ...S.btn(), flex: 2, justifyContent: 'center' }}
            onClick={() => createMut.mutate(form)}
            disabled={!form.planId || createMut.isLoading}>
            {createMut.isLoading ? 'Creating...' : '✓ Create Voucher'}
          </button>
        </div>
      </Modal>

      {/* ── BULK GENERATE MODAL ───────────────────────────────────────────── */}
      <Modal open={modal === 'bulk'} onClose={() => setModal(null)} title="⚡ Bulk Generate Vouchers">
        <div style={{ background: '#0D0D1A', borderRadius: 10, padding: 14, marginBottom: 18, fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>
          Generate up to <strong style={{ color: '#A5B4FC' }}>500 vouchers</strong> at once. Each gets a unique code and QR code automatically.
        </div>
        <Field label="Plan *">
          <select style={S.input} value={bulk.planId} onChange={bf('planId')}>
            <option value="">Select a plan...</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ₦{Number(p.price).toLocaleString()} / {p.validityLabel}</option>)}
          </select>
        </Field>
        <Field label="Router (optional)">
          <select style={S.input} value={bulk.routerId} onChange={bf('routerId')}>
            <option value="">All routers</option>
            {routers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Count (max 500)">
            <input style={S.input} type="number" value={bulk.count}
              onChange={bf('count')} min={1} max={500} />
          </Field>
          <Field label="Code Prefix (optional)">
            <input style={S.input} value={bulk.prefix} onChange={bf('prefix')} placeholder="e.g. HOTEL" />
          </Field>
        </div>
        <Field label="Batch Name">
          <input style={S.input} value={bulk.batchName} onChange={bf('batchName')} placeholder="e.g. Café Batch July 2025" />
        </Field>

        {selectedPlanInfo && bulk.count > 0 && (
          <div style={{ background: '#10B98111', border: '1px solid #10B98133', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#10B981', fontWeight: 700, marginBottom: 4 }}>Preview</div>
            <div style={{ color: '#94A3B8', fontSize: 12 }}>
              {bulk.count} vouchers · Plan: <strong>{selectedPlanInfo.name}</strong> · Total value: ₦{(Number(selectedPlanInfo.price) * Number(bulk.count)).toLocaleString()}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...S.btn('ghost'), flex: 1, justifyContent: 'center' }} onClick={() => setModal(null)}>Cancel</button>
          <button style={{ ...S.btn(), flex: 2, justifyContent: 'center' }}
            onClick={() => bulkMut.mutate(bulk)}
            disabled={!bulk.planId || bulkMut.isLoading}>
            {bulkMut.isLoading
              ? `Generating ${bulk.count} vouchers...`
              : `⚡ Generate ${bulk.count} Voucher${Number(bulk.count) !== 1 ? 's' : ''}`}
          </button>
        </div>
      </Modal>

      {/* ── VIEW DETAIL MODAL ─────────────────────────────────────────────── */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title="Voucher Details" wide>
        {selected && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Code',         selected.code],
                ['Status',       selected.status],
                ['Plan',         selected.plan?.name || '—'],
                ['Price',        `₦${Number(selected.price).toLocaleString()}`],
                ['Type',         selected.type],
                ['Device Limit', selected.deviceLimit],
                ['Router',       selected.router?.name || 'Any router'],
                ['Activated At', selected.activatedAt  ? new Date(selected.activatedAt).toLocaleString()  : '—'],
                ['Expires At',   selected.expiresAt    ? new Date(selected.expiresAt).toLocaleString()    : 'On first use'],
                ['Data Used',    `${selected.dataUsed || 0} MB`],
                ['Created',      new Date(selected.createdAt).toLocaleString()],
                ['Batch ID',     selected.batchId ? selected.batchId.slice(0, 12) + '...' : 'Single'],
              ].map(([l, v]) => (
                <div key={l} style={{ background: '#0D0D1A', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: l === 'Code' ? '#A5B4FC' : '#F1F5F9', fontFamily: l === 'Code' ? 'monospace' : 'inherit', letterSpacing: l === 'Code' ? 1 : 0 }}>{String(v)}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button style={S.btn('ghost')} onClick={() => { setModal('qr'); }}>📱 View QR Code</button>
              {selected.status !== 'ACTIVE' && (
                <button style={S.btn('danger')} onClick={() => { deleteMut.mutate(selected.id); }}>🗑 Delete</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── QR CODE MODAL ─────────────────────────────────────────────────── */}
      <Modal open={modal === 'qr'} onClose={() => setModal(null)} title="Voucher QR Code">
        {selected && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: '#fff', padding: 20, borderRadius: 12, display: 'inline-block', marginBottom: 16 }}>
              <QRCode
                value={`${window.location.origin}/auth/qr/${selected.qrToken || selected.id}`}
                size={200}
              />
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, letterSpacing: 4, color: '#A5B4FC', marginBottom: 6 }}>
              {selected.code}
            </div>
            <div style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
              {selected.plan?.name} · ₦{Number(selected.price).toLocaleString()} · Scan to auto-login
            </div>
            <button style={S.btn()} onClick={() => window.print()}>🖨 Print QR Card</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
