import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AuditService } from '../services/auditService';
import { RankingService } from '../services/rankingService';
import { NotificationService } from '../services/notificationService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// All routes require Admin privileges
router.use(authenticate, requireAdmin);

// GET /api/admin/stats - Overview analytics
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalUsers,
      totalCompanies,
      pendingListings,
      approvedListings,
      activeBids,
      successfulPayments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
      prisma.listing.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.listing.count({ where: { status: 'APPROVED' } }),
      prisma.bid.count({ where: { status: 'ACTIVE' } }),
      prisma.payment.findMany({
        where: { status: 'SUCCESS' },
        select: { amount: true },
      }),
    ]);

    const totalRevenue = successfulPayments.reduce((acc, curr) => acc + curr.amount, 0);

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalCompanies,
        pendingListings,
        approvedListings,
        activeBids,
        totalRevenue,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/listings - All listings with filtering and pagination
router.get('/listings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search, page: pageQuery, limit: limitQuery } = req.query as {
      status?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search && search.trim().length > 0) {
      where.company = {
        name: { contains: search.trim() },
      };
    }

    const page = pageQuery ? Math.max(1, parseInt(pageQuery, 10)) : 1;
    const limit = limitQuery ? Math.max(1, parseInt(limitQuery, 10)) : 20;
    const skip = (page - 1) * limit;

    const [total, listings] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        include: {
          company: {
            include: {
              members: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true },
                  },
                },
              },
            },
          },
          bids: {
            where: { status: 'ACTIVE' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return res.json({
      success: true,
      data: {
        listings,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/listings/:id/status - Approve, Reject, or Suspend listing
const updateStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING_APPROVAL']),
  rejectionReason: z.string().optional(),
});

router.patch('/listings/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status, rejectionReason } = updateStatusSchema.parse(req.body);
    const adminId = req.user!.userId;

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!listing) {
      throw new AppError('Listing not found', 404);
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason || 'Listing did not meet criteria' : null,
      },
    });

    // If approved, recalculate ranks on the main board
    if (status === 'APPROVED') {
      const mainBoard = await prisma.leaderboard.findFirst({ where: { isActive: true } });
      if (mainBoard) {
        await RankingService.recalculateRanks(mainBoard.id);
      }
    }

    // Send notification to company owner
    for (const member of listing.company.members) {
      await NotificationService.createNotification({
        userId: member.userId,
        title: `Startup Listing ${status === 'APPROVED' ? 'Approved!' : status === 'REJECTED' ? 'Rejected' : 'Status Updated'}`,
        message:
          status === 'APPROVED'
            ? `Congratulations! Your startup "${listing.company.name}" has been approved and is now live on StartupBaazi.`
            : status === 'REJECTED'
            ? `Your listing for "${listing.company.name}" was not approved. Reason: ${rejectionReason || 'Incomplete details'}.`
            : `Your listing status has been changed to ${status}.`,
        type: status === 'APPROVED' ? 'APPROVAL' : status === 'REJECTED' ? 'REJECTION' : 'SYSTEM',
        linkUrl: status === 'APPROVED' ? `/startup/${listing.company.slug}` : '/dashboard',
      });
    }

    // Audit log
    await AuditService.logAction({
      adminId,
      action: `UPDATE_LISTING_STATUS_${status}`,
      targetType: 'LISTING',
      targetId: id,
      details: { status, rejectionReason, companyName: listing.company.name },
    });

    return res.json({
      success: true,
      message: `Listing status updated to ${status}`,
      data: { listing: updated },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/listings/:id/verify - Toggle verified badge
router.patch('/listings/:id/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { isVerified } = req.body;
    const adminId = req.user!.userId;

    const listing = await prisma.listing.update({
      where: { id },
      data: {
        isVerified: !!isVerified,
        verifiedAt: isVerified ? new Date() : null,
      },
      include: { company: true },
    });

    await AuditService.logAction({
      adminId,
      action: isVerified ? 'VERIFY_COMPANY' : 'UNVERIFY_COMPANY',
      targetType: 'LISTING',
      targetId: id,
      details: { companyName: listing.company.name },
    });

    return res.json({
      success: true,
      message: `Company verification badge ${isVerified ? 'granted' : 'removed'}`,
      data: { listing },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/payments - All financial transactions with filtering and pagination
router.get('/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search, page: pageQuery, limit: limitQuery } = req.query as {
      status?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { razorpayOrderId: { contains: term } },
        { razorpayPaymentId: { contains: term } },
        { stripeSessionId: { contains: term } },
        { upiUtr: { contains: term } },
        { user: { email: { contains: term } } },
        { user: { name: { contains: term } } },
      ];
    }

    const page = pageQuery ? Math.max(1, parseInt(pageQuery, 10)) : 1;
    const limit = limitQuery ? Math.max(1, parseInt(limitQuery, 10)) : 20;
    const skip = (page - 1) * limit;

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          bid: {
            include: {
              leaderboard: { select: { id: true, name: true } },
              listing: {
                include: {
                  company: { select: { name: true, slug: true } },
                },
              },
            },
          },
          refunds: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return res.json({
      success: true,
      data: {
        payments,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/refund - Process payment refund and recalculate ranks
const refundSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  reason: z.string().min(3, 'Reason must be at least 3 characters').optional(),
});

router.post('/refund', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentId, reason } = refundSchema.parse(req.body);
    const adminId = req.user!.userId;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        bid: {
          include: {
            listing: { include: { company: true } },
          },
        },
        user: true,
      },
    });

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    if (payment.status === 'REFUNDED') {
      throw new AppError('This payment has already been refunded', 400);
    }

    // Process refund inside transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark payment as REFUNDED
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'REFUNDED',
          metadata: JSON.stringify({
            refundedAt: new Date().toISOString(),
            refundReason: reason || 'Admin-initiated refund',
            refundedByAdminId: adminId,
          }),
        },
      });

      // 2. Create Refund log
      const refundRecord = await tx.refund.create({
        data: {
          paymentId: payment.id,
          amount: payment.amount,
          reason: reason || 'Admin-initiated refund',
          status: 'PROCESSED',
        },
      });

      // 3. Expire the corresponding bid if present
      if (payment.bid) {
        await tx.bid.update({
          where: { id: payment.bid.id },
          data: {
            status: 'EXPIRED',
          },
        });
      }

      return { updatedPayment, refundRecord };
    });

    // 4. If the bid was associated with an active leaderboard, recalculate ranks
    if (payment.bid?.leaderboardId) {
      await RankingService.recalculateRanks(payment.bid.leaderboardId);
    }

    // 5. Send notification to the user
    await NotificationService.createNotification({
      userId: payment.userId,
      title: 'Payment Refunded',
      message: `Your payment of ₹${payment.amount.toLocaleString('en-IN')} for ${
        payment.bid?.listing?.company?.name || 'startup listing'
      } has been refunded. Reason: ${reason || 'Admin decision'}.`,
      type: 'SYSTEM',
    });

    // 6. Admin audit log
    await AuditService.logAction({
      adminId,
      action: 'REFUND_PAYMENT',
      targetType: 'PAYMENT',
      targetId: payment.id,
      details: {
        amount: payment.amount,
        reason: reason || 'Admin refund',
        bidId: payment.bidId,
        companyName: payment.bid?.listing?.company?.name,
      },
    });

    return res.json({
      success: true,
      message: `Payment of ₹${payment.amount} refunded successfully and leaderboard rankings updated.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/suspicious-bids - Detect unusual, anomalous, or burst bids
router.get('/suspicious-bids', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const recentBids = await prisma.bid.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        listing: { include: { company: { select: { id: true, name: true, slug: true } } } },
        payment: { select: { status: true, provider: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Calculate baseline active bid metrics
    const activeAmounts = recentBids.filter((b) => b.status === 'ACTIVE').map((b) => b.amount);
    const avgAmount = activeAmounts.length > 0
      ? activeAmounts.reduce((a, b) => a + b, 0) / activeAmounts.length
      : 1000;

    const suspiciousBids: any[] = [];

    // Check 1: High outlier bids (> 5x average active amount or >= ₹25,000)
    for (const bid of recentBids) {
      if (bid.amount >= 25000 || (bid.amount > 5 * avgAmount && avgAmount > 500)) {
        suspiciousBids.push({
          bidId: bid.id,
          companyName: bid.listing?.company?.name || 'Unknown',
          userEmail: bid.user?.email,
          amount: bid.amount,
          status: bid.status,
          createdAt: bid.createdAt,
          reason: `High outlier bid: ₹${bid.amount.toLocaleString('en-IN')} (Average active bid: ₹${Math.round(avgAmount).toLocaleString('en-IN')})`,
          severity: bid.amount >= 50000 ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    // Check 2: Rapid successive bids (>= 3 bids by the same company within 15 minutes)
    const companyBidsMap = new Map<string, typeof recentBids>();
    for (const bid of recentBids) {
      const compId = bid.listing?.company?.id;
      if (!compId) continue;
      if (!companyBidsMap.has(compId)) companyBidsMap.set(compId, []);
      companyBidsMap.get(compId)!.push(bid);
    }

    for (const [compId, bids] of companyBidsMap.entries()) {
      if (bids.length >= 3) {
        // Sort ascending by time
        const sorted = [...bids].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        for (let i = 0; i < sorted.length - 2; i++) {
          const diffMinutes = (new Date(sorted[i + 2].createdAt).getTime() - new Date(sorted[i].createdAt).getTime()) / (1000 * 60);
          if (diffMinutes <= 15) {
            suspiciousBids.push({
              bidId: sorted[i + 2].id,
              companyName: sorted[i + 2].listing?.company?.name || compId,
              userEmail: sorted[i + 2].user?.email,
              amount: sorted[i + 2].amount,
              status: sorted[i + 2].status,
              createdAt: sorted[i + 2].createdAt,
              reason: `Rapid burst: 3+ bids submitted within ${Math.round(diffMinutes)} minutes`,
              severity: 'MEDIUM',
            });
            break;
          }
        }
      }
    }

    // Check 3: Data discrepancy (Active bid with failed or unconfirmed payment)
    for (const bid of recentBids) {
      if (bid.status === 'ACTIVE' && (!bid.payment || bid.payment.status !== 'SUCCESS')) {
        suspiciousBids.push({
          bidId: bid.id,
          companyName: bid.listing?.company?.name || 'Unknown',
          userEmail: bid.user?.email,
          amount: bid.amount,
          status: bid.status,
          createdAt: bid.createdAt,
          reason: `Integrity alert: Bid is ACTIVE but payment state is ${bid.payment?.status || 'MISSING'}`,
          severity: 'HIGH',
        });
      }
    }

    return res.json({
      success: true,
      data: {
        suspiciousBids,
        summary: {
          totalChecked: recentBids.length,
          flaggedCount: suspiciousBids.length,
          avgActiveBid: Math.round(avgAmount),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/audit-logs - View audit history
router.get('/audit-logs', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.adminAuditLog.findMany({
      include: {
        admin: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({
      success: true,
      data: { logs },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/leaderboard-rules - Update bidding rules
const updateRulesSchema = z.object({
  id: z.string().uuid(),
  minBidAmount: z.number().positive(),
  minBidIncrement: z.number().positive(),
});

router.patch('/leaderboard-rules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateRulesSchema.parse(req.body);
    const adminId = req.user!.userId;

    const updated = await prisma.leaderboard.update({
      where: { id: data.id },
      data: {
        minBidAmount: data.minBidAmount,
        minBidIncrement: data.minBidIncrement,
      },
    });

    await AuditService.logAction({
      adminId,
      action: 'UPDATE_LEADERBOARD_RULES',
      targetType: 'LEADERBOARD',
      targetId: data.id,
      details: { minBidAmount: data.minBidAmount, minBidIncrement: data.minBidIncrement },
    });

    return res.json({
      success: true,
      message: 'Leaderboard bidding rules updated',
      data: { leaderboard: updated },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
