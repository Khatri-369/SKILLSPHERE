import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const AuthLayout = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-darkBg px-4 py-12">
      <div className="max-w-md w-full glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Background gradient blur decorators */}
        <div className="absolute -top-12 -right-12 h-32 w-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
