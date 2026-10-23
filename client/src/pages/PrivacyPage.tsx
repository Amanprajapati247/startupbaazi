import React from 'react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-sm text-slate-300 leading-relaxed">
      <h1 className="text-3xl font-extrabold text-white tracking-tight border-b border-slate-800 pb-4">
        Privacy Policy
      </h1>
      <p className="text-xs text-slate-400">Last updated: October 2026</p>

      <div className="space-y-4">
        <h2 className="text-base font-bold text-white">1. Information We Collect</h2>
        <p>
          We collect information provided when registering an account, submitting a startup listing (company name, official website, logo URL, founder details), and participating in visibility bidding.
        </p>

        <h2 className="text-base font-bold text-white">2. Payment Security</h2>
        <p>
          We do NOT store or process raw credit/debit card numbers, CVVs, or UPI MPINs on our servers. All financial transactions are handled securely through Razorpay in full compliance with PCI-DSS standards and Reserve Bank of India tokenization mandates.
        </p>

        <h2 className="text-base font-bold text-white">3. Outbound Click & Impression Analytics</h2>
        <p>
          To provide accurate traffic analytics to startup founders without compromising user privacy, outbound clicks and impressions are tracked using anonymized cryptographic hashes of IP addresses. We never sell personal browsing data to third-party ad networks.
        </p>

        <h2 className="text-base font-bold text-white">4. Contact Us</h2>
        <p>
          For privacy inquiries or account data deletion requests, contact our compliance team at privacy@startupbaazi.in.
        </p>
      </div>
    </div>
  );
};
