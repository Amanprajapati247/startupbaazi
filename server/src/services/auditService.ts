import { prisma } from '../prisma';

export class AuditService {
  static async logAction({
    adminId,
    action,
    targetType,
    targetId,
    details,
    ipAddress,
  }: {
    adminId: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: Record<string, any> | string;
    ipAddress?: string;
  }) {
    try {
      const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details;
      return await prisma.adminAuditLog.create({
        data: {
          adminId,
          action,
          targetType,
          targetId,
          details: detailsStr,
          ipAddress,
        },
      });
    } catch (err) {
      console.error('[AuditService Error]', err);
    }
  }
}
