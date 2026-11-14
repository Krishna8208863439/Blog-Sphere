/**
 * Authentication middleware.
 * Verifies the JWT from the Authorization header.
 * - protect: requires a valid token; attaches req.user
 * - optionalAuth: attaches req.user if token present; never blocks the request
 */
'use strict';

const { verifyToken } = require('../utils/generateToken');
const User = require('../models/User');

/**
 * Require a valid JWT.
 * Sends 401 if the token is missing, expired, or invalid.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated. Please sign in.',
      });
    }

    // Verify signature and expiry
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Your session has expired. Please sign in again.'
          : 'Invalid token. Please sign in again.';
      return res.status(401).json({ success: false, message });
    }

    // Load fresh user (excludes password by default via schema select:false)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The account for this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Attach req.user if a valid token is present, but never block the request.
 * Used for public routes that have optional owner-specific behavior (e.g. like state).
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return next();

    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      if (user) req.user = user;
    } catch (_) {
      // Invalid/expired token on a public route — ignore silently
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { protect, optionalAuth };
