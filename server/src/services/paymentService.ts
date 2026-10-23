import crypto from 'crypto';
import Razorpay from 'razorpay';
import { config } from '../config';
import { prisma } from '../prisma';
import { RankingService } from './rankingService';
import { NotificationService } from './notificationService';
import { AppError } from '../middleware/errorHandler';

// Initialize Razorpay instance if keys are set
let razorpayInstance: Razorpay | null = null;
if (config.razorpayKeyId && config.razorpayKeySecret && !config.razorpayKeyId.includes('placeholder')) {
  try {
    razorpayInstance = new Razorpay({
      key_id: config.razorpayKeyId,
      key_secret: config.razorpayKeySecret,
    });
  } catch (e) {
    console.warn('[Razorpay] Failed to initialize Razorpay SDK client:', e);
  }
}

export class PaymentService {
  /**
   * Creates an order with Razorpay in INR paise (₹1 = 100 paise)
   */
  static async createOrder({
    amountInINR,
    receipt,
    notes = {},
  }: {
    amountInINR: number;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<{ id: string; amount: number; currency: string; isTestMode: boolean }> {
    const amountInPaise = Math.round(amountInINR * 100);

    // If Razorpay instance is active, attempt to create real order
    if (razorpayInstance) {
      try {
        const order = await razorpayInstance.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt,
          notes,
        });
        return {
          id: order.id,
          amount: order.amount as number,
          currency: order.currency,
          isTestMode: false,
        };
      } catch (err: any) {
        console.warn('[Razorpay Order Note] Razorpay API rejected test key:', err.message || err);
        // If in development or test and using dummy keys, fallback to simulated test mode
        if (config.nodeEnv !== 'production') {
          console.log('ℹ️ [Razorpay Test Mode] Falling back to simulated local Razorpay test order');
        } else {
          throw new AppError(`Payment provider error: ${err.message || 'Failed to create order'}`, 502);
        }
      }
    }

    // Development / Test Mock Mode
    // Generates a valid test order ID when live keys aren't configured yet
    const mockOrderId = `order_test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      id: mockOrderId,
      amount: amountInPaise,
      currency: 'INR',
      isTestMode: true,
    };
  }

  /**
   * Verifies Razorpay HMAC-SHA256 signature
   */
  static verifyPaymentSignature({
    orderId,
    paymentId,
    signature,
  }: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    // If order was a local development test order
    if (orderId.startsWith('order_test_') && signature === 'test_mode_valid_signature') {
      return true;
    }

    const secret = config.razorpayKeySecret;
    if (!secret || secret.includes('placeholder')) {
      // In dev mode when placeholder is used, permit test signature
      if (orderId.startsWith('order_test_')) return true;
    }

    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );
    } catch {
      return false;
    }
  }

  /**
   * Verifies incoming webhook signature
   */
  static verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = config.razorpayWebhookSecret;
    if (!secret) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );
    } catch {
      return false;
    }
  }

  /**
   * Completes payment verification and atomically activates the bid & updates ranking
   */
  static async settleSuccessfulPayment({
    orderId,
    paymentId,
    signature,
    metadata,
  }: {
    orderId: string;
    paymentId: string;
    signature: string;
    metadata?: any;
  }) {
    // Find payment record
    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: orderId },
      include: {
        bid: {
          include: {
            listing: {
              include: {
                company: true,
              },
            },
            leaderboard: true,
            user: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError('Payment record not found for this order ID.', 404);
    }

    if (payment.status === 'SUCCESS') {
      // Idempotent: already processed
      return { success: true, alreadyProcessed: true, payment };
    }

    // Verify signature
    const isValid = this.verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValid) {
      // Update payment to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        },
      });
      throw new AppError('Payment signature verification failed.', 400);
    }

    // Execute atomic transaction for ranking update and bid activation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Payment status
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          metadata: metadata ? JSON.stringify(metadata) : payment.metadata,
        },
      });

      // 2. Mark previous ACTIVE bids for this listing on this leaderboard as EXPIRED / OUTBID
      await tx.bid.updateMany({
        where: {
          listingId: payment.bid.listingId,
          leaderboardId: payment.bid.leaderboardId,
          status: 'ACTIVE',
          id: { not: payment.bidId },
        },
        data: {
          status: 'EXPIRED',
          outbidAt: new Date(),
        },
      });

      // 3. Mark the current bid as ACTIVE
      const activatedBid = await tx.bid.update({
        where: { id: payment.bidId },
        data: {
          status: 'ACTIVE',
        },
      });

      // 4. Update the listing's currentBidAmount
      await tx.listing.update({
        where: { id: payment.bid.listingId },
        data: {
          currentBidAmount: payment.bid.amount,
        },
      });

      // 5. Recalculate leaderboard ranks
      await RankingService.recalculateRanks(payment.bid.leaderboardId, tx as any);

      return { updatedPayment, activatedBid };
    });

    // 6. Fetch new listing rank to notify user
    const updatedListing = await prisma.listing.findUnique({
      where: { id: payment.bid.listingId },
    });

    const newRank = updatedListing?.currentRank ?? 1;

    // Send success notification to bidder
    await NotificationService.createNotification({
      userId: payment.userId,
      title: 'Payment Successful! Rank Updated',
      message: `Your bid of ₹${payment.amount.toLocaleString('en-IN')} for ${payment.bid.listing.company.name} is now ACTIVE! You are currently ranked #${newRank} on ${payment.bid.leaderboard.name}.`,
      type: 'PAYMENT_SUCCESS',
      linkUrl: `/startup/${payment.bid.listing.company.slug}`,
    });

    // Notify any company owners who were pushed down or outbid
    // Find listings on this leaderboard whose rank was pushed down
    try {
      const lowerRanks = await prisma.listing.findMany({
        where: {
          status: 'APPROVED',
          currentRank: { gt: newRank },
          id: { not: payment.bid.listingId },
        },
        include: {
          company: {
            include: {
              members: true,
            },
          },
        },
        take: 3,
      });

      for (const item of lowerRanks) {
        for (const member of item.company.members) {
          await NotificationService.notifyOutbid({
            outbidUserId: member.userId,
            companyName: item.company.name,
            newBidAmount: payment.amount,
            leaderboardName: payment.bid.leaderboard.name,
          });
        }
      }
    } catch (e) {
      console.warn('[Outbid Notification Error]', e);
    }

    return {
      success: true,
      payment: result.updatedPayment,
      bid: result.activatedBid,
      newRank,
    };
  }
}
