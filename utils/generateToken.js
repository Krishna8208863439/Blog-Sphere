/**
 * JWT generation and verification utilities.
 */
'use strict';

const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT for the given user ID.
 * @param {string} userId - MongoDB ObjectId as string
 * @returns {string} Signed JWT
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Verify a JWT and return its decoded payload.
 * @param {string} token
 * @returns {{ id: string, iat: number, exp: number }}
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
