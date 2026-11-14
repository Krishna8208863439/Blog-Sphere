/**
 * express-validator rule sets and the shared result checker.
 */
'use strict';

const { body, validationResult } = require('express-validator');

/**
 * Run after a rule array and short-circuit with 400 if any rule failed.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  // Build a field → message map matching the frontend expectation
  const fieldErrors = {};
  errors.array().forEach((e) => {
    if (!fieldErrors[e.path]) fieldErrors[e.path] = e.msg;
  });

  return res.status(400).json({
    success: false,
    message: errors.array()[0].msg,
    errors: fieldErrors,
  });
};

// ── Registration rules ────────────────────────────────────────────────────
const registerRules = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required.')
    .matches(/^[A-Za-z][A-Za-z .'-]{1,59}$/)
    .withMessage('Use letters, spaces, hyphens, or apostrophes (2–60 characters).'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('username')
    .trim()
    .notEmpty().withMessage('Username is required.')
    .matches(/^[a-zA-Z0-9_]{3,20}$/)
    .withMessage('Use 3–20 letters, numbers, or underscores.'),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Use at least 8 characters.')
    .isLength({ max: 72 }).withMessage('Use 72 characters or fewer.')
    .matches(/[A-Za-z]/).withMessage('Include at least one letter.')
    .matches(/\d/).withMessage('Include at least one number.'),

  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password.')
    .custom((val, { req }) => {
      if (val !== req.body.password) throw new Error('Passwords do not match.');
      return true;
    }),
];

// ── Login rules ────────────────────────────────────────────────────────────
const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

// ── Blog create / update rules ─────────────────────────────────────────────
const CATEGORIES = ['Technology', 'AI', 'Programming', 'Lifestyle', 'Education'];

const blogRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Blog title is required.')
    .isLength({ min: 4 }).withMessage('Title must be at least 4 characters.')
    .isLength({ max: 140 }).withMessage('Title cannot exceed 140 characters.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Description cannot exceed 300 characters.'),

  body('category')
    .trim()
    .notEmpty().withMessage('Category is required.')
    .isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}.`),

  body('status')
    .optional()
    .isIn(['draft', 'published']).withMessage('Status must be draft or published.'),
];

const blogPublishRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Blog title is required.')
    .isLength({ min: 4 }).withMessage('Title must be at least 4 characters.')
    .isLength({ max: 140 }).withMessage('Title cannot exceed 140 characters.'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required when publishing.')
    .isLength({ min: 20 }).withMessage('Add at least 20 characters for the description.')
    .isLength({ max: 300 }).withMessage('Description cannot exceed 300 characters.'),

  body('category')
    .trim()
    .notEmpty().withMessage('Category is required.')
    .isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}.`),
];

// ── Profile update rules ───────────────────────────────────────────────────
const profileRules = [
  body('fullName')
    .optional()
    .trim()
    .matches(/^[A-Za-z][A-Za-z .'-]{1,59}$/)
    .withMessage('Use letters, spaces, hyphens, or apostrophes (2–60 characters).'),

  body('username')
    .optional()
    .trim()
    .matches(/^[a-zA-Z0-9_]{3,20}$/)
    .withMessage('Use 3–20 letters, numbers, or underscores.'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 280 }).withMessage('Bio cannot exceed 280 characters.'),
];

// ── Password change rules ──────────────────────────────────────────────────
const passwordChangeRules = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required.'),

  body('newPassword')
    .notEmpty().withMessage('New password is required.')
    .isLength({ min: 8 }).withMessage('Use at least 8 characters.')
    .isLength({ max: 72 }).withMessage('Use 72 characters or fewer.')
    .matches(/[A-Za-z]/).withMessage('Include at least one letter.')
    .matches(/\d/).withMessage('Include at least one number.'),

  body('confirmPassword')
    .notEmpty().withMessage('Please confirm the new password.')
    .custom((val, { req }) => {
      if (val !== req.body.newPassword) throw new Error('Passwords do not match.');
      return true;
    }),
];

// ── Password reset (forgot password) rules ────────────────────────────────
const passwordResetRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('newPassword')
    .notEmpty().withMessage('New password is required.')
    .isLength({ min: 8 }).withMessage('Use at least 8 characters.')
    .isLength({ max: 72 }).withMessage('Use 72 characters or fewer.')
    .matches(/[A-Za-z]/).withMessage('Include at least one letter.')
    .matches(/\d/).withMessage('Include at least one number.'),

  body('confirmPassword')
    .notEmpty().withMessage('Please confirm the new password.')
    .custom((val, { req }) => {
      if (val !== req.body.newPassword) throw new Error('Passwords do not match.');
      return true;
    }),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  blogRules,
  blogPublishRules,
  profileRules,
  passwordChangeRules,
  passwordResetRules,
};
