import { prisma } from '../prisma';

export interface LeaderboardStats {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  minBidAmount: number;
  minBidIncrement: number;
  currentHighestBid: number;
  nextMinimumBidForRank1: number;
  totalRankedStartups: number;
}

export class RankingService {
  /**
   * Recalculates all ranks for a given leaderboard atomically.
   * Can be executed within a Prisma transaction.
   */
  static async recalculateRanks(leaderboardId: string, client = prisma) {
    // 1. Fetch the leaderboard
    const leaderboard = await client.leaderboard.findUnique({
      where: { id: leaderboardId },
    });

    if (!leaderboard) {
      throw new Error(`Leaderboard ${leaderboardId} not found.`);
    }

    // 2. Fetch all ACTIVE bids for this leaderboard, grouped by listing (highest active bid per listing)
    const activeBids = await client.bid.findMany({
      where: {
        leaderboardId,
        status: 'ACTIVE',
        listing: {
          status: 'APPROVED',
        },
      },
      include: {
        listing: {
          include: {
            company: true,
          },
        },
      },
      orderBy: [
        { amount: 'desc' },
        { createdAt: 'asc' }, // Tie-breaker: earlier bid placed gets priority
      ],
    });

    // De-duplicate in case a listing has multiple bids: keep the highest
    const listingHighestBidMap = new Map<string, { listingId: string; amount: number; bidId: string }>();

    for (const b of activeBids) {
      if (!listingHighestBidMap.has(b.listingId)) {
        listingHighestBidMap.set(b.listingId, {
          listingId: b.listingId,
          amount: b.amount,
          bidId: b.id,
        });
      }
    }

    // Convert map to sorted list
    const sortedRankedListings = Array.from(listingHighestBidMap.values()).sort(
      (a, b) => b.amount - a.amount
    );

    // 3. Update the rank and currentBidAmount for each ranked listing
    let rank = 1;
    for (const item of sortedRankedListings) {
      await client.listing.update({
        where: { id: item.listingId },
        data: {
          currentRank: rank,
          currentBidAmount: item.amount,
        },
      });
      rank++;
    }

    // 4. Also fetch any APPROVED listings that currently have NO active bid
    const unrankedListings = await client.listing.findMany({
      where: {
        status: 'APPROVED',
        id: {
          notIn: sortedRankedListings.map((s) => s.listingId),
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    for (const unranked of unrankedListings) {
      await client.listing.update({
        where: { id: unranked.id },
        data: {
          currentRank: rank,
          currentBidAmount: 0,
        },
      });
      rank++;
    }

    return sortedRankedListings;
  }

  /**
   * Calculates the minimum eligible bid required to achieve a specific position
   */
  static async getBidRequirements(leaderboardId: string, targetRank: number = 1) {
    const leaderboard = await prisma.leaderboard.findUnique({
      where: { id: leaderboardId },
    });

    if (!leaderboard) {
      throw new Error('Leaderboard not found.');
    }

    // Find the current startup occupying targetRank
    const currentHolder = await prisma.listing.findFirst({
      where: {
        currentRank: targetRank,
        status: 'APPROVED',
      },
    });

    const minBase = leaderboard.minBidAmount;
    const minIncrement = leaderboard.minBidIncrement;

    if (!currentHolder || currentHolder.currentBidAmount <= 0) {
      return {
        targetRank,
        requiredBid: minBase,
        currentBidAmount: 0,
        minIncrement,
        minBase,
      };
    }

    const requiredBid = Math.max(minBase, currentHolder.currentBidAmount + minIncrement);

    return {
      targetRank,
      requiredBid,
      currentBidAmount: currentHolder.currentBidAmount,
      minIncrement,
      minBase,
      currentHolderCompanyId: currentHolder.companyId,
    };
  }
}
