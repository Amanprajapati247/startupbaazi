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

// GET /api/admin/listings - All listings with filtering
router.get('/listings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search } = req.query as { status?: string; search?: string };

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search && search.trim().length > 0) {
      where.company = {
        name: { contains: search.trim() },
      };
    }

    const listings = await prisma.listing.findMany({
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
    });

    return res.json({
      success: true,
      data: { listings },
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

// GET /api/admin/payments - All financial transactions
router.get('/payments', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        user: { select: { name: true, email: true } },
        bid: {
          include: {
            leaderboard: { select: { name: true } },
            listing: {
              include: {
                company: { select: { name: true, slug: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({
      success: true,
      data: { payments },
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
