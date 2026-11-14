/**
 * BlogSphere — Backend API Layer
 *
 * Replaces BlogStore localStorage operations with real REST API calls.
 * Keeps the same BlogStore interface so existing JS (auth.js, blogs.js,
 * dashboard.js, main.js) continues to work without changes.
 *
 * Token storage mirrors the original session strategy:
 *   remember=true  → localStorage key   blogsphere_token
 *   remember=false → sessionStorage key blogsphere_token
 *
 * User profile is cached in localStorage for synchronous reads
 * (BlogStore.currentUser() must stay synchronous for the boot sequence).
 */
'use strict';

const API_BASE = 'http://localhost:5000/api';
const TOKEN_KEY = 'blogsphere_token';
const USER_KEY  = 'blogsphere_user';

// ── Low-level fetch wrapper ───────────────────────────────────────────────

/**
 * @param {string} path   e.g. '/auth/login'
 * @param {RequestInit} options
 * @returns {Promise<{ success, message, data?, errors? }>}
 */
async function apiFetch(path, options = {}) {
  const token = getStoredToken();
  const guestId = getGuestId();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (guestId) headers['X-Guest-Id'] = guestId;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
    const json = await res.json();
    return json;
  } catch (err) {
    return { success: false, message: 'Network error. Is the server running?' };
  }
}

// ── Token helpers ─────────────────────────────────────────────────────────

function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
}

function storeToken(token, remember) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}

function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

// ── User cache helpers ────────────────────────────────────────────────────

function cacheUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

function getCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

// ── Guest ID (for anonymous likes) ───────────────────────────────────────

