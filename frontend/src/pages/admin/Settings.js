import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import { settingsAPI, uploadAPI, legalAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const S = {
  card: { background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, marginBottom: 20, overflow: 'hidden' },
  cardHead: { padding: '14px 20px', borderBottom: '1px solid #2D2D3F', background: '#0D0D1A', display: 'flex', alignItems: 'center', gap: 10 },
  cardBody: { padding: 20 },
  input: { width: '100%', background: '#0D0D1A', border: '1px solid #2D2D3F', borderRadius: 8, color: '#F1F5F9', padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  label: { display: 'block', color: '#94A3B8', fontSize: 11, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' },
  btn: (v = 'primary') => ({
    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', fontSize: 13,
    background: v === 'primary' ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : '#2D2D3F',
    color: v === 'primary' ? '#fff' : '#94A3B8',
  }),
};

const Field = ({ label, children, note }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={S.label}>{label}</label>
    {children}
    {note && <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 11 }}>{note}</p>}
  </div>
);

const Grid2 = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{children}</div>;

const SectionCard = ({ icon, title, children }) => (
  <div style={S.card}>
    <div style={S.cardHead}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</h3>
    </div>
    <div style={S.cardBody}>{children}</div>
  </div>
);

const LEGAL_SLUGS = ['privacy-policy', 'terms', 'refund-policy', 'about', 'faq', 'contact'];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [vals, setVals] = useState({});
  const [legalSlug, setLegalSlug] = useState('privacy-policy');
  const [legalContent, setLegalContent] = useState('');
  const [legalTitle, setLegalTitle] = useState('');

  const { data, isLoading } = useQuery('settings-all', () => settingsAPI.get().then(r => r.data?.data?.settings || {}));
  const { data: legalData, refetch: refetchLegal } = useQuery(['legal', legalSlug], () => legalAPI.get(legalSlug).then(r => r.data.data.page).catch(() => null));

  useEffect(() => { if (data) setVals(Object.entries(data).reduce((acc, [g, v]) => ({ ...acc, ...v }), {})); }, [data]);
  useEffect(() => { if (legalData) { setLegalContent(legalData.content || ''); setLegalTitle(legalData.title || ''); } }, [legalData]);

  const v = (key) => vals[key] || '';
  const set = (key) => (e) => setVals(p => ({ ...p, [key]: e.target.value }));

  const saveMut = useMutation(({ settings, group }) => settingsAPI.update(settings, group), {
    onSuccess: () => toast.success('Settings saved!'),
    onError: () => toast.error('Failed to save settings'),
  });

  const saveLegalMut = useMutation(() => legalAPI.update(legalSlug, { title: legalTitle, content: legalContent }), {
    onSuccess: () => { toast.success('Page saved!'); refetchLegal(); },
  });

  const handleSave = (group, keys) => {
    const subset = keys.reduce((acc, k) => { acc[k] = vals[k] || ''; return acc; }, {});
    saveMut.mutate({ settings: subset, group });
  };

  const handleUpload = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await uploadAPI.upload(file);
      setVals(p => ({ ...p, [key]: res.data.data.url }));
      toast.success('File uploaded!');
    } catch { toast.error('Upload failed'); }
  };

  const TABS = [
    { id: 'general',  label: '⚙️ General'       },
    { id: 'branding', label: '🎨 Branding'      },
    { id: 'payment',  label: '💳 Payment'       },
    { id: 'captive',  label: '🌐 Captive Portal'},
    { id: 'seo',      label: '🔍 SEO'           },
    { id: 'legal',    label: '📜 Legal Pages'   },
  ];

  if (isLoading) return <div style={{ color: '#64748B', padding: 40, textAlign: 'center' }}>Loading settings...</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 900 }}>Settings</h1>
        <p style={{ color: '#64748B', margin: 0, fontSize: 13 }}>All changes apply site-wide without touching code</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#0D0D1A', borderRadius: 12, padding: 6, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
            background: activeTab === t.id ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : 'transparent',
            color: activeTab === t.id ? '#fff' : '#64748B',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── GENERAL ── */}
      {activeTab === 'general' && (
        <SectionCard icon="⚙️" title="General Settings">
          <Grid2>
            <Field label="Company Name"><input style={S.input} value={v('company_name')} onChange={set('company_name')} /></Field>
            <Field label="Tagline"><input style={S.input} value={v('company_tagline')} onChange={set('company_tagline')} /></Field>
            <Field label="Email"><input style={S.input} type="email" value={v('company_email')} onChange={set('company_email')} /></Field>
            <Field label="Phone"><input style={S.input} value={v('company_phone')} onChange={set('company_phone')} /></Field>
            <Field label="WhatsApp"><input style={S.input} value={v('company_whatsapp')} onChange={set('company_whatsapp')} /></Field>
            <Field label="Website"><input style={S.input} value={v('company_website')} onChange={set('company_website')} /></Field>
            <Field label="Currency"><input style={S.input} value={v('currency')} onChange={set('currency')} /></Field>
            <Field label="Currency Symbol"><input style={S.input} value={v('currency_symbol')} onChange={set('currency_symbol')} /></Field>
            <Field label="Timezone"><input style={S.input} value={v('timezone')} onChange={set('timezone')} /></Field>
            <Field label="Country"><input style={S.input} value={v('country')} onChange={set('country')} /></Field>
          </Grid2>
          <Field label="Business Address">
            <textarea style={{ ...S.input, resize: 'vertical' }} rows={2} value={v('company_address')} onChange={set('company_address')} />
          </Field>
          <Field label="Maintenance Mode">
            <select style={S.input} value={v('maintenance_mode')} onChange={set('maintenance_mode')}>
              <option value="false">Off — Site is live</option>
              <option value="true">On — Maintenance mode active</option>
            </select>
          </Field>
          <button style={S.btn()} onClick={() => handleSave('general', ['company_name', 'company_tagline', 'company_email', 'company_phone', 'company_whatsapp', 'company_website', 'currency', 'currency_symbol', 'timezone', 'country', 'company_address', 'maintenance_mode'])}>
            💾 Save General Settings
          </button>
        </SectionCard>
      )}

      {/* ── BRANDING ── */}
      {activeTab === 'branding' && (
        <SectionCard icon="🎨" title="Branding & Appearance">
          <Grid2>
            <Field label="Primary Color" note="Main buttons, links, highlights">
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="color" value={v('primary_color') || '#6366F1'} onChange={set('primary_color')} style={{ width: 44, height: 38, padding: 2, border: '1px solid #2D2D3F', borderRadius: 8, background: 'none', cursor: 'pointer' }} />
                <input style={S.input} value={v('primary_color')} onChange={set('primary_color')} />
              </div>
            </Field>
            <Field label="Secondary Color">
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="color" value={v('secondary_color') || '#8B5CF6'} onChange={set('secondary_color')} style={{ width: 44, height: 38, padding: 2, border: '1px solid #2D2D3F', borderRadius: 8, background: 'none', cursor: 'pointer' }} />
                <input style={S.input} value={v('secondary_color')} onChange={set('secondary_color')} />
              </div>
            </Field>
            <Field label="Accent Color">
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="color" value={v('accent_color') || '#EC4899'} onChange={set('accent_color')} style={{ width: 44, height: 38, padding: 2, border: '1px solid #2D2D3F', borderRadius: 8, background: 'none', cursor: 'pointer' }} />
                <input style={S.input} value={v('accent_color')} onChange={set('accent_color')} />
              </div>
            </Field>
          </Grid2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 8 }}>
            {[['Logo', 'logo_url'], ['Favicon', 'favicon_url'], ['Login Background', 'login_bg_url']].map(([label, key]) => (
              <Field key={key} label={label}>
                {v(key) && <img src={v(key)} alt={label} style={{ width: '100%', height: 80, objectFit: 'contain', borderRadius: 8, background: '#0D0D1A', marginBottom: 8 }} />}
                <input type="file" accept="image/*" onChange={e => handleUpload(e, key)} style={{ ...S.input, padding: '6px 10px' }} />
                <input style={{ ...S.input, marginTop: 6 }} value={v(key)} onChange={set(key)} placeholder="Or paste URL..." />
              </Field>
            ))}
          </div>

          <button style={S.btn()} onClick={() => handleSave('branding', ['primary_color', 'secondary_color', 'accent_color', 'logo_url', 'favicon_url', 'login_bg_url'])}>
            💾 Save Branding
          </button>
        </SectionCard>
      )}

      {/* ── PAYMENT ── */}
      {activeTab === 'payment' && (
        <>
          <SectionCard icon="💳" title="Paystack">
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#94A3B8' }}>
                <input type="checkbox" checked={v('paystack_enabled') === 'true'} onChange={e => setVals(p => ({ ...p, paystack_enabled: e.target.checked ? 'true' : 'false' }))} />
                Enable Paystack
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#94A3B8' }}>
                <input type="checkbox" checked={v('paystack_test_mode') === 'true'} onChange={e => setVals(p => ({ ...p, paystack_test_mode: e.target.checked ? 'true' : 'false' }))} />
                Test Mode
              </label>
            </div>
            <Grid2>
              <Field label="Public Key"><input style={S.input} value={v('paystack_public_key')} onChange={set('paystack_public_key')} placeholder="pk_test_..." /></Field>
              <Field label="Secret Key"><input style={S.input} type="password" value={v('paystack_secret_key')} onChange={set('paystack_secret_key')} placeholder="sk_test_..." /></Field>
            </Grid2>
            <Field label="Webhook URL" note={`Set this in your Paystack dashboard → Settings → Webhooks`}>
              <input style={{ ...S.input, color: '#A5B4FC' }} readOnly value={`${window.location.origin}/api/v1/payments/webhook/paystack`} />
            </Field>
            <button style={S.btn()} onClick={() => handleSave('payment', ['paystack_enabled', 'paystack_public_key', 'paystack_secret_key', 'paystack_test_mode'])}>💾 Save Paystack</button>
          </SectionCard>

          <SectionCard icon="💸" title="Flutterwave">
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#94A3B8' }}>
                <input type="checkbox" checked={v('flutterwave_enabled') === 'true'} onChange={e => setVals(p => ({ ...p, flutterwave_enabled: e.target.checked ? 'true' : 'false' }))} />
                Enable Flutterwave
              </label>
            </div>
            <Grid2>
              <Field label="Public Key"><input style={S.input} value={v('flutterwave_public_key')} onChange={set('flutterwave_public_key')} placeholder="FLWPUBK_TEST-..." /></Field>
              <Field label="Secret Key"><input style={S.input} type="password" value={v('flutterwave_secret_key')} onChange={set('flutterwave_secret_key')} placeholder="FLWSECK_TEST-..." /></Field>
            </Grid2>
            <Field label="Webhook URL" note="Set this in your Flutterwave dashboard → Webhooks">
              <input style={{ ...S.input, color: '#A5B4FC' }} readOnly value={`${window.location.origin}/api/v1/payments/webhook/flutterwave`} />
            </Field>
            <button style={S.btn()} onClick={() => handleSave('payment', ['flutterwave_enabled', 'flutterwave_public_key', 'flutterwave_secret_key'])}>💾 Save Flutterwave</button>
          </SectionCard>

          <SectionCard icon="⚡" title="Default Gateway">
            <Field label="Default Payment Gateway">
              <select style={S.input} value={v('default_gateway')} onChange={set('default_gateway')}>
                <option value="PAYSTACK">Paystack</option>
                <option value="FLUTTERWAVE">Flutterwave</option>
              </select>
            </Field>
            <button style={S.btn()} onClick={() => handleSave('payment', ['default_gateway'])}>💾 Save</button>
          </SectionCard>
        </>
      )}

      {/* ── CAPTIVE PORTAL ── */}
      {activeTab === 'captive' && (
        <SectionCard icon="🌐" title="Captive Portal (Login Page)">
          <Field label="Welcome Title">
            <input style={S.input} value={v('captive_welcome')} onChange={set('captive_welcome')} placeholder="Welcome to Blue Dot Networks" />
          </Field>
          <Field label="Subtitle / Description">
            <textarea style={{ ...S.input, resize: 'vertical' }} rows={2} value={v('captive_subtitle')} onChange={set('captive_subtitle')} />
          </Field>
          <Field label="Footer Text">
            <input style={S.input} value={v('captive_footer')} onChange={set('captive_footer')} />
          </Field>
          <button style={S.btn()} onClick={() => handleSave('captive', ['captive_welcome', 'captive_subtitle', 'captive_footer'])}>💾 Save Captive Portal Settings</button>
        </SectionCard>
      )}

      {/* ── SEO ── */}
      {activeTab === 'seo' && (
        <SectionCard icon="🔍" title="SEO & Meta">
          <Field label="Meta Title"><input style={S.input} value={v('meta_title')} onChange={set('meta_title')} /></Field>
          <Field label="Meta Description"><textarea style={{ ...S.input, resize: 'vertical' }} rows={3} value={v('meta_description')} onChange={set('meta_description')} /></Field>
          <Field label="Keywords"><input style={S.input} value={v('meta_keywords')} onChange={set('meta_keywords')} placeholder="hotspot, wifi, voucher, internet" /></Field>
          <button style={S.btn()} onClick={() => handleSave('seo', ['meta_title', 'meta_description', 'meta_keywords'])}>💾 Save SEO</button>
        </SectionCard>
      )}

      {/* ── LEGAL PAGES ── */}
      {activeTab === 'legal' && (
        <SectionCard icon="📜" title="Legal Pages">
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {LEGAL_SLUGS.map(slug => (
              <button key={slug} onClick={() => setLegalSlug(slug)} style={{
                border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: legalSlug === slug ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : '#2D2D3F',
                color: legalSlug === slug ? '#fff' : '#94A3B8',
              }}>{slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</button>
            ))}
          </div>
          <Field label="Page Title"><input style={S.input} value={legalTitle} onChange={e => setLegalTitle(e.target.value)} /></Field>
          <Field label="Content (HTML supported)" note="You can use HTML tags like <h2>, <p>, <ul>, <li>, <strong>">
            <textarea style={{ ...S.input, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} rows={16} value={legalContent} onChange={e => setLegalContent(e.target.value)} />
          </Field>
          <button style={S.btn()} onClick={() => saveLegalMut.mutate()} disabled={saveLegalMut.isLoading}>
            {saveLegalMut.isLoading ? 'Saving...' : '💾 Save Page'}
          </button>
        </SectionCard>
      )}
    </div>
  );
}
