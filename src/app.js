import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import config from './config/index.js';
import apiRouter from './routes/index.js';
import errorHandler from './middleware/error.middleware.js';
import './config/passport.js';

const app = express();

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
