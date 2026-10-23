import { prisma } from '../prisma';
import { PaymentService } from './paymentService';
import { RankingService } from './rankingService';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';

export class BiddingService {
  /**
   * Creates a bid intent and Razorpay payment order.
   * Performs server-side validation against current leaderboard minimums.
   */
  static async createBidIntent({
    listingId,
    leaderboardId,
    userId,
    amount,
  }: {
    listingId: string;
    leaderboardId: string;
    userId: string;
    amount: number;
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

    // 3. Verify leaderboard exists and is active
    const leaderboard = await prisma.leaderboard.findUnique({
      where: { id: leaderboardId },
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

    // If currently holding a bid, ensure the new bid is higher than their own existing bid!
    if (listing.currentBidAmount > 0 && amount <= listing.currentBidAmount) {
      throw new AppError(
        `Your new bid (₹${amount}) must be greater than your current active bid of ₹${listing.currentBidAmount.toLocaleString('en-IN')}.`,
        400
      );
    }

    // 5. Create Razorpay order
    const receipt = `bid_${Date.now()}_${listingId.substring(0, 6)}`;
    const order = await PaymentService.createOrder({
      amountInINR: amount,
      receipt,
      notes: {
        listingId,
        companyName: listing.company.name,
        leaderboardId,
        userId,
      },
    });

    // 6. Record Bid and Payment in database
    const { bid, payment } = await prisma.$transaction(async (tx) => {
      const newBid = await tx.bid.create({
        data: {
          listingId,
          leaderboardId,
          userId,
          amount,
          status: 'PENDING_PAYMENT',
        },
      });

      const newPayment = await tx.payment.create({
        data: {
          bidId: newBid.id,
          userId,
          razorpayOrderId: order.id,
          amount,
          currency: 'INR',
          status: 'CREATED',
          metadata: JSON.stringify({
            companyName: listing.company.name,
            leaderboardName: leaderboard.name,
            isTestMode: order.isTestMode,
          }),
        },
      });

      return { bid: newBid, payment: newPayment };
    });

    return {
      bidId: bid.id,
      paymentId: payment.id,
      orderId: order.id,
      amountInINR: amount,
      amountInPaise: order.amount,
      currency: order.currency,
      keyId: config.razorpayKeyId,
      companyName: listing.company.name,
      isTestMode: order.isTestMode,
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
            razorpayPaymentId: true,
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
