import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'startupbaazi_super_secret_jwt_key_fallback',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'placeholder_webhook_secret',
  defaultMinBid: parseFloat(process.env.DEFAULT_MIN_BID_AMOUNT || '500'),
  defaultMinIncrement: parseFloat(process.env.DEFAULT_MIN_BID_INCREMENT || '100'),
};
