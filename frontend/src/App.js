import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './store';
import { fetchCurrentUser } from './features/authSlice';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Gigs from './pages/Gigs';
import FreelancerProposals from './pages/FreelancerProposals';
import MyProfile from './pages/MyProfile';
import ForgotPassword from './pages/ForgotPassword';
import ClientGigs from './pages/ClientGigs';
import Chat from './pages/Chat';

// Component
import ProtectedRoute from './components/ProtectedRoute';

// Simple placeholder page for under-construction features
const ComingSoon = ({ title }) => (
  <div className="glass-panel p-12 text-center text-gray-400 rounded-3xl animate-fade-in">
    <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wider">{title}</h2>
    <p className="text-sm">This space is currently under development. Check back soon!</p>
  </div>
);

function AppContent() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [isInitializing, setIsInitializing] = useState(true);

  // Restore session on page load/refresh
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      dispatch(fetchCurrentUser())
        .unwrap()
        .catch(() => {
          // Token is invalid/expired
          localStorage.removeItem('accessToken');
        })
        .finally(() => {
          setIsInitializing(false);
        });
    } else {
      setIsInitializing(false);
    }
  }, [dispatch]);

  // Prevent routing redirects before initial session validation completes
  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-darkBg text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Root URL redirects to Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth / Guest Layout */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ForgotPassword />} />
        </Route>

        {/* Protected Dashboard Layout */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* General Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Freelancer specific routes */}
          <Route
            path="/gigs"
            element={
              <ProtectedRoute allowedRoles={['Freelancer']}>
                <Gigs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/freelancer/proposals"
            element={
              <ProtectedRoute allowedRoles={['Freelancer']}>
                <FreelancerProposals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['Freelancer']}>
                <MyProfile />
              </ProtectedRoute>
            }
          />

          {/* Coming Soon placeholders to prevent routing crashes for Admin & Client menus */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <ComingSoon title="Manage Users Console" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/gigs"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <ComingSoon title="Manage Gigs Console" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client/gigs"
            element={
              <ProtectedRoute allowedRoles={['Client']}>
                <ClientGigs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute allowedRoles={['Client', 'Freelancer']}>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/disputes"
            element={
              <ProtectedRoute allowedRoles={['Client', 'Freelancer', 'Admin']}>
                <ComingSoon title="Disputes Management Portal" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowedRoles={['Client', 'Freelancer']}>
                <ComingSoon title="Detailed Analytics" />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch-all - fallback to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
