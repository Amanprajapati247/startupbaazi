import React from 'react';
import { Flame, ShieldCheck, Zap, Scale, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const BiddingRulesPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-3 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-400">
          <Flame className="w-4 h-4 text-brand-500" />
          <span>Platform Mechanism & Mechanics</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          StartupBaazi Bidding Rules & Ranking Engine
        </h1>
        <p className="text-sm text-slate-400">
          Complete transparent disclosure on how pay-to-rank visibility, minimum bid increments, atomic settlements, and outbid events operate.
        </p>
      </div>

      {/* Rules Content */}
      <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
        <section className="bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-3 shadow-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-brand-400" />
            <span>1. Core Ranking Rule: Paid Visibility Engine</span>
          </h2>
          <p>
            Positions on StartupBaazi leaderboards are determined solely by active, verified promotional bids paid in Indian Rupees (₹).
            We do not evaluate, audit, endorse, or guarantee any startup’s financial viability, technological superiority, or investment potential.
          </p>
          <p>
            Rankings are sorted descending by the highest active bid amount in INR. In case of identical bid amounts, the earlier placed bid holds priority (tie-breaker rule).
          </p>
        </section>

        <section className="bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-3 shadow-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>2. Minimum Eligible Bid & Increments</span>
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-xs text-slate-300">
            <li>
              <strong>Starting Base Price:</strong> Configured on each leaderboard (Default: ₹500). No bid below this threshold is accepted.
            </li>
            <li>
              <strong>Minimum Bid Increment:</strong> To overtake a specific position (e.g. Rank #1), your bid must be at least:
              <br />
              <code className="inline-block mt-1 p-2 rounded-lg bg-navy-950 font-mono text-amber-300 border border-slate-800">
                Minimum Next Bid = (Current Active Bid of Rank #1) + (Minimum Increment of ₹100)
              </code>
            </li>
            <li>
              <strong>Founder Self-Increments:</strong> A founder can increase their own startup's bid at any time to defend or elevate their position.
            </li>
          </ul>
        </section>

        <section className="bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-3 shadow-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>3. Atomic Transactions & Razorpay Verification</span>
          </h2>
          <p>
            Rankings are never updated until Razorpay returns a cryptographically valid HMAC-SHA256 signature and our backend settles the database transaction atomically.
          </p>
          <p>
            This guarantees zero race conditions or corrupted rankings if multiple founders place bids simultaneously.
          </p>
        </section>

        <section className="bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-3 shadow-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span>4. Outbid Alerts & Reclaiming Positions</span>
          </h2>
          <p>
            When a competing startup overtakes your rank, our notification engine immediately emits an in-app Outbid Alert to all verified founders of the displaced startup.
          </p>
          <p>
            The outbid founder can visit their dashboard and click "Outbid / Boost Rank" to submit a new bid and reclaim their position.
          </p>
        </section>
      </div>

      <div className="pt-4 text-center">
        <Link
          to="/leaderboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-amber-500 text-white font-bold text-xs shadow-lg shadow-brand-500/25"
        >
          <span>Explore Live National Leaderboard</span>
        </Link>
      </div>
    </div>
  );
};
