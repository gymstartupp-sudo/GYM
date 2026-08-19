import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './context/ThemeContext';

// Pages - Lazy loaded for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const GymRegister = lazy(() => import('./pages/GymRegister'));
const ClientRegister = lazy(() => import('./pages/ClientRegister'));
const RegistrationSuccess = lazy(() => import('./pages/RegistrationSuccess'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const OtpVerification = lazy(() => import('./pages/OtpVerification'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

// Owner - Lazy loaded for code splitting
const OwnerLayout = lazy(() => import('./layouts/OwnerLayout'));
const OwnerDashboard = lazy(() => import('./pages/owner/Dashboard'));
const OwnerClients = lazy(() => import('./pages/owner/Clients'));
const OwnerInactiveClients = lazy(() => import('./pages/owner/InactiveClients'));
const OwnerDeletedClients = lazy(() => import('./pages/owner/DeletedClients'));
const OwnerPlans = lazy(() => import('./pages/owner/Plans'));
const ClientsPayment = lazy(() => import('./pages/owner/ClientsPayment'));
const OwnerDues = lazy(() => import('./pages/owner/Dues'));
const OwnerOverdue = lazy(() => import('./pages/owner/Overdue'));
const OwnerProfile = lazy(() => import('./pages/owner/Profile'));
const OwnerRequests = lazy(() => import('./pages/owner/ClientRequests'));
const ClientDetail = lazy(() => import('./pages/owner/ClientDetail'));
const PaymentLedger = lazy(() => import('./pages/owner/PaymentLedger'));
const FeedbackList = lazy(() => import('./pages/owner/FeedbackList'));
const Settings = lazy(() => import('./pages/owner/Settings'));

// Client - Lazy loaded for code splitting
const ClientLayout = lazy(() => import('./layouts/ClientLayout'));
const ClientHome = lazy(() => import('./pages/client/ClientHome'));
const ClientProfile = lazy(() => import('./pages/client/ClientProfile'));
const ClientPayments = lazy(() => import('./pages/client/ClientPayments'));
const ClientPlans = lazy(() => import('./pages/client/ClientPlans'));
const ClientFeedback = lazy(() => import('./pages/client/ClientFeedback'));
const ClientSettings = lazy(() => import('./pages/client/ClientSettings'));
const RenewalRedirect = lazy(() => import('./pages/client/RenewalRedirect'));

// Admin - Lazy loaded for code splitting
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminGyms = lazy(() => import('./pages/admin/AdminGyms'));
const AdminClients = lazy(() => import('./pages/admin/AdminClients'));
const AdminIssues = lazy(() => import('./pages/admin/AdminIssues'));
const AdminReminderTesting = lazy(() => import('./pages/admin/AdminReminderTesting'));

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-surface-primary">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user || !allowedRoles.includes(role)) return <Navigate to="/login" replace />;
  
  return children;
};

// Redirect component for Super Admin viewing a Gym
const GymViewRedirect = () => {
  const { gymId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (gymId) {
      sessionStorage.setItem('viewGymId', gymId.toUpperCase());
      navigate('/owner/dashboard', { replace: true });
    } else {
      navigate('/admin/gyms', { replace: true });
    }
  }, [gymId, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-surface-primary">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};

const AppContent = () => {
  const { theme } = useTheme();

  return (
    <>
      <div className="bg-surface-primary min-h-screen text-text-primary w-full overflow-x-hidden">
        <Suspense fallback={
          <div className="flex h-screen items-center justify-center bg-surface-primary">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verify-otp" element={<OtpVerification />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/registration-success" element={<RegistrationSuccess />} />
              
              {/* Owner Routes */}
              <Route path="/owner" element={<ProtectedRoute allowedRoles={['owner', 'superadmin']}><OwnerLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<OwnerDashboard />} />
                <Route path="clients" element={<OwnerClients />} />
                <Route path="inactive-clients" element={<OwnerInactiveClients />} />
                <Route path="deleted-clients" element={<OwnerDeletedClients />} />
                <Route path="plans" element={<OwnerPlans />} />
                <Route path="clients-payment" element={<ClientsPayment />} />
                <Route path="dues" element={<OwnerDues />} />
                <Route path="overdue" element={<OwnerOverdue />} />
                <Route path="payment-ledger" element={<PaymentLedger />} />
                <Route path="profile" element={<OwnerProfile />} />
                <Route path="requests" element={<OwnerRequests />} />
                <Route path="feedback" element={<FeedbackList />} />
                <Route path="settings" element={<Settings />} />
                <Route path="clients/:id" element={<ClientDetail />} />
              </Route>
              
              {/* Client Routes */}
              <Route path="/client" element={<ProtectedRoute allowedRoles={['client']}><ClientLayout /></ProtectedRoute>}>
                <Route index element={<ClientHome />} />
                <Route path="profile" element={<ClientProfile />} />
                <Route path="payments" element={<ClientPayments />} />
                <Route path="plans" element={<ClientPlans />} />
                <Route path="feedback" element={<ClientFeedback />} />
                <Route path="settings" element={<ClientSettings />} />
              </Route>
              <Route path="/client/renew/:clientId" element={<RenewalRedirect />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['superadmin', 'developer']}><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="gyms" element={<AdminGyms />} />
                <Route path="gyms/:gymId/view" element={<GymViewRedirect />} />
                <Route path="gyms/:gymId/clients" element={<AdminClients />} />
                <Route path="issues" element={<AdminIssues />} />
                <Route path="reminder-testing" element={<AdminReminderTesting />} />
              </Route>

            </Routes>
        </Suspense>
      </div>
      <ToastContainer theme={theme === 'dark' ? 'dark' : 'light'} />
    </>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;
