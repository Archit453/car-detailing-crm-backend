import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import apiRouter from './routes/index.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requireAuth } from './middlewares/auth.js';
import { successResponse } from './utils/apiResponse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, '../public');

const app = express();

// Security Headers (Configured for static UI and CDN assets)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Serve static frontend assets
app.use(express.static(publicPath, { index: false }));

// Cross-Origin Resource Sharing (CORS) configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin || config.corsOrigin === '*') {
      return callback(null, true);
    }
    const allowedOrigins = config.corsOrigin.split(',').map((o) => o.trim());
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// HTTP Request Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// Request Body Parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Favicon Handler (prevents 404 logs from browser requests)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Authentication Login UI
app.get('/login', (req, res) => {
  res.sendFile(path.join(publicPath, 'login.html'));
});

// CRM Frontend Dashboard UI (Protected: Redirects unauthenticated users to /login)
app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// WhatsApp Coexistence Setup Page (Step 3)
app.get('/coexistence', (req, res) => {
  res.sendFile(path.join(publicPath, 'coexistence.html'));
});

// Privacy Policy (Required for Meta App Review and Publishing)
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(publicPath, 'privacy.html'));
});

// Root Route - Base API status & index (with browser redirect to /dashboard)
app.get('/', (req, res) => {
  if (req.accepts('html') && !req.accepts('json')) {
    return res.redirect('/dashboard');
  }

  return successResponse(
    res,
    {
      name: 'Car Detailing CRM REST API',
      version: '1.0.0',
      status: 'online',
      environment: config.nodeEnv,
      dashboard: '/dashboard',
      endpoints: {
        root: 'GET /',
        dashboard: 'GET /dashboard',
        health: 'GET /health',
        apiDocs: 'GET /api',
        leads: 'GET /api/leads',
      },
    },
    'Car Detailing CRM Backend API is online and operational'
  );
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  return successResponse(
    res,
    {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    },
    'Server is running healthy'
  );
});

// API Routes
app.use('/api', apiRouter);

// 404 Handler for undefined routes
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

export default app;
