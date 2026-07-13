import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import AdminLayout   from './components/layout/AdminLayout';
import LoadingScreen from './components/ui/LoadingScreen';

// Public layout wrapper
const PublicLayout = lazy(() => import('./components/layout/PublicLayout'));

// Auth pages
const Login          = lazy(() => import('./pages/auth/Login'));
const Register       = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword  = lazy(() => import('./pages/auth/ResetPassword'));
const VerifyEmail    = lazy(() => import('./pages/auth/VerifyEmail'));

// Public pages
const Homepage      = lazy(() => import('./pages/public/Homepage'));
const BuyVoucher    = lazy(() => import('./pages/public/BuyVoucher'));
const PaymentVerify = lazy(() => import('./pages/public/PaymentVerify'));
const LegalPage     = lazy(() => import('./pages/public/LegalPage'));

// Admin pages
const Dashboard       = lazy(() => import('./pages/admin/Dashboard'));
const Routers         = lazy(() => import('./pages/admin/Routers'));
const Plans           = lazy(() => import('./pages/admin/Plans'));
const Vouchers        = lazy(() => import('./pages/admin/Vouchers'));
const Customers       = lazy(() => import('./pages/admin/Customers'));
const CustomerDetail  = lazy(() => import('./pages/admin/CustomerDetail'));
const Sessions        = lazy(() => import('./pages/admin/Sessions'));
const Payments        = lazy(() => import('./pages/admin/Payments'));
const Reports         = lazy(() => import('./pages/admin/Reports'));
const Settings        = lazy(() => import('./pages/admin/Settings'));
const LegalAdmin      = lazy(() => import('./pages/admin/LegalPages'));
const Tickets         = lazy(() => import('./pages/admin/Tickets'));
const Announcements   = lazy(() => import('./pages/admin/Announcements'));
const ActivityLogs    = lazy(() => import('./pages/admin/ActivityLogs'));
const AdminProfile    = lazy(() => import('./pages/admin/Profile'));

// Customer portal
const CustomerDashboard = lazy(() => import('./pages/customer/Dashboard'));
const CustomerProfile   = lazy(() => import('./pages/customer/Profile'));

// ── Guards ────────────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, staffOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  if (staffOnly && !['SUPER_ADMIN','ADMIN','MANAGER','CASHIER','SUPPORT'].includes(user.role))
    return <Navigate to="/portal" replace />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) {
    const isStaff = ['SUPER_ADMIN','ADMIN','MANAGER','CASHIER','SUPPORT'].includes(user.role);
    return <Navigate to={isStaff ? '/admin' : '/portal'} replace />;
  }
  return children;
};

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style:   { background:'#1e293b', color:'#f1f5f9', border:'1px solid #334155' },
            success: { iconTheme:{ primary:'#10B981', secondary:'#fff' } },
            error:   { iconTheme:{ primary:'#EF4444',  secondary:'#fff' } },
            duration: 4000,
          }}
        />
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public */}
            <Route path="/"            element={<Homepage />} />
            <Route path="/buy"         element={<BuyVoucher />} />
            <Route path="/payment/verify"     element={<PaymentVerify />} />
            <Route path="/payment/verify-flw" element={<PaymentVerify gateway="flutterwave" />} />
            <Route path="/legal/:slug" element={<LegalPage />} />

            {/* Auth */}
            <Route path="/login"            element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/register"         element={<GuestRoute><Register /></GuestRoute>} />
            <Route path="/forgot-password"  element={<GuestRoute><ForgotPassword /></GuestRoute>} />
            <Route path="/reset-password"   element={<GuestRoute><ResetPassword /></GuestRoute>} />
            <Route path="/verify-email"     element={<VerifyEmail />} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute staffOnly><AdminLayout /></ProtectedRoute>}>
              <Route index          element={<Dashboard />} />
              <Route path="routers"      element={<Routers />} />
              <Route path="plans"        element={<Plans />} />
              <Route path="vouchers"     element={<Vouchers />} />
              <Route path="customers"    element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="sessions"     element={<Sessions />} />
              <Route path="payments"     element={<Payments />} />
              <Route path="reports"      element={<Reports />} />
              <Route path="tickets"      element={<Tickets />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="activity"     element={<ActivityLogs />} />
              <Route path="legal"        element={<LegalAdmin />} />
              <Route path="settings"     element={<Settings />} />
              <Route path="profile"      element={<AdminProfile />} />
            </Route>

            {/* Customer Portal */}
            <Route path="/portal"         element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/portal/profile" element={<ProtectedRoute><CustomerProfile /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
