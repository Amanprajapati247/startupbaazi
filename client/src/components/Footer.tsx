import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-navy-950 border-t border-slate-900 text-slate-400 text-sm mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center">
                <Flame className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Startup<span className="text-brand-500">Baazi</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              India's Paid Startup Visibility & Leaderboard Platform. Empowering founders, SaaS builders, and bootstrapped brands to command the spotlight through transparent pay-to-rank bidding in INR (₹).
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verified Razorpay Payments in INR</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4">Discover</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/leaderboard" className="hover:text-brand-400 transition-colors">
                  Live National Leaderboard
                </Link>
              </li>
              <li>
                <Link to="/leaderboard?industry=AI" className="hover:text-brand-400 transition-colors">
                  AI & Indic Tech Startups
                </Link>
              </li>
              <li>
                <Link to="/leaderboard?industry=SaaS" className="hover:text-brand-400 transition-colors">
                  SaaS & Enterprise Tools
                </Link>
              </li>
              <li>
                <Link to="/leaderboard?city=Bengaluru" className="hover:text-brand-400 transition-colors">
                  Bengaluru Tech Startups
                </Link>
              </li>
              <li>
                <Link to="/submit" className="hover:text-brand-400 transition-colors">
                  List Your Startup
                </Link>
              </li>
            </ul>
          </div>

          {/* How It Works & Help */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4">Transparency</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/bidding-rules" className="hover:text-brand-400 transition-colors">
                  Bidding Rules & Engine
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="hover:text-brand-400 transition-colors">
                  Refund & Cancellation Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-brand-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-brand-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="text-amber-400/90 hover:text-amber-300 transition-colors font-medium">
                  Forgot Password
                </Link>
              </li>
            </ul>
          </div>

          {/* Ecosystem & Disclaimer */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-4">Compliance</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
              StartupBaazi operates a transparent advertising and paid leaderboard discovery service. Leaderboard rankings are strictly determined by real-time bidding amounts in Indian Rupees (₹).
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              We do not provide investment advisory, financial ratings, or equity offerings.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} StartupBaazi Technologies. All rights reserved.</p>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>for the Indian Startup Ecosystem</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
