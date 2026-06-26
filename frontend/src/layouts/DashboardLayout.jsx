import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../features/authSlice';
import {
  LayoutDashboard,
  Briefcase,
  MessageSquare,
  AlertTriangle,
  BarChart3,
  User,
  Users,
  LogOut,
  FolderLock
} from 'lucide-react';

const DashboardLayout = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logoutUser()).then(() => {
      navigate('/login');
    });
  };

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['Client', 'Freelancer', 'Admin'],
    },
    {
      name: 'Manage Users',
      path: '/admin/users',
      icon: Users,
      roles: ['Admin'],
    },
    {
      name: 'Manage Gigs',
      path: '/admin/gigs',
      icon: FolderLock,
      roles: ['Admin'],
    },
    {
      name: 'My Gigs',
      path: '/client/gigs',
      icon: Briefcase,
      roles: ['Client'],
    },
    {
      name: 'Search Gigs',
      path: '/gigs',
      icon: Briefcase,
      roles: ['Freelancer'],
    },
    {
      name: 'My Proposals',
      path: '/freelancer/proposals',
      icon: Briefcase,
      roles: ['Freelancer'],
    },
    {
      name: 'Inbox Chat',
      path: '/chat',
      icon: MessageSquare,
      roles: ['Client', 'Freelancer'],
    },
    {
      name: 'Disputes',
      path: '/disputes',
      icon: AlertTriangle,
      roles: ['Client', 'Freelancer', 'Admin'],
    },
    {
      name: 'Analytics',
      path: '/analytics',
      icon: BarChart3,
      roles: ['Client', 'Freelancer'],
    },
    {
      name: 'My Profile',
      path: '/profile',
      icon: User,
      roles: ['Freelancer'],
    },
  ];

  const filteredMenu = menuItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="flex h-screen bg-darkBg text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r border-glassBorder flex flex-col justify-between">
        <div>
          <div className="h-16 flex items-center justify-center border-b border-glassBorder">
            <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              SKILLSPHERE
            </span>
          </div>
          <nav className="mt-6 px-4 space-y-1">
            {filteredMenu.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-glassBorder space-y-4">
          <div className="flex items-center px-2">
            <div className="h-10 w-10 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold truncate text-white">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 rounded-xl text-sm font-semibold text-red-400 transition-all"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 glass-panel border-b border-glassBorder flex items-center justify-between px-8 z-10">
          <h1 className="text-lg font-bold text-white">Dashboard View</h1>
          <div className="text-sm text-gray-400">
            Account verified: <span className="text-emerald-400 font-semibold">{user?.isVerified ? 'Yes' : 'No'}</span>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
