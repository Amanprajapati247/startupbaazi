import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

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
  contentSecurityPolicy: false, // Allows Razorpay and Stripe checkout overlays
}));
app.use(cors({
  origin: '*', // Allow all origins for dev / flexible deployment
  credentials: true,
}));
app.use(morgan('dev'));

// Webhook raw body capture (for HMAC signature)
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
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

// Serve client in production if built
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const altClientDistPath = path.resolve(process.cwd(), '../client/dist');
const localDistPath = path.resolve(process.cwd(), 'client/dist');

const staticPath = fs.existsSync(clientDistPath)
  ? clientDistPath
  : fs.existsSync(altClientDistPath)
  ? altClientDistPath
  : fs.existsSync(localDistPath)
  ? localDistPath
  : null;

if (staticPath) {
  app.use(express.static(staticPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`🚀 [StartupBaazi API] running on http://localhost:${config.port}`);
  });
}

export default app;
