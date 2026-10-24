import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';
import { RankingService } from '../services/rankingService';

export async function autoSeedIfEmpty() {
  try {
    const boardCount = await prisma.leaderboard.count();
    if (boardCount > 0) {
      return; // Already initialized
    }

    console.log('🌱 [StartupBaazi Auto-Init] Empty database detected. Initializing production taxonomy & default leaderboard...');

    // 1. Create Admin & Founder Users
    const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
    const founderPasswordHash = await bcrypt.hash('Founder@12345', 10);

    const admin = await prisma.user.upsert({
      where: { email: 'admin@startupbaazi.in' },
      update: {},
      create: {
        email: 'admin@startupbaazi.in',
        name: 'StartupBaazi Admin',
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        isEmailVerified: true,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      },
    });

    const founder = await prisma.user.upsert({
      where: { email: 'founder@startupbaazi.demo' },
      update: {},
      create: {
        email: 'founder@startupbaazi.demo',
        name: 'Nitin & Nithin Kamath',
        passwordHash: founderPasswordHash,
        role: 'FOUNDER',
        isEmailVerified: true,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      },
    });

    // 2. Create Categories
    const categoriesData = [
      { name: 'Fintech & Payments', slug: 'fintech', description: 'Financial technology, wealth management, and payment rails' },
      { name: 'SaaS & Enterprise', slug: 'saas', description: 'Software as a service, workflows, and productivity tools' },
      { name: 'AI & Machine Learning', slug: 'ai', description: 'Generative AI, LLMs, computer vision, and autonomous agents' },
      { name: 'Developer Tools', slug: 'developer-tools', description: 'APIs, infrastructure, SDKs, and engineering platforms' },
      { name: 'D2C & E-Commerce', slug: 'd2c', description: 'Direct-to-consumer brands and retail tech' },
      { name: 'EdTech', slug: 'edtech', description: 'Educational platforms, upskilling, and learning tech' },
      { name: 'Healthcare & Biotech', slug: 'healthcare', description: 'Health services, diagnostics, and tele-health' },
      { name: 'Logistics & Mobility', slug: 'logistics', description: 'Supply chain, freight, EV, and smart transport' },
    ];

    const categoryMap = new Map<string, string>();
    for (const cat of categoriesData) {
      const createdCat = await prisma.category.upsert({
        where: { slug: cat.slug },
        update: {},
        create: cat,
      });
      categoryMap.set(cat.slug, createdCat.id);
    }

    // 3. Create Main Leaderboard
    const leaderboard = await prisma.leaderboard.upsert({
      where: { slug: 'india-top-startups' },
      update: {},
      create: {
        name: 'India Premier Startup Leaderboard',
        slug: 'india-top-startups',
        description: "India's official ranking board for emerging ventures, bootstrapped titans, and venture-backed rocketships.",
        minBidAmount: 500,
        minBidIncrement: 100,
        isActive: true,
      },
    });

    // 4. Seed Showcase Startups
    const startups = [
      {
        name: 'Zerodha',
        slug: 'zerodha',
        tagline: 'The pioneer of discount broking and financial literacy in India',
        description: 'Zerodha is India’s largest retail stockbroker, offering zero-brokerage equity investments and building world-class financial technology products for millions of Indian traders.',
        websiteUrl: 'https://zerodha.com',
        logoUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=128&auto=format&fit=crop&q=80',
        industry: 'Fintech & Payments',
        categorySlug: 'fintech',
        hqCity: 'Bengaluru',
        hqState: 'Karnataka',
        foundedYear: 2010,
        stage: 'Profitable',
        bidAmount: 25000,
        isVerified: true,
      },
      {
        name: 'Postman',
        slug: 'postman',
        tagline: 'The world’s leading API platform used by 30M+ developers',
        description: 'Postman simplifies each step of the API lifecycle and streamlines collaboration so you can create better APIs—faster. Proudly founded in Bengaluru.',
        websiteUrl: 'https://postman.com',
        logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80',
        industry: 'Developer Tools',
        categorySlug: 'developer-tools',
        hqCity: 'Bengaluru',
        hqState: 'Karnataka',
        foundedYear: 2014,
        stage: 'Series D',
        bidAmount: 20000,
        isVerified: true,
      },
      {
        name: 'Razorpay',
        slug: 'razorpay',
        tagline: 'The financial backbone for Indian digital commerce and payments',
        description: 'Razorpay powers payments for millions of Indian businesses, offering payment gateway, neo-banking, payroll, and automated disbursements.',
        websiteUrl: 'https://razorpay.com',
        logoUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=128&auto=format&fit=crop&q=80',
        industry: 'Fintech & Payments',
        categorySlug: 'fintech',
        hqCity: 'Bengaluru',
        hqState: 'Karnataka',
        foundedYear: 2014,
        stage: 'Series F',
        bidAmount: 18000,
        isVerified: true,
      },
      {
        name: 'Sarvam AI',
        slug: 'sarvam-ai',
        tagline: 'Building sovereign foundational GenAI models for Indian languages',
        description: 'Sarvam AI develops full-stack Generative AI foundational models and enterprise speech-to-text / translation platforms designed for India’s linguistic diversity.',
        websiteUrl: 'https://sarvam.ai',
        logoUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=128&auto=format&fit=crop&q=80',
        industry: 'AI & Machine Learning',
        categorySlug: 'ai',
        hqCity: 'Bengaluru',
        hqState: 'Karnataka',
        foundedYear: 2023,
        stage: 'Series A',
        bidAmount: 15000,
        isVerified: true,
      },
      {
        name: 'Hasura',
        slug: 'hasura',
        tagline: 'Instant GraphQL and REST APIs on all your enterprise data',
        description: 'Hasura makes data access easy by instantly generating modern GraphQL and REST APIs on your existing databases.',
        websiteUrl: 'https://hasura.io',
        logoUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=128&auto=format&fit=crop&q=80',
        industry: 'Developer Tools',
        categorySlug: 'developer-tools',
        hqCity: 'Bengaluru',
        hqState: 'Karnataka',
        foundedYear: 2017,
        stage: 'Series C',
        bidAmount: 12000,
        isVerified: true,
      },
      {
        name: 'CRED',
        slug: 'cred',
        tagline: 'Rewarding creditworthy individuals and building India’s high-trust network',
        description: 'CRED is an exclusive members-only platform that rewards India’s most creditworthy individuals for paying their credit card bills on time.',
        websiteUrl: 'https://cred.club',
        logoUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=128&auto=format&fit=crop&q=80',
        industry: 'Fintech & Payments',
        categorySlug: 'fintech',
        hqCity: 'Bengaluru',
        hqState: 'Karnataka',
        foundedYear: 2018,
        stage: 'Series F',
        bidAmount: 10000,
        isVerified: true,
      },
      {
        name: 'Krutrim AI',
        slug: 'krutrim',
        tagline: 'India’s first AI unicorn building computing infrastructure for Bharat',
        description: 'Krutrim is building India’s AI computing stack, language models, and AI cloud architecture designed specifically for Indian cultural and linguistic contexts.',
        websiteUrl: 'https://krutrim.com',
        logoUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=128&auto=format&fit=crop&q=80',
        industry: 'AI & Machine Learning',
        categorySlug: 'ai',
        hqCity: 'Bengaluru',
        hqState: 'Karnataka',
        foundedYear: 2023,
        stage: 'Series A',
        bidAmount: 8500,
        isVerified: true,
      },
      {
        name: 'BrowserStack',
        slug: 'browserstack',
        tagline: 'The world’s leading software testing platform',
        description: 'BrowserStack gives developers instant access to 3,000+ real mobile devices and desktop browsers on the cloud for testing applications.',
        websiteUrl: 'https://browserstack.com',
        logoUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=128&auto=format&fit=crop&q=80',
        industry: 'Developer Tools',
        categorySlug: 'developer-tools',
        hqCity: 'Mumbai',
        hqState: 'Maharashtra',
        foundedYear: 2011,
        stage: 'Series B',
        bidAmount: 6000,
        isVerified: true,
      },
    ];

    for (const s of startups) {
      const company = await prisma.company.upsert({
        where: { slug: s.slug },
        update: {},
        create: {
          name: s.name,
          slug: s.slug,
          tagline: s.tagline,
          description: s.description,
          websiteUrl: s.websiteUrl,
          logoUrl: s.logoUrl,
          industry: s.industry,
          categoryId: categoryMap.get(s.categorySlug),
          hqCity: s.hqCity,
          hqState: s.hqState,
          foundedYear: s.foundedYear,
          stage: s.stage,
        },
      });

      // Link to founder
      await prisma.companyMember.upsert({
        where: {
          companyId_userId: {
            companyId: company.id,
            userId: founder.id,
          },
        },
        update: {},
        create: {
          companyId: company.id,
          userId: founder.id,
          role: 'OWNER',
        },
      });

      // Listing
      const listing = await prisma.listing.upsert({
        where: { companyId: company.id },
        update: {},
        create: {
          companyId: company.id,
          status: 'APPROVED',
          isVerified: s.isVerified,
          verifiedAt: new Date(),
          currentRank: null,
          currentBidAmount: s.bidAmount,
          viewCount: Math.floor(Math.random() * 800) + 150,
          clickCount: Math.floor(Math.random() * 80) + 10,
        },
      });

      // Active Bid
      const existingBid = await prisma.bid.findFirst({
        where: { listingId: listing.id, status: 'ACTIVE' },
      });

      if (!existingBid) {
        const bid = await prisma.bid.create({
          data: {
            listingId: listing.id,
            leaderboardId: leaderboard.id,
            userId: founder.id,
            amount: s.bidAmount,
            status: 'ACTIVE',
          },
        });

        await prisma.payment.create({
          data: {
            bidId: bid.id,
            userId: founder.id,
            provider: 'RAZORPAY',
            razorpayOrderId: `order_seed_${s.slug}`,
            razorpayPaymentId: `pay_seed_${s.slug}`,
            amount: s.bidAmount,
            currency: 'INR',
            status: 'SUCCESS',
            metadata: JSON.stringify({ seeded: true, isDemoData: true }),
          },
        });
      }
    }

    // Authoritatively calculate ranks
    await RankingService.recalculateRanks(leaderboard.id);
    console.log('✅ [StartupBaazi Auto-Init] Production database successfully initialized with showcase startups!');
  } catch (err: any) {
    console.warn('⚠️ [StartupBaazi Auto-Init] Notice:', err.message);
  }
}
