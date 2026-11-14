/**
 * Blog routes — /api/blogs/*
 */
'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const {
  createBlog,
  getPublishedBlogs,
  getMyBlogs,
  getBlog,
  updateBlog,
  deleteBlog,
  publishBlog,
  moveToDraft,
  toggleLike,
  uploadImage,
  getStats,
} = require('../controllers/blogController');

const { protect, optionalAuth } = require('../middleware/authMiddleware');
const {
  validate,
  blogRules,
  blogPublishRules,
} = require('../middleware/validationMiddleware');

// ── Multer configuration for image uploads ───────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /^image\/(jpeg|jpg|png|gif|webp|svg\+xml)$/;
  if (allowed.test(file.mimetype)) return cb(null, true);
  cb(new Error('Only image files (jpg, png, gif, webp, svg) are allowed.'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
});

// ── Middleware to attach guestId from request body ───────────────────────
// Reads req.headers['x-guest-id'] and attaches to req for controllers
router.use((req, res, next) => {
  req.guestId = req.headers['x-guest-id'] || '';
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────

// Public — authenticated users get extra like state info
router.get('/',          optionalAuth, getPublishedBlogs);
router.get('/my-blogs',  protect,      getMyBlogs);       // must come BEFORE /:id
router.get('/stats',     protect,      getStats);         // must come BEFORE /:id
router.get('/:id',       optionalAuth, getBlog);

// Protected — create
router.post('/',       protect, blogRules, validate, createBlog);

// Protected — update / delete
router.put('/:id',     protect, blogRules, validate, updateBlog);
router.delete('/:id',  protect, deleteBlog);

// Protected — status transitions
router.patch('/:id/publish', protect, publishBlog);
router.patch('/:id/draft',   protect, moveToDraft);

// Public — likes (actor ID passed in body)
router.post('/:id/like', optionalAuth, toggleLike);

// Protected — image upload
router.post('/upload-image', protect, upload.single('image'), uploadImage);

module.exports = router;
