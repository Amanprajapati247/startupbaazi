import { prisma } from '../prisma';
import { PaymentService } from './paymentService';
import { RankingService } from './rankingService';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';

export class BiddingService {
  /**
   * Creates a bid intent and payment order across Razorpay, Stripe, or Direct UPI.
   */
  static async createBidIntent({
    listingId,
    leaderboardId,
    userId,
    amount,
    provider = 'RAZORPAY',
  }: {
    listingId: string;
    leaderboardId: string;
    userId: string;
    amount: number;
    provider?: 'RAZORPAY' | 'STRIPE' | 'UPI_DIRECT';
  }) {
    // 1. Verify listing is APPROVED
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        company: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!listing) {
      throw new AppError('Listing not found.', 404);
    }

    if (listing.status !== 'APPROVED') {
      throw new AppError('Only approved startup listings can place bids.', 400);
    }

    // 2. Verify user has rights to this company (or is admin)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isMember = listing.company.members.some((m) => m.userId === userId);
    const isAdmin = user?.role === 'ADMIN';

    if (!isMember && !isAdmin) {
      throw new AppError('You are not authorized to place bids on behalf of this company.', 403);
    }

    // 3. Verify leaderboard exists and is active (lookup by ID or by slug)
    const leaderboard = await prisma.leaderboard.findFirst({
      where: {
        OR: [{ id: leaderboardId }, { slug: leaderboardId }],
      },
    });

    if (!leaderboard || !leaderboard.isActive) {
      throw new AppError('Target leaderboard is not active.', 400);
    }

    // 4. Validate bid amount
    if (amount < leaderboard.minBidAmount) {
      throw new AppError(
        `Minimum starting bid for this leaderboard is ₹${leaderboard.minBidAmount.toLocaleString('en-IN')}.`,
        400
      );
    }

    if (listing.currentBidAmount > 0 && amount <= listing.currentBidAmount) {
      throw new AppError(
        `Your new bid (₹${amount}) must be greater than your current active bid of ₹${listing.currentBidAmount.toLocaleString('en-IN')}.`,
        400
      );
    }

    // 5. Initialize provider-specific order
    let razorpayOrder: any = null;
    let stripeSession: any = null;
    let upiDetails: any = null;

    if (provider === 'STRIPE') {
      stripeSession = await PaymentService.createStripeSession({
        amountInINR: amount,
        companyName: listing.company.name,
        successUrl: `${config.clientUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${config.clientUrl}/dashboard?payment=cancelled`,
        metadata: { listingId, leaderboardId: leaderboard.id, userId },
      });
    } else {
      const receipt = `bid_${Date.now()}_${listingId.substring(0, 6)}`;
      razorpayOrder = await PaymentService.createOrder({
        amountInINR: amount,
        receipt,
        notes: {
          listingId,
          companyName: listing.company.name,
          leaderboardId: leaderboard.id,
          userId,
        },
      });
    }

    // 6. Record Bid and Payment atomically
    const { bid, payment } = await prisma.$transaction(async (tx) => {
      const newBid = await tx.bid.create({
        data: {
          listingId,
          leaderboardId: leaderboard.id,
          userId,
          amount,
          status: 'PENDING_PAYMENT',
        },
      });

      const newPayment = await tx.payment.create({
        data: {
          bidId: newBid.id,
          userId,
          provider,
          razorpayOrderId: razorpayOrder ? razorpayOrder.id : undefined,
          stripeSessionId: stripeSession ? stripeSession.id : undefined,
          amount,
          currency: 'INR',
          status: 'CREATED',
          metadata: JSON.stringify({
            companyName: listing.company.name,
            leaderboardName: leaderboard.name,
            provider,
            isTestMode: razorpayOrder?.isTestMode ?? stripeSession?.isTestMode ?? true,
          }),
        },
      });

      return { bid: newBid, payment: newPayment };
    });

    if (provider === 'UPI_DIRECT') {
      upiDetails = PaymentService.getUpiPaymentDetails({
        amountInINR: amount,
        companyName: listing.company.name,
        bidId: bid.id,
      });
    }

    return {
      bidId: bid.id,
      paymentId: payment.id,
      orderId: razorpayOrder?.id || stripeSession?.id || payment.id,
      amountInINR: amount,
      amountInPaise: Math.round(amount * 100),
      currency: 'INR',
      keyId: config.razorpayKeyId,
      stripePublishableKey: config.stripePublishableKey,
      stripeSessionUrl: stripeSession?.url,
      upiDetails,
      provider,
      companyName: listing.company.name,
      isTestMode: razorpayOrder?.isTestMode ?? stripeSession?.isTestMode ?? true,
    };
  }

  /**
   * Fetches the bid history for a specific listing
   */
  static async getBidHistory(listingId: string) {
    return prisma.bid.findMany({
      where: { listingId },
      include: {
        payment: {
          select: {
            status: true,
            provider: true,
            razorpayPaymentId: true,
            stripePaymentIntentId: true,
            upiUtr: true,
            createdAt: true,
          },
        },
        leaderboard: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
