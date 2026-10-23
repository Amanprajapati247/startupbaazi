import React from 'react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-sm text-slate-300 leading-relaxed">
      <h1 className="text-3xl font-extrabold text-white tracking-tight border-b border-slate-800 pb-4">
        Terms of Service
      </h1>
      <p className="text-xs text-slate-400">Last updated: October 2026</p>

      <div className="space-y-4">
        <h2 className="text-base font-bold text-white">1. Nature of the Platform</h2>
        <p>
          StartupBaazi is a paid visibility discovery and promotional platform for Indian businesses, SaaS companies, and startups.
          Rankings on the platform are determined exclusively by paid promotional bidding in Indian Rupees (INR ₹).
        </p>

        <h2 className="text-base font-bold text-white">2. No Investment Advice or Equity Solicitation</h2>
        <p>
          StartupBaazi is not an equity marketplace, crowdfunding portal, registered broker-dealer, or SEBI-registered investment advisor.
          Listing on this platform does not constitute an offering of securities. Visitors must perform their own independent due diligence before engaging with any listed entity.
        </p>

        <h2 className="text-base font-bold text-white">3. Listing Verification & Moderation</h2>
        <p>
          All startup submissions are subject to administrative review. We reserve the right to suspend or reject any listing that promotes misleading information, illegal goods, fraudulent schemes, or violates Indian consumer protection and IT regulations.
        </p>

        <h2 className="text-base font-bold text-white">4. Payment Processing</h2>
        <p>
          All promotional payments are processed securely via Razorpay. Bids placed are non-refundable once payment verification has completed and the rank has been allocated.
        </p>
      </div>
    </div>
  );
};
