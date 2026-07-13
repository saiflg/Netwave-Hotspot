import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../utils/api';
import toast from 'react-hot-toast';

// ─── Shared Auth Layout ───────────────────────────────────────────────────────
const AuthWrap = ({ title, sub, children, footer }) => (
  <div style={{ minHeight: '100vh', background: '#0A0A14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter','Segoe UI',sans-serif", padding: 20 }}>
    <div style={{ width: '100%', maxWidth: 420 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 20 }}>
          <div style={{ background: 'linear-gradient(135deg,#6366F1,#EC4899)', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📡</div>
          <span style={{ fontWeight: 900, fontSize: 18, background: 'linear-gradient(135deg,#A5B4FC,#F9A8D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Blue Dot Networks</span>
        </Link>
        <h1 style={{ color: '#F1F5F9', margin: '0 0 6px', fontSize: 24, fontWeight: 900 }}>{title}</h1>
        {sub && <p style={{ color: '#64748B', margin: 0, fontSize: 14 }}>{sub}</p>}
      </div>
      <div style={{ background: '#12121E', border: '1px solid #2D2D3F', borderRadius: 16, padding: 28 }}>
        {children}
      </div>
      {footer && <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748B' }}>{footer}</div>}
    </div>
  </div>
);

const Input = ({ label, type = 'text', value, onChange, placeholder, autoComplete }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', color: '#94A3B8', fontSize: 11, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete}
      style={{ width: '100%', background: '#0D0D1A', border: '1px solid #2D2D3F', borderRadius: 8, color: '#F1F5F9', padding: '11px 13px', fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
      onFocus={e => e.target.style.borderColor = '#6366F1'}
      onBlur={e => e.target.style.borderColor = '#2D2D3F'} />
  </div>
);

const SubmitBtn = ({ loading, label }) => (
  <button type="submit" disabled={loading}
    style={{ width: '100%', background: loading ? '#4338CA' : 'linear-gradient(135deg,#6366F1,#8B5CF6)', border: 'none', borderRadius: 8, color: '#fff', padding: '12px', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s', marginTop: 8 }}>
    {loading ? 'Please wait...' : label}
  </button>
);

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════════════════════
export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.firstName}!`);
      const isStaff = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SUPPORT'].includes(user.role);
      navigate(isStaff ? '/admin' : '/portal', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <AuthWrap title="Welcome Back" sub="Sign in to your Blue Dot Networks account"
      footer={<>Don't have an account? <Link to="/register" style={{ color: '#A5B4FC', fontWeight: 700 }}>Register</Link></>}>
      <form onSubmit={handleSubmit}>
        <Input label="Email Address" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" autoComplete="email" />
        <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" autoComplete="current-password" />
        <div style={{ textAlign: 'right', marginBottom: 16 }}>
          <Link to="/forgot-password" style={{ color: '#6366F1', fontSize: 13, fontWeight: 600 }}>Forgot password?</Link>
        </div>
        <SubmitBtn loading={loading} label="Sign In →" />
      </form>

    </AuthWrap>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REGISTER
// ══════════════════════════════════════════════════════════════════════════════
export function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', username: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.password) return toast.error('Please fill all required fields');
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await authAPI.register(form);
      toast.success('Account created! Please verify your email.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <AuthWrap title="Create Account" sub="Join Blue Dot Networks today"
      footer={<>Already have an account? <Link to="/login" style={{ color: '#A5B4FC', fontWeight: 700 }}>Sign In</Link></>}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="First Name *" value={form.firstName} onChange={f('firstName')} placeholder="Aminu" />
          <Input label="Last Name *" value={form.lastName} onChange={f('lastName')} placeholder="Bello" />
        </div>
        <Input label="Email Address *" type="email" value={form.email} onChange={f('email')} placeholder="you@example.com" />
        <Input label="Username *" value={form.username} onChange={f('username')} placeholder="aminubello" />
        <Input label="Phone Number" value={form.phone} onChange={f('phone')} placeholder="08012345678" />
        <Input label="Password *" type="password" value={form.password} onChange={f('password')} placeholder="Min. 8 characters" />
        <Input label="Confirm Password *" type="password" value={form.confirmPassword} onChange={f('confirmPassword')} placeholder="Repeat password" />
        <SubmitBtn loading={loading} label="Create Account →" />
      </form>
    </AuthWrap>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD
// ══════════════════════════════════════════════════════════════════════════════
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch { toast.error('Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <AuthWrap title="Forgot Password" sub="Enter your email to receive a reset link"
      footer={<Link to="/login" style={{ color: '#A5B4FC', fontWeight: 700 }}>← Back to Login</Link>}>
      {sent ? (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>📧</div>
          <h3 style={{ color: '#10B981', margin: '0 0 8px', fontWeight: 800 }}>Email Sent!</h3>
          <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.6 }}>
            If that email exists in our system, a password reset link has been sent. Please check your inbox and spam folder.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          <SubmitBtn loading={loading} label="Send Reset Link" />
        </form>
      )}
    </AuthWrap>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RESET PASSWORD
// ══════════════════════════════════════════════════════════════════════════════
export function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await authAPI.resetPassword({ token: params.get('token'), password: form.password });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Reset failed. Link may have expired.'); }
    finally { setLoading(false); }
  };

  return (
    <AuthWrap title="Reset Password" sub="Choose a new secure password">
      <form onSubmit={handleSubmit}>
        <Input label="New Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters" />
        <Input label="Confirm New Password" type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repeat new password" />
        <SubmitBtn loading={loading} label="Reset Password" />
      </form>
    </AuthWrap>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VERIFY EMAIL
// ══════════════════════════════════════════════════════════════════════════════
export function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('verifying');

  React.useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('invalid'); return; }
    authAPI.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('invalid'));
  }, [params]);

  return (
    <AuthWrap title="Email Verification">
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        {status === 'verifying' && <><div style={{ fontSize: 48 }}>⏳</div><p style={{ color: '#64748B' }}>Verifying your email...</p></>}
        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 14 }}>✅</div>
            <h3 style={{ color: '#10B981', fontWeight: 900, margin: '0 0 8px' }}>Email Verified!</h3>
            <p style={{ color: '#64748B', marginBottom: 20 }}>Your account has been verified. You can now log in.</p>
            <Link to="/login" style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', borderRadius: 8, padding: '11px 28px', fontWeight: 700, fontSize: 14, display: 'inline-block' }}>Go to Login</Link>
          </>
        )}
        {status === 'invalid' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 14 }}>❌</div>
            <h3 style={{ color: '#EF4444', fontWeight: 900, margin: '0 0 8px' }}>Invalid Link</h3>
            <p style={{ color: '#64748B', marginBottom: 20 }}>This verification link is invalid or has expired.</p>
            <Link to="/login" style={{ background: '#2D2D3F', color: '#94A3B8', borderRadius: 8, padding: '11px 28px', fontWeight: 700, fontSize: 14, display: 'inline-block' }}>Back to Login</Link>
          </>
        )}
      </div>
    </AuthWrap>
  );
}
