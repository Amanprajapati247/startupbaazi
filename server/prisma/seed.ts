import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting StartupBaazi database seed...');

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

  console.log('✅ Users created: admin@startupbaazi.in & founder@startupbaazi.demo');

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

  console.log('✅ Leaderboard created:', leaderboard.name);

  // 4. Seed Startups & Listings
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
      status: 'APPROVED',
      rank: 1,
    },
    {
      name: 'Postman',
      slug: 'postman',
      tagline: 'The leading collaborative platform for API development',
      description: 'Postman simplifies each step of the API lifecycle and streamlines collaboration so teams can create better APIs faster. Founded in Bengaluru, now used worldwide by 30M+ developers.',
      websiteUrl: 'https://postman.com',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      industry: 'Developer Tools',
      categorySlug: 'developer-tools',
      hqCity: 'Bengaluru',
      hqState: 'Karnataka',
      foundedYear: 2014,
      stage: 'Series B+',
      bidAmount: 18000,
      isVerified: true,
      status: 'APPROVED',
      rank: 2,
    },
    {
      name: 'Zoho Corporation',
      slug: 'zoho',
      tagline: 'Your life’s work powered by our life’s work',
      description: 'Zoho offers a comprehensive suite of cloud software applications for businesses worldwide, built with deep engineering from Chennai and rural Tamil Nadu.',
      websiteUrl: 'https://zoho.com',
      logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80',
      industry: 'SaaS & Enterprise',
      categorySlug: 'saas',
      hqCity: 'Chennai',
      hqState: 'Tamil Nadu',
      foundedYear: 1996,
      stage: 'Profitable',
      bidAmount: 15000,
      isVerified: true,
      status: 'APPROVED',
      rank: 3,
    },
    {
      name: 'Razorpay',
      slug: 'razorpay',
      tagline: 'Powering seamless financial infrastructure for Indian businesses',
      description: 'Razorpay provides payment gateway services, corporate cards, and neobanking products, making digital commerce effortless for Indian enterprises and startups.',
      websiteUrl: 'https://razorpay.com',
      logoUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=128&auto=format&fit=crop&q=80',
      industry: 'Fintech & Payments',
      categorySlug: 'fintech',
      hqCity: 'Bengaluru',
      hqState: 'Karnataka',
      foundedYear: 2014,
      stage: 'Series B+',
      bidAmount: 12500,
      isVerified: true,
      status: 'APPROVED',
      rank: 4,
    },
    {
      name: 'Krutrim AI',
      slug: 'krutrim',
      tagline: "India's own AI cloud & foundational multimodal models",
      description: 'Krutrim is building India-first foundational AI models supporting 22 Indian languages and a full stack AI infrastructure from silicon to application.',
      websiteUrl: 'https://krutrim.ai',
      logoUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=128&auto=format&fit=crop&q=80',
      industry: 'AI & Machine Learning',
      categorySlug: 'ai',
      hqCity: 'Bengaluru',
      hqState: 'Karnataka',
      foundedYear: 2023,
      stage: 'Series A',
      bidAmount: 10000,
      isVerified: true,
      status: 'APPROVED',
      rank: 5,
    },
    {
      name: 'Hasura',
      slug: 'hasura',
      tagline: 'Instant GraphQL & REST APIs on all your enterprise databases',
      description: 'Hasura makes your data instantly accessible over secure GraphQL and REST APIs with granular authorization rules.',
      websiteUrl: 'https://hasura.io',
      logoUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=128&auto=format&fit=crop&q=80',
      industry: 'Developer Tools',
      categorySlug: 'developer-tools',
      hqCity: 'Bengaluru',
      hqState: 'Karnataka',
      foundedYear: 2017,
      stage: 'Series B+',
      bidAmount: 7500,
      isVerified: true,
      status: 'APPROVED',
      rank: 6,
    },
    {
      name: 'InVideo',
      slug: 'invideo',
      tagline: 'Generative AI platform that turns text ideas into complete videos',
      description: 'InVideo empowers creators, marketers, and enterprises to generate publish-ready videos with voiceovers, stock footage, and scriptwriting.',
      websiteUrl: 'https://invideo.io',
      logoUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=128&auto=format&fit=crop&q=80',
      industry: 'AI & Machine Learning',
      categorySlug: 'ai',
      hqCity: 'Mumbai',
      hqState: 'Maharashtra',
      foundedYear: 2017,
      stage: 'Series A',
      bidAmount: 5000,
      isVerified: true,
      status: 'APPROVED',
      rank: 7,
    },
    {
      name: 'Lenskart',
      slug: 'lenskart',
      tagline: 'Revolutionizing eyewear and vision care across Bharat',
      description: 'Omnichannel eyewear retailer combining 3D try-on technology with automated robotic manufacturing facilities in Delhi NCR.',
      websiteUrl: 'https://lenskart.com',
      logoUrl: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=128&auto=format&fit=crop&q=80',
      industry: 'D2C & E-Commerce',
      categorySlug: 'd2c',
      hqCity: 'Delhi NCR',
      hqState: 'Haryana',
      foundedYear: 2010,
      stage: 'Series B+',
      bidAmount: 3500,
      isVerified: true,
      status: 'APPROVED',
      rank: 8,
    },
    {
      name: 'PhysicsWallah',
      slug: 'physicswallah',
      tagline: 'Democratizing quality education for millions of Indian students',
      description: 'Affordable, high-impact learning for competitive exams like JEE, NEET, and UPSC with an extensive hybrid offline-online ecosystem.',
      websiteUrl: 'https://pw.live',
      logoUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=128&auto=format&fit=crop&q=80',
      industry: 'EdTech',
      categorySlug: 'edtech',
      hqCity: 'Delhi NCR',
      hqState: 'Uttar Pradesh',
      foundedYear: 2020,
      stage: 'Series A',
      bidAmount: 2000,
      isVerified: true,
      status: 'APPROVED',
      rank: 9,
    },
    {
      name: 'Dukaan',
      slug: 'dukaan',
      tagline: 'No-code platform to launch your e-commerce store in 30 seconds',
      description: 'Enables neighborhood merchants and D2C brands to launch digital storefronts with integrated UPI payments and logistics.',
      websiteUrl: 'https://mydukaan.io',
      logoUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=128&auto=format&fit=crop&q=80',
      industry: 'SaaS & Enterprise',
      categorySlug: 'saas',
      hqCity: 'Bengaluru',
      hqState: 'Karnataka',
      foundedYear: 2020,
      stage: 'Seed',
      bidAmount: 1000,
      isVerified: false,
      status: 'APPROVED',
      rank: 10,
    },
    {
      name: 'Sarvam AI',
      slug: 'sarvam-ai',
      tagline: 'Building generative AI for Indian enterprise and population-scale needs',
      description: 'Developing full-stack Indic LLMs and voice agents tailored for the diversity of Indian languages.',
      websiteUrl: 'https://sarvam.ai',
      logoUrl: 'https://images.unsplash.com/photo-1617791160505-6f00504e3519?w=128&auto=format&fit=crop&q=80',
      industry: 'AI & Machine Learning',
      categorySlug: 'ai',
      hqCity: 'Bengaluru',
      hqState: 'Karnataka',
      foundedYear: 2023,
      stage: 'Series A',
      bidAmount: 0,
      isVerified: false,
      status: 'PENDING_APPROVAL', // Pending approval for admin review testing!
      rank: null,
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
        categoryId: categoryMap.get(s.categorySlug) || null,
        hqCity: s.hqCity,
        hqState: s.hqState,
        foundedYear: s.foundedYear,
        stage: s.stage,
      },
    });

    // Link founder member
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

    // Create listing
    const listing = await prisma.listing.create({
      data: {
        companyId: company.id,
        status: s.status,
        isVerified: s.isVerified,
        verifiedAt: s.isVerified ? new Date() : null,
        currentRank: s.rank,
        currentBidAmount: s.bidAmount,
        viewCount: Math.floor(Math.random() * 500) + 120,
        clickCount: Math.floor(Math.random() * 80) + 25,
      },
    });

    // If active bid, record bid and payment
    if (s.bidAmount > 0) {
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
          razorpayOrderId: `order_seed_${s.slug}`,
          razorpayPaymentId: `pay_seed_${s.slug}`,
          razorpaySignature: 'seed_verified_signature',
          amount: s.bidAmount,
          currency: 'INR',
          status: 'SUCCESS',
          metadata: JSON.stringify({ seeded: true }),
        },
      });
    }
  }

  console.log('✅ Seeded 11 Indian startups with verified bids and leaderboard ranks!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
