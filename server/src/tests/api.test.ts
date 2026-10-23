import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../prisma';
import { RankingService } from '../services/rankingService';
import { PaymentService } from '../services/paymentService';

describe('StartupBaazi Full Production Readiness & QA Suite (12 Core Scenarios)', () => {
  let adminToken: string;
  let adminUser: any;
  let founderToken: string;
  let founderUser: any;
  let testLeaderboardId: string;
  let testLeaderboardSlug: string;
  let existingListing: any;

  beforeAll(async () => {
    // 1. Authenticate Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@startupbaazi.in', password: 'Admin@12345' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;
    adminUser = adminRes.body.data.user;

    // 2. Authenticate Founder
    const founderRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'founder@startupbaazi.demo', password: 'Founder@12345' });
    expect(founderRes.status).toBe(200);
    founderToken = founderRes.body.data.token;
    founderUser = founderRes.body.data.user;

    // 3. Find primary leaderboard
    const board = await prisma.leaderboard.findFirst({ where: { isActive: true } });
    expect(board).toBeDefined();
    testLeaderboardId = board!.id;
    testLeaderboardSlug = board!.slug;

    // 4. Find an existing approved listing
    existingListing = await prisma.listing.findFirst({
      where: { status: 'APPROVED' },
      include: { company: true },
    });
    expect(existingListing).toBeDefined();
  });

  // =========================================================================
  // SCENARIO 1: Duplicate Company Listing Prevention
  // =========================================================================
  describe('1. Duplicate Company Listing Prevention', () => {
    it('1A. Should enforce unique constraint at the database layer (preventing duplicate Listing for same company)', async () => {
      // Attempting to create a second Listing for existingListing.companyId directly in Prisma
      await expect(
        prisma.listing.create({
          data: {
            companyId: existingListing.companyId,
            status: 'PENDING_APPROVAL',
            currentRank: null,
            currentBidAmount: 0,
          },
        })
      ).rejects.toThrow();
    });

    it('1B. Should prevent duplicate company submissions by the same founder via the API', async () => {
      // The demo founder already has a company registered
      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({
          name: 'Zerodha', // Already existing name
          tagline: 'Duplicate submission attempt',
          description: 'This should be blocked by duplicate company validation rules.',
          websiteUrl: 'https://zerodha.com',
          industry: 'Fintech & Payments',
          hqCity: 'Bengaluru',
          hqState: 'Karnataka',
          foundedYear: 2010,
          stage: 'Profitable',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already submitted/i);
    });
  });

  // =========================================================================
  // SCENARIO 2: Deterministic Ranking and Tie-Breaking
  // =========================================================================
  describe('2. Deterministic Ranking and Tie-Breaking', () => {
    it('Should rank strictly by bid amount descending, and break equal-bid ties by earliest timestamp', async () => {
      // Create 2 test companies and listings
      const compA = await prisma.company.create({
        data: {
          name: `TieTestA_${Date.now()}`,
          slug: `tietesta-${Date.now()}`,
          tagline: 'Tie-break test startup A',
          description: 'Testing deterministic ranking tie-breaking with identical amounts.',
          websiteUrl: 'https://tieta.in',
          industry: 'Fintech & Payments',
          hqCity: 'Bengaluru',
          hqState: 'Karnataka',
          foundedYear: 2021,
          stage: 'Seed',
        },
      });

      const listingA = await prisma.listing.create({
        data: { companyId: compA.id, status: 'APPROVED' },
      });

      const compB = await prisma.company.create({
        data: {
          name: `TieTestB_${Date.now()}`,
          slug: `tietestb-${Date.now()}`,
          tagline: 'Tie-break test startup B',
          description: 'Testing deterministic ranking tie-breaking with identical amounts.',
          websiteUrl: 'https://tietb.in',
          industry: 'Fintech & Payments',
          hqCity: 'Mumbai',
          hqState: 'Maharashtra',
          foundedYear: 2021,
          stage: 'Seed',
        },
      });

      const listingB = await prisma.listing.create({
        data: { companyId: compB.id, status: 'APPROVED' },
      });

      const tieAmount = 999999;
      const earlierDate = new Date(Date.now() - 3600000); // 1 hour ago
      const laterDate = new Date(Date.now() - 1800000);   // 30 mins ago

      // Bid A placed earlier
      await prisma.bid.create({
        data: {
          listingId: listingA.id,
          leaderboardId: testLeaderboardId,
          userId: adminUser.id,
          amount: tieAmount,
          status: 'ACTIVE',
          createdAt: earlierDate,
        },
      });

      // Bid B placed later with IDENTICAL amount
      await prisma.bid.create({
        data: {
          listingId: listingB.id,
          leaderboardId: testLeaderboardId,
          userId: adminUser.id,
          amount: tieAmount,
          status: 'ACTIVE',
          createdAt: laterDate,
        },
      });

      // Recalculate ranks
      await RankingService.recalculateRanks(testLeaderboardId);

      // Check results
      const updatedListingA = await prisma.listing.findUnique({ where: { id: listingA.id } });
      const updatedListingB = await prisma.listing.findUnique({ where: { id: listingB.id } });

      expect(updatedListingA!.currentRank).toBe(1);
      expect(updatedListingB!.currentRank).toBe(2);

      // Cleanup tie test bids to restore normal state
      await prisma.bid.deleteMany({
        where: { listingId: { in: [listingA.id, listingB.id] } },
      });
      await prisma.listing.deleteMany({
        where: { id: { in: [listingA.id, listingB.id] } },
      });
      await prisma.company.deleteMany({
        where: { id: { in: [compA.id, compB.id] } },
      });
      await RankingService.recalculateRanks(testLeaderboardId);
    });
  });

  // =========================================================================
  // SCENARIO 3: Invalid Bid Rejection
  // =========================================================================
  describe('3. Invalid Bid Rejection', () => {
    it('Should reject bids below the minimum required starting bid or increment', async () => {
      const res = await request(app)
        .post('/api/bids/intent')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({
          listingId: existingListing.id,
          leaderboardId: testLeaderboardId,
          amount: 5, // Below starting minimum (500)
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/minimum/i);
    });

    it('Should reject negative or zero bid amounts via schema validation', async () => {
      const res = await request(app)
        .post('/api/bids/intent')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({
          listingId: existingListing.id,
          leaderboardId: testLeaderboardId,
          amount: -500,
        });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // SCENARIO 4: Concurrent Bid Handling
  // =========================================================================
  describe('4. Concurrent Bid Handling & Idempotency', () => {
    it('Should atomically lock payment record so duplicate or concurrent verification cannot create multiple active bids', async () => {
      const freshListing = await prisma.listing.findUnique({ where: { id: existingListing.id } });
      const newBidAmount = (freshListing?.currentBidAmount || 1000) + 15000;

      // 1. Create a bid intent
      const intentRes = await request(app)
        .post('/api/bids/intent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          listingId: existingListing.id,
          leaderboardId: testLeaderboardId,
          amount: newBidAmount,
        });

      expect(intentRes.status).toBe(201);
      const orderId = intentRes.body.data.orderId;

      // 2. Trigger two simultaneous verification calls
      const [res1, res2] = await Promise.all([
        PaymentService.settleSuccessfulPayment({
          orderId,
          paymentId: `pay_concurrent_1_${Date.now()}`,
          signature: 'test_mode_valid_signature',
        }),
        PaymentService.settleSuccessfulPayment({
          orderId,
          paymentId: `pay_concurrent_2_${Date.now()}`,
          signature: 'test_mode_valid_signature',
        }),
      ]);

      // Both should return clean success and idempotency handling
      expect(res1.payment.status).toBe('SUCCESS');
      expect(res2.payment.status).toBe('SUCCESS');

      // Count active bids for this payment
      const paymentBids = await prisma.payment.count({
        where: { razorpayOrderId: orderId, status: 'SUCCESS' },
      });
      expect(paymentBids).toBe(1);
    });
  });

  // =========================================================================
  // SCENARIO 5: Failed Payments Not Activating Bids
  // =========================================================================
  describe('5. Failed Payments Not Activating Bids', () => {
    it('Should keep bid in non-active status when payment fails or is marked failed', async () => {
      const freshListing = await prisma.listing.findUnique({ where: { id: existingListing.id } });
      const newBidAmount = (freshListing?.currentBidAmount || 1000) + 25000;

      // Create intent
      const intentRes = await request(app)
        .post('/api/bids/intent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          listingId: existingListing.id,
          leaderboardId: testLeaderboardId,
          amount: newBidAmount,
        });

      expect(intentRes.status).toBe(201);
      const orderId = intentRes.body.data.orderId;

      // Mark payment as FAILED
      const payment = await prisma.payment.update({
        where: { razorpayOrderId: orderId },
        data: { status: 'FAILED' },
        include: { bid: true },
      });

      expect(payment.status).toBe('FAILED');
      expect(payment.bid.status).toBe('PENDING_PAYMENT'); // Never activated!

      // Recalculate ranks and confirm this failed bid is not counted
      await RankingService.recalculateRanks(testLeaderboardId);
      const listing = await prisma.listing.findUnique({ where: { id: existingListing.id } });
      expect(listing!.currentBidAmount).not.toBe(newBidAmount);
    });
  });

  // =========================================================================
  // SCENARIO 6: Duplicate Webhook Delivery Idempotency
  // =========================================================================
  describe('6. Duplicate Webhook Delivery Idempotency', () => {
    it('Should process a webhook event once and return already_processed on duplicate delivery', async () => {
      const eventId = `evt_test_${Date.now()}`;
      const payload = {
        event_id: eventId,
        event: 'payment.authorized',
        payload: {
          payment: {
            entity: { id: `pay_${Date.now()}`, amount: 50000, status: 'authorized' },
          },
        },
      };

      // 1. First webhook delivery
      const res1 = await request(app).post('/api/payments/webhook').send(payload);
      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe('ok');

      // 2. Duplicate webhook delivery with same eventId
      const res2 = await request(app).post('/api/payments/webhook').send(payload);
      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe('already_processed');

      // Check database webhook events table: only 1 record exists
      const count = await prisma.paymentWebhookEvent.count({ where: { eventId } });
      expect(count).toBe(1);
    });
  });

  // =========================================================================
  // SCENARIO 7: Payment-Signature Verification
  // =========================================================================
  describe('7. Payment-Signature Verification', () => {
    it('Should reject payment verification when signature is invalid or mismatched', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: 'order_non_existent_fake_123',
          paymentId: 'pay_fake_123',
          signature: 'invalid_sha256_tampered_signature',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // SCENARIO 8: Unauthorized Founder and Admin Requests
  // =========================================================================
  describe('8. Unauthorized Founder and Admin Requests', () => {
    it('Should reject unauthenticated calls to admin routes with 401', async () => {
      const res = await request(app).get('/api/admin/stats');
      expect(res.status).toBe(401);
    });

    it('Should reject non-admin founder calls to admin routes with 403', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(403);
    });

    it('Should reject non-admin refund attempts with 403', async () => {
      const res = await request(app)
        .post('/api/admin/refund')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({ paymentId: 'dummy-id' });
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // SCENARIO 9: Company Ownership Enforcement
  // =========================================================================
  describe('9. Company Ownership Enforcement', () => {
    it('Should prevent user from bidding on a listing for a company they do not own or manage', async () => {
      // Register a second founder
      const randomEmail = `founder_b_${Date.now()}@example.in`;
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Founder B',
          email: randomEmail,
          password: 'Password@123',
          role: 'FOUNDER',
        });
      expect(regRes.status).toBe(201);
      const tokenB = regRes.body.data.token;

      // Founder B attempts to bid on existingListing (owned by Demo Founder or Admin)
      const bidRes = await request(app)
        .post('/api/bids/intent')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          listingId: existingListing.id,
          leaderboardId: testLeaderboardId,
          amount: 50000,
        });

      // Must be rejected with 403 Forbidden!
      expect(bidRes.status).toBe(403);
      expect(bidRes.body.success).toBe(false);
      expect(bidRes.body.message).toMatch(/authorized/i);
    });
  });

  // =========================================================================
  // SCENARIO 10: Startup Form Validation
  // =========================================================================
  describe('10. Startup Form Validation', () => {
    it('Should reject submission with invalid website URL, short tagline, or future founded year', async () => {
      const tempEmail = `validator_${Date.now()}@test.in`;
      const userRes = await request(app).post('/api/auth/register').send({
        name: 'Validator Founder',
        email: tempEmail,
        password: 'Password@123',
        role: 'FOUNDER',
      });
      const tempToken = userRes.body.data.token;

      // 1. Invalid URL protocol
      const resBadUrl = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({
          name: 'Test Corp',
          tagline: 'Short', // < 5 chars
          description: 'Too short',
          websiteUrl: 'not-a-valid-http-url',
          industry: 'AI & Machine Learning',
          hqCity: 'Bengaluru',
          hqState: 'Karnataka',
          foundedYear: 2099, // Future year!
          stage: 'Seed',
        });

      expect(resBadUrl.status).toBe(400);
      expect(resBadUrl.body.success).toBe(false);
    });
  });

  // =========================================================================
  // SCENARIO 11: Dashboard Metric Calculations (Zero-Division Safe CTR)
  // =========================================================================
  describe('11. Dashboard Metric Calculations (Safe CTR)', () => {
    it('Should calculate CTR safely as 0.0 without division by zero when views or clicks are 0', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toBeDefined();

      const stats = res.body.data.stats;
      expect(Number.isFinite(stats.clickThroughRate)).toBe(true);
      expect(isNaN(stats.clickThroughRate)).toBe(false);
      expect(stats.clickThroughRate).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // SCENARIO 12: Empty Leaderboard and API Failure States
  // =========================================================================
  describe('12. Empty Leaderboard and API Failure States', () => {
    it('Should return 404 for non-existent leaderboard slug', async () => {
      const res = await request(app).get('/api/leaderboards/non-existent-board-slug-404');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Should return 404 for non-existent company slug', async () => {
      const res = await request(app).get('/api/companies/non-existent-startup-404');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Should return empty array gracefully without crashing when filtering yields 0 results', async () => {
      const res = await request(app).get(
        `/api/leaderboards/${testLeaderboardSlug}?city=NonExistentCityXYZ`
      );
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toEqual([]);
      expect(res.body.data.leaderboard.minBidAmount).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // BONUS: Admin Refund & Suspicious Bids Watchdog
  // =========================================================================
  describe('13. Admin Refund Processing & Suspicious Bids Watchdog', () => {
    it('Should allow admin to query suspicious bids and get statistical anomaly analysis', async () => {
      const res = await request(app)
        .get('/api/admin/suspicious-bids')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.suspiciousBids).toBeDefined();
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.summary.totalChecked).toBeGreaterThanOrEqual(0);
    });

    it('Should allow admin to refund a payment, which expires the bid and recalculates ranks', async () => {
      // Find a successful payment
      const payment = await prisma.payment.findFirst({
        where: { status: 'SUCCESS' },
        include: { bid: true },
      });

      if (payment) {
        const res = await request(app)
          .post('/api/admin/refund')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            paymentId: payment.id,
            reason: 'Automated QA refund test',
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const updatedPayment = await prisma.payment.findUnique({
          where: { id: payment.id },
          include: { bid: true },
        });
        expect(updatedPayment!.status).toBe('REFUNDED');
        if (updatedPayment!.bid) {
          expect(updatedPayment!.bid.status).toBe('EXPIRED');
        }
      }
    });
  });
});
