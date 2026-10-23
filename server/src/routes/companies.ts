import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { clickLimiter } from '../middleware/rateLimiter';

const router = Router();

// Slugify helper
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// URL normalizer and protocol guard
function normalizeUrl(url: string): string {
  let trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = 'https://' + trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid URL protocol');
    }
    return parsed.origin + parsed.pathname.replace(/\/+$/, '') + (parsed.search || '');
  } catch {
    return trimmed;
  }
}

const companySubmissionSchema = z.object({
  name: z.string().min(2, 'Company name is required (min 2 characters)').max(100),
  tagline: z.string().min(5, 'Short tagline must be at least 5 characters').max(120, 'Tagline max 120 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000),
  websiteUrl: z.string().min(4, 'Valid website URL is required'),
  logoUrl: z.string().optional().or(z.literal('')),
  industry: z.string().min(2, 'Industry is required'),
  categoryId: z.string().optional(),
  hqCity: z.string().min(2, 'Headquarters city is required'),
  hqState: z.string().min(2, 'State is required'),
  foundedYear: z.number().int().min(1990).max(new Date().getFullYear()),
  stage: z.enum(['Idea', 'Bootstrapped', 'Pre-Seed', 'Seed', 'Series A', 'Series B+', 'Profitable']).default('Seed'),
  cin: z.string().optional().or(z.literal('')),
  gstin: z.string().optional().or(z.literal('')),
  twitterUrl: z.string().optional().or(z.literal('')),
  linkedinUrl: z.string().optional().or(z.literal('')),
  githubUrl: z.string().optional().or(z.literal('')),
});

// POST /api/companies - Submit a new startup
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = companySubmissionSchema.parse(req.body);
    const userId = req.user!.userId;

    const normalizedWebsite = normalizeUrl(data.websiteUrl);

    // Validate logoUrl protocol if provided
    if (data.logoUrl && data.logoUrl.trim().length > 0) {
      const normalizedLogo = data.logoUrl.trim();
      if (!normalizedLogo.startsWith('http://') && !normalizedLogo.startsWith('https://')) {
        throw new AppError('Logo URL must be a valid http:// or https:// image link.', 400);
      }
    }

    // Prevent duplicate submissions by the same user for the same company or website
    const existingUserCompany = await prisma.companyMember.findFirst({
      where: {
        userId,
        company: {
          OR: [
            { name: { equals: data.name } },
            { websiteUrl: { equals: normalizedWebsite } },
          ],
        },
      },
      include: { company: true },
    });

    if (existingUserCompany) {
      throw new AppError(
        `You have already submitted "${existingUserCompany.company.name}". You can view and manage it from your Founder Dashboard.`,
        409
      );
    }

    let baseSlug = slugify(data.name);
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (await prisma.company.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: data.name,
          slug: uniqueSlug,
          tagline: data.tagline,
          description: data.description,
          websiteUrl: normalizedWebsite,
          logoUrl: data.logoUrl?.trim() || `https://api.dicebear.com/7.x/shapes/svg?seed=${uniqueSlug}`,
          industry: data.industry,
          categoryId: data.categoryId || null,
          hqCity: data.hqCity,
          hqState: data.hqState,
          foundedYear: data.foundedYear,
          stage: data.stage,
          cin: data.cin || null,
          gstin: data.gstin || null,
          twitterUrl: data.twitterUrl ? normalizeUrl(data.twitterUrl) : null,
          linkedinUrl: data.linkedinUrl ? normalizeUrl(data.linkedinUrl) : null,
          githubUrl: data.githubUrl ? normalizeUrl(data.githubUrl) : null,
        },
      });

      // Assign user as OWNER
      await tx.companyMember.create({
        data: {
          companyId: company.id,
          userId,
          role: 'OWNER',
        },
      });

      // Create unique Listing in PENDING_APPROVAL status
      const listing = await tx.listing.upsert({
        where: { companyId: company.id },
        update: {},
        create: {
          companyId: company.id,
          status: 'PENDING_APPROVAL',
        },
      });

      return { company, listing };
    });

    return res.status(201).json({
      success: true,
      message: 'Startup submitted successfully for review! An administrator will review your listing shortly.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/companies/my-companies - Founder's managed startups
router.get('/my-companies', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberships = await prisma.companyMember.findMany({
      where: { userId: req.user!.userId },
      include: {
        company: {
          include: {
            listings: {
              include: {
                bids: {
                  where: { status: 'ACTIVE' },
                  orderBy: { amount: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const companies = memberships.map((m) => ({
      ...m.company,
      userRole: m.role,
      listing: m.company.listings[0] || null,
    }));

    return res.json({
      success: true,
      data: { companies },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/companies/:slug - Public startup profile (Privacy-sanitized)
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug as string;

    const company = await prisma.company.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        tagline: true,
        description: true,
        websiteUrl: true,
        logoUrl: true,
        industry: true,
        categoryId: true,
        category: true,
        hqCity: true,
        hqState: true,
        foundedYear: true,
        stage: true,
        twitterUrl: true,
        linkedinUrl: true,
        githubUrl: true,
        createdAt: true,
        listings: {
          select: {
            id: true,
            status: true,
            isVerified: true,
            verifiedAt: true,
            currentRank: true,
            currentBidAmount: true,
            viewCount: true,
            clickCount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!company) {
      throw new AppError('Startup not found', 404);
    }

    const listing = company.listings[0];

    // If listing is not approved, return draft preview info
    if (!listing || listing.status !== 'APPROVED') {
      return res.status(200).json({
        success: true,
        data: {
          company: {
            ...company,
            listing,
          },
        },
      });
    }

    // Deduplicate views: Only increment viewCount once every 15 minutes per IP
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ipHash = crypto.createHash('sha256').update(String(ip)).digest('hex').substring(0, 16);
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

    prisma.impressionEvent
      .findFirst({
        where: {
          listingId: listing.id,
          ipHash,
          createdAt: { gte: fifteenMinsAgo },
        },
      })
      .then((recentImp) => {
        if (!recentImp) {
          prisma.listing
            .update({
              where: { id: listing.id },
              data: { viewCount: { increment: 1 } },
            })
            .catch(() => {});

          prisma.impressionEvent
            .create({
              data: {
                listingId: listing.id,
                ipHash,
              },
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    return res.json({
      success: true,
      data: {
        company: {
          ...company,
          listing,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/companies/:id/click - Track outbound website visit (with deduplication & rate limiting)
router.post('/:id/click', clickLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const listing = await prisma.listing.findFirst({
      where: {
        OR: [{ id }, { companyId: id }],
      },
    });

    if (!listing) {
      throw new AppError('Listing not found', 404);
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ipHash = crypto.createHash('sha256').update(String(ip)).digest('hex').substring(0, 16);
    const referrer = (req.headers.referer as string) || null;
    const userAgent = (req.headers['user-agent'] as string) || null;

    // Deduplication: check if this IP recorded a click on this listing in the past 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentClick = await prisma.clickEvent.findFirst({
      where: {
        listingId: listing.id,
        ipHash,
        createdAt: { gte: tenMinutesAgo },
      },
    });

    if (recentClick) {
      return res.json({
        success: true,
        message: 'Click deduplicated',
        deduplicated: true,
      });
    }

    // Increment clickCount atomically & record click event
    await prisma.$transaction([
      prisma.listing.update({
        where: { id: listing.id },
        data: { clickCount: { increment: 1 } },
      }),
      prisma.clickEvent.create({
        data: {
          listingId: listing.id,
          ipHash,
          referrer,
          userAgent,
        },
      }),
    ]);

    return res.json({
      success: true,
      message: 'Click recorded',
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/companies/:id - Update company profile
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;

    // Verify ownership
    const membership = await prisma.companyMember.findUnique({
      where: {
        companyId_userId: {
          companyId: id,
          userId,
        },
      },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!membership && user?.role !== 'ADMIN') {
      throw new AppError('You are not authorized to edit this company.', 403);
    }

    const allowedUpdates = [
      'tagline',
      'description',
      'websiteUrl',
      'logoUrl',
      'industry',
      'hqCity',
      'hqState',
      'stage',
      'twitterUrl',
      'linkedinUrl',
      'githubUrl',
    ];

    const dataToUpdate: Record<string, any> = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        if (key === 'websiteUrl' || key === 'twitterUrl' || key === 'linkedinUrl' || key === 'githubUrl') {
          dataToUpdate[key] = req.body[key] ? normalizeUrl(req.body[key]) : null;
        } else {
          dataToUpdate[key] = req.body[key];
        }
      }
    }

    const updated = await prisma.company.update({
      where: { id },
      data: dataToUpdate,
    });

    return res.json({
      success: true,
      message: 'Company profile updated',
      data: { company: updated },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
