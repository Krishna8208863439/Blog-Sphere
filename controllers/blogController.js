/**
 * Blog controller.
 * Full CRUD + publish/draft toggle + like toggle.
 * All responses follow the { success, message, data } envelope.
 */
'use strict';

const mongoose = require('mongoose');
const Blog = require('../models/Blog');

const COVER_MAP = {
  Technology: 'assets/images/cover-technology.svg',
  AI: 'assets/images/cover-ai.svg',
  'Artificial Intelligence': 'assets/images/cover-ai.svg',
  Programming: 'assets/images/cover-programming.svg',
  'Web Development': 'assets/images/cover-programming.svg',
  'Data Science': 'assets/images/cover-technology.svg',
  Lifestyle: 'assets/images/cover-lifestyle.svg',
  Education: 'assets/images/cover-education.svg',
  Business: 'assets/images/cover-technology.svg',
};

/** Convert a Mongoose Blog document to the shape the frontend expects. */
const formatBlog = (blog, actorId) => {
  const authorId = blog.author?._id
    ? blog.author._id.toString()
    : (blog.author || '').toString();

  return {
    id: blog._id.toString(),
    authorId,
    author: blog.author?.fullName
      ? {
          id: authorId,
          fullName: blog.author.fullName,
          username: blog.author.username,
          bio: blog.author.bio || '',
        }
      : undefined,
    title: blog.title,
    description: blog.description || '',
    content: blog.content || '',
    category: blog.category,
    image: blog.image || COVER_MAP[blog.category] || COVER_MAP.Technology,
    featured: Boolean(blog.featured),
    status: blog.status,
    publishedAt: blog.publishedAt || null,
    createdAt: blog.createdAt,
    updatedAt: blog.updatedAt,
    likesCount: (blog.likes || []).length,
    liked: actorId ? (blog.likes || []).includes(String(actorId)) : false,
  };
};

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/blogs          — Create blog (auth required)
// ═════════════════════════════════════════════════════════════════════════════
const createBlog = async (req, res, next) => {
  try {
    const { title, description, content, category, image, featured, status } = req.body;
    const resolvedStatus = status === 'published' ? 'published' : 'draft';

    const blog = await Blog.create({
      title,
      description: description || '',
      content: content || '',
      category,
      image: image || COVER_MAP[category] || '',
      featured: Boolean(featured) && resolvedStatus === 'published',
      author: req.user._id,
      status: resolvedStatus,
      publishedAt: resolvedStatus === 'published' ? new Date() : null,
    });

    // Populate author for the response
    await blog.populate('author', 'fullName username bio');

    const actorId = req.user._id.toString();
    return res.status(201).json({
      success: true,
      message:
        resolvedStatus === 'published'
          ? 'Blog published successfully.'
          : 'Draft saved.',
      data: { blog: formatBlog(blog, actorId) },
    });
  } catch (error) {
    next(error);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/blogs           — All published blogs (public, with filters)
// Query params: q / search, category, page, limit
// ═════════════════════════════════════════════════════════════════════════════
const getPublishedBlogs = async (req, res, next) => {
  try {
    const { q, search, category, page = 1, limit = 9 } = req.query;
    const actorId = req.user ? req.user._id.toString() : (req.guestId || '');

    const filter = { status: 'published' };
    
    // Category filter: support category, handle 'All' or 'all'
    if (category && category !== 'All' && category !== 'all') {
      if (category === 'Artificial Intelligence') {
        filter.category = { $in: ['Artificial Intelligence', 'AI'] };
      } else if (category === 'AI') {
        filter.category = { $in: ['Artificial Intelligence', 'AI'] };
      } else {
        filter.category = category;
      }
    }

    // Search query: support both `search` and `q` parameters
    const searchTerm = (search || q || '').trim();
    if (searchTerm) {
      // Regex case-insensitive search across title, description, content
      const searchRegex = new RegExp(searchTerm.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      filter.$or = [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { content: { $regex: searchRegex } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 9);
    const skip = (pageNum - 1) * limitNum;

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .populate('author', 'fullName username bio')
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      Blog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        blogs: blogs.map((b) => formatBlog(b, actorId)),
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/blogs/my-blogs  — Logged-in user's blogs (all statuses)
// Query params: status, category, q, search, page, limit
// ═════════════════════════════════════════════════════════════════════════════
const getMyBlogs = async (req, res, next) => {
  try {
    const { status, category, q, search, page = 1, limit = 50 } = req.query;
    const actorId = req.user._id.toString();

    const filter = { author: req.user._id };
    if (status && status !== 'all' && status !== 'All') filter.status = status;
    if (category && category !== 'all' && category !== 'All') {
      if (category === 'Artificial Intelligence' || category === 'AI') {
        filter.category = { $in: ['Artificial Intelligence', 'AI'] };
      } else {
        filter.category = category;
      }
    }

    const searchTerm = (search || q || '').trim();
    if (searchTerm) {
      const searchRegex = new RegExp(searchTerm.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      filter.$or = [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { content: { $regex: searchRegex } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const skip = (pageNum - 1) * limitNum;

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .populate('author', 'fullName username bio')
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      Blog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        blogs: blogs.map((b) => formatBlog(b, actorId)),
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/blogs/:id       — Single blog (public; draft only for owner)
// ═════════════════════════════════════════════════════════════════════════════
const getBlog = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog ID format.' });
    }

    const blog = await Blog.findById(req.params.id)
      .populate('author', 'fullName username bio')
      .lean({ virtuals: true });

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found.' });
    }

    // Draft — only visible to the author
    const meId = req.user ? req.user._id.toString() : null;
    const authorId = blog.author?._id
      ? blog.author._id.toString()
      : blog.author?.toString();

    if (blog.status === 'draft' && authorId !== meId) {
      return res.status(403).json({
        success: false,
        message: 'This story is a draft and only visible to its author.',
      });
    }

    const actorId = meId || (req.guestId || '');

    return res.status(200).json({
      success: true,
      data: { blog: formatBlog(blog, actorId) },
    });
  } catch (error) {
    next(error);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// PUT /api/blogs/:id       — Update blog (owner only)
// ═════════════════════════════════════════════════════════════════════════════
const updateBlog = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog ID format.' });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found.' });
    }

    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only edit your own stories.',
      });
    }

    const { title, description, content, category, image, featured, status } = req.body;
    const resolvedStatus = status === 'published' ? 'published' : 'draft';

    blog.title = title ?? blog.title;
    blog.description = description ?? blog.description;
    blog.content = content ?? blog.content;
    blog.category = category ?? blog.category;
    blog.image = image !== undefined ? image : blog.image;
    blog.featured = Boolean(featured) && resolvedStatus === 'published';
    blog.status = resolvedStatus;

    // Set publishedAt only on first publish; clear it when moving back to draft
    if (resolvedStatus === 'published' && !blog.publishedAt) {
      blog.publishedAt = new Date();
    } else if (resolvedStatus === 'draft') {
      blog.publishedAt = null;
    }

    await blog.save();
    await blog.populate('author', 'fullName username bio');

    const actorId = req.user._id.toString();
    return res.status(200).json({
      success: true,
      message:
        resolvedStatus === 'published'
          ? 'Blog updated successfully.'
          : 'Draft saved successfully.',
      data: { blog: formatBlog(blog.toObject({ virtuals: true }), actorId) },
    });
  } catch (error) {
    next(error);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// DELETE /api/blogs/:id    — Delete blog (owner only)
// ═════════════════════════════════════════════════════════════════════════════
const deleteBlog = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog ID format.' });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found.' });
    }

    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only delete your own stories.',
      });
    }

    await Blog.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Blog deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// PATCH /api/blogs/:id/publish  — Publish a draft (owner only)
