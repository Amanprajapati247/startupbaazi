import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  MapPin,
  Calendar,
  Building,
  Flame,
  ArrowLeft,
  CheckCircle2,
  Share2,
  ShieldAlert,
  Globe,
  Twitter,
  Linkedin,
  Github
} from 'lucide-react';
import { api } from '../services/api';
import { Company, Listing } from '../types';
import { RankBadge } from '../components/RankBadge';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { BidModal } from '../components/BidModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const StartupDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [company, setCompany] = useState<Company | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBidModalOpen, setIsBidModalOpen] = useState<boolean>(false);

  const fetchCompanyDetails = async () => {
    if (!slug) return;
    try {
      setIsLoading(true);
      const res = await api.getCompanyBySlug(slug);
      if (res.success && res.data.company) {
        setCompany(res.data.company);
        setListing(res.data.company.listing || null);
      }
    } catch (err: any) {
      console.error('Failed to load startup details:', err);
      showToast('Startup profile not found', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyDetails();
  }, [slug]);

  const handleVisitWebsite = () => {
    if (!company) return;
    if (listing?.id) {
      api.trackClick(listing.id).catch(() => {});
    }
    window.open(company.websiteUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${company?.name} on StartupBaazi`,
        text: company?.tagline,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Profile link copied to clipboard!', 'success');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading startup profile...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Startup Not Found</h2>
        <p className="text-xs text-slate-400">The startup profile you are looking for does not exist or is pending review.</p>
        <Link
          to="/leaderboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-white font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Leaderboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <Link
        to="/leaderboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Leaderboard</span>
      </Link>

      {/* Main Profile Header Card */}
      <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 relative z-10">
          {/* Logo & Meta */}
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-2 border-slate-700 bg-navy-950 shadow-xl"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center font-bold text-2xl shadow-xl">
                {company.name.substring(0, 2)}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {company.name}
                </h1>
                {listing?.isVerified && <VerifiedBadge showText={true} />}
                {listing?.currentRank && (
                  <RankBadge rank={listing.currentRank} className="text-xs" />
                )}
              </div>

              <p className="text-sm sm:text-base text-slate-300 font-medium">
                {company.tagline}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-brand-400" />
                  {company.hqCity}, {company.hqState}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Founded {company.foundedYear}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  {company.stage}
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-3">
            <button
              onClick={handleVisitWebsite}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-500 hover:to-amber-400 text-white font-bold text-xs shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
            >
              <span>Visit Website</span>
              <ExternalLink className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    showToast('Please sign in to place a bid on this listing.', 'warning');
                    navigate('/login');
                    return;
                  }
                  setIsBidModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-navy-850 hover:bg-slate-800 text-brand-400 hover:text-white border border-brand-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Flame className="w-4 h-4" />
                <span>Outbid / Boost Rank</span>
              </button>

              <button
                onClick={handleShare}
                className="p-2.5 rounded-xl bg-navy-850 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 transition-all"
                title="Share Profile"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Grid: Details & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Description & Profile Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white tracking-tight">About {company.name}</h2>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {company.description}
            </p>
          </div>

          {/* Social Links */}
          <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Online Presence</h3>
            <div className="flex flex-wrap gap-3">
              <a
                href={company.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all"
              >
                <Globe className="w-4 h-4 text-brand-400" />
                <span>Official Website</span>
              </a>

              {company.twitterUrl && (
                <a
                  href={company.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all"
                >
                  <Twitter className="w-4 h-4 text-sky-400" />
                  <span>Twitter / X</span>
                </a>
              )}

              {company.linkedinUrl && (
                <a
                  href={company.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all"
                >
                  <Linkedin className="w-4 h-4 text-blue-400" />
                  <span>LinkedIn</span>
                </a>
              )}

              {company.githubUrl && (
                <a
                  href={company.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all"
                >
                  <Github className="w-4 h-4 text-slate-300" />
                  <span>GitHub</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Paid Ranking & Performance Card */}
        <div className="space-y-6">
          <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Leaderboard Standing
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-800 text-xs">
                <span className="text-slate-400">National Rank</span>
                <span className="font-extrabold text-amber-400 text-base">
                  #{listing?.currentRank || 'Unranked'}
                </span>
              </div>

              <div className="flex justify-between items-center py-2.5 border-b border-slate-800 text-xs">
                <span className="text-slate-400">Current Verified Bid</span>
                <span className="font-extrabold text-white text-base">
                  ₹{(listing?.currentBidAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center py-2.5 border-b border-slate-800 text-xs">
                <span className="text-slate-400">Industry</span>
                <span className="font-semibold text-slate-200">{company.industry}</span>
              </div>

              <div className="flex justify-between items-center py-2.5 border-b border-slate-800 text-xs">
                <span className="text-slate-400">Approval Status</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {listing?.status || 'APPROVED'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (!isAuthenticated) {
                  showToast('Please sign in to place a bid on this listing.', 'warning');
                  navigate('/login');
                  return;
                }
                setIsBidModalOpen(true);
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 hover:from-brand-500 hover:to-amber-400 text-white font-bold text-xs shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Flame className="w-4 h-4" />
              <span>Outbid for Top Spot</span>
            </button>
          </div>

          {/* Legal / Ranking Notice */}
          <div className="p-4 rounded-2xl bg-navy-950 border border-slate-800 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-400">
              <ShieldAlert className="w-3.5 h-3.5 text-brand-400" />
              <span>Transparency Disclosure</span>
            </div>
            <p>
              Leaderboard standing is determined entirely by transparent bids placed in INR. StartupBaazi does not offer investment advisory or rating services.
            </p>
          </div>
        </div>
      </div>

      {/* Outbid Modal */}
      {listing && (
        <BidModal
          isOpen={isBidModalOpen}
          onClose={() => setIsBidModalOpen(false)}
          listingId={listing.id}
          companyName={company.name}
          companyLogo={company.logoUrl}
          currentRank={listing.currentRank}
          currentBidAmount={listing.currentBidAmount}
          leaderboardId="india-top-startups"
          onSuccess={fetchCompanyDetails}
        />
      )}
    </div>
  );
};
