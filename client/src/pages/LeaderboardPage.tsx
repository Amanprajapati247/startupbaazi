import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Flame,
  Search,
  ExternalLink,
  MapPin,
  Calendar,
  Building,
  TrendingUp,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { LeaderboardItem, LeaderboardConfig } from '../types';
import { RankBadge } from '../components/RankBadge';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { BidModal } from '../components/BidModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [leaderboard, setLeaderboard] = useState<LeaderboardConfig | null>(null);
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters state
  const [selectedIndustry, setSelectedIndustry] = useState<string>(searchParams.get('industry') || 'All');
  const [selectedCity, setSelectedCity] = useState<string>(searchParams.get('city') || 'All');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || 'rank_asc');
  const [currentPage, setCurrentPage] = useState<number>(parseInt(searchParams.get('page') || '1', 10));
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Bid Modal
  const [bidTarget, setBidTarget] = useState<LeaderboardItem | null>(null);
  const [isBidModalOpen, setIsBidModalOpen] = useState<boolean>(false);

  const industries = [
    'All',
    'AI & Machine Learning',
    'Fintech & Payments',
    'SaaS & Enterprise',
    'Developer Tools',
    'D2C & E-Commerce',
    'EdTech',
    'Healthcare & Biotech',
    'Logistics & Mobility',
  ];

  const cities = [
    'All',
    'Bengaluru',
    'Delhi NCR',
    'Mumbai',
    'Pune',
    'Hyderabad',
    'Chennai',
    'Indore',
  ];

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {
        page: currentPage.toString(),
        limit: '20',
        sort: sortBy,
      };

      if (selectedIndustry !== 'All') params.industry = selectedIndustry;
      if (selectedCity !== 'All') params.city = selectedCity;
      if (searchQuery.trim().length > 0) params.search = searchQuery.trim();

      const res = await api.getLeaderboard('india-top-startups', params);
      if (res.success) {
        setLeaderboard(res.data.leaderboard);
        setItems(res.data.items);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalCount(res.data.pagination.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedIndustry, selectedCity, sortBy, currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLeaderboard();
  };

  const handleVisitWebsite = (item: LeaderboardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    api.trackClick(item.listingId).catch(() => {});
    window.open(item.websiteUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenBid = (item: LeaderboardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      showToast('Please sign in to place a bid on this startup.', 'warning');
      navigate('/login');
      return;
    }
    setBidTarget(item);
    setIsBidModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-400 mb-2">
            <Flame className="w-4 h-4 text-brand-500 fill-brand-500" />
            <span>National Pay-to-Rank Showcase</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            India Premier Startup Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time ranking of Indian startups determined strictly by verified paid visibility bids in INR (₹).
          </p>
        </div>

        {/* Next bid info card */}
        {leaderboard && (
          <div className="bg-navy-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              👑
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">
                Next Min Bid to Take Rank #1
              </span>
              <span className="text-lg font-black text-amber-400">
                ₹{leaderboard.nextMinimumBid.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-navy-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search startup, tagline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </form>

          {/* Industry Filter */}
          <div>
            <select
              value={selectedIndustry}
              onChange={(e) => {
                setSelectedIndustry(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  Industry: {ind}
                </option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              {cities.map((city) => (
                <option key={city} value={city}>
                  City: {city}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-navy-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="rank_asc">Sort: Rank (Ascending)</option>
              <option value="bid_desc">Sort: Highest Active Bid</option>
              <option value="newest">Sort: Newly Listed</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <div>
            Showing <span className="font-bold text-white">{items.length}</span> of{' '}
            <span className="font-bold text-white">{totalCount}</span> verified startups
          </div>
          {(selectedIndustry !== 'All' || selectedCity !== 'All' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedIndustry('All');
                setSelectedCity('All');
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="text-brand-400 hover:text-brand-300 font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Leaderboard Listings */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Updating verified leaderboard data...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-navy-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
            <p className="text-base font-semibold text-slate-300">No startups match this query.</p>
            <p className="text-xs text-slate-500">Try adjusting your category, city, or search terms.</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.listingId}
              onClick={() => navigate(`/startup/${item.slug}`)}
              className="group flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 rounded-2xl bg-navy-900/70 hover:bg-navy-850 border border-slate-800 hover:border-brand-500/50 transition-all duration-200 cursor-pointer gap-4 shadow-lg"
            >
              {/* Left Column: Rank + Logo + Info */}
              <div className="flex items-center gap-4 min-w-0">
                <RankBadge rank={item.rank} className="min-w-[48px]" />

                {/* Company Logo */}
                {item.logoUrl ? (
                  <img
                    src={item.logoUrl}
                    alt={item.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-700/80 bg-navy-950 flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {item.name.substring(0, 2)}
                  </div>
                )}

                {/* Text Content */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-brand-400 transition-colors truncate">
                      {item.name}
                    </h3>
                    {item.isVerified && <VerifiedBadge showText={false} />}
                    <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-navy-950 text-slate-300 border border-slate-800">
                      {item.categoryName || item.industry}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 max-w-xl">
                    {item.tagline}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {item.hqCity}, {item.hqState}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Founded {item.foundedYear}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      {item.stage}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Bid & Buttons */}
              <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                <div className="text-left md:text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">
                    Verified Bid
                  </span>
                  <span className="text-base sm:text-lg font-black text-white group-hover:text-brand-400 transition-colors">
                    ₹{item.currentBidAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleVisitWebsite(item, e)}
                    className="px-3 py-2 rounded-xl bg-navy-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold transition-all flex items-center gap-1.5"
                    title="Visit Website"
                  >
                    <span>Visit</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => handleOpenBid(item, e)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-500 hover:to-amber-400 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
                    title="Outbid this startup"
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl bg-navy-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs text-slate-400 px-4">
            Page <span className="font-bold text-white">{currentPage}</span> of{' '}
            <span className="font-bold text-white">{totalPages}</span>
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl bg-navy-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Outbid Modal */}
      {bidTarget && (
        <BidModal
          isOpen={isBidModalOpen}
          onClose={() => {
            setIsBidModalOpen(false);
            setBidTarget(null);
          }}
          listingId={bidTarget.listingId}
          companyName={bidTarget.name}
          companyLogo={bidTarget.logoUrl}
          currentRank={bidTarget.rank}
          currentBidAmount={bidTarget.currentBidAmount}
          leaderboardId={leaderboard?.id || ''}
          onSuccess={fetchLeaderboard}
        />
      )}
    </div>
  );
};
