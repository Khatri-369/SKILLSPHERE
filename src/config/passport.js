import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.model.js';
import config from './index.js';
import crypto from 'crypto';

// Setup Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: `${config.clientUrl}/api/v1/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName || profile.name?.givenName || 'Google User';

        if (!email) {
          return done(new Error('No email found in Google account profile'), null);
        }

        // 1. Check if user already exists
        let user = await User.findOne({ email });

        if (user) {
          return done(null, user);
        }

        // 2. Otherwise create a new user profile
        // Generate a secure random password since schema requires one
        const randomPassword = crypto.randomBytes(20).toString('hex');
        
        user = await User.create({
          name,
          email,
          password: randomPassword,
          role: 'Client', // Default role
          isVerified: true, // Google email is already verified
        });

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Session serialization (Required by passport framework, but not used since we utilize custom stateless JWT cookies)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
