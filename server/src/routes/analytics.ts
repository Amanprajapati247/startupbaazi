import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/analytics/dashboard - Metrics for logged in founder
router.get('/dashboard', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    // Find companies owned by user
    const memberships = await prisma.companyMember.findMany({
      where: { userId },
      include: {
        company: {
          include: {
            listings: {
              include: {
                bids: {
                  where: { status: 'ACTIVE' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (memberships.length === 0) {
      return res.json({
        success: true,
        data: {
          hasCompany: false,
          stats: { views: 0, clicks: 0, ctr: 0, currentRank: null, currentBid: 0 },
          chartData: [],
        },
      });
    }

    const company = memberships[0].company;
    const listing = company.listings[0];

    const views = listing?.viewCount || 0;
    const clicks = listing?.clickCount || 0;
    const ctr = views > 0 ? parseFloat(((clicks / views) * 100).toFixed(2)) : 0;
    const currentRank = listing?.currentRank || null;
    const currentBid = listing?.currentBidAmount || 0;

    // Fetch past 7 days click/view trends
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let clickEvents: any[] = [];
    let impressionEvents: any[] = [];

    if (listing) {
      [clickEvents, impressionEvents] = await Promise.all([
        prisma.clickEvent.findMany({
          where: {
            listingId: listing.id,
            createdAt: { gte: sevenDaysAgo },
          },
          select: { createdAt: true },
        }),
        prisma.impressionEvent.findMany({
          where: {
            listingId: listing.id,
            createdAt: { gte: sevenDaysAgo },
          },
          select: { createdAt: true },
        }),
      ]);
    }

    // Aggregate by day
    const daysMap = new Map<string, { date: string; views: number; clicks: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      daysMap.set(dateKey, { date: dateKey, views: 0, clicks: 0 });
    }

    for (const imp of impressionEvents) {
      const key = new Date(imp.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (daysMap.has(key)) {
        daysMap.get(key)!.views += 1;
      }
    }

    for (const clk of clickEvents) {
      const key = new Date(clk.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (daysMap.has(key)) {
        daysMap.get(key)!.clicks += 1;
      }
    }

    const chartData = Array.from(daysMap.values());

    return res.json({
      success: true,
      data: {
        hasCompany: true,
        company,
        listing,
        stats: {
          views,
          clicks,
          ctr,
          currentRank,
          currentBid,
        },
        chartData,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/notifications - Notifications for current user
router.get('/notifications', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return res.json({
      success: true,
      data: { notifications, unreadCount },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/analytics/notifications/:id/read - Mark notification read
router.patch('/notifications/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;

    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/analytics/notifications/read-all - Mark all read
router.patch('/notifications/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

export default router;
