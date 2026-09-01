import express from 'express';
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

// Import db for startup migration
import { db } from './database/connection';

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
// Serve React frontend in production (single-server mode)
// =============================================================================
if (isProduction) {
  // Resolve the client build path relative to the compiled server entry point.
  // When running from FinanceTracker/server/dist/app.js, __dirname = …/server/dist
  // so the client build lives at FinanceTracker/client/dist.
  const clientBuildPath = path.resolve(__dirname, '../../client/dist');

  // Serve static assets (JS, CSS, images, etc.)
  app.use(express.static(clientBuildPath, {
    maxAge: '1y',           // Cache static assets for 1 year
    immutable: true,
    index: false,            // Don't serve index.html for '/' via static
  }));

  // SPA fallback — serve index.html for all non-API routes
  // Catch-all: API routes that weren't matched above get a 404;
  // everything else serves the SPA index.html.
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
      });
    } else {
      res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
        if (err) {
          console.error('Failed to serve index.html:', err);
          res.status(500).json({
            success: false,
            error: { code: 'BUILD_MISSING', message: 'Frontend build not found. Run npm run build in the client directory.' },
          });
        }
      });
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
// Start server (only when run directly, not when imported by Vercel)
// =============================================================================
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Balqen API running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
