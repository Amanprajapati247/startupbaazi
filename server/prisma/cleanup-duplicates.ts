import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function cleanupDuplicateListings() {
  console.log('🔍 Checking for duplicate listings per company...');

  const duplicateGroups = await prisma.listing.groupBy({
    by: ['companyId'],
    _count: { companyId: true },
    having: { companyId: { _count: { gt: 1 } } },
  });

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicate listings found. Database is clean.');
    return;
  }

  console.log(`⚠️ Found ${duplicateGroups.length} companies with duplicate listings. Safely merging...`);

  for (const group of duplicateGroups) {
    const listings = await prisma.listing.findMany({
      where: { companyId: group.companyId },
      include: {
        bids: true,
        clickEvents: true,
        impressionEvents: true,
      },
      orderBy: [
        { currentBidAmount: 'desc' },
        { viewCount: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    const masterListing = listings[0];
    const redundantListings = listings.slice(1);

    console.log(`  Merging ${redundantListings.length} duplicates into master listing ${masterListing.id}...`);

    for (const redundant of redundantListings) {
      // Re-link bids
      await prisma.bid.updateMany({
        where: { listingId: redundant.id },
        data: { listingId: masterListing.id },
      });

      // Re-link click events
      await prisma.clickEvent.updateMany({
        where: { listingId: redundant.id },
        data: { listingId: masterListing.id },
      });

      // Re-link impression events
      await prisma.impressionEvent.updateMany({
        where: { listingId: redundant.id },
        data: { listingId: masterListing.id },
      });

      // Sum views and clicks into master
      await prisma.listing.update({
        where: { id: masterListing.id },
        data: {
          viewCount: { increment: redundant.viewCount },
          clickCount: { increment: redundant.clickCount },
        },
      });

      // Safely delete redundant listing
      await prisma.listing.delete({
        where: { id: redundant.id },
      });
    }
  }

  console.log('✅ Duplicate cleanup completed successfully.');
}

if (require.main === module) {
  cleanupDuplicateListings()
    .catch((e) => {
      console.error('Error cleaning duplicates:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
