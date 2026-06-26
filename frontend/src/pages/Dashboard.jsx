import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchClientAnalytics,
  fetchFreelancerAnalytics,
  fetchAdminAnalytics
} from '../features/analyticsSlice';
import { updateProfile, fetchProfileMe } from '../features/profileSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  CartesianGrid
} from 'recharts';
import {
  DollarSign,
  Briefcase,
  Users,
  Eye,
  FileText,
  UserCheck,
  Power,
  Layers
} from 'lucide-react';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { clientStats, freelancerStats, adminStats, loading } = useSelector((state) => state.analytics);
  const { myProfile } = useSelector((state) => state.profile);

  useEffect(() => {
    if (user?.role === 'Client') {
      dispatch(fetchClientAnalytics());
    } else if (user?.role === 'Freelancer') {
      dispatch(fetchFreelancerAnalytics());
      dispatch(fetchProfileMe());
    } else if (user?.role === 'Admin') {
      dispatch(fetchAdminAnalytics());
    }
  }, [user, dispatch]);

  const handleToggleAvailability = () => {
    if (!myProfile) return;
    const nextAvailability = myProfile.availability === 'Available' ? 'Busy' : 'Available';
    dispatch(updateProfile({ availability: nextAvailability }));
  };

  if (loading) {
    return <LoadingSpinner size="large" className="min-h-[50vh]" />;
  }

  // ==========================================
  // CLIENT DASHBOARD
  // ==========================================
  if (user?.role === 'Client') {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Core Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3.5 bg-blue-500/10 rounded-xl text-blue-400">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xs uppercase tracking-wider text-gray-500 font-semibold">Gigs Published</p>
              <h3 className="text-xl font-extrabold text-white">{clientStats?.gigsPublished || 0}</h3>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3.5 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xs uppercase tracking-wider text-gray-500 font-semibold">Active Gigs</p>
              <h3 className="text-xl font-extrabold text-white">{clientStats?.activeGigs || 0}</h3>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xs uppercase tracking-wider text-gray-500 font-semibold">Total Spend</p>
              <h3 className="text-xl font-extrabold text-white">₹{clientStats?.totalSpend || 0}</h3>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3.5 bg-purple-500/10 rounded-xl text-purple-400">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xs uppercase tracking-wider text-gray-500 font-semibold">Proposals Recv</p>
              <h3 className="text-xl font-extrabold text-white">{clientStats?.proposalsReceived || 0}</h3>
            </div>
          </div>
        </div>

        {/* Info panel */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h4 className="font-extrabold text-white text-md uppercase tracking-wider">Dashboard Portal</h4>
          <p className="text-sm text-gray-400">
            Welcome to the Client console. Proactively publish requirements, review submitted applications, and execute secure Razorpay milestone payments inside the respective tabs.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // FREELANCER DASHBOARD
  // ==========================================
  if (user?.role === 'Freelancer') {
    const revenueGraphData = freelancerStats?.revenueGraph || [];
    const applicationsData = freelancerStats?.applications || {};

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Top summary row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3.5 bg-blue-500/10 rounded-xl text-blue-400">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xs uppercase tracking-wider text-gray-500 font-semibold">Gigs Completed</p>
              <h3 className="text-xl font-extrabold text-white">{freelancerStats?.gigsCompleted || 0}</h3>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3.5 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Eye className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xs uppercase tracking-wider text-gray-500 font-semibold">Profile Views</p>
              <h3 className="text-xl font-extrabold text-white">{freelancerStats?.profileViews || 0}</h3>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex items-center justify-between col-span-2">
            <div className="flex items-center space-x-4">
              <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400">
                <Power className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wider text-gray-500 font-semibold">Availability Status</p>
                <h3 className="text-md font-bold text-white">
                  Currently: <Badge status={myProfile?.availability === 'Available' ? 'accepted' : 'closed'}>{myProfile?.availability || 'Available'}</Badge>
                </h3>
              </div>
            </div>
            <button
              onClick={handleToggleAvailability}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Toggle
            </button>
          </div>
        </div>

        {/* Charts & Graphs (Monthly Earnings & Applications) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Earnings timeline graph */}
          <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-6">
            <h4 className="font-extrabold text-white text-sm uppercase tracking-wider">Monthly Earnings Timeline</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueGraphData}>
                  <defs>
                    <linearGradient id="earningsColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="earnings" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#earningsColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Proposals / Applications distributions */}
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <h4 className="font-extrabold text-white text-sm uppercase tracking-wider">Applications Status</h4>
            <div className="space-y-4 pt-2">
              {Object.keys(applicationsData).map((status) => (
                <div key={status} className="flex justify-between items-center py-2 border-b border-glassBorder last:border-0">
                  <span className="text-sm text-gray-400 font-semibold">{status}</span>
                  <span className="text-sm font-black text-white">{applicationsData[status]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ADMIN DASHBOARD
  // ==========================================
  if (user?.role === 'Admin') {
    const revenueData = adminStats?.revenueTimeline || [];
    const monthlyUsersData = adminStats?.monthlyUsers || [];
    const topCatsData = adminStats?.topCategories || [];

    const COLORS = ['#3b82f6', '#6366f1', '#10b981', '#a855f7', '#f59e0b'];

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Core Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xs uppercase tracking-wider text-gray-500 font-semibold">Total Revenue Managed</p>
              <h3 className="text-xl font-extrabold text-white">₹{adminStats?.totalRevenue || 0}</h3>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3.5 bg-blue-500/10 rounded-xl text-blue-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xs uppercase tracking-wider text-gray-500 font-semibold">Active Freelancers</p>
              <h3 className="text-xl font-extrabold text-white">{adminStats?.activeFreelancers || 0}</h3>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3.5 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xs uppercase tracking-wider text-gray-500 font-semibold">Total Timelines Tracked</p>
              <h3 className="text-xl font-extrabold text-white">{monthlyUsersData.reduce((acc, curr) => acc + curr.count, 0)}</h3>
            </div>
          </div>
        </div>

        {/* Admin timelines charting */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Managed platform revenue graph */}
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <h4 className="font-extrabold text-white text-sm uppercase tracking-wider">System-wide Revenue Timeline</h4>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fill="rgba(16, 185, 129, 0.1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* User registration timeline graph */}
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <h4 className="font-extrabold text-white text-sm uppercase tracking-wider">Monthly Registered Users</h4>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyUsersData}>
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px' }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Gigs categories distribution */}
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <h4 className="font-extrabold text-white text-sm uppercase tracking-wider font-sans">Top Gig Categories</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCatsData} layout="vertical">
                <XAxis type="number" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis dataKey="category" type="category" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px' }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {topCatsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-8 text-center text-gray-400 rounded-3xl">
      Unauthorized or un-profiled dashboard state.
    </div>
  );
};

export default Dashboard;
