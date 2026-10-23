import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/auth';
import companyRoutes from './routes/companies';
import leaderboardRoutes from './routes/leaderboards';
import bidRoutes from './routes/bids';
import paymentRoutes from './routes/payments';
import adminRoutes from './routes/admin';
import analyticsRoutes from './routes/analytics';

const app = express();

// Security & Utility Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: '*', // Allow all origins for dev / flexible deployment
  credentials: true,
}));
app.use(morgan('dev'));

// Razorpay webhook raw body capture (for HMAC signature)
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString();
  },
}));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    platform: 'StartupBaazi API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

// Global Error Handler
app.use(errorHandler);

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`🚀 [StartupBaazi API] running on http://localhost:${config.port}`);
  });
}

export default app;
