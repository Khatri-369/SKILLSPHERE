import jsonwebtoken from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/user.model.js';

export const verifyJWT = async (req, res, next) => {
  try {
    // 1. Get access token from either cookies or HTTP Authorization header
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace(/^Bearer\s+/, '');

    if (!token) {
      const error = new Error('Access denied. No token provided.');
      error.statusCode = 401;
      return next(error);
    }

    // 2. Verify token content (explicitly checking valid algorithms to prevent confusion/override attacks)
    const decoded = jsonwebtoken.verify(token, config.accessTokenSecret, {
      algorithms: ['HS256'],
    });

    // 3. Find the user in the database
    const user = await User.findById(decoded._id).select('-password -refreshToken');
    if (!user) {
      const error = new Error('Invalid token. User not found.');
      error.statusCode = 401;
      return next(error);
    }

    if (user.isSuspended) {
      const error = new Error('Access denied. Your account has been suspended.');
      error.statusCode = 403;
      return next(error);
    }

    // 4. Attach user object to request
    req.user = user;
    next();
  } catch (error) {
    const err = new Error(error.message || 'Unauthorized access token.');
    err.statusCode = 401;
    next(err);
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access to endpoints based on user roles (Client, Freelancer, Admin)
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Ensure verifyJWT middleware was run first and user is attached
    if (!req.user) {
      const error = new Error('Unauthorized. User details not found.');
      error.statusCode = 401;
      return next(error);
    }

    // 2. Check if user's role is authorized
    if (!allowedRoles.includes(req.user.role)) {
      const error = new Error(`Access denied. Role '${req.user.role}' is not authorized to access this resource.`);
      error.statusCode = 403; // Forbidden
      return next(error);
    }

    next();
  };
};
