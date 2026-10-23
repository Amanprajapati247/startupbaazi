import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface VerifiedBadgeProps {
  className?: string;
  showText?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ className = '', showText = false }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded-full text-[11px] font-medium ${className}`}
      title="Verified Indian Startup"
    >
      <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500/20 text-emerald-400" />
      {showText && <span>Verified</span>}
    </span>
  );
};
