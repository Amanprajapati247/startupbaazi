import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('[Error Handler]', err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err instanceof AppError || err?.statusCode) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || 'An error occurred',
    });
  }

  // Handle Prisma Known Request Errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: `Duplicate field value: a record with this ${err.meta?.target || 'field'} already exists.`,
    });
  }

  if (err.code === 'P2021') {
    return res.status(500).json({
      success: false,
      message: `Database table not found (${err.meta?.table || 'schema'}). Database schema is being initialized. Please try again in a few moments.`,
    });
  }

  if (err.code === 'P1001' || err.code === 'P1000') {
    return res.status(503).json({
      success: false,
      message: 'Database connection failed. Please verify the DATABASE_URL in your Render Environment settings.',
    });
  }

  return res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};
