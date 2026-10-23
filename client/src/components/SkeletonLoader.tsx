import React from 'react';

export const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-slate-800/60 animate-pulse rounded-lg ${className}`} />
);

export const LeaderboardRowSkeleton: React.FC = () => (
  <div className="flex items-center justify-between p-4 bg-navy-900/60 border border-slate-800/60 rounded-2xl animate-pulse space-x-4">
    <div className="flex items-center space-x-4 flex-1">
      <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0" />
      <div className="w-12 h-12 rounded-xl bg-slate-800 flex-shrink-0" />
      <div className="space-y-2 flex-1 max-w-sm">
        <div className="h-4 bg-slate-800 rounded w-3/4" />
        <div className="h-3 bg-slate-800/80 rounded w-1/2" />
      </div>
    </div>
    <div className="hidden sm:flex items-center space-x-4">
      <div className="w-20 h-5 bg-slate-800 rounded-full" />
      <div className="w-24 h-6 bg-slate-800 rounded-lg" />
    </div>
  </div>
);

export const StartupCardSkeleton: React.FC = () => (
  <div className="bg-navy-900/60 border border-slate-800/60 rounded-2xl p-5 animate-pulse space-y-4">
    <div className="flex items-center space-x-3">
      <div className="w-12 h-12 rounded-xl bg-slate-800 flex-shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-slate-800 rounded w-2/3" />
        <div className="h-3 bg-slate-800/70 rounded w-1/3" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-slate-800 rounded w-full" />
      <div className="h-3 bg-slate-800/60 rounded w-4/5" />
    </div>
    <div className="flex justify-between items-center pt-2 border-t border-slate-800/40">
      <div className="w-16 h-4 bg-slate-800 rounded" />
      <div className="w-20 h-7 bg-slate-800 rounded-lg" />
    </div>
  </div>
);

export const StatCardSkeleton: React.FC = () => (
  <div className="bg-navy-900/60 border border-slate-800/60 rounded-2xl p-4 animate-pulse space-y-3">
    <div className="flex justify-between items-center">
      <div className="w-20 h-3 bg-slate-800 rounded" />
      <div className="w-6 h-6 rounded-lg bg-slate-800" />
    </div>
    <div className="h-7 bg-slate-800 rounded w-1/2" />
    <div className="h-3 bg-slate-800/70 rounded w-2/3" />
  </div>
);
