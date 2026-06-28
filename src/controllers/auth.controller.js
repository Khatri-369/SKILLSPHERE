import User from '../models/user.model.js';
import config from '../config/index.js';
import jsonwebtoken from 'jsonwebtoken';
import crypto from 'crypto';
import { sendEmail } from '../utils/mail.js';

// Helper for cookie options
const getCookieOptions = () => ({
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'Lax',
});

/**
 * Helper to generate access and refresh tokens, and update the database with refresh token.
 */
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found during token generation');
    }

    const accessToken = user.generateAccessToken(config.accessTokenSecret, config.accessTokenExpiry);
    const refreshToken = user.generateRefreshToken(config.refreshTokenSecret, config.refreshTokenExpiry);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new Error(`Token generation failed: ${error.message}`);
  }
};

/**
 * Register User
 * POST /api/v1/auth/register
 */
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Validation check for required fields
    if (!name || !email || !password) {
      const error = new Error('Name, email, and password are required');
      error.statusCode = 400;
      return next(error);
    }

    // 2. Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      const error = new Error('Please provide a valid email address');
      error.statusCode = 400;
      return next(error);
    }

    // 3. Validate password length
    if (password.length < 6) {
      const error = new Error('Password must be at least 6 characters long');
      error.statusCode = 400;
      return next(error);
    }

    // 4. Validate role if provided
    const validRoles = ['Client', 'Freelancer', 'Admin'];
    if (role && !validRoles.includes(role)) {
      const error = new Error(`Invalid role. Allowed roles are: ${validRoles.join(', ')}`);
      error.statusCode = 400;
      return next(error);
    }

    // 5. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error('User with this email already exists');
      error.statusCode = 409;
      return next(error);
    }

    // 6. Create user in database (isVerified: false by default)
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'Client',
    });

    // 7. Generate email verification token and save
    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // 8. Dispatch verification email
    const backendUrl = `${req.protocol}://${req.get('host')}`;
    const verificationUrl = `${backendUrl}/api/v1/auth/verify-email?token=${verificationToken}`;
    await sendEmail({
      email: user.email,
      subject: 'Please verify your SkillSphere email address',
      html: `<h1>Welcome to SkillSphere!</h1>
             <p>Hi ${user.name},</p>
             <p>Thank you for registering. Please verify your email by clicking the link below:</p>
             <p><a href="${verificationUrl}">${verificationUrl}</a></p>
             <p>Note: This verification link expires in 15 minutes.</p>`,
    });

    // 9. Get user representation without sensitive fields
    const createdUser = await User.findById(user._id).select('-password -refreshToken -emailVerificationToken -emailVerificationExpiry');

    // 10. Return standardized response
    return res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email address.',
      data: createdUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login User
 * POST /api/v1/auth/login
 */
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validation check
    if (!email || !password) {
      const error = new Error('Email and password are required');
      error.statusCode = 400;
      return next(error);
    }

    // 2. Find user
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      return next(error);
    }

    // 3. Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      return next(error);
    }

    // 4. Verify email verification status
    if (!user.isVerified) {
      const error = new Error('Please verify your email before logging in');
      error.statusCode = 403; // Forbidden
      return next(error);
    }

    if (user.isSuspended) {
      const error = new Error('Your account has been suspended by an administrator.');
      error.statusCode = 403; // Forbidden
      return next(error);
    }

    // 5. Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      user.twoFactorCode = code;
      user.twoFactorCodeExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      await user.save({ validateBeforeSave: false });

      // Dispatch 2FA email
      await sendEmail({
        email: user.email,
        subject: 'Your SkillSphere 2FA Code',
        html: `<h1>SkillSphere 2FA Verification</h1>
               <p>Hi ${user.name},</p>
               <p>Your 2-Factor Authentication code is: <b>${code}</b></p>
               <p>Note: This code expires in 5 minutes.</p>`,
      });

      return res.status(200).json({
        success: true,
        message: '2FA code sent to your email. Please verify.',
        data: {
          is2FARequired: true,
          email: user.email,
        },
      });
    }

    // 6. Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // 7. Get user profile details
    const loggedInUser = await User.findById(user._id).select('-password -refreshToken -emailVerificationToken -emailVerificationExpiry -twoFactorCode -twoFactorCodeExpiry');

    // 8. Set cookies and send standardized response
    return res
      .status(200)
      .cookie('accessToken', accessToken, getCookieOptions())
      .cookie('refreshToken', refreshToken, getCookieOptions())
      .json({
        success: true,
        message: 'Logged in successfully',
        data: {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
      });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout User
 * POST /api/v1/auth/logout
 */
export const logoutUser = async (req, res, next) => {
  try {
    // 1. Clear the refresh token in database
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: { refreshToken: 1 },
      },
      { new: true }
    );

    // 2. Clear cookie values on client side
    return res
      .status(200)
      .clearCookie('accessToken', getCookieOptions())
      .clearCookie('refreshToken', getCookieOptions())
      .json({
        success: true,
        message: 'Logged out successfully',
        data: {},
      });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Access Token
 * POST /api/v1/auth/refresh-token
 */
export const refreshAccessToken = async (req, res, next) => {
  try {
    // 1. Get refresh token from cookie or request body
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
      const error = new Error('Refresh token is required');
      error.statusCode = 401;
      return next(error);
    }

    // 2. Verify token
    let decoded;
    try {
      decoded = jsonwebtoken.verify(incomingRefreshToken, config.refreshTokenSecret);
    } catch (err) {
      const error = new Error('Invalid or expired refresh token');
      error.statusCode = 401;
      return next(error);
    }

    // 3. Find the user in database
    const user = await User.findById(decoded._id);
    if (!user) {
      const error = new Error('Invalid refresh token. User not found');
      error.statusCode = 401;
      return next(error);
    }

    // 4. Validate matching token to prevent replay attacks
    if (incomingRefreshToken !== user.refreshToken) {
      const error = new Error('Refresh token is expired or already used');
      error.statusCode = 403;
      return next(error);
    }

    // 5. Generate rotated tokens
    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

    // 6. Return response
    return res
      .status(200)
      .cookie('accessToken', accessToken, getCookieOptions())
      .cookie('refreshToken', newRefreshToken, getCookieOptions())
      .json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken,
          refreshToken: newRefreshToken,
        },
      });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Email
 * GET /api/v1/auth/verify-email
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      const error = new Error('Verification token is required');
      error.statusCode = 400;
      return next(error);
    }

    // 1. Hash incoming token for comparison
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // 2. Query matching user with active expiry time
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: { $gt: Date.now() },
    });

    if (!user) {
      const error = new Error('Invalid or expired verification token');
      error.statusCode = 400;
      return next(error);
    }

    // 3. Update status and remove verification fields
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend Verification Email
 * POST /api/v1/auth/resend-verification
 */
