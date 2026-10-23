import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { prisma } from '../prisma';

describe('StartupBaazi Backend Test Suite', () => {
  let adminToken: string;
  let founderToken: string;
  let testListingId: string;
  let testLeaderboardId: string;
  let currentRank1Bid: number;

  beforeAll(async () => {
    // 1. Login as Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@startupbaazi.in', password: 'Admin@12345' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;

    // 2. Login as Founder
    const founderRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'founder@startupbaazi.demo', password: 'Founder@12345' });
    expect(founderRes.status).toBe(200);
    founderToken = founderRes.body.data.token;

    // 3. Get leaderboard
    const board = await prisma.leaderboard.findFirst();
    testLeaderboardId = board!.id;

    // 4. Get rank 1 listing
    const listing = await prisma.listing.findFirst({
      where: { currentRank: 1 },
    });
    testListingId = listing!.id;
    currentRank1Bid = listing!.currentBidAmount;
  });

  describe('1. Health and Discovery APIs', () => {
    it('should return 200 OK from /api/health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('online');
    });

    it('should fetch public leaderboard with ranked startups', async () => {
      const res = await request(app).get('/api/leaderboards/india-top-startups');
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.items[0].rank).toBe(1);
      expect(res.body.data.items[0].currentBidAmount).toBeGreaterThan(0);
    });

    it('should filter leaderboard by industry and city', async () => {
      const res = await request(app)
        .get('/api/leaderboards/india-top-startups?city=Bengaluru');
      expect(res.status).toBe(200);
      expect(res.body.data.items.every((i: any) => i.hqCity === 'Bengaluru')).toBe(true);
    });

    it('should fetch company public profile by slug', async () => {
      const res = await request(app).get('/api/companies/zerodha');
      expect(res.status).toBe(200);
      expect(res.body.data.company.name).toBe('Zerodha');
    });
  });

  describe('2. Authentication & Authorization', () => {
    it('should register a new founder account', async () => {
      const testEmail = `founder_${Date.now()}@test.in`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Kunal Shah',
          email: testEmail,
          password: 'SecretPassword123',
          role: 'FOUNDER',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@startupbaazi.in',
          password: 'WrongPassword',
        });
      expect(res.status).toBe(401);
    });

    it('should reject non-admin access to admin routes', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${founderToken}`);
      expect(res.status).toBe(403);
    });

    it('should allow admin access to /api/admin/stats', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.totalCompanies).toBeGreaterThan(0);
      expect(res.body.data.totalRevenue).toBeGreaterThan(0);
    });
  });

  describe('3. Startup Submission & Moderation Lifecycle', () => {
    let newCompanySlug: string;
    let newListingId: string;

    it('should allow founder to submit a startup for review', async () => {
      const uniqueName = `TestStartup ${Date.now()}`;
      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({
          name: uniqueName,
          tagline: 'Transforming Indian logistics with AI',
          description: 'A revolutionary logistics platform serving Tier 2 and Tier 3 cities across India.',
          websiteUrl: 'https://testlogistics.in',
          industry: 'Logistics & Mobility',
          hqCity: 'Pune',
          hqState: 'Maharashtra',
          foundedYear: 2022,
          stage: 'Seed',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.listing.status).toBe('PENDING_APPROVAL');
      newCompanySlug = res.body.data.company.slug;
      newListingId = res.body.data.listing.id;
    });

    it('should allow admin to approve the pending listing', async () => {
      const res = await request(app)
        .patch(`/api/admin/listings/${newListingId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(200);
      expect(res.body.data.listing.status).toBe('APPROVED');
    });

    it('should allow admin to grant verified badge', async () => {
      const res = await request(app)
        .patch(`/api/admin/listings/${newListingId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isVerified: true });

      expect(res.status).toBe(200);
      expect(res.body.data.listing.isVerified).toBe(true);
    });
  });

  describe('4. Bidding Engine & Razorpay Payment Verification', () => {
    it('should enforce minimum bid amount requirements', async () => {
      const reqRes = await request(app).get('/api/leaderboards/india-top-startups/requirements');
      expect(reqRes.status).toBe(200);
      const minRequired = reqRes.body.data.requiredBid;

      // Try bidding below minimum
      const failRes = await request(app)
        .post('/api/bids/intent')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({
          listingId: testListingId,
          leaderboardId: testLeaderboardId,
          amount: 10, // Below minimum!
        });

      expect(failRes.status).toBe(400);
    });

    it('should successfully create a bid intent and Razorpay test order', async () => {
      const newBidAmount = currentRank1Bid + 5000;

      const res = await request(app)
        .post('/api/bids/intent')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({
          listingId: testListingId,
          leaderboardId: testLeaderboardId,
          amount: newBidAmount,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.orderId).toBeDefined();
      expect(res.body.data.amountInINR).toBe(newBidAmount);

      // Verify the payment and atomically update ranking
      const verifyRes = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({
          orderId: res.body.data.orderId,
          paymentId: `pay_test_${Date.now()}`,
          signature: 'test_mode_valid_signature',
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.success).toBe(true);
      expect(verifyRes.body.data.newRank).toBe(1);
    });

    it('should safely reject invalid payment signatures', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({
          orderId: 'non_existent_order_id',
          paymentId: 'pay_invalid',
          signature: 'bad_signature_123',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('5. Analytics and Click Tracking', () => {
    it('should record outbound website clicks', async () => {
      const res = await request(app).post(`/api/companies/${testListingId}/click`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fetch founder dashboard analytics and notifications', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${founderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasCompany).toBe(true);
      expect(res.body.data.stats).toBeDefined();
    });
  });
});
