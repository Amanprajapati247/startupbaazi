import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { RankingService } from '../services/rankingService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/leaderboards - List all active boards
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const leaderboards = await prisma.leaderboard.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            bids: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });

    return res.json({
      success: true,
      data: { leaderboards },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/leaderboards/:slug - Fetch leaderboard with filtering and search
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug as string;
    const {
      industry,
      city,
      search,
      page = '1',
      limit = '25',
      sort = 'rank_asc',
    } = req.query as Record<string, string>;

    const leaderboard = await prisma.leaderboard.findUnique({
      where: { slug },
    });

    if (!leaderboard) {
      throw new AppError('Leaderboard not found', 404);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build Prisma where filter for company/listing
    const whereClause: any = {
      status: 'APPROVED',
      company: {},
    };

    if (industry && industry !== 'All') {
      whereClause.company.industry = {
        equals: industry,
      };
    }

    if (city && city !== 'All') {
      whereClause.company.hqCity = {
        equals: city,
      };
    }

    if (search && search.trim().length > 0) {
      const q = search.trim();
      whereClause.company.OR = [
        { name: { contains: q } },
        { tagline: { contains: q } },
        { description: { contains: q } },
      ];
    }

    // Determine ordering
    let orderBy: any = [{ currentRank: 'asc' }, { currentBidAmount: 'desc' }];
    if (sort === 'bid_desc') {
      orderBy = [{ currentBidAmount: 'desc' }, { currentRank: 'asc' }];
    } else if (sort === 'newest') {
      orderBy = [{ createdAt: 'desc' }];
    }

    const [total, listings] = await Promise.all([
      prisma.listing.count({ where: whereClause }),
      prisma.listing.findMany({
        where: whereClause,
        include: {
          company: {
            include: {
              category: true,
            },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
    ]);

    // Format output
    const items = listings.map((l, index) => ({
      listingId: l.id,
      companyId: l.company.id,
      name: l.company.name,
      slug: l.company.slug,
      tagline: l.company.tagline,
      description: l.company.description,
      logoUrl: l.company.logoUrl,
      websiteUrl: l.company.websiteUrl,
      industry: l.company.industry,
      categoryName: l.company.category?.name || l.company.industry,
      hqCity: l.company.hqCity,
      hqState: l.company.hqState,
      foundedYear: l.company.foundedYear,
      stage: l.company.stage,
      isVerified: l.isVerified,
      rank: l.currentRank || skip + index + 1,
      currentBidAmount: l.currentBidAmount,
      viewCount: l.viewCount,
      clickCount: l.clickCount,
    }));

    // Calculate current highest bid on this leaderboard
    const highestBidListing = await prisma.listing.findFirst({
      where: { status: 'APPROVED' },
      orderBy: { currentBidAmount: 'desc' },
      select: { currentBidAmount: true },
    });

    const currentHighestBid = highestBidListing?.currentBidAmount || 0;
    const nextMinimumBid =
      currentHighestBid > 0
        ? currentHighestBid + leaderboard.minBidIncrement
        : leaderboard.minBidAmount;

    return res.json({
      success: true,
      data: {
        leaderboard: {
          id: leaderboard.id,
          name: leaderboard.name,
          slug: leaderboard.slug,
          description: leaderboard.description,
          minBidAmount: leaderboard.minBidAmount,
          minBidIncrement: leaderboard.minBidIncrement,
          currentHighestBid,
          nextMinimumBid,
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
        items,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/leaderboards/:slug/requirements - Minimum bid requirements
router.get('/:slug/requirements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug as string;
    const targetRank = parseInt((req.query.rank as string) || '1', 10);

    const leaderboard = await prisma.leaderboard.findUnique({
      where: { slug },
    });

    if (!leaderboard) {
      throw new AppError('Leaderboard not found', 404);
    }

    const requirements = await RankingService.getBidRequirements(leaderboard.id, targetRank);

    return res.json({
      success: true,
      data: requirements,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
