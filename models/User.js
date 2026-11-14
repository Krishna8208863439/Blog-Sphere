/**
 * User model — stores account data.
 * Passwords are hashed with bcryptjs before saving.
 * Password field is excluded from all queries by default.
 */
'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required.'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters.'],
      maxlength: [60, 'Full name cannot exceed 60 characters.'],
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'],
    },
    username: {
      type: String,
      required: [true, 'Username is required.'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters.'],
      maxlength: [20, 'Username cannot exceed 20 characters.'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores.'],
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      minlength: [8, 'Password must be at least 8 characters.'],
      select: false, // never returned in queries unless explicitly requested
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: [280, 'Bio cannot exceed 280 characters.'],
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Hash password before saving ────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  // Only hash when password field has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ─── Instance method: compare plaintext password with stored hash ─────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ─── Virtual: expose _id as id (matches frontend expectation) ────────────
userSchema.virtual('id').get(function () {
  return this._id.toString();
});

module.exports = mongoose.model('User', userSchema);
