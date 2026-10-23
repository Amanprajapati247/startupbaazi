export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'FOUNDER' | 'USER';
  isEmailVerified: boolean;
  avatarUrl?: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logoUrl?: string;
  websiteUrl: string;
  industry: string;
  categoryId?: string;
  category?: { id: string; name: string; slug: string };
  hqCity: string;
  hqState: string;
  foundedYear: number;
  stage: string;
  cin?: string;
  gstin?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  listings?: Listing[];
  listing?: Listing;
}

export interface Listing {
  id: string;
  companyId: string;
  company?: Company;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string;
  isVerified: boolean;
  verifiedAt?: string;
  currentRank?: number | null;
  currentBidAmount: number;
  viewCount: number;
  clickCount: number;
  createdAt: string;
}

export interface LeaderboardItem {
  listingId: string;
  companyId: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logoUrl?: string;
  websiteUrl: string;
  industry: string;
  categoryName: string;
  hqCity: string;
  hqState: string;
  foundedYear: number;
  stage: string;
  isVerified: boolean;
  rank: number;
  currentBidAmount: number;
  viewCount: number;
  clickCount: number;
}

export interface LeaderboardConfig {
  id: string;
  name: string;
  slug: string;
  description?: string;
  minBidAmount: number;
  minBidIncrement: number;
  currentHighestBid: number;
  nextMinimumBid: number;
}

export interface Bid {
  id: string;
  listingId: string;
  leaderboardId: string;
  amount: number;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'OUTBID' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  payment?: {
    status: string;
    razorpayPaymentId?: string;
    createdAt: string;
  };
  leaderboard?: {
    name: string;
    slug: string;
  };
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  createdAt: string;
  bid: {
    leaderboard: { name: string; slug: string };
    listing: {
      company: { name: string; slug: string; logoUrl?: string };
    };
  };
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'OUTBID' | 'APPROVAL' | 'REJECTION' | 'PAYMENT_SUCCESS' | 'SYSTEM';
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}
