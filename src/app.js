import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import config from './config/index.js';
import apiRouter from './routes/index.js';
import errorHandler from './middleware/error.middleware.js';
import './config/passport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerDocument = JSON.parse(
  fs.readFileSync(path.join(__dirname, './docs/openapi.json'), 'utf8')
);

// Define Global Rate Limiting configuration
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: (config.env === 'test' || config.env === 'development') ? 10000 : 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// Define strict rate limiting on Auth routes to block brute-force attacks
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: (config.env === 'test' || config.env === 'development') ? 10000 : 10,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const app = express();

// Apply Security Headers via Helmet (with Content Security Policy disabled to allow inline assets on Swagger UI)
app.use(helmet({ contentSecurityPolicy: false }));

// Apply Global Rate Limiting
app.use(globalRateLimiter);

// Apply strict rate limiting on Auth routes to block brute-force attacks
app.use('/api/v1/auth', authRateLimiter);

// Initialize Passport.js
app.use(passport.initialize());

// Custom request logging middleware
app.use((req, res, next) => {
  console.log(`Received request: [${req.method}] ${req.url}`);
  next();
});

// Enable CORS with configurable options
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Enable JSON parser with payload size limit
app.use(express.json({ limit: '16kb' }));

// Enable Urlencoded parser for form-data
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// Enable Cookie Parser
app.use(cookieParser());

// Base static folder setup for public assets
app.use(express.static('public'));

// Serve Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/v1/docs', (req, res) => {
  res.redirect('/api-docs');
});

// Mount API routes under /api/v1 prefix
app.use('/api/v1', apiRouter);

// Catch-all route for undefined endpoints
app.use('*', (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
});

// Register centralized error handling middleware
app.use(errorHandler);

export { app };
export default app;
