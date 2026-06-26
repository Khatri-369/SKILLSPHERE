import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsphere',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || 'skillsphere_access_token_secret_key_12345',
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'skillsphere_refresh_token_secret_key_67890',
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5000',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'no-reply@skillsphere.com',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || 'mock_client_id_123',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret_456',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY || '',
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
};

// Basic validation for production
if (config.env === 'production') {
  if (!process.env.MONGODB_URI) {
    console.warn('WARNING: MONGODB_URI is not set in production. Falling back to default.');
  }
  if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
    console.warn('WARNING: JWT token secrets are not properly configured in production environment variables.');
  }
}

export default config;
