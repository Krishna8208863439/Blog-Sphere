/**
 * Authentication controller.
 * Handles: register, login, getMe, updateProfile,
 *          changePassword, resetPassword, checkEmail.
 */
'use strict';

const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');

// ── Helper: format user for response (never expose password) ─────────────
const formatUser = (user) => ({
  id: user._id.toString(),
  fullName: user.fullName,
  email: user.email,
  username: user.username,
  bio: user.bio || '',
  createdAt: user.createdAt,
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/auth/register
// ═════════════════════════════════════════════════════════════════════════════
const register = async (req, res, next) => {
  try {
    const { fullName, email, username, password } = req.body;

    // Check for duplicate email
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
        errors: { email: 'An account with this email already exists.' },
      });
    }

    // Check for duplicate username
    const usernameExists = await User.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') },
    });
    if (usernameExists) {
      return res.status(400).json({
        success: false,
        message: 'This username is already taken.',
        errors: { username: 'This username is already taken.' },
      });
    }

    // Create user (password is hashed in pre-save hook on the model)
    const user = await User.create({ fullName, email, username, password, bio: '' });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: { user: formatUser(user) },
    });
  } catch (error) {
    next(error);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ═════════════════════════════════════════════════════════════════════════════
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and explicitly select password (excluded by default)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email or password is incorrect.',
      });
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email or password is incorrect.',
      });
    }

    const token = generateToken(user._id.toString());

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.fullName.split(' ')[0]}.`,
      data: {
        token,
        user: formatUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/auth/me  (protected)
// ═════════════════════════════════════════════════════════════════════════════
const getMe = async (req, res, next) => {
  try {
    // req.user is set by protect middleware
    return res.status(200).json({
      success: true,
      data: { user: formatUser(req.user) },
    });
  } catch (error) {
    next(error);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// PATCH /api/auth/profile  (protected)
// Update fullName, username, bio
// ═════════════════════════════════════════════════════════════════════════════
const updateProfile = async (req, res, next) => {
  try {
    const { fullName, username, bio } = req.body;
    const userId = req.user._id;

    // Check username uniqueness if changed
    if (username && username !== req.user.username) {
      const taken = await User.findOne({
        _id: { $ne: userId },
        username: { $regex: new RegExp(`^${username}$`, 'i') },
      });
      if (taken) {
        return res.status(400).json({
          success: false,
          message: 'This username is already taken.',
          errors: { username: 'This username is already taken.' },
        });
      }
    }

    const updates = {};
    if (fullName !== undefined) updates.fullName = fullName;
    if (username !== undefined) updates.username = username;
    if (bio !== undefined) updates.bio = bio;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated.',
      data: { user: formatUser(user) },
    });
  } catch (error) {
    next(error);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// PATCH /api/auth/change-password  (protected)
// ═════════════════════════════════════════════════════════════════════════════
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Reload with password
    const user = await User.findById(req.user._id).select('+password');
    const match = await user.comparePassword(currentPassword);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'That is not your current password.',
        errors: { currentPassword: 'That is not your current password.' },
      });
    }

    user.password = newPassword; // pre-save hook hashes it
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated.',
    });
  } catch (error) {
    next(error);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// Inline password reset (simulates "forgot password" for a local app)
// Body: { email, newPassword, confirmPassword }
// ═════════════════════════════════════════════════════════════════════════════
const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'We could not find an account with that email.',
        errors: { email: 'We could not find an account with that email.' },
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated. You can sign in now.',
    });
  } catch (error) {
    next(error);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/auth/check-email
// Check if an email is registered (used by forgot-password step 1)
// Body: { email }
// ═════════════════════════════════════════════════════════════════════════════
const checkEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    return res.status(200).json({
      success: true,
      data: { exists: Boolean(user) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  resetPassword,
  checkEmail,
};
