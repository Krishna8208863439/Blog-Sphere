/**
 * User routes — /api/users/*
 * Provides RESTful user endpoints requested:
 * GET   /api/users/profile
 * PUT   /api/users/profile
 * PATCH /api/users/change-password
 */
'use strict';

const express = require('express');
const router = express.Router();

const {
  getMe,
  updateProfile,
  changePassword,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');
const {
  validate,
  profileRules,
  passwordChangeRules,
} = require('../middleware/validationMiddleware');

router.get('/profile', protect, getMe);
router.put('/profile', protect, profileRules, validate, updateProfile);
router.patch('/profile', protect, profileRules, validate, updateProfile);
router.patch('/change-password', protect, passwordChangeRules, validate, changePassword);

module.exports = router;
