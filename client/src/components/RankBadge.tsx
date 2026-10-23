import React from 'react';

interface RankBadgeProps {
  rank: number;
  className?: string;
}

export const RankBadge: React.FC<RankBadgeProps> = ({ rank, className = '' }) => {
  if (rank === 1) {
    return (
      <span
        className={`inline-flex items-center justify-center font-bold px-2.5 py-1 rounded-lg text-amber-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-lg shadow-amber-500/20 text-xs sm:text-sm ${className}`}
        title="Rank #1"
      >
        🥇 #1
      </span>
    );
  }

  if (rank === 2) {
    return (
      <span
        className={`inline-flex items-center justify-center font-bold px-2.5 py-1 rounded-lg text-slate-900 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 shadow-md shadow-slate-400/20 text-xs sm:text-sm ${className}`}
        title="Rank #2"
      >
        🥈 #2
      </span>
    );
  }

  if (rank === 3) {
    return (
      <span
        className={`inline-flex items-center justify-center font-bold px-2.5 py-1 rounded-lg text-amber-950 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 text-white shadow-md shadow-amber-700/20 text-xs sm:text-sm ${className}`}
        title="Rank #3"
      >
        🥉 #3
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center font-semibold px-2 py-1 rounded-md text-slate-400 bg-navy-800 border border-slate-700/60 text-xs ${className}`}
    >
      #{rank}
    </span>
  );
};
