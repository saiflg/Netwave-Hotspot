import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bdn_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('bdn_token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await authAPI.me();
      setUser(res.data.data.user);
      localStorage.setItem('bdn_user', JSON.stringify(res.data.data.user));
    } catch {
      localStorage.removeItem('bdn_token');
      localStorage.removeItem('bdn_user');
      setUser(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, data } = res.data;
    localStorage.setItem('bdn_token', token);
    localStorage.setItem('bdn_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('bdn_token');
    localStorage.removeItem('bdn_user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const isAdmin = user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
  const isStaff = user && ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'SUPPORT'].includes(user.role);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchMe, isAdmin, isStaff, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
