import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PaymentService } from '../services/paymentService';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const verifyPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  paymentId: z.string().min(1, 'Payment ID is required'),
  signature: z.string().min(1, 'Signature is required'),
  provider: z.string().optional(),
  metadata: z.any().optional(),
});

// POST /api/payments/verify - Server-side verification of payment (Razorpay / Stripe)
router.post('/verify', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = verifyPaymentSchema.parse(req.body);

    const result = await PaymentService.settleSuccessfulPayment({
      orderId: data.orderId,
      paymentId: data.paymentId,
      signature: data.signature,
      provider: data.provider || 'RAZORPAY',
      metadata: data.metadata,
    });

    return res.json({
      success: true,
      message: 'Payment verified and bid activated successfully! Leaderboard updated.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

const upiVerifySchema = z.object({
  bidId: z.string().uuid(),
  utr: z.string().min(6, 'Valid UPI Transaction Reference / UTR (min 6 characters) is required'),
});

// POST /api/payments/verify-upi - Direct UPI UTR verification
router.post('/verify-upi', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bidId, utr } = upiVerifySchema.parse(req.body);

    const payment = await prisma.payment.findUnique({
      where: { bidId },
    });

    if (!payment) {
      throw new AppError('Payment record not found for this bid.', 404);
    }

    const result = await PaymentService.settleSuccessfulPayment({
      orderId: payment.id,
      paymentId: utr,
      signature: 'upi_utr_verified',
      provider: 'UPI_DIRECT',
      metadata: { utr, method: 'Direct UPI Transfer' },
    });

    return res.json({
      success: true,
      message: 'UPI payment verified and bid activated! Leaderboard updated.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/webhook - Idempotent Razorpay Webhook Handler
router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // If webhook secret is configured, verify signature
    if (signature) {
      const isValid = PaymentService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = req.body;
    const eventId = event?.event_id || event?.id || `evt_${Date.now()}`;
    const eventType = event?.event || 'unknown';

    // 1. Idempotency Check
    const existing = await prisma.paymentWebhookEvent.findUnique({
      where: { eventId },
    });

    if (existing) {
      return res.status(200).json({ message: 'Event already processed' });
    }

    // 2. Record incoming webhook event
    await prisma.paymentWebhookEvent.create({
      data: {
        eventId,
        eventType,
        payload: JSON.stringify(event),
      },
    });

    // 3. Process event
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event?.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId && paymentId) {
        // Attempt automated settlement if not already settled
        try {
          const payment = await prisma.payment.findUnique({
            where: { razorpayOrderId: orderId },
          });

          if (payment && payment.status !== 'SUCCESS') {
            await PaymentService.settleSuccessfulPayment({
              orderId,
              paymentId,
              signature: 'webhook_verified',
              metadata: { via: 'webhook', eventId },
            });
          }
        } catch (e) {
          console.error('[Webhook Settlement Error]', e);
        }
      }
    }

    // Mark event processed
    await prisma.paymentWebhookEvent.update({
      where: { eventId },
      data: {
        isProcessed: true,
        processedAt: new Date(),
      },
    });

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/my-history - User's transaction history
router.get('/my-history', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        bid: {
          include: {
            leaderboard: {
              select: { name: true, slug: true },
            },
            listing: {
              include: {
                company: {
                  select: { name: true, slug: true, logoUrl: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: { payments },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
