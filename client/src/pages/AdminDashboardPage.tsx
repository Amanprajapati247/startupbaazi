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
  ExternalLink,
  RotateCcw,
  AlertOctagon,
  X,
  Key,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface ConfirmModalConfig {
  isOpen: boolean;
  title: string;
  description: string;
  actionLabel: string;
  isDestructive?: boolean;
  requiresReason?: boolean;
  reasonPlaceholder?: string;
  defaultReason?: string;
  onConfirm: (reason?: string) => Promise<void>;
}

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [suspiciousBids, setSuspiciousBids] = useState<any[]>([]);
  const [suspiciousSummary, setSuspiciousSummary] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'moderation' | 'users' | 'rules' | 'payments' | 'suspicious' | 'audit'>('moderation');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_APPROVAL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  const [paymentSearch, setPaymentSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // User Management State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [isUsersLoading, setIsUsersLoading] = useState<boolean>(false);

  // Admin Change Password Modal State
  const [userPasswordModal, setUserPasswordModal] = useState<{
    isOpen: boolean;
    user: { id: string; name: string; email: string } | null;
    newPassword: string;
    confirmPassword: string;
    showPassword: boolean;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    user: null,
    newPassword: '',
    confirmPassword: '',
    showPassword: false,
    isSubmitting: false,
  });

  // Leaderboard Rules Config
  const [minBidAmount, setMinBidAmount] = useState<number>(500);
  const [minBidIncrement, setMinBidIncrement] = useState<number>(100);
  const [leaderboardId, setLeaderboardId] = useState<string>('');

  // Confirmation Modal State
  const [modalConfig, setModalConfig] = useState<ConfirmModalConfig>({
    isOpen: false,
    title: '',
    description: '',
    actionLabel: 'Confirm',
    onConfirm: async () => {},
  });
  const [modalReasonInput, setModalReasonInput] = useState<string>('');
  const [isActionPending, setIsActionPending] = useState<boolean>(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      showToast('Access denied. Administrator privileges required.', 'error');
      navigate('/');
    }
  }, [isAdmin, authLoading]);

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, listingsRes, paymentsRes, auditRes, boardsRes, suspiciousRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminListings(statusFilter, searchQuery),
        api.getAdminPayments(paymentStatusFilter, paymentSearch),
        api.getAdminAuditLogs(),
        api.getLeaderboards(),
        api.getAdminSuspiciousBids(),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (listingsRes.success) setListings(listingsRes.data.listings || []);
      if (paymentsRes.success) setPayments(paymentsRes.data.payments || []);
      if (auditRes.success) setAuditLogs(auditRes.data.logs || []);
      if (suspiciousRes.success) {
        setSuspiciousBids(suspiciousRes.data.suspiciousBids || []);
        setSuspiciousSummary(suspiciousRes.data.summary || null);
      }

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
  }, [isAdmin, statusFilter, paymentStatusFilter]);

  const loadUsers = async () => {
    try {
      setIsUsersLoading(true);
      const res = await api.getAdminUsers(userSearch, userRoleFilter);
      if (res.success) {
        setUsersList(res.data.users || []);
      }
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setIsUsersLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin, userRoleFilter]);

  const generateStrongPassword = () => {
    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let pwd = 'Sb@';
    for (let i = 0; i < 9; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setUserPasswordModal((prev) => ({
      ...prev,
      newPassword: pwd,
      confirmPassword: pwd,
      showPassword: true,
    }));
    showToast('Generated strong password suggestion', 'info');
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPasswordModal.user) return;
    if (userPasswordModal.newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (userPasswordModal.newPassword !== userPasswordModal.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    try {
      setUserPasswordModal((prev) => ({ ...prev, isSubmitting: true }));
      const res = await api.adminResetUserPassword(
        userPasswordModal.user.id,
        userPasswordModal.newPassword
      );

      if (res.success) {
        showToast(res.message || 'Password updated successfully!', 'success');
        setUserPasswordModal({
          isOpen: false,
          user: null,
          newPassword: '',
          confirmPassword: '',
          showPassword: false,
          isSubmitting: false,
        });
        // Reload audit logs to reflect action
        api.getAdminAuditLogs().then((res) => {
          if (res.success) setAuditLogs(res.data.logs || []);
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update user password', 'error');
      setUserPasswordModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const openConfirmModal = (config: Omit<ConfirmModalConfig, 'isOpen'>) => {
    setModalReasonInput(config.defaultReason || '');
    setModalConfig({ ...config, isOpen: true });
  };

  const closeConfirmModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
    setModalReasonInput('');
  };

  const handleModalSubmit = async () => {
    try {
      setIsActionPending(true);
      await modalConfig.onConfirm(modalReasonInput);
      closeConfirmModal();
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setIsActionPending(false);
    }
  };

  const promptStatusChange = (id: string, status: string, companyName: string) => {
    if (status === 'APPROVED') {
      openConfirmModal({
        title: `Approve ${companyName}?`,
        description: `This will publish "${companyName}" to the public verified directory and make it eligible for competitive leaderboard ranking.`,
        actionLabel: 'Approve & Publish',
        isDestructive: false,
        onConfirm: async () => {
          const res = await api.updateListingStatus(id, 'APPROVED');
          if (res.success) {
            showToast(`${companyName} approved successfully!`, 'success');
          }
        },
      });
    } else if (status === 'REJECTED') {
      openConfirmModal({
        title: `Reject Listing for ${companyName}`,
        description: `Please enter a rejection reason so the founder can correct their submission:`,
        actionLabel: 'Reject Submission',
        isDestructive: true,
        requiresReason: true,
        reasonPlaceholder: 'e.g. Incomplete website details or broken link',
        defaultReason: 'Incomplete website details or broken link',
        onConfirm: async (reason) => {
          const res = await api.updateListingStatus(id, 'REJECTED', reason);
          if (res.success) {
            showToast(`Listing for ${companyName} rejected.`, 'info');
          }
        },
      });
    } else if (status === 'SUSPENDED') {
      openConfirmModal({
        title: `Suspend Listing for ${companyName}?`,
        description: `This will immediately remove ${companyName} from public leaderboards and de-rank its active bids.`,
        actionLabel: 'Suspend Listing',
        isDestructive: true,
        requiresReason: true,
        reasonPlaceholder: 'Reason for suspension (policy violation, dispute, etc.)',
        onConfirm: async (reason) => {
          const res = await api.updateListingStatus(id, 'SUSPENDED', reason);
          if (res.success) {
            showToast(`Listing for ${companyName} suspended.`, 'warning');
          }
        },
      });
    }
  };

  const promptRefundPayment = (paymentId: string, companyName: string, amount: number) => {
    openConfirmModal({
      title: `Refund ₹${amount.toLocaleString('en-IN')} to ${companyName}?`,
      description: `This action will mark the payment as REFUNDED, expire the corresponding leaderboard bid, recalculate the entire leaderboard rankings, and notify the founder.`,
      actionLabel: 'Process Refund & Recalculate Ranks',
      isDestructive: true,
      requiresReason: true,
      reasonPlaceholder: 'Reason for refund (e.g. User requested, disputed charge, test transaction)',
      defaultReason: 'User requested or administrative decision',
      onConfirm: async (reason) => {
        const res = await api.refundPayment(paymentId, reason);
        if (res.success) {
          showToast(`Refund processed successfully. Rankings updated!`, 'success');
        }
      },
    });
  };

  const promptSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaderboardId) return;

    openConfirmModal({
      title: 'Update Leaderboard Bidding Parameters?',
      description: `New Minimum Starting Bid: ₹${minBidAmount.toLocaleString('en-IN')} | Minimum Increment: ₹${minBidIncrement.toLocaleString('en-IN')}. All future bids will immediately enforce these parameters.`,
      actionLabel: 'Apply Parameter Changes',
      isDestructive: false,
      onConfirm: async () => {
        const res = await api.updateLeaderboardRules({
          id: leaderboardId,
          minBidAmount,
          minBidIncrement,
        });
        if (res.success) {
          showToast('Leaderboard bidding parameters updated successfully!', 'success');
        }
      },
    });
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
      {/* Confirmation Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-navy-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={closeConfirmModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              {modalConfig.isDestructive ? (
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertOctagon className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
              )}
              <h3 className="text-base font-bold text-white">{modalConfig.title}</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{modalConfig.description}</p>

            {modalConfig.requiresReason && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-semibold text-slate-400 block">
                  Action Reason / Note (Mandatory):
                </label>
                <input
                  type="text"
                  placeholder={modalConfig.reasonPlaceholder}
                  value={modalReasonInput}
                  onChange={(e) => setModalReasonInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-navy-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={closeConfirmModal}
                disabled={isActionPending}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-navy-950 border border-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleModalSubmit}
                disabled={isActionPending || (modalConfig.requiresReason && !modalReasonInput.trim())}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md disabled:opacity-50 ${
                  modalConfig.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                    : 'bg-brand-500 hover:bg-brand-400 shadow-brand-500/20'
                }`}
              >
                {isActionPending ? 'Processing...' : modalConfig.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reset User Password Modal */}
      {userPasswordModal.isOpen && userPasswordModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-navy-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setUserPasswordModal((prev) => ({ ...prev, isOpen: false }))}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Change User Password</h3>
                <p className="text-[11px] text-slate-400">Admin override for user credential</p>
              </div>
            </div>

            <div className="p-3 bg-navy-950 border border-slate-800 rounded-xl space-y-1">
              <div className="text-xs text-slate-400">Target User:</div>
              <div className="text-sm font-bold text-white">{userPasswordModal.user.name}</div>
              <div className="text-xs text-brand-400 font-mono">{userPasswordModal.user.email}</div>
            </div>

            <form onSubmit={handleAdminResetPassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">New Password</label>
                  <button
                    type="button"
                    onClick={generateStrongPassword}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={userPasswordModal.showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter new password (min 6 chars)"
                    value={userPasswordModal.newPassword}
                    onChange={(e) =>
                      setUserPasswordModal((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    className="w-full pl-10 pr-10 py-2.5 bg-navy-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setUserPasswordModal((prev) => ({ ...prev, showPassword: !prev.showPassword }))
                    }
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {userPasswordModal.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={userPasswordModal.showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat new password"
                    value={userPasswordModal.confirmPassword}
                    onChange={(e) =>
                      setUserPasswordModal((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    className="w-full pl-10 pr-4 py-2.5 bg-navy-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setUserPasswordModal((prev) => ({ ...prev, isOpen: false }))}
                  disabled={userPasswordModal.isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-navy-950 border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userPasswordModal.isSubmitting || userPasswordModal.newPassword.length < 6}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {userPasswordModal.isSubmitting ? (
                    'Updating...'
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            Review submissions, audit transactions, detect suspicious bids, process refunds, and configure bidding parameters.
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
      <div className="flex border-b border-slate-800 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'moderation'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Moderation ({stats?.pendingListings || 0} Pending)</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'users'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts & Passwords ({stats?.totalUsers || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 flex-shrink-0 ${
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
          className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'payments'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Transactions & Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('suspicious')}
          className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 flex-shrink-0 ${
            activeTab === 'suspicious'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Suspicious Bids {suspiciousBids.length > 0 && `(${suspiciousBids.length})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 flex-shrink-0 ${
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
                              onClick={() => promptStatusChange(l.id, 'APPROVED', l.company.name)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all"
                            >
                              Approve
                            </button>
                          )}
                          {l.status !== 'REJECTED' && (
                            <button
                              onClick={() => promptStatusChange(l.id, 'REJECTED', l.company.name)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[11px] transition-all"
                            >
                              Reject
                            </button>
                          )}
                          {l.status === 'APPROVED' && (
                            <button
                              onClick={() => promptStatusChange(l.id, 'SUSPENDED', l.company.name)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[11px] transition-all border border-amber-500/30"
                            >
                              Suspend
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

      {/* TAB: User Accounts & Passwords */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex gap-2">
              {(['ALL', 'FOUNDER', 'ADMIN', 'USER'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    userRoleFilter === r
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                      : 'bg-navy-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                  className="w-full pl-9 pr-4 py-2 bg-navy-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                onClick={loadUsers}
                className="p-2 bg-navy-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl hover:text-white transition-colors"
                title="Refresh user list"
              >
                <RefreshCw className={`w-4 h-4 ${isUsersLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-navy-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-navy-950/60 text-slate-400 uppercase font-semibold">
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Startups Associated</th>
                    <th className="py-3.5 px-4">Activity</th>
                    <th className="py-3.5 px-4">Joined Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {isUsersLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading user accounts...
                      </td>
                    </tr>
                  ) : usersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No user accounts match your search/filter.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-navy-950/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-navy-800 border border-slate-700 flex items-center justify-center font-bold text-brand-400 text-xs flex-shrink-0">
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt={u.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                u.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {u.isEmailVerified && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Verified email" />
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'ADMIN'
                                ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
                                : u.role === 'FOUNDER'
                                ? 'bg-brand-500/10 text-brand-400 border border-brand-500/30'
                                : 'bg-slate-700/30 text-slate-400 border border-slate-700/50'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {u.companyMembers && u.companyMembers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.companyMembers.map((m: any) => (
                                <span
                                  key={m.company.id}
                                  className="px-2 py-0.5 rounded bg-navy-950 border border-slate-700 text-slate-300 text-[11px]"
                                >
                                  {m.company.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">None</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-300">
                          <div className="text-[11px]">
                            <span className="text-white font-semibold">{u._count?.bids || 0}</span> bids
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {u._count?.payments || 0} payments
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() =>
                              setUserPasswordModal({
                                isOpen: true,
                                user: { id: u.id, name: u.name, email: u.email },
                                newPassword: '',
                                confirmPassword: '',
                                showPassword: false,
                                isSubmitting: false,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl bg-navy-950 border border-amber-500/40 hover:bg-amber-500/10 text-amber-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Change Password</span>
                          </button>
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

          <form onSubmit={promptSaveRules} className="space-y-4">
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
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-amber-500 text-white font-bold text-xs shadow-lg shadow-brand-500/20 hover:from-brand-500 hover:to-amber-400 transition-all cursor-pointer"
            >
              Save Bidding Rules
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Transactions & Ledger */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex gap-2">
              {['ALL', 'SUCCESS', 'REFUNDED', 'FAILED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setPaymentStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    paymentStatusFilter === st
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                      : 'bg-navy-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search order ID or email..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
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
                    <th className="py-3 px-4">Order / Session ID</th>
                    <th className="py-3 px-4">Payment Ref</th>
                    <th className="py-3 px-4">Startup</th>
                    <th className="py-3 px-4">Founder / User</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-navy-950/50">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                          {p.razorpayOrderId || p.stripeSessionId || p.upiUtr || p.id.substring(0, 8)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {p.razorpayPaymentId || p.stripePaymentIntentId || p.upiUtr || 'N/A'}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {p.bid?.listing?.company?.name || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{p.user?.email || p.user?.name}</td>
                        <td className="py-3 px-4 font-bold text-emerald-400">₹{p.amount.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.status === 'SUCCESS'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : p.status === 'REFUNDED'
                                ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right">
                          {p.status === 'SUCCESS' && (
                            <button
                              onClick={() => promptRefundPayment(p.id, p.bid?.listing?.company?.name || 'startup', p.amount)}
                              className="px-2.5 py-1 rounded-lg bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800 text-[11px] font-semibold transition-all flex items-center gap-1 ml-auto"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Refund</span>
                            </button>
                          )}
                          {p.status === 'REFUNDED' && (
                            <span className="text-[11px] text-slate-500 font-mono">Refunded</span>
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

      {/* TAB 4: Suspicious Bids */}
      {activeTab === 'suspicious' && (
        <div className="space-y-4">
          <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span>Anomalous & Suspicious Bidding Watchdog</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Automated heuristics flag statistical outliers, rapid automated burst bids, and payment status integrity discrepancies.
                </p>
              </div>

              {suspiciousSummary && (
                <div className="flex items-center gap-4 text-xs">
                  <div className="px-3 py-1.5 bg-navy-950 border border-slate-800 rounded-xl">
                    <span className="text-slate-400">Total Bids Analyzed: </span>
                    <span className="font-bold text-white">{suspiciousSummary.totalChecked}</span>
                  </div>
                  <div className="px-3 py-1.5 bg-navy-950 border border-slate-800 rounded-xl">
                    <span className="text-slate-400">Active Benchmark: </span>
                    <span className="font-bold text-emerald-400">₹{suspiciousSummary.avgActiveBid?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </div>

            {suspiciousBids.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-semibold text-white">No Suspicious Bidding Activity Detected</p>
                <p className="text-xs text-slate-500">All recent bidding transactions fall within typical statistical bounds.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {suspiciousBids.map((b, idx) => (
                  <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{b.companyName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            b.severity === 'HIGH'
                              ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {b.severity} ALERT
                        </span>
                        <span className="text-xs font-mono text-emerald-400 font-bold">
                          ₹{b.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-xs text-amber-300/90">{b.reason}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>User: {b.userEmail || 'N/A'}</span>
                        <span>•</span>
                        <span>Placed: {new Date(b.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <span>Status: {b.status}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => promptStatusChange(b.bidId, 'SUSPENDED', b.companyName)}
                        className="px-3 py-1.5 rounded-xl bg-navy-950 border border-slate-700 hover:border-amber-400 text-amber-300 text-xs font-semibold"
                      >
                        Investigate Company
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Audit Logs */}
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
                      <td className="py-3 px-4 text-white">{log.admin?.name || log.admin?.email}</td>
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
