import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../utils/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const S = {
  page:  { minHeight:'100vh', background:'#0A0A14', fontFamily:"'Inter','Segoe UI',sans-serif", color:'#F1F5F9', padding:'40px 5%' },
  card:  { background:'#12121E', border:'1px solid #2D2D3F', borderRadius:14, padding:24, marginBottom:20 },
  input: { width:'100%', background:'#0D0D1A', border:'1px solid #2D2D3F', borderRadius:8, color:'#F1F5F9', padding:'11px 13px', fontSize:14, outline:'none', boxSizing:'border-box' },
  label: { display:'block', color:'#94A3B8', fontSize:11, fontWeight:700, marginBottom:5, textTransform:'uppercase', letterSpacing:'.06em' },
  btn:   { border:'none', borderRadius:8, cursor:'pointer', fontWeight:700, padding:'11px 22px', fontSize:14, background:'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'#fff' },
  back:  { color:'#64748B', fontSize:13, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6, marginBottom:28 },
};

const Field = ({ label, children }) => (
  <div style={{ marginBottom:16 }}>
    <label style={S.label}>{label}</label>
    {children}
  </div>
);

export default function CustomerProfile() {
  const { user, fetchMe } = useAuth();
  const [profile, setProfile] = useState({ firstName:'', lastName:'', phone:'', address:'' });
  const [pwd,     setPwd]     = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [saving,    setSaving]    = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (user) setProfile({ firstName: user.firstName||'', lastName: user.lastName||'', phone: user.phone||'', address: user.address||'' });
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile(profile);
      await fetchMe();
      toast.success('Profile updated!');
    } catch (e) { toast.error(e.response?.data?.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (pwd.newPassword.length < 8) { toast.error('Minimum 8 characters'); return; }
    setSavingPwd(true);
    try {
      await authAPI.changePassword({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      toast.success('Password changed!');
      setPwd({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSavingPwd(false); }
  };

  return (
    <div style={S.page}>
      <div style={{ maxWidth:700, margin:'0 auto' }}>
        <Link to="/portal" style={S.back}>← Back to Dashboard</Link>
        <h1 style={{ fontSize:26, fontWeight:900, marginBottom:28 }}>My Profile</h1>

        {/* Account Info */}
        <div style={S.card}>
          <h3 style={{ margin:'0 0 16px', fontWeight:800, fontSize:14, color:'#A5B4FC', textTransform:'uppercase' }}>Account Info</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[['Email', user?.email], ['Username', user?.username], ['Role', user?.role], ['Verified', user?.isVerified ? '✅ Yes' : '❌ No']].map(([l,v]) => (
              <div key={l} style={{ background:'#0D0D1A', borderRadius:8, padding:'10px 14px' }}>
                <div style={S.label}>{l}</div>
                <div style={{ fontWeight:700, fontSize:14 }}>{v || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Profile */}
        <div style={S.card}>
          <h3 style={{ margin:'0 0 16px', fontWeight:800, fontSize:14, color:'#A5B4FC', textTransform:'uppercase' }}>Edit Profile</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="First Name"><input style={S.input} value={profile.firstName} onChange={e => setProfile(p=>({...p,firstName:e.target.value}))} /></Field>
            <Field label="Last Name"><input  style={S.input} value={profile.lastName}  onChange={e => setProfile(p=>({...p,lastName:e.target.value}))}  /></Field>
          </div>
          <Field label="Phone"><input style={S.input} value={profile.phone}   onChange={e => setProfile(p=>({...p,phone:e.target.value}))}   placeholder="+234 800 000 0000" /></Field>
          <Field label="Address"><textarea style={{ ...S.input, resize:'vertical' }} rows={2} value={profile.address} onChange={e => setProfile(p=>({...p,address:e.target.value}))} /></Field>
          <button style={S.btn} onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : '💾 Save Profile'}</button>
        </div>

        {/* Change Password */}
        <div style={S.card}>
          <h3 style={{ margin:'0 0 16px', fontWeight:800, fontSize:14, color:'#A5B4FC', textTransform:'uppercase' }}>Change Password</h3>
          <form onSubmit={changePassword}>
            <Field label="Current Password"><input type="password" style={S.input} value={pwd.currentPassword} onChange={e=>setPwd(p=>({...p,currentPassword:e.target.value}))} placeholder="••••••••" /></Field>
            <Field label="New Password"><input     type="password" style={S.input} value={pwd.newPassword}      onChange={e=>setPwd(p=>({...p,newPassword:e.target.value}))}      placeholder="Min. 8 characters" /></Field>
            <Field label="Confirm New Password"><input type="password" style={S.input} value={pwd.confirmPassword} onChange={e=>setPwd(p=>({...p,confirmPassword:e.target.value}))} placeholder="Repeat password" /></Field>
            <button type="submit" style={S.btn} disabled={savingPwd}>{savingPwd ? 'Changing...' : '🔑 Change Password'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
