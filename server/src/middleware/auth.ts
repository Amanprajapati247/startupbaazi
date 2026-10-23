import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../prisma';
import { AppError } from './errorHandler';

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Missing token.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUserPayload;

    // Verify user still exists in DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new AppError('User belonging to this token no longer exists.', 401);
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new AppError('Invalid or expired authentication token.', 401));
    } else {
      next(error);
    }
  }
};

export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new AppError('Forbidden. Admin access required.', 403));
  }
  next();
};

export const requireCompanyMember = (requiredRole: string = 'MEMBER') => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError('Authentication required.', 401));
      }

      // Admins bypass company membership checks
      if (req.user.role === 'ADMIN') {
        return next();
      }

      const companyId = req.params.companyId || req.body.companyId;
      if (!companyId) {
        return next(new AppError('Company ID is required to verify ownership.', 400));
      }

      const membership = await prisma.companyMember.findUnique({
        where: {
          companyId_userId: {
            companyId,
            userId: req.user.userId,
          },
        },
      });

      if (!membership) {
        return next(new AppError('You are not authorized to manage this company.', 403));
      }

      if (requiredRole === 'OWNER' && membership.role !== 'OWNER') {
        return next(new AppError('Company OWNER privileges required.', 403));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
