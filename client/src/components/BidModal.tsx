import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ShieldCheck, Zap, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface BidModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  companyName: string;
  companyLogo?: string;
  currentRank?: number | null;
  currentBidAmount: number;
  leaderboardId: string;
  onSuccess?: () => void;
}

export const BidModal: React.FC<BidModalProps> = ({
  isOpen,
  onClose,
  listingId,
  companyName,
  companyLogo,
  currentRank,
  currentBidAmount,
  leaderboardId,
  onSuccess,
}) => {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [minRequiredBid, setMinRequiredBid] = useState<number>(500);
  const [minIncrement, setMinIncrement] = useState<number>(100);
  const [bidAmount, setBidAmount] = useState<number>(1000);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [testOrderData, setTestOrderData] = useState<any>(null);
  const [successCelebration, setSuccessCelebration] = useState<boolean>(false);
  const [newRankAchieved, setNewRankAchieved] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSuccessCelebration(false);
      setTestOrderData(null);
      // Fetch rank 1 requirements
      api.getBidRequirements('india-top-startups', 1)
        .then((res) => {
          if (res.success && res.data) {
            const req = res.data.requiredBid;
            setMinRequiredBid(req);
            setMinIncrement(res.data.minIncrement || 100);
            setBidAmount(Math.max(req, currentBidAmount + (res.data.minIncrement || 100)));
          }
        })
        .catch(() => {
          setMinRequiredBid(Math.max(500, currentBidAmount + 100));
          setBidAmount(Math.max(500, currentBidAmount + 500));
        });
    }
  }, [isOpen, currentBidAmount]);

  if (!isOpen) return null;

  const handlePlaceBid = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in to place a verified bid for your startup.', 'warning');
      return;
    }

    if (bidAmount < minRequiredBid) {
      showToast(`Minimum eligible bid to take top rank is ₹${minRequiredBid.toLocaleString('en-IN')}`, 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.createBidIntent({
        listingId,
        leaderboardId,
        amount: bidAmount,
      });

      if (!res.success) {
        throw new Error(res.message || 'Failed to create bid order');
      }

      const orderData = res.data;

      // Check if real Razorpay checkout is available and key is configured
      if (window.Razorpay && !orderData.isTestMode && orderData.keyId && !orderData.keyId.includes('placeholder')) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amountInPaise,
          currency: 'INR',
          name: 'StartupBaazi',
          description: `Leaderboard Bid for ${companyName}`,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            try {
              const verifyRes = await api.verifyPayment({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });

              if (verifyRes.success) {
                setNewRankAchieved(verifyRes.data.newRank);
                setSuccessCelebration(true);
                showToast('Payment verified! Ranking updated.', 'success');
                if (onSuccess) onSuccess();
              }
            } catch (err: any) {
              showToast(err.message || 'Payment verification failed', 'error');
            }
          },
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          theme: {
            color: '#f97316',
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        setIsSubmitting(false);
      } else {
        // Dev/Test Mode Simulator
        setTestOrderData(orderData);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      showToast(err.message || 'Failed to initiate bid', 'error');
    }
  };

  const handleSimulatePayment = async () => {
    if (!testOrderData) return;
    try {
      setIsSubmitting(true);
      const verifyRes = await api.verifyPayment({
        orderId: testOrderData.orderId,
        paymentId: `pay_sim_${Date.now()}`,
        signature: 'test_mode_valid_signature',
      });

      if (verifyRes.success) {
        setNewRankAchieved(verifyRes.data.newRank);
        setSuccessCelebration(true);
        showToast('Payment simulated and verified! Rank activated.', 'success');
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      showToast(err.message || 'Payment verification failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-navy-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {successCelebration ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-3xl">
              🎉
            </div>
            <h3 className="text-2xl font-black text-white">Bid Activated!</h3>
            <p className="text-sm text-slate-300">
              Congratulations! <span className="font-bold text-white">{companyName}</span> has successfully secured{' '}
              <span className="text-amber-400 font-extrabold text-base">Rank #{newRankAchieved || 1}</span> on the India Premier Startup Leaderboard!
            </p>
            <div className="pt-4">
              <button
                onClick={() => {
                  onClose();
                  if (onSuccess) onSuccess();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-amber-500 text-white font-bold text-sm shadow-lg shadow-brand-500/25 hover:from-brand-500 hover:to-amber-400 transition-all"
              >
                View Updated Leaderboard
              </button>
            </div>
          </div>
        ) : testOrderData ? (
          /* Razorpay Test Mode Confirmation */
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-2 rounded-xl text-xs">
              <Zap className="w-4 h-4 flex-shrink-0" />
              <span>Razorpay Test Mode: Order created ({testOrderData.orderId}).</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Confirm Simulated Payment</h3>
              <p className="text-xs text-slate-400 mt-1">
                In local development / test mode, you can instantly simulate a verified UPI / NetBanking payment to activate this bid.
              </p>
            </div>
            <div className="p-4 bg-navy-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Startup:</span>
                <span className="text-white font-semibold">{companyName}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Bid Amount:</span>
                <span className="text-emerald-400 font-extrabold text-sm">₹{bidAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Payment Rail:</span>
                <span className="text-brand-400 font-semibold">UPI / Razorpay Test</span>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTestOrderData(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-400 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying...' : 'Complete Simulated Payment'}
              </button>
            </div>
          </div>
        ) : (
          /* Standard Bidding Form */
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {companyLogo ? (
                  <img src={companyLogo} alt={companyName} className="w-10 h-10 rounded-xl object-cover border border-slate-700" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold">
                    {companyName.substring(0, 2)}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                    {companyName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Currently: <span className="text-slate-200 font-semibold">#{currentRank || 'Unranked'}</span> (₹{currentBidAmount.toLocaleString('en-IN')} bid)
                  </p>
                </div>
              </div>
              <h2 className="text-xl font-black text-white mt-4">Place Paid Visibility Bid</h2>
              <p className="text-xs text-slate-400 mt-1">
                Outbid competitors in INR to claim the #1 spotlight on India's premier startup leaderboard.
              </p>
            </div>

            {/* Min Required Notice */}
            <div className="flex items-center justify-between p-3.5 bg-navy-950/80 rounded-2xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-brand-400" />
                <span>Next Minimum Eligible Bid:</span>
              </div>
              <span className="font-extrabold text-amber-400 text-sm">
                ₹{minRequiredBid.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Bid Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex justify-between">
                <span>Your Bid in Indian Rupees (₹)</span>
                <span className="text-slate-400">Min Increment: ₹{minIncrement}</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                  ₹
                </span>
                <input
                  type="number"
                  min={minRequiredBid}
                  step={minIncrement}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full pl-10 pr-4 py-3 bg-navy-950 border border-slate-700/80 rounded-2xl text-xl font-bold text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            {/* Quick Increment Buttons */}
            <div className="flex flex-wrap gap-2">
              {[500, 1000, 5000, 10000].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => setBidAmount((prev) => Math.max(minRequiredBid, prev + inc))}
                  className="px-3 py-1.5 rounded-xl bg-navy-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition-all"
                >
                  +₹{inc.toLocaleString('en-IN')}
                </button>
              ))}
            </div>

            {/* Safety & Razorpay Assurance */}
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60 flex items-start gap-2.5 text-[11px] text-slate-400">
              <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>
                Leaderboard rankings update atomically after cryptographic signature verification. If another startup outbids you, you receive an instant alert to defend your position.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePlaceBid}
                disabled={isSubmitting || bidAmount < minRequiredBid}
                className="flex-2 w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 text-white font-bold text-xs shadow-lg shadow-brand-500/25 hover:from-brand-500 hover:to-amber-400 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>Processing Bid...</span>
                ) : (
                  <>
                    <span>Proceed to Pay ₹{bidAmount.toLocaleString('en-IN')}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
