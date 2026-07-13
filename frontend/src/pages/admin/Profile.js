import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, settingsAPI, uploadAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const S = {
  input: { width: '100%', background: '#0D0D1A', border: '1px solid #2D2D3F', borderRadius: 8, color: '#F1F5F9', padding: '11px 13px', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s', fontFamily: 'inherit' },
  label: { display: 'block', color: '#94A3B8', fontSize: 11, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' },
  card:  { background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 14, marginBottom: 22, overflow: 'hidden' },
  head:  { padding: '14px 22px', borderBottom: '1px solid #2D2D3F', background: '#0D0D1A', display: 'flex', alignItems: 'center', gap: 10 },
  body:  { padding: 24 },
  btn:   (v = 'primary', sm) => ({
    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: sm ? '8px 16px' : '11px 24px', fontSize: sm ? 12 : 14,
    background: v === 'primary' ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : v === 'danger' ? '#EF444422' : '#2D2D3F',
    color: v === 'primary' ? '#fff' : v === 'danger' ? '#EF4444' : '#94A3B8',
    ...(v === 'danger' && { border: '1px solid #EF444433' }),
  }),
};

const Field = ({ label, note, children }) => (
  <div style={{ marginBottom: 18 }}>
    <label style={S.label}>{label}</label>
    {children}
    {note && <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 11 }}>{note}</p>}
  </div>
);

const SectionCard = ({ icon, title, children }) => (
  <div style={S.card}>
    <div style={S.head}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '.06em' }}>{title}</h3>
    </div>
    <div style={S.body}>{children}</div>
  </div>
);