// ═════════════════════════════════════════════════════════════════════════════
const publishBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found.' });
    }
    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only publish your own stories.' });
    }
    if (blog.status === 'published') {
      return res.status(400).json({ success: false, message: 'Story is already published.' });
    }

    blog.status = 'published';
    if (!blog.publishedAt) blog.publishedAt = new Date();
    await blog.save();
    await blog.populate('author', 'fullName username bio');

    return res.status(200).json({
      success: true,
      message: 'Story published.',
      data: { blog: formatBlog(blog.toObject({ virtuals: true }), req.user._id.toString()) },
    });
  } catch (error) {
    next(error);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// PATCH /api/blogs/:id/draft   — Move published blog back to draft (owner)
// ═════════════════════════════════════════════════════════════════════════════
const moveToDraft = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found.' });
    }
    if (blog.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only edit your own stories.' });
    }

    blog.status = 'draft';
    blog.publishedAt = null;
    blog.featured = false;
    await blog.save();
    await blog.populate('author', 'fullName username bio');

    return res.status(200).json({
      success: true,
      message: 'Story moved to drafts.',
      data: { blog: formatBlog(blog.toObject({ virtuals: true }), req.user._id.toString()) },
    });
  } catch (error) {
    next(error);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/blogs/:id/like — Toggle like (any actor: user or guest)
// Body: { actorId: string }   (guest ID or user ID from frontend)
// ═════════════════════════════════════════════════════════════════════════════
const toggleLike = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog || blog.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Blog not found.' });
    }

    // Actor = logged-in user ID or guest ID sent from frontend
    const actorId =
      (req.user ? req.user._id.toString() : null) ||
      (req.body.actorId ? String(req.body.actorId) : null);

    if (!actorId) {
      return res.status(400).json({ success: false, message: 'Actor ID is required.' });
    }

    const liked = blog.likes.includes(actorId);
    if (liked) {
      blog.likes = blog.likes.filter((id) => id !== actorId);
    } else {
      blog.likes.push(actorId);
    }
    await blog.save();

    return res.status(200).json({
      success: true,
      data: {
        liked: !liked,
        likesCount: blog.likes.length,
        blogId: blog._id.toString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/blogs/upload-image  — Upload featured image (auth required)
// Field: image (single file)
// ═════════════════════════════════════════════════════════════════════════════
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided.' });
    }

    // Build the public URL for the uploaded file
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      message: 'Image uploaded.',
      data: { imageUrl },
    });
  } catch (error) {
    next(error);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/blogs/stats  — Counts for the logged-in user's dashboard
// ═════════════════════════════════════════════════════════════════════════════
const getStats = async (req, res, next) => {
  try {
    const authorId = req.user._id;
    const [total, published, drafts] = await Promise.all([
      Blog.countDocuments({ author: authorId }),
      Blog.countDocuments({ author: authorId, status: 'published' }),
      Blog.countDocuments({ author: authorId, status: 'draft' }),
    ]);
    return res.status(200).json({
      success: true,
      data: { total, published, drafts },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
