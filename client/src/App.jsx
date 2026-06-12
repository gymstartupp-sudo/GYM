import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

// Pages - Lazy loaded for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const GymRegister = lazy(() => import('./pages/GymRegister'));
const ClientRegister = lazy(() => import('./pages/ClientRegister'));
const RegistrationSuccess = lazy(() => import('./pages/RegistrationSuccess'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));

// Owner - Lazy loaded for code splitting
const OwnerLayout = lazy(() => import('./layouts/OwnerLayout'));
const OwnerDashboard = lazy(() => import('./pages/owner/Dashboard'));
const OwnerClients = lazy(() => import('./pages/owner/Clients'));
const OwnerInactiveClients = lazy(() => import('./pages/owner/InactiveClients'));
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
const ClientHome = lazy(() => import('./pages/client/ClientHome'));
const ClientProfile = lazy(() => import('./pages/client/ClientProfile'));
const ClientPayments = lazy(() => import('./pages/client/ClientPayments'));
const ClientPlans = lazy(() => import('./pages/client/ClientPlans'));
const ClientFeedback = lazy(() => import('./pages/client/ClientFeedback'));
const ClientSettings = lazy(() => import('./pages/client/ClientSettings'));

// Admin - Lazy loaded for code splitting
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminGyms = lazy(() => import('./pages/admin/AdminGyms'));
const AdminClients = lazy(() => import('./pages/admin/AdminClients'));

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-dark">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user || !allowedRoles.includes(role)) return <Navigate to="/login" replace />;
  
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="bg-dark min-h-screen text-slate-200">
          <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-dark">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/registration-success" element={<RegistrationSuccess />} />
              
              {/* Owner Routes */}
              <Route path="/owner" element={<ProtectedRoute allowedRoles={['owner']}><OwnerLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<OwnerDashboard />} />
                <Route path="clients" element={<OwnerClients />} />
                <Route path="inactive-clients" element={<OwnerInactiveClients />} />
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
              <Route path="/client" element={<ProtectedRoute allowedRoles={['client']}><ClientHome /></ProtectedRoute>} />
              <Route path="/client/profile" element={<ProtectedRoute allowedRoles={['client']}><ClientProfile /></ProtectedRoute>} />
              <Route path="/client/payments" element={<ProtectedRoute allowedRoles={['client']}><ClientPayments /></ProtectedRoute>} />
              <Route path="/client/plans" element={<ProtectedRoute allowedRoles={['client']}><ClientPlans /></ProtectedRoute>} />
              <Route path="/client/feedback" element={<ProtectedRoute allowedRoles={['client']}><ClientFeedback /></ProtectedRoute>} />
              <Route path="/client/settings" element={<ProtectedRoute allowedRoles={['client']}><ClientSettings /></ProtectedRoute>} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['superadmin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/gyms" element={<ProtectedRoute allowedRoles={['superadmin']}><AdminGyms /></ProtectedRoute>} />
              <Route path="/admin/gyms/:gymId/clients" element={<ProtectedRoute allowedRoles={['superadmin']}><AdminClients /></ProtectedRoute>} />

            </Routes>
          </Suspense>
        </div>
        <ToastContainer theme="dark" />
      </Router>
    </AuthProvider>
  );
};

export default App;
