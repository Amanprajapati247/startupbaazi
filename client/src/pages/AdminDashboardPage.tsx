import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  Building,
  CreditCard,
  Settings,
  History,
  Search,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'moderation' | 'rules' | 'payments' | 'audit'>('moderation');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_APPROVAL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Leaderboard Rules Config
  const [minBidAmount, setMinBidAmount] = useState<number>(500);
  const [minBidIncrement, setMinBidIncrement] = useState<number>(100);
  const [leaderboardId, setLeaderboardId] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      showToast('Access denied. Administrator privileges required.', 'error');
      navigate('/');
    }
  }, [isAdmin, authLoading]);

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, listingsRes, paymentsRes, auditRes, boardsRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminListings(statusFilter, searchQuery),
        api.getAdminPayments(),
        api.getAdminAuditLogs(),
        api.getLeaderboards(),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (listingsRes.success) setListings(listingsRes.data.listings || []);
      if (paymentsRes.success) setPayments(paymentsRes.data.payments || []);
      if (auditRes.success) setAuditLogs(auditRes.data.logs || []);

      if (boardsRes.success && boardsRes.data.leaderboards?.length > 0) {
        const board = boardsRes.data.leaderboards[0];
        setLeaderboardId(board.id);
        setMinBidAmount(board.minBidAmount);
        setMinBidIncrement(board.minBidIncrement);
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      showToast(err.message || 'Error loading admin data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin, statusFilter]);

  const handleUpdateStatus = async (id: string, status: string, companyName: string) => {
    let rejectionReason = undefined;
    if (status === 'REJECTED') {
      rejectionReason = window.prompt(`Enter rejection reason for ${companyName}:`, 'Incomplete website details');
      if (rejectionReason === null) return;
    }

    try {
      const res = await api.updateListingStatus(id, status, rejectionReason);
      if (res.success) {
        showToast(`Listing for ${companyName} updated to ${status}`, 'success');
        loadAdminData();
      }
    } catch (err: any) {
      showToast(err.message || 'Status update failed', 'error');
    }
  };

  const handleToggleVerification = async (id: string, currentStatus: boolean, companyName: string) => {
    try {
      const res = await api.toggleListingVerification(id, !currentStatus);
      if (res.success) {
        showToast(`Verification badge ${!currentStatus ? 'granted' : 'revoked'} for ${companyName}`, 'info');
        loadAdminData();
      }
    } catch (err: any) {
      showToast(err.message || 'Verification update failed', 'error');
    }
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaderboardId) return;

    try {
      const res = await api.updateLeaderboardRules({
        id: leaderboardId,
        minBidAmount,
        minBidIncrement,
      });

      if (res.success) {
        showToast('Leaderboard bidding parameters updated successfully!', 'success');
        loadAdminData();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update rules', 'error');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Verifying administrative credentials...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
            <Shield className="w-4 h-4" />
            <span>Mission Control & Moderation Desk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            StartupBaazi Administration
          </h1>
          <p className="text-xs text-slate-400">
            Review submissions, audit transactions, toggle verification, and configure bidding parameters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30">
            Administrator: {user?.email}
          </span>
        </div>
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Platform Revenue"
          value={`₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`}
          subtitle="From verified bids"
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
        />
        <StatCard
          label="Pending Approvals"
          value={stats?.pendingListings || 0}
          subtitle="Awaiting moderation"
          icon={<Clock className="w-5 h-5 text-amber-400" />}
        />
        <StatCard
          label="Live Approved Startups"
          value={stats?.approvedListings || 0}
          subtitle="On public directory"
          icon={<CheckCircle2 className="w-5 h-5 text-brand-400" />}
        />
        <StatCard
          label="Active Bids"
          value={stats?.activeBids || 0}
          subtitle="Currently ranking startups"
          icon={<CreditCard className="w-5 h-5 text-indigo-400" />}
        />
        <StatCard
          label="Registered Users"
          value={stats?.totalUsers || 0}
          subtitle="Founders & members"
          icon={<Users className="w-5 h-5 text-sky-400" />}
        />
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'moderation'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Moderation ({stats?.pendingListings || 0} Pending)</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'rules'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Bidding Parameters</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Transactions & Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Logs</span>
        </button>
      </div>

      {/* TAB 1: Startup Moderation */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex gap-2">
              {['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ALL'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    statusFilter === status
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                      : 'bg-navy-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadAdminData()}
                className="w-full pl-9 pr-4 py-2 bg-navy-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          <div className="bg-navy-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-navy-950/60 text-slate-400 uppercase font-semibold">
                    <th className="py-3.5 px-4">Startup</th>
                    <th className="py-3.5 px-4">Location & Category</th>
                    <th className="py-3.5 px-4">Website</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Verified</th>
                    <th className="py-3.5 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {listings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No startup submissions matching this status.
                      </td>
                    </tr>
                  ) : (
                    listings.map((l) => (
                      <tr key={l.id} className="hover:bg-navy-950/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {l.company.logoUrl ? (
                              <img src={l.company.logoUrl} alt={l.company.name} className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold">
                                {l.company.name.substring(0, 2)}
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-white block">{l.company.name}</span>
                              <span className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{l.company.tagline}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-300">
                          <span>{l.company.hqCity}, {l.company.hqState}</span>
                          <span className="block text-[11px] text-slate-500">{l.company.industry}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <a
                            href={l.company.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-400 hover:underline flex items-center gap-1 font-medium"
                          >
                            <span>Visit</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              l.status === 'APPROVED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : l.status === 'PENDING_APPROVAL'
                                ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleVerification(l.id, l.isVerified, l.company.name)}
                            className="cursor-pointer"
                            title="Toggle verification badge"
                          >
                            {l.isVerified ? (
                              <VerifiedBadge showText={true} />
                            ) : (
                              <span className="text-[11px] text-slate-500 hover:text-slate-300 underline">Unverified</span>
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-2">
                          {l.status !== 'APPROVED' && (
                            <button
                              onClick={() => handleUpdateStatus(l.id, 'APPROVED', l.company.name)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all"
                            >
                              Approve
                            </button>
                          )}
                          {l.status !== 'REJECTED' && (
                            <button
                              onClick={() => handleUpdateStatus(l.id, 'REJECTED', l.company.name)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[11px] transition-all"
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Bidding Rules */}
      {activeTab === 'rules' && (
        <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Leaderboard Bidding Configuration</h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure baseline amounts in Indian Rupees (₹). All bidding transactions enforce these values server-side.
            </p>
          </div>

          <form onSubmit={handleSaveRules} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Starting Minimum Bid (INR ₹)
              </label>
              <input
                type="number"
                min={100}
                step={50}
                value={minBidAmount}
                onChange={(e) => setMinBidAmount(parseFloat(e.target.value) || 500)}
                className="w-full px-4 py-2.5 bg-navy-950 border border-slate-700 rounded-xl text-xs text-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                The minimum initial bid required for a startup to rank on an empty leaderboard.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Minimum Bid Increment (INR ₹)
              </label>
              <input
                type="number"
                min={50}
                step={50}
                value={minBidIncrement}
                onChange={(e) => setMinBidIncrement(parseFloat(e.target.value) || 100)}
                className="w-full px-4 py-2.5 bg-navy-950 border border-slate-700 rounded-xl text-xs text-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                The minimum amount by which a new bid must exceed the target rank's active bid.
              </p>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-amber-500 text-white font-bold text-xs shadow-lg shadow-brand-500/20 hover:from-brand-500 hover:to-amber-400 transition-all"
            >
              Save Bidding Rules
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Transactions & Ledger */}
      {activeTab === 'payments' && (
        <div className="bg-navy-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-navy-950/60 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Payment ID</th>
                  <th className="py-3 px-4">Startup</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-navy-950/50">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">{p.razorpayOrderId}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{p.razorpayPaymentId || 'N/A'}</td>
                    <td className="py-3 px-4 font-bold text-white">{p.bid?.listing?.company?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-slate-300">{p.user?.name}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-navy-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-navy-950/60 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">Target ID</th>
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No admin actions recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-navy-950/50">
                      <td className="py-3 px-4 font-bold text-brand-400">{log.action}</td>
                      <td className="py-3 px-4 text-slate-300">{log.targetType}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{log.targetId.substring(0, 10)}...</td>
                      <td className="py-3 px-4 text-white">{log.admin?.name}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] max-w-xs truncate">{log.details || '-'}</td>
                      <td className="py-3 px-4 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
