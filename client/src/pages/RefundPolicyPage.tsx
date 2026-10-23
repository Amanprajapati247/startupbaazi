import React from 'react';

export const RefundPolicyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-sm text-slate-300 leading-relaxed">
      <h1 className="text-3xl font-extrabold text-white tracking-tight border-b border-slate-800 pb-4">
        Refund and Cancellation Policy
      </h1>
      <p className="text-xs text-slate-400">Last updated: October 2026</p>

      <div className="space-y-4">
        <h2 className="text-base font-bold text-white">1. Nature of Paid Visibility Services</h2>
        <p>
          StartupBaazi offers digital visibility services where leaderboard rankings are assigned immediately following verified payment confirmation. Because visibility, profile impressions, and outbound click opportunities begin delivering instantaneously upon rank activation, promotional bids are generally non-refundable.
        </p>

        <h2 className="text-base font-bold text-white">2. Technical Failures and Duplicate Charges</h2>
        <p>
          In the event of a documented technical billing failure (such as an inadvertent duplicate debit for a single bid order, or a verified charge that failed to activate leaderboard position due to server anomaly), founders are entitled to a full refund or crediting of the affected transaction.
        </p>

        <h2 className="text-base font-bold text-white">3. Outbid Status</h2>
        <p>
          Being outbid by another startup is an inherent part of competitive leaderboard bidding and does not constitute grounds for a refund. When outbid, your startup shifts to the corresponding lower rank according to the bid ladder.
        </p>

        <h2 className="text-base font-bold text-white">4. Refund Process</h2>
        <p>
          Eligible refunds are processed through our payment partner (Razorpay) back to the original payment source (UPI, net banking, or debit/credit card) within 5–7 business days in accordance with RBI guidelines.
        </p>
      </div>
    </div>
  );
};
