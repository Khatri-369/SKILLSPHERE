import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import jsonwebtoken from 'jsonwebtoken';
import crypto from 'crypto';
import cacheService from '../services/cache.service.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    role: {
      type: String,
      enum: ['Client', 'Freelancer', 'Admin'],
      default: 'Client',
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationExpiry: {
      type: Date,
    },
    forgotPasswordToken: {
      type: String,
    },
    forgotPasswordExpiry: {
      type: Date,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorCode: {
      type: String,
    },
    twoFactorCodeExpiry: {
      type: Date,
    },
    avatar: {
      type: String,
      default: '',
    },
    resume: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
    },
    skills: [
      {
        type: String,
      },
    ],
    location: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    experience: [
      {
        title: String,
        company: String,
        startDate: Date,
        endDate: Date,
        current: { type: Boolean, default: false },
        description: String,
      },
    ],
    education: [
      {
        school: String,
        degree: String,
        fieldOfStudy: String,
        startDate: Date,
        endDate: Date,
        description: String,
      },
    ],
    portfolio: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving to the database
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password during login
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

// Instance method to sign Access Token
userSchema.methods.generateAccessToken = function (secret, expiry) {
  return jsonwebtoken.sign(
    {
      _id: this._id,
      email: this.email,
      role: this.role,
    },
    secret,
    {
      expiresIn: expiry,
    }
  );
};

// Instance method to sign Refresh Token
userSchema.methods.generateRefreshToken = function (secret, expiry) {
  return jsonwebtoken.sign(
    {
      _id: this._id,
    },
    secret,
    {
      expiresIn: expiry,
    }
  );
};

// Instance method to generate and hash email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  // 1. Generate a raw random token
  const rawVerificationToken = crypto.randomBytes(32).toString('hex');

  // 2. Store the hashed version of the token for DB security
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(rawVerificationToken)
    .digest('hex');

  // 3. Set the expiry to 15 minutes from now
  this.emailVerificationExpiry = Date.now() + 15 * 60 * 1000;

  // 4. Return the raw token so it can be emailed to the user
  return rawVerificationToken;
};

// Instance method to generate and hash forgot password token
userSchema.methods.generateForgotPasswordToken = function () {
  // 1. Generate a raw random token
  const rawResetToken = crypto.randomBytes(32).toString('hex');

  // 2. Store the hashed version of the token for DB security
  this.forgotPasswordToken = crypto
    .createHash('sha256')
    .update(rawResetToken)
    .digest('hex');

  // 3. Set the expiry to 15 minutes from now
  this.forgotPasswordExpiry = Date.now() + 15 * 60 * 1000;

  // 4. Return the raw token so it can be emailed to the user
  return rawResetToken;
};

userSchema.post('save', function (doc) {
  cacheService.del('admin:analytics');
  cacheService.del(`analytics:freelancer:${doc._id}`);
  cacheService.del(`analytics:client:${doc._id}`);
});

userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);
export default User;
