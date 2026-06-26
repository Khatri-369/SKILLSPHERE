import React from 'react';

const Badge = ({ children, status }) => {
  const lowercaseStatus = status?.toLowerCase() || 'default';
  
  const colors = {
    pending: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    negotiating: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    accepted: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    paid: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
    refunded: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    open: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    resolved: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    closed: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
    draft: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
    published: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    default: 'bg-white/5 text-gray-400 border border-white/10',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-bold uppercase tracking-wider ${colors[lowercaseStatus] || colors.default}`}>
      {children || status}
    </span>
  );
};

export default Badge;
