import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Flame,
  TrendingUp,
  Eye,
  MousePointerClick,
  Percent,
  Bell,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Edit,
  ExternalLink,
  PlusCircle,
  RefreshCw,
  Clock,
  Lock,
  KeyRound,
  EyeOff,
  X,
  Shield
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { RankBadge } from '../components/RankBadge';
import { BidModal } from '../components/BidModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { NotificationItem, PaymentRecord } from '../types';

export const UserDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Edit Profile Modal
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTagline, setEditTagline] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editWebsite, setEditWebsite] = useState<string>('');

  // Bid Modal
  const [isBidModalOpen, setIsBidModalOpen] = useState<boolean>(false);

  // Change Password Modal
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showOldPassword, setShowOldPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState<boolean>(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Please enter your current password', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    try {
      setIsSubmittingPassword(true);
      const res = await api.changePassword({ currentPassword, newPassword });
      if (res.success) {
        showToast('Password changed successfully!', 'success');
        setIsChangePasswordOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to change password. Check your current password.', 'error');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?redirect=/dashboard');
    }
  }, [isAuthenticated, authLoading]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [dashRes, notifRes, payRes] = await Promise.all([
        api.getDashboardAnalytics(),
        api.getNotifications(),
        api.getMyPayments(),
      ]);

      if (dashRes.success) {
        setAnalyticsData(dashRes.data);
        if (dashRes.data.company) {
          setEditTagline(dashRes.data.company.tagline || '');
          setEditDescription(dashRes.data.company.description || '');
          setEditWebsite(dashRes.data.company.websiteUrl || '');
        }
      }

      if (notifRes.success) {
        setNotifications(notifRes.data.notifications || []);
      }

      if (payRes.success) {
        setPayments(payRes.data.payments || []);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      showToast('Error loading dashboard analytics', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analyticsData?.company?.id) return;
    try {
      const res = await api.updateCompany(analyticsData.company.id, {
        tagline: editTagline,
        description: editDescription,
        websiteUrl: editWebsite,
      });
      if (res.success) {
        showToast('Company profile updated successfully!', 'success');
        setIsEditing(false);
        loadDashboardData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update company profile', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      showToast('All notifications marked as read', 'info');
    } catch {
      // ignore
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading founder dashboard...</p>
      </div>
    );
  }

  const hasCompany = analyticsData?.hasCompany;
  const company = analyticsData?.company;
  const listing = analyticsData?.listing;
  const stats = analyticsData?.stats || { views: 0, clicks: 0, ctr: 0, currentRank: null, currentBid: 0 };
  const chartData = analyticsData?.chartData || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Top Banner & Founder Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-400 mb-1">
            <Flame className="w-4 h-4 text-brand-500" />
            <span>Founder Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs text-slate-400">
            Monitor verified rankings, manage visibility bids, and review real traffic analytics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsChangePasswordOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-navy-900 border border-slate-700/80 hover:border-slate-500 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            title="Update account password"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>Change Password</span>
          </button>

          {hasCompany ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsBidModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 text-white font-bold text-xs shadow-lg shadow-brand-500/25 hover:from-brand-500 hover:to-amber-400 transition-all flex items-center gap-1.5"
              >
                <Flame className="w-4 h-4" />
                <span>Outbid & Boost Rank</span>
              </button>
              <Link
                to={`/startup/${company?.slug}`}
                className="p-2.5 rounded-xl bg-navy-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1"
                title="View Public Profile"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <Link
              to="/submit"
              className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-xs shadow-lg shadow-brand-500/25 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>List Your Startup</span>
            </Link>
          )}
        </div>
      </div>

      {/* Account Info & Security Bar */}
      <div className="bg-navy-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center font-bold text-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-white font-semibold flex items-center gap-2">
              <span>{user?.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-brand-500/10 text-brand-400 border border-brand-500/30 uppercase font-bold tracking-wider">
                {user?.role}
              </span>
            </div>
            <div className="text-slate-400 text-[11px] font-mono mt-0.5">{user?.email}</div>
          </div>
        </div>

        <button
          onClick={() => setIsChangePasswordOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-navy-950 border border-slate-700 hover:border-brand-500 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Update Account Password</span>
        </button>
      </div>

      {!hasCompany ? (
        <div className="bg-navy-900 border border-slate-800 rounded-3xl p-10 text-center space-y-4 max-w-xl mx-auto shadow-2xl">
          <div className="w-16 h-16 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
            🚀
          </div>
          <h2 className="text-xl font-bold text-white">No Startup Listed Yet</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            You don't have any verified startup listings under this account. Submit your startup to begin competing on India's premier paid leaderboard.
          </p>
          <Link
            to="/submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-amber-500 text-white font-bold text-xs shadow-lg shadow-brand-500/25"
          >
            <span>Submit Your Startup Now</span>
            <PlusCircle className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="Leaderboard Rank"
              value={stats.currentRank ? `#${stats.currentRank}` : 'Unranked'}
              subtitle={stats.currentRank === 1 ? '🥇 Top Spotlight' : 'Compete to rank #1'}
              icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
            />
            <StatCard
              label="Active Paid Bid"
              value={`₹${stats.currentBid.toLocaleString('en-IN')}`}
              subtitle="Verified server-side via Razorpay"
              icon={<CreditCard className="w-5 h-5 text-emerald-400" />}
            />
            <StatCard
              label="Total Impressions"
              value={stats.views.toLocaleString('en-IN')}
              subtitle="Verified founder views"
              icon={<Eye className="w-5 h-5 text-sky-400" />}
            />
            <StatCard
              label="Outbound Clicks"
              value={stats.clicks.toLocaleString('en-IN')}
              subtitle="Direct visits to official website"
              icon={<MousePointerClick className="w-5 h-5 text-indigo-400" />}
            />
            <StatCard
              label="Click-Through Rate"
              value={`${stats.ctr}%`}
              subtitle="Visitor to website conversion"
              icon={<Percent className="w-5 h-5 text-brand-400" />}
            />
          </div>

          {/* Performance Trend Chart */}
          <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Campaign Traffic Trend</h3>
                <p className="text-xs text-slate-400">Daily impressions and outbound clicks recorded over the past 7 days.</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-brand-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-500" /> Views
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Clicks
                </span>
              </div>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0b1120', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="views" stroke="#f97316" fillOpacity={1} fill="url(#colorViews)" />
                  <Area type="monotone" dataKey="clicks" stroke="#10b981" fillOpacity={1} fill="url(#colorClicks)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2-Column: Company Info & Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Startup Profile & Quick Edit */}
            <div className="lg:col-span-2 bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  {company.logoUrl && (
                    <img src={company.logoUrl} alt={company.name} className="w-12 h-12 rounded-xl object-cover border border-slate-800" />
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {company.name}
                      {listing?.currentRank && <RankBadge rank={listing.currentRank} className="text-[10px]" />}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Status: <span className="text-emerald-400 font-semibold">{listing?.status}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3 py-1.5 rounded-xl bg-navy-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Cancel Edit' : 'Edit Listing'}</span>
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Tagline</label>
                    <input
                      type="text"
                      value={editTagline}
                      onChange={(e) => setEditTagline(e.target.value)}
                      className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Official Website</label>
                    <input
                      type="url"
                      value={editWebsite}
                      onChange={(e) => setEditWebsite(e.target.value)}
                      className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                    <textarea
                      rows={4}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-navy-950 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-xs"
                  >
                    Save Changes
                  </button>
                </form>
              ) : (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Tagline:</span>
                    <p className="text-slate-200 mt-0.5">{company.tagline}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Description:</span>
                    <p className="text-slate-300 mt-0.5 leading-relaxed">{company.description}</p>
                  </div>
                  <div className="flex gap-6 pt-2 text-slate-400">
                    <span>📍 {company.hqCity}, {company.hqState}</span>
                    <span>🏢 {company.industry}</span>
                    <span>📅 Est. {company.foundedYear}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right 1 Col: In-App Notifications & Outbid Alerts */}
            <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-brand-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Alerts & Outbids</h3>
                </div>
                {notifications.some((n) => !n.isRead) && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-brand-400 hover:text-brand-300 font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No notifications yet.</p>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
                        !item.isRead
                          ? 'bg-navy-950 border-brand-500/40 text-slate-200'
                          : 'bg-navy-950/40 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          {item.type === 'OUTBID' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                          {item.type === 'APPROVAL' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-300">{item.message}</p>
                      {item.type === 'OUTBID' && (
                        <button
                          onClick={() => setIsBidModalOpen(true)}
                          className="mt-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          <Flame className="w-3 h-3" />
                          <span>Reclaim Rank #1 Now</span>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Payment & Bidding Transaction History */}
          <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand-400" />
              <span>Payment & Bidding Ledger</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Order / Reference</th>
                    <th className="pb-3">Startup</th>
                    <th className="pb-3">Amount (INR)</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-navy-950/50 transition-colors">
                        <td className="py-3 font-mono text-[11px] text-slate-300">
                          {p.razorpayOrderId}
                        </td>
                        <td className="py-3 font-semibold text-white">
                          {p.bid?.listing?.company?.name || company?.name}
                        </td>
                        <td className="py-3 font-bold text-emerald-400">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.status === 'SUCCESS'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : p.status === 'CREATED'
                                ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400">
                          {new Date(p.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Outbid Modal */}
      {listing && company && (
        <BidModal
          isOpen={isBidModalOpen}
          onClose={() => setIsBidModalOpen(false)}
          listingId={listing.id}
          companyName={company.name}
          companyLogo={company.logoUrl}
          currentRank={listing.currentRank}
          currentBidAmount={listing.currentBidAmount}
          leaderboardId="india-top-startups"
          onSuccess={loadDashboardData}
        />
      )}

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-navy-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => {
                setIsChangePasswordOpen(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Change Your Password</h3>
                <p className="text-[11px] text-slate-400">Update your account credentials securely</p>
              </div>
            </div>

            <div className="p-3 bg-navy-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-400">Logged in as:</span>
              <span className="text-white font-mono font-medium">{user?.email}</span>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Current Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline"
                  >
                    Forgot current password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-navy-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password (Min 6 chars)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-navy-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-navy-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  disabled={isSubmittingPassword}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-navy-950 border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassword || !currentPassword || newPassword.length < 6}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-500 hover:to-amber-400 transition-all shadow-md shadow-brand-500/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingPassword ? (
                    'Saving...'
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Save New Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="text-center pt-3 border-t border-slate-800 text-xs text-slate-400">
              <span>Don't remember your current password? </span>
              <Link to="/forgot-password" className="text-brand-400 font-semibold hover:underline">
                Reset via 6-digit code
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
