import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import rate limiter
import { apiLimiter } from './middleware/rateLimit';

// Import routes
import authRoutes from './routes/auth';
import accountRoutes from './routes/accounts';
import personRoutes from './routes/people';
import categoryRoutes from './routes/categories';
import transactionRoutes from './routes/transactions';
import loanRoutes from './routes/loans';
import dashboardRoutes from './routes/dashboard';
import reportRoutes from './routes/reports';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const isProduction = process.env.NODE_ENV === 'production';

// =============================================================================
// Middleware
// =============================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
}));

// Compression
app.use(compression());

// CORS — allow frontend origin in all environments
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3001',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: isProduction ? 'strict' : 'lax',
  },
}));

// =============================================================================
// API Routes
// =============================================================================
app.use('/api/auth', authRoutes);
app.use('/api/accounts', apiLimiter, accountRoutes);
app.use('/api/people', apiLimiter, personRoutes);
app.use('/api/categories', apiLimiter, categoryRoutes);
app.use('/api/transactions', apiLimiter, transactionRoutes);
app.use('/api/loans', apiLimiter, loanRoutes);
app.use('/api/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/reports', apiLimiter, reportRoutes);

// =============================================================================
// Health check
// =============================================================================
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// =============================================================================
// Serve React frontend in production
// =============================================================================
if (isProduction) {
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));

  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    }
  });
}

// =============================================================================
// Global error handler
// =============================================================================
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: isProduction ? 'An unexpected error occurred' : err.message,
    },
  });
});

// =============================================================================
// Start server
// =============================================================================
app.listen(PORT, () => {
  console.log(`🚀 Finance Tracker API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
