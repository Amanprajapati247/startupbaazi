import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../prisma';
import { config } from '../config';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { loginLimiter } from '../middleware/rateLimiter';
import { NotificationService } from '../services/notificationService';
import { EmailService } from '../services/emailService';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['USER', 'FOUNDER']).default('FOUNDER'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('An account with this email already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        isEmailVerified: true, // Auto-verified for frictionless MVP
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          avatarUrl: user.avatarUrl,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEmailVerified: true,
        avatarUrl: true,
        companyMembers: {
          include: {
            company: {
              include: {
                listings: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    return res.json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
      select: { id: true, email: true, isEmailVerified: true },
    });

    return res.json({
      success: true,
      message: 'Email verified successfully!',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
});

// Validation Schemas for Password Management
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  resetToken: z.string().min(1, 'Reset code or token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// POST /api/auth/forgot-password - Request a 6-digit password reset code
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      // Don't leak registered status if account doesn't exist
      return res.json({
        success: true,
        message: 'If an account exists with this email, password reset instructions have been generated.',
      });
    }

    // Generate a secure 6-digit numeric verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // Valid for 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetCode,
        resetPasswordExpires: resetExpires,
      },
    });

    console.log(`🔐 [Password Reset] Verification code generated for ${user.email}`);

    // Send the verification code to the user's real email address
    const emailResult = await EmailService.sendPasswordResetEmail({
      toEmail: user.email,
      userName: user.name,
      resetCode,
    });

    await NotificationService.createNotification({
      userId: user.id,
      title: 'Password Reset Code Requested',
      message: `A password reset code was requested for your account (${user.email}). Valid for 1 hour.`,
      type: 'SYSTEM',
    });

    if (emailResult.sent) {
      return res.json({
        success: true,
        message: `A 6-digit verification code has been dispatched to your email (${user.email}). Please check your inbox and spam folder.`,
        data: {
          email: user.email,
        },
      });
    } else {
      throw new AppError(
        `Unable to send verification code to ${user.email}. ${emailResult.reason || 'Email service (SMTP) is not configured in server environment.'}`,
        500
      );
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password - Verify reset code and update password
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
      throw new AppError('Invalid or expired reset code. Please request a new code.', 400);
    }

    if (new Date() > user.resetPasswordExpires) {
      throw new AppError('The reset code has expired. Please request a new code.', 400);
    }

    if (user.resetPasswordToken.trim() !== data.resetToken.trim()) {
      throw new AppError('Incorrect reset code. Please check and try again.', 400);
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    await NotificationService.createNotification({
      userId: user.id,
      title: 'Password Reset Successful',
      message: 'Your account password was successfully reset. You can now log in with your new credentials.',
      type: 'SYSTEM',
    });

    return res.json({
      success: true,
      message: 'Password has been reset successfully! You can now log in with your new password.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password - Authenticated user self-service password update
router.post('/change-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    const isMatch = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400);
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await NotificationService.createNotification({
      userId,
      title: 'Password Changed',
      message: 'Your account password was updated successfully.',
      type: 'SYSTEM',
    });

    return res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
