import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import config from '../src/config/index.js';

// Override env variables for test mode
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/skillsphere_test';

export const connectTestDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
};

export const closeTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

export const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Creates a test user in the test database and signs valid access/refresh tokens.
 */
export const createTestUser = async (role = 'Client', extraData = {}) => {
  const rand = Math.floor(Math.random() * 1000000);
  const email = `test_${role.toLowerCase()}_${rand}@example.com`;
  const user = await User.create({
    name: `Test ${role}`,
    email,
    password: 'password123',
    role,
    isVerified: true,
    ...extraData,
  });

  const accessToken = user.generateAccessToken(config.accessTokenSecret, config.accessTokenExpiry);
  const refreshToken = user.generateRefreshToken(config.refreshTokenSecret, config.refreshTokenExpiry);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { user, accessToken, refreshToken };
};
