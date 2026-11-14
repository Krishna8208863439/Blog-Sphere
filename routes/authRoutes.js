/**
 * Auth routes — /api/auth/*
 */
'use strict';

const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  resetPassword,
  checkEmail,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

const {
  validate,
  registerRules,
  loginRules,
  profileRules,
  passwordChangeRules,
  passwordResetRules,
} = require('../middleware/validationMiddleware');

// ── Public routes ──────────────────────────────────────────────────────────
router.post('/register',      registerRules,       validate, register);
router.post('/login',         loginRules,          validate, login);
router.post('/check-email',                                  checkEmail);
router.post('/reset-password', passwordResetRules, validate, resetPassword);

// ── Protected routes ───────────────────────────────────────────────────────
router.get('/me',             protect,                       getMe);
router.patch('/profile',      protect, profileRules,         validate, updateProfile);
router.patch('/change-password', protect, passwordChangeRules, validate, changePassword);

module.exports = router;
