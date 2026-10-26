import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BiddingService } from '../services/biddingService';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const bidIntentSchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required'),
  leaderboardId: z.string().min(1, 'Leaderboard ID or slug is required'),
  amount: z.number().positive('Bid amount must be a positive number'),
  provider: z.enum(['RAZORPAY', 'STRIPE', 'UPI_DIRECT']).default('RAZORPAY').optional(),
});

// POST /api/bids/intent - Create a bid intent and payment order
router.post('/intent', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = bidIntentSchema.parse(req.body);
    const userId = req.user!.userId;

    const result = await BiddingService.createBidIntent({
      listingId: data.listingId,
      leaderboardId: data.leaderboardId,
      userId,
      amount: data.amount,
      provider: data.provider || 'RAZORPAY',
    });

    return res.status(201).json({
      success: true,
      message: 'Bid order initiated. Complete payment to activate your ranking.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/bids/history/:listingId - Bid history for a listing
router.get('/history/:listingId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listingId = req.params.listingId as string;
    const history = await BiddingService.getBidHistory(listingId);

    return res.json({
      success: true,
      data: { history },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
