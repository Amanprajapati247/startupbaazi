import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, subtitle, icon, trend }) => {
  return (
    <div className="bg-navy-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-brand-500/40 transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
        {icon && <div className="text-brand-500 group-hover:scale-110 transition-transform">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <h4 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{value}</h4>
        {trend && <span className="text-xs text-emerald-400 font-medium">{trend}</span>}
      </div>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-brand-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-brand-500/10 transition-all" />
    </div>
  );
};
