import rateLimit from 'express-rate-limit';

// General API Rate Limiter: 120 requests per minute
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after a minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth Login Limiter: 10 attempts per 15 minutes to prevent brute-forcing
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please wait 15 minutes before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Click & Impression Tracker Limiter: 60 clicks per minute per IP
export const clickLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: 'Click rate limit reached. Please wait a moment.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
