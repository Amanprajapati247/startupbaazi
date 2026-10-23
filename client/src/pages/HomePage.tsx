import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Flame,
  ArrowRight,
  TrendingUp,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Zap,
  Globe,
  Building2,
  Eye,
  MousePointerClick
} from 'lucide-react';
import { api } from '../services/api';
import { LeaderboardItem, LeaderboardConfig } from '../types';
import { RankBadge } from '../components/RankBadge';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { BidModal } from '../components/BidModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [leaderboard, setLeaderboard] = useState<LeaderboardConfig | null>(null);
  const [topItems, setTopItems] = useState<LeaderboardItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Bid Modal state
  const [activeBidTarget, setActiveBidTarget] = useState<LeaderboardItem | null>(null);
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);

  const fetchTopStartups = async () => {
    try {
      setIsLoading(true);
      const res = await api.getLeaderboard('india-top-startups', {
        limit: '10',
        industry: selectedIndustry !== 'All' ? selectedIndustry : '',
        search: searchQuery,
      });

      if (res.success) {
        setLeaderboard(res.data.leaderboard);
        setTopItems(res.data.items);
      }
    } catch (err: any) {
      console.error('Failed to load leaderboard', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopStartups();
  }, [selectedIndustry]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTopStartups();
  };

  const handleVisitWebsite = async (item: LeaderboardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    // Record outbound click
    api.trackClick(item.listingId).catch(() => {});
    window.open(item.websiteUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenBid = (item: LeaderboardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      showToast('Please sign in to place a bid on this listing.', 'warning');
      navigate('/login');
      return;
    }
    setActiveBidTarget(item);
    setIsBidModalOpen(true);
  };

  const industries = ['All', 'AI', 'SaaS', 'Fintech', 'Developer Tools', 'D2C', 'EdTech'];

  return (
    <div className="space-y-24 pb-20">
      {/* 1. Hero Section */}
      <section className="relative pt-12 sm:pt-20 lg:pt-28 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-500/15 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10 space-y-6">
          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-900 border border-brand-500/30 text-brand-400 text-xs font-semibold shadow-lg shadow-brand-500/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>India's Paid Startup Visibility & Leaderboard</span>
          </div>

          {/* Hero Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
            India's Startups.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-brand-500 to-amber-300">
              One Competitive Leaderboard.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Discover emerging Indian companies, launch your product, and compete for the spotlight. Transparent pay-to-rank bidding in INR (₹).
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/submit"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 hover:from-brand-500 hover:to-amber-400 text-white font-bold text-sm shadow-xl shadow-brand-500/25 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <span>List Your Startup</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/leaderboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-navy-900 hover:bg-navy-850 text-slate-200 border border-slate-700/80 font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Explore Full Leaderboard</span>
              <TrendingUp className="w-4 h-4 text-brand-400" />
            </Link>
          </div>

          {/* Trust badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              <span>Razorpay Verified Indian UPI & Cards</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Server-Controlled Atomic Bidding</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>100% Real Audited Data</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Live Top 10 Leaderboard Preview */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-navy-900/80 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Live National Leaderboard
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Current top ranked startups in India based on verified paid bids.
              </p>
            </div>

            {/* Minimum bid pill */}
            {leaderboard && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-navy-950 border border-slate-700 text-xs">
                <span className="text-slate-400">Next Minimum Bid to Take #1:</span>
                <span className="font-extrabold text-amber-400">
                  ₹{leaderboard.nextMinimumBid.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>

          {/* Filter Chips & Search Bar */}
          <div className="py-5 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {industries.map((ind) => (
                <button
                  key={ind}
                  onClick={() => setSelectedIndustry(ind)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedIndustry === ind
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                      : 'bg-navy-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search startups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-navy-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </form>
          </div>

          {/* Leaderboard Table / Cards */}
          <div className="space-y-3 pt-2">
            {isLoading ? (
              <div className="text-center py-16 text-slate-400 space-y-3">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs">Loading live verified rankings...</p>
              </div>
            ) : topItems.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-sm">No startups found matching your filter.</p>
              </div>
            ) : (
              topItems.map((item) => (
                <div
                  key={item.listingId}
                  onClick={() => navigate(`/startup/${item.slug}`)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-navy-950/60 hover:bg-navy-850/80 border border-slate-800/80 hover:border-brand-500/40 transition-all duration-200 cursor-pointer gap-4"
                >
                  {/* Left: Rank & Company Info */}
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    <RankBadge rank={item.rank} className="min-w-[42px]" />

                    {/* Logo */}
                    {item.logoUrl ? (
                      <img
                        src={item.logoUrl}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-800 flex-shrink-0 bg-navy-900"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center font-bold text-base flex-shrink-0">
                        {item.name.substring(0, 2)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base group-hover:text-brand-400 transition-colors truncate">
                          {item.name}
                        </h3>
                        {item.isVerified && <VerifiedBadge />}
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-navy-800 text-slate-300 border border-slate-700/60">
                          {item.categoryName || item.industry}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5 max-w-md">
                        {item.tagline}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span>📍 {item.hqCity}, {item.hqState}</span>
                        <span>•</span>
                        <span>Est. {item.foundedYear}</span>
                        <span>•</span>
                        <span>{item.stage}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Bid Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">
                        Active Bid
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-white group-hover:text-brand-400 transition-colors">
                        ₹{item.currentBidAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleVisitWebsite(item, e)}
                        className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-navy-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold transition-all flex items-center gap-1.5"
                        title="Visit Official Website"
                      >
                        <span className="hidden sm:inline">Visit</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleOpenBid(item, e)}
                        className="px-3 py-1.5 rounded-xl bg-brand-500/15 hover:bg-brand-500 text-brand-400 hover:text-white border border-brand-500/40 text-xs font-bold transition-all flex items-center gap-1"
                        title="Outbid to take higher position"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>Outbid</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* View Full Leaderboard CTA */}
          <div className="pt-6 text-center border-t border-slate-800 mt-6">
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors"
            >
              <span>View all ranked startups on dedicated leaderboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-400">
            Transparent Mechanism
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            How StartupBaazi Works
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            A merit-backed visibility engine designed for the high-octane Indian startup ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-navy-900 border border-slate-800 rounded-2xl p-6 space-y-4 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold text-lg border border-brand-500/20">
              1
            </div>
            <h3 className="text-lg font-bold text-white">List Your Startup</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Submit your company details, founders, category, and website. All listings undergo swift administrative verification to prevent spam and duplicate entities.
            </p>
          </div>

          <div className="bg-navy-900 border border-slate-800 rounded-2xl p-6 space-y-4 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-lg border border-amber-500/20">
              2
            </div>
            <h3 className="text-lg font-bold text-white">Compete for the Spotlight</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Place a verified bid in INR using Razorpay. Our server-controlled engine updates rankings immediately upon payment verification with atomic concurrency locks.
            </p>
          </div>

          <div className="bg-navy-900 border border-slate-800 rounded-2xl p-6 space-y-4 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/20">
              3
            </div>
            <h3 className="text-lg font-bold text-white">Harvest High-Intent Traffic</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Attract founders, early adopters, venture angels, and tech talent. Track impressions, outbound clicks, and conversion performance inside your personal founder dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Real Platform Statistics */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-gradient-to-br from-navy-900 via-navy-850 to-navy-900 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-2">
              <div className="text-3xl sm:text-4xl font-extrabold text-white">
                ₹{leaderboard ? (leaderboard.currentHighestBid || 25000).toLocaleString('en-IN') : '25,000'}
              </div>
              <p className="text-xs text-slate-400 font-medium">Highest Verified Bid (INR)</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl sm:text-4xl font-extrabold text-brand-400">
                100%
              </div>
              <p className="text-xs text-slate-400 font-medium">Transparent Paid Rules</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl sm:text-4xl font-extrabold text-white">
                8+
              </div>
              <p className="text-xs text-slate-400 font-medium">Indian Startup Hubs</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400">
                24/7
              </div>
              <p className="text-xs text-slate-400 font-medium">Real-Time Bidding Engine</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Bottom List Startup Banner */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Ready to put your startup on the map?
        </h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Join India's fastest-growing directory of venture-backed rockets and bootstrapped cash cows.
        </p>
        <Link
          to="/submit"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-500 hover:to-amber-400 text-white font-bold text-sm shadow-xl shadow-brand-500/25 transition-all transform hover:scale-105"
        >
          <span>List Your Startup Now</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Bid Modal */}
      {activeBidTarget && (
        <BidModal
          isOpen={isBidModalOpen}
          onClose={() => {
            setIsBidModalOpen(false);
            setActiveBidTarget(null);
          }}
          listingId={activeBidTarget.listingId}
          companyName={activeBidTarget.name}
          companyLogo={activeBidTarget.logoUrl}
          currentRank={activeBidTarget.rank}
          currentBidAmount={activeBidTarget.currentBidAmount}
          leaderboardId={leaderboard?.id || ''}
          onSuccess={fetchTopStartups}
        />
      )}
    </div>
  );
};