export const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      const error = new Error('Email is required');
      error.statusCode = 400;
      return next(error);
    }

    // 1. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error('User not found with this email');
      error.statusCode = 404;
      return next(error);
    }

    // 2. Check verification status
    if (user.isVerified) {
      const error = new Error('Email is already verified');
      error.statusCode = 400;
      return next(error);
    }

    // 3. Re-generate token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // 4. Send link
    const backendUrl = `${req.protocol}://${req.get('host')}`;
    const verificationUrl = `${backendUrl}/api/v1/auth/verify-email?token=${verificationToken}`;
    await sendEmail({
      email: user.email,
      subject: 'Please verify your SkillSphere email address',
      html: `<h1>Welcome to SkillSphere!</h1>
             <p>Hi ${user.name},</p>
             <p>A new email verification link has been requested. Please click the link below to verify your email:</p>
             <p><a href="${verificationUrl}">${verificationUrl}</a></p>
             <p>Note: This verification link expires in 15 minutes.</p>`,
    });

    return res.status(200).json({
      success: true,
      message: 'Verification email resent successfully.',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot Password Request
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      const error = new Error('Email is required');
      error.statusCode = 400;
      return next(error);
    }

    // 1. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error('User not found with this email');
      error.statusCode = 404;
      return next(error);
    }

    // 2. Generate reset token and save
    const resetToken = user.generateForgotPasswordToken();
    await user.save({ validateBeforeSave: false });

    // 3. Send reset link
    const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;
    await sendEmail({
      email: user.email,
      subject: 'SkillSphere - Password Reset Request',
      html: `<h1>Password Reset Request</h1>
             <p>Hi ${user.name},</p>
             <p>We received a request to reset your password. Please click the link below to change your password:</p>
             <p><a href="${resetUrl}">${resetUrl}</a></p>
             <p>Note: This link will expire in 15 minutes.</p>
             <p>If you did not request this, you can safely ignore this email.</p>`,
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email address.',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset Password
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.query;
    const { newPassword } = req.body;

    if (!token || !newPassword) {
      const error = new Error('Token and new password are required');
      error.statusCode = 400;
      return next(error);
    }

    if (newPassword.length < 6) {
      const error = new Error('Password must be at least 6 characters long');
      error.statusCode = 400;
      return next(error);
    }

    // 1. Hash incoming token for comparison
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // 2. Query user with matching token and active expiry
    const user = await User.findOne({
      forgotPasswordToken: hashedToken,
      forgotPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      const error = new Error('Invalid or expired reset token');
      error.statusCode = 400;
      return next(error);
    }

    // 3. Change password (this automatically triggers Mongoose pre-save password hashing hook)
    user.password = newPassword;
    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiry = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in.',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Google OAuth Callback Handler
 * Handles post-login token creation, cookie setting, and redirection.
 */
export const googleCallback = async (req, res, next) => {
  try {
    if (!req.user) {
      const error = new Error('Google authentication failed. User not authenticated.');
      error.statusCode = 401;
      return next(error);
    }

    // 1. Generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(req.user._id);

    // 2. Set tokens in secure HTTP-only cookies and redirect to frontend homepage with query token
    return res
      .cookie('accessToken', accessToken, getCookieOptions())
      .cookie('refreshToken', refreshToken, getCookieOptions())
      .redirect(`${config.clientUrl}/login?token=${accessToken}`);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Current Logged-in User Profile
 * GET /api/v1/auth/me
 */
export const getCurrentUser = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Current user profile retrieved successfully',
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify 2FA OTP Code
 * POST /api/v1/auth/verify-2fa
 */
export const verify2FA = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      const error = new Error('Email and 2FA code are required');
      error.statusCode = 400;
      return next(error);
    }

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    if (!user.twoFactorCode || user.twoFactorCode !== code) {
      const error = new Error('Invalid 2FA verification code');
      error.statusCode = 400;
      return next(error);
    }

    if (new Date() > user.twoFactorCodeExpiry) {
      const error = new Error('2FA verification code has expired');
      error.statusCode = 400;
      return next(error);
    }

    // Reset code
    user.twoFactorCode = undefined;
    user.twoFactorCodeExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select('-password -refreshToken -emailVerificationToken -emailVerificationExpiry -twoFactorCode -twoFactorCodeExpiry');

    return res
      .status(200)
      .cookie('accessToken', accessToken, getCookieOptions())
      .cookie('refreshToken', refreshToken, getCookieOptions())
      .json({
        success: true,
        message: '2FA verification successful',
        data: {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
      });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle 2FA State (Enable/Disable)
 * POST /api/v1/auth/toggle-2fa
 */
export const toggle2FA = async (req, res, next) => {
  try {
    const { enabled } = req.body;

    if (enabled === undefined) {
      const error = new Error('Enabled flag is required');
      error.statusCode = 400;
      return next(error);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    user.twoFactorEnabled = !!enabled;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: `2-Factor Authentication has been ${enabled ? 'enabled' : 'disabled'} successfully.`,
      data: {
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Quick Verify Email (Development Bypass)
 * POST /api/v1/auth/quick-verify
 */
export const quickVerifyEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      const error = new Error('Email is required');
      error.statusCode = 400;
      return next(error);
    }

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: `Account ${email} has been verified successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mock Google Login (Development/Demo Helper)
 * GET /api/v1/auth/google-mock
 */
export const googleMock = async (req, res, next) => {
  try {
    const email = 'google.test@skillsphere.com';
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: 'Google Test User',
        email,
        password: crypto.randomBytes(20).toString('hex'),
        role: 'Client',
        isVerified: true,
      });
    }

    const { accessToken } = await generateAccessAndRefreshTokens(user._id);

    return res.redirect(`${config.clientUrl}/login?token=${accessToken}`);
  } catch (error) {
    next(error);
  }
};