export default function AdminProfile() {
  const { user, fetchMe, logout } = useAuth();

  // ── Profile form ────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '', address: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Email form ──────────────────────────────────────────────────────────────
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [savingEmail, setSavingEmail] = useState(false);

  // ── Password form ───────────────────────────────────────────────────────────
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  // ── SMTP / Mail settings ────────────────────────────────────────────────────
  const [smtp, setSmtp] = useState({ smtp_host: '', smtp_port: '587', smtp_secure: 'false', smtp_user: '', smtp_pass: '', email_from: '' });
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingMail, setTestingMail] = useState(false);
  const [testMailTo, setTestMailTo] = useState('');

  useEffect(() => {
    if (user) {
      setProfile({ firstName: user.firstName || '', lastName: user.lastName || '', phone: user.phone || '', address: user.address || '' });
      setEmailForm(f => ({ ...f, email: user.email || '' }));
      setTestMailTo(user.email || '');
    }
  }, [user]);

  // Load SMTP settings
  useEffect(() => {
    settingsAPI.get().then(r => {
      const all = r.data?.data?.settings || {};
      const mail = all.mail || {};
      setSmtp({
        smtp_host:   mail.smtp_host   || '',
        smtp_port:   mail.smtp_port   || '587',
        smtp_secure: mail.smtp_secure || 'false',
        smtp_user:   mail.smtp_user   || '',
        smtp_pass:   mail.smtp_pass   || '',
        email_from:  mail.email_from  || '',
      });
    }).catch(() => {});
  }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await authAPI.updateProfile(profile);
      await fetchMe();
      toast.success('Profile updated!');
    } catch (e) { toast.error(e.response?.data?.message || 'Update failed'); }
    finally { setSavingProfile(false); }
  };

  const saveEmail = async () => {
    if (!emailForm.email || !emailForm.password) { toast.error('Enter new email and current password'); return; }
    setSavingEmail(true);
    try {
      await authAPI.updateEmail(emailForm);
      await fetchMe();
      toast.success('Email updated! You may need to log in again.');
      setEmailForm(f => ({ ...f, password: '' }));
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSavingEmail(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { toast.error('New passwords do not match'); return; }
    if (pwdForm.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSavingPwd(true);
    try {
      await authAPI.changePassword({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword });
      toast.success('Password changed! Please log in again.');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => logout(), 1500);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSavingPwd(false); }
  };

  const saveSmtp = async () => {
    setSavingSmtp(true);
    try {
      await settingsAPI.update(smtp, 'mail');
      toast.success('Mail settings saved!');
    } catch (e) { toast.error('Failed to save mail settings'); }
    finally { setSavingSmtp(false); }
  };

  const sendTestMail = async () => {
    if (!testMailTo) { toast.error('Enter a test email address'); return; }
    setTestingMail(true);
    try {
      const token = localStorage.getItem('bdn_token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || '/api/v1'}/auth/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: testMailTo }),
      }).then(r => r.json());
      if (res.success) toast.success('Test email sent! Check your inbox.');
      else toast.error(res.message || 'Failed to send test email');
    } catch { toast.error('Could not send test email'); }
    finally { setTestingMail(false); }
  };

  const p = (setter) => (k) => (e) => setter(prev => ({ ...prev, [k]: e.target.value }));

  const avatar = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, padding: 24, background: 'linear-gradient(135deg,#6366F122,#8B5CF611)', border: '1px solid #6366F133', borderRadius: 16 }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
          {avatar}
        </div>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900 }}>{user?.firstName} {user?.lastName}</h1>
          <div style={{ color: '#64748B', fontSize: 13 }}>{user?.email}</div>
          <div style={{ marginTop: 6 }}>
            <span style={{ background: '#6366F122', color: '#A5B4FC', border: '1px solid #6366F144', borderRadius: 6, fontSize: 11, fontWeight: 700, padding: '2px 10px', textTransform: 'uppercase' }}>{user?.role}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, alignItems: 'start' }}>
        {/* Left column */}
        <div>
          {/* Edit Profile */}
          <SectionCard icon="👤" title="Personal Info">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="First Name">
                <input style={S.input} value={profile.firstName} onChange={p(setProfile)('firstName')} placeholder="First name" />
              </Field>
              <Field label="Last Name">
                <input style={S.input} value={profile.lastName} onChange={p(setProfile)('lastName')} placeholder="Last name" />
              </Field>
            </div>
            <Field label="Phone">
              <input style={S.input} value={profile.phone} onChange={p(setProfile)('phone')} placeholder="+234 800 000 0000" />
            </Field>
            <Field label="Address">
              <textarea style={{ ...S.input, resize: 'vertical' }} rows={2} value={profile.address} onChange={p(setProfile)('address')} placeholder="Your address" />
            </Field>
            <button style={S.btn()} onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving...' : '💾 Save Profile'}
            </button>
          </SectionCard>

          {/* Change Email */}
          <SectionCard icon="📧" title="Change Email Address">
            <div style={{ background: '#F59E0B11', border: '1px solid #F59E0B33', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#F59E0B' }}>
              ⚠️ Changing your email will require you to verify the new address.
            </div>
            <Field label="New Email Address">
              <input type="email" style={S.input} value={emailForm.email} onChange={p(setEmailForm)('email')} placeholder="new@email.com" />
            </Field>
            <Field label="Current Password (to confirm)">
              <input type="password" style={S.input} value={emailForm.password} onChange={p(setEmailForm)('password')} placeholder="••••••••" />
            </Field>
            <button style={S.btn()} onClick={saveEmail} disabled={savingEmail}>
              {savingEmail ? 'Updating...' : '📧 Update Email'}
            </button>
          </SectionCard>
        </div>

        {/* Right column */}
        <div>
          {/* Change Password */}
          <SectionCard icon="🔑" title="Change Password">
            <form onSubmit={savePassword}>
              <Field label="Current Password">
                <input type="password" style={S.input} value={pwdForm.currentPassword} onChange={p(setPwdForm)('currentPassword')} placeholder="••••••••" />
              </Field>
              <Field label="New Password" note="Minimum 8 characters">
                <input type="password" style={S.input} value={pwdForm.newPassword} onChange={p(setPwdForm)('newPassword')} placeholder="Min. 8 characters" />
              </Field>
              <Field label="Confirm New Password">
                <input type="password" style={S.input} value={pwdForm.confirmPassword} onChange={p(setPwdForm)('confirmPassword')} placeholder="Repeat new password" />
              </Field>
              {/* Strength indicator */}
              {pwdForm.newPassword && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: pwdForm.newPassword.length >= i * 3 ? (i <= 1 ? '#EF4444' : i <= 2 ? '#F59E0B' : i <= 3 ? '#3B82F6' : '#10B981') : '#2D2D3F', transition: 'background .3s' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: '#64748B' }}>
                    {pwdForm.newPassword.length < 4 ? 'Too weak' : pwdForm.newPassword.length < 7 ? 'Weak' : pwdForm.newPassword.length < 10 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}
              <button type="submit" style={S.btn()} disabled={savingPwd}>
                {savingPwd ? 'Changing...' : '🔑 Change Password'}
              </button>
            </form>
          </SectionCard>

          {/* SMTP / Email Settings */}
          <SectionCard icon="📬" title="Mail / SMTP Settings">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="SMTP Host" note="e.g. smtp.gmail.com">
                <input style={S.input} value={smtp.smtp_host} onChange={p(setSmtp)('smtp_host')} placeholder="smtp.gmail.com" />
              </Field>
              <Field label="SMTP Port" note="Usually 587 or 465">
                <input style={S.input} value={smtp.smtp_port} onChange={p(setSmtp)('smtp_port')} placeholder="587" />
              </Field>
            </div>
            <Field label="Use SSL/TLS">
              <select style={S.input} value={smtp.smtp_secure} onChange={p(setSmtp)('smtp_secure')}>
                <option value="false">No — Port 587 (STARTTLS)</option>
                <option value="true">Yes — Port 465 (SSL)</option>
              </select>
            </Field>
            <Field label="SMTP Username / Email">
              <input style={S.input} value={smtp.smtp_user} onChange={p(setSmtp)('smtp_user')} placeholder="your@gmail.com" />
            </Field>
            <Field label="SMTP Password / App Password" note="For Gmail: use an App Password, not your regular password">
              <input type="password" style={S.input} value={smtp.smtp_pass} onChange={p(setSmtp)('smtp_pass')} placeholder="••••••••••••••••" />
            </Field>
            <Field label="From Name & Email" note='e.g. "Blue Dot Networks <noreply@bluedotnetworks.com>"'>
              <input style={S.input} value={smtp.email_from} onChange={p(setSmtp)('email_from')} placeholder='Blue Dot Networks <noreply@yourdomain.com>' />
            </Field>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <button style={S.btn()} onClick={saveSmtp} disabled={savingSmtp}>
                {savingSmtp ? 'Saving...' : '💾 Save Mail Settings'}
              </button>
            </div>

            {/* Test email */}
            <div style={{ background: '#0D0D1A', borderRadius: 10, padding: 16, border: '1px solid #2D2D3F' }}>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>Send Test Email</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="email" style={S.input} value={testMailTo} onChange={e => setTestMailTo(e.target.value)} placeholder="recipient@example.com" />
                <button style={{ ...S.btn('ghost', true), flexShrink: 0 }} onClick={sendTestMail} disabled={testingMail}>
                  {testingMail ? 'Sending...' : '📤 Send Test'}
                </button>
              </div>
              <p style={{ color: '#64748B', fontSize: 11, margin: '8px 0 0' }}>
                Save mail settings first, then send a test to verify your SMTP configuration works.
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
