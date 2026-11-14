/**
 * Global error handling middleware.
 * Catches all errors forwarded via next(error) and returns
 * a consistent JSON response.
 */
'use strict';

/**
 * 404 — Route not found.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * General error handler.
 */
const errorHandler = (err, req, res, _next) => {
  // Default to 500 unless the response already has a code set
  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'An unexpected error occurred.';

  // ── Mongoose: bad ObjectId ────────────────────────────────────────────
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found.';
  }

  // ── Mongoose: unique constraint violation ─────────────────────────────
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    const labels = { email: 'email address', username: 'username' };
    message = `That ${labels[field] || field} is already in use.`;
  }

  // ── Mongoose: validation error ────────────────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    // Collect all field messages into a single string
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join(' ');
  }

  // ── JWT errors (should be caught in middleware, but just in case) ─────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please sign in again.';
  }

  const body = {
    success: false,
    message,
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };
