import { prisma } from '../prisma';

export class NotificationService {
  static async createNotification({
    userId,
    title,
    message,
    type = 'SYSTEM',
    linkUrl,
  }: {
    userId: string;
    title: string;
    message: string;
    type?: 'OUTBID' | 'APPROVAL' | 'REJECTION' | 'PAYMENT_SUCCESS' | 'SYSTEM';
    linkUrl?: string;
  }) {
    try {
      return await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          linkUrl,
        },
      });
    } catch (err) {
      console.error('[NotificationService Error]', err);
    }
  }

  static async notifyOutbid({
    outbidUserId,
    companyName,
    newBidAmount,
    leaderboardName,
  }: {
    outbidUserId: string;
    companyName: string;
    newBidAmount: number;
    leaderboardName: string;
  }) {
    return this.createNotification({
      userId: outbidUserId,
      title: `You've been outbid on ${leaderboardName}!`,
      message: `Another startup placed a verified bid of ₹${newBidAmount.toLocaleString('en-IN')}, bumping ${companyName}'s position. Place a higher bid now to reclaim your spotlight!`,
      type: 'OUTBID',
      linkUrl: '/dashboard',
    });
  }
}