function getGuestId() {
  let id = localStorage.getItem('blogsphere_guest');
  if (!id) {
    id = `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('blogsphere_guest', id);
  }
  return id;
}

// ── Theme helpers (stays local, no API needed) ────────────────────────────

function getTheme() {
  return localStorage.getItem('blogsphere_theme') === 'dark' ? 'dark' : 'light';
}

function setTheme(theme) {
  localStorage.setItem('blogsphere_theme', theme === 'dark' ? 'dark' : 'light');
}

// ── Cover fallback map ────────────────────────────────────────────────────

const COVER_MAP = {
  Technology: 'assets/images/cover-technology.svg',
  AI:         'assets/images/cover-ai.svg',
  Programming:'assets/images/cover-programming.svg',
  Lifestyle:  'assets/images/cover-lifestyle.svg',
  Education:  'assets/images/cover-education.svg',
};

function coverFor(category) {
  return COVER_MAP[category] || COVER_MAP.Technology;
}

// ═════════════════════════════════════════════════════════════════════════════
// BlogStore — public interface (matches original localStorage API)
// All async methods return a Promise; synchronous ones stay synchronous.
// ═════════════════════════════════════════════════════════════════════════════

const BlogStore = {
  CATEGORIES: ['Technology', 'AI', 'Programming', 'Lifestyle', 'Education'],

  coverFor,
  getTheme,
  setTheme,
  guestId: getGuestId,

  // ── Session helpers ──────────────────────────────────────────────────

  /** Synchronous — reads from cache; set after login */
  currentUser() {
    if (!getStoredToken()) return null;
    return getCachedUser();
  },

  getSession() {
    const token = getStoredToken();
    if (!token) return null;
    const user = getCachedUser();
    return user ? { userId: user.id, token } : null;
  },

  setSession(userId, remember) {
    // No-op when called from legacy code after API login already stored token.
    // The real token is stored in storeToken() during the login flow.
  },

  clearSession() {
    removeToken();
    cacheUser(null);
  },

  // ── Auth ─────────────────────────────────────────────────────────────

  /**
   * Register a new user.
   * Returns { ok, user?, field?, message }
   */
  async createUser({ fullName, email, username, password }) {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, username, password, confirmPassword: password }),
    });
    if (!res.success) {
      const field = res.errors ? Object.keys(res.errors)[0] : 'email';
      return { ok: false, field, message: res.message };
    }
    return { ok: true, user: res.data.user };
  },

  /**
   * Log in. Stores JWT and caches user profile.
   * Returns the user object on success, null on failure.
   */
  async authenticate(email, password, remember = false) {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.success) return null;

    storeToken(res.data.token, remember);
    cacheUser(res.data.user);
    return res.data.user;
  },

  /**
   * Refresh user profile from the server and update cache.
   */
  async refreshCurrentUser() {
    if (!getStoredToken()) return null;
    const res = await apiFetch('/auth/me');
    if (!res.success) {
      this.clearSession();
      return null;
    }
    cacheUser(res.data.user);
    return res.data.user;
  },

  async updateUser(id, patch) {
    // Determine which endpoint to call
    if (patch.password !== undefined) {
      // changePassword requires currentPassword
      const res = await apiFetch('/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: patch.currentPassword,
          newPassword: patch.password,
          confirmPassword: patch.password,
        }),
      });
      if (!res.success) {
        return { ok: false, field: 'currentPassword', message: res.message };
      }
      return { ok: true, user: getCachedUser() };
    }

    const res = await apiFetch('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    if (!res.success) {
      const field = res.errors ? Object.keys(res.errors)[0] : undefined;
      return { ok: false, field, message: res.message };
    }
    cacheUser(res.data.user);
    return { ok: true, user: res.data.user };
  },

  async verifyPassword(id, password) {
    // Check by attempting to get /me – we can't easily verify without an endpoint.
    // So we call a lightweight check: re-login with the stored email.
    const user = getCachedUser();
    if (!user) return false;
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: user.email, password }),
    });
    return res.success;
  },

  async setPasswordByEmail(email, password) {
    const res = await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword: password, confirmPassword: password }),
    });
    return res.success;
  },

  async getUserById(id) {
    // For cards, author is embedded in the blog object returned by the API.
    // This is kept for compatibility — returns from cache when possible.
    const cached = getCachedUser();
    if (cached && cached.id === id) return cached;
    return null;
  },

  // ── Blogs ─────────────────────────────────────────────────────────────

  async getPublishedBlogs(params = {}) {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.category && params.category !== 'All') qs.set('category', params.category);
    if (params.page) qs.set('page', params.page);
    if (params.limit) qs.set('limit', params.limit);
    const query = qs.toString() ? `?${qs}` : '';
    const res = await apiFetch(`/blogs${query}`);
    return res.success ? res.data.blogs : [];
  },

  async getBlogs() {
    return this.getPublishedBlogs();
  },

  async getBlog(id) {
    if (!id) return null;
    const res = await apiFetch(`/blogs/${id}`);
    return res.success ? res.data.blog : null;
  },

  async getBlogsByAuthor(authorId) {
    const res = await apiFetch('/blogs/my-blogs');
    return res.success ? res.data.blogs : [];
  },

  async getStats() {
    const res = await apiFetch('/blogs/stats');
    return res.success ? res.data : { total: 0, published: 0, drafts: 0 };
  },

  async saveBlog(input) {
    const payload = {
      title:       input.title,
      description: input.description || '',
      content:     input.content || '',
      category:    input.category,
      image:       input.image || '',
      featured:    Boolean(input.featured),
      status:      input.status === 'published' ? 'published' : 'draft',
    };

    let res;
    if (input.id) {
      res = await apiFetch(`/blogs/${input.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      res = await apiFetch('/blogs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    if (!res.success) return { ok: false, message: res.message };
    return { ok: true, blog: res.data.blog };
  },

  async deleteBlog(id, authorId) {
    const res = await apiFetch(`/blogs/${id}`, { method: 'DELETE' });
    if (!res.success) return { ok: false, message: res.message };
    return { ok: true };
  },

  async toggleLike(blogId, actorId) {
    const res = await apiFetch(`/blogs/${blogId}/like`, {
      method: 'POST',
      body: JSON.stringify({ actorId }),
    });
    if (!res.success) return { ok: false, liked: false, count: 0 };
    return {
      ok:    true,
      liked: res.data.liked,
      count: res.data.likesCount,
    };
  },

  getLikeState(blogId, actorId) {
    // Synchronous version — returns default; real data comes from blog object
    return { liked: false, count: 0 };
  },
};

// Make globally available (same as storage.js)
window.BlogStore = BlogStore;
