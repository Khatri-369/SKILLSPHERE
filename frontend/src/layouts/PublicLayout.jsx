import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

const PublicLayout = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  return (
    <div className="min-h-screen bg-darkBg text-gray-100 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="h-16 glass-panel border-b border-glassBorder flex items-center justify-between px-8 md:px-16 z-20">
        <div className="flex items-center">
          <Link to="/" className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mr-8">
            SKILLSPHERE
          </Link>
          <nav className="hidden md:flex space-x-6 text-sm font-semibold">
            <Link to="/gigs" className="text-gray-300 hover:text-white transition-all">Gigs Directory</Link>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 border border-blue-500/20 text-sm font-semibold rounded-xl text-white transition-all"
            >
              Dashboard ({user?.name})
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-gray-300 hover:text-white transition-all">Sign In</Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-sm font-semibold rounded-xl text-white transition-all border border-blue-500/20"
              >
                Join Now
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        <Outlet />
      </div>

      {/* Footer */}
      <footer className="py-6 border-t border-glassBorder text-center text-xs text-gray-500 bg-darkBg">
        <p>&copy; {new Date().getFullYear()} SkillSphere. Built with React, Redux, and Tailwind.</p>
      </footer>
    </div>
  );
};

export default PublicLayout;
