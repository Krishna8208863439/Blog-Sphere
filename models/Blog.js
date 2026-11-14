/**
 * Blog model — stores stories with full content, metadata, and likes.
 */
'use strict';

const mongoose = require('mongoose');

const CATEGORIES = ['Technology', 'AI', 'Programming', 'Lifestyle', 'Education'];

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required.'],
      trim: true,
      minlength: [4, 'Title must be at least 4 characters.'],
      maxlength: [140, 'Title cannot exceed 140 characters.'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters.'],
    },
    content: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required.'],
      enum: {
        values: CATEGORIES,
        message: `Category must be one of: ${CATEGORIES.join(', ')}.`,
      },
    },
    image: {
      type: String,
      default: '',
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required.'],
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published'],
        message: 'Status must be draft or published.',
      },
      default: 'draft',
    },
    featured: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    // likes — array of user/guest ID strings
    likes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: expose _id as id ────────────────────────────────────────────
blogSchema.virtual('id').get(function () {
  return this._id.toString();
});

// ─── Virtual: likes count ────────────────────────────────────────────────
blogSchema.virtual('likesCount').get(function () {
  return (this.likes || []).length;
});

// ─── Indexes for common query patterns ───────────────────────────────────
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ author: 1, updatedAt: -1 });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ title: 'text', description: 'text', content: 'text' });

module.exports = mongoose.model('Blog', blogSchema);
