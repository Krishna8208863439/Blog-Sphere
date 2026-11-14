/**
 * dashboard.js — Dashboard shell, stats, library, and profile.
 * All BlogStore data calls are async (backed by REST API via api.js).
 */
'use strict';

const VIEW_TITLES = {
  overview: ['Overview', 'Dashboard'],
  posts:    ['Library',  'My posts'],
  profile:  ['Account',  'Profile'],
  create:   ['Editor',   'Write a story'],
};

// ── Sidebar renderer ─────────────────────────────────────────────────────

function renderSidebar(active) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const user = BlogStore.currentUser();
  if (!user) return;

  const items = [
    ['overview', 'dashboard.html',         'fa-solid fa-table-cells',              'Overview'],
    ['posts',    'dashboard.html#posts',    'fa-solid fa-newspaper',               'My posts'],
    ['create',   'create-blog.html',        'fa-solid fa-pen-nib',                 'Create blog'],
    ['profile',  'dashboard.html#profile',  'fa-solid fa-user',                    'Profile'],
  ];

  sidebar.innerHTML = `
    <a class="logo" href="index.html">
      <span class="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32">
          <rect width="32" height="32" rx="10" fill="currentColor"></rect>
          <path d="M8.2 23V9h2.3l5.5 8.4L21.5 9H23.8v14h-2.15v-8.7l-4.15 6.3h-1.3l-4.15-6.3V23H8.2z"
                fill="var(--on-accent)"></path>
        </svg>
      </span>
      <span class="logo-word">Blog<em>Sphere</em></span>
    </a>

    <div class="sidebar-user">
      <span class="avatar" id="user-avatar" aria-hidden="true">
        ${BlogUI.escapeHtml(BlogUI.initial(user.fullName))}
      </span>
      <div>
        <strong id="user-name">${BlogUI.escapeHtml(user.fullName)}</strong>
        <span id="user-handle">@${BlogUI.escapeHtml(user.username)}</span>
      </div>
    </div>

    <nav class="sidebar-nav" aria-label="Dashboard navigation">
      ${items.map(([key, href, icon, label]) => `
        <a href="${href}" data-nav="${key}" class="${key === active ? 'is-active' : ''}">
          <i class="${icon}" aria-hidden="true"></i> ${label}
        </a>
      `).join('')}
    </nav>

    <button class="sidebar-logout" type="button" data-logout>
      <i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i> Log out
    </button>
  `;
}

function bindSidebar() {
  const shell    = document.querySelector('.app-shell');
  const toggle   = document.querySelector('.sidebar-toggle');
  const backdrop = document.querySelector('.sidebar-backdrop');
  if (!shell || !toggle) return;

  const setOpen = (open) => {
    shell.classList.toggle('is-sidebar-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  toggle.addEventListener('click', () => setOpen(!shell.classList.contains('is-sidebar-open')));
  backdrop?.addEventListener('click', () => setOpen(false));
  document.getElementById('sidebar')?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });
}

function setTopbar(view) {
  const titles = VIEW_TITLES[view] || VIEW_TITLES.overview;
  const crumb  = document.getElementById('crumb');
  const title  = document.getElementById('view-title');
  if (crumb) crumb.textContent = titles[0];
  if (title) title.textContent = titles[1];
  document.querySelectorAll('[data-nav]').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.nav === view);
  });
}

// ── Post row markup ───────────────────────────────────────────────────────

function postRow(blog) {
  const status    = blog.status === 'published' ? 'Published' : 'Draft';
  const detailUrl = `blog-details.html?id=${encodeURIComponent(blog.id)}`;
  const editUrl   = `create-blog.html?id=${encodeURIComponent(blog.id)}`;

  return `
    <article class="post-row" role="listitem">
      <a class="post-thumb" href="${blog.status === 'published' ? detailUrl : editUrl}" tabindex="-1">
        <img src="${BlogUI.escapeHtml(blog.image || BlogStore.coverFor(blog.category))}"
             alt=""
             data-fallback="${BlogUI.escapeHtml(BlogStore.coverFor(blog.category))}">
      </a>
      <div class="post-copy">
        <div class="post-tags">
          <span class="pill" data-category="${BlogUI.escapeHtml(blog.category)}">${BlogUI.escapeHtml(blog.category)}</span>
          <span class="badge badge-${BlogUI.escapeHtml(blog.status)}">${status}</span>
        </div>
        <h3>
          <a href="${editUrl}">${BlogUI.escapeHtml(blog.title)}</a>
        </h3>
        <p>${BlogUI.escapeHtml(blog.description || 'No description yet.')}</p>
        <small>Updated ${BlogUI.escapeHtml(BlogUI.formatDate(blog.updatedAt))}</small>
      </div>
      <div class="post-actions">
        ${blog.status === 'published'
          ? `<a class="icon-btn" href="${detailUrl}" aria-label="View ${BlogUI.escapeHtml(blog.title)}">
               <i class="fa-solid fa-arrow-up-right-from-square"></i>
             </a>`
          : ''}
        <a class="icon-btn" href="${editUrl}" aria-label="Edit ${BlogUI.escapeHtml(blog.title)}">
          <i class="fa-solid fa-pen"></i>
        </a>
        <button class="icon-btn danger" type="button"
                data-delete-blog="${BlogUI.escapeHtml(blog.id)}"
                aria-label="Delete ${BlogUI.escapeHtml(blog.title)}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </article>
  `;
}

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD — main initialisation
// ═════════════════════════════════════════════════════════════════════════════
async function initDashboard() {
  // Auth guard — synchronous check on cached user
  const user = BlogStore.currentUser();
  if (!user) {
    const next = window.location.pathname.split('/').pop()
      + window.location.search
      + window.location.hash;
    window.location.replace(`login.html?next=${encodeURIComponent(next)}`);
    return;
  }

  renderSidebar('overview');
  bindSidebar();

  const welcome        = document.getElementById('welcome');
  const profileForm    = document.getElementById('profile-form');
  const passwordForm   = document.getElementById('password-form');
  const search         = document.getElementById('post-search');
  const statusFilter   = document.getElementById('post-status');
  const categoryFilter = document.getElementById('post-category');
  const params         = new URLSearchParams(window.location.search);

  welcome.textContent = `${BlogUI.greeting()}, ${BlogUI.firstName(user.fullName)}.`;

  // Populate category filter
  BlogStore.CATEGORIES.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });
  if (params.get('status') === 'published' || params.get('status') === 'draft') {
    statusFilter.value = params.get('status');
  }

  // ── Fetch data from API ───────────────────────────────────────────────

  async function loadBlogs() {
    return BlogStore.getBlogsByAuthor(user.id);
  }

  async function loadStats() {
    // Use the dedicated /api/blogs/stats endpoint (accurate, single query)
    try {
      const res = await fetch('http://localhost:5000/api/blogs/stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('blogsphere_token') || sessionStorage.getItem('blogsphere_token') || ''}`,
        },
      });
      const json = await res.json();
      if (json.success) return json.data;
    } catch (_) { /* fall through */ }
    return null;
  }

  // ── Render functions ─────────────────────────────────────────────────

  function renderStats(total, published, drafts) {
    document.getElementById('stat-total').textContent     = String(total);
    document.getElementById('stat-published').textContent = String(published);
    document.getElementById('stat-draft').textContent     = String(drafts);
  }

  function renderRecent(list) {
    const recent = document.getElementById('recent-list');
    const slice  = list.slice(0, 4);
    if (!slice.length) {
      recent.innerHTML = BlogUI.emptyState({
        title:       'No stories yet',
        text:        'Write the first one. Keep it as a draft until it is ready.',
        actionHref:  'create-blog.html',
        actionLabel: 'Create new blog',
      });
      return;
    }
    recent.innerHTML = slice.map(postRow).join('');
  }

  function renderLibrary(list) {
    const library = document.getElementById('library-list');
    const q       = search.value.trim().toLowerCase();

    const filtered = list.filter((blog) => {
      const statusOk   = statusFilter.value === 'all' || blog.status === statusFilter.value;
      const categoryOk = categoryFilter.value === 'all' || blog.category === categoryFilter.value;
      const text       = `${blog.title} ${blog.description} ${BlogUI.plainText(blog.content)}`.toLowerCase();
      return statusOk && categoryOk && (!q || text.includes(q));
    });

    document.getElementById('library-count').textContent =
      `${filtered.length} ${filtered.length === 1 ? 'story' : 'stories'}`;

    if (!list.length) {
      library.innerHTML = BlogUI.emptyState({
        title:       'Your library is empty',
        text:        'Published stories appear on the home page. Drafts stay here until you publish them.',
        actionHref:  'create-blog.html',
        actionLabel: 'Create new blog',
      });
      return;
    }

    if (!filtered.length) {
      library.innerHTML = BlogUI.emptyState({
        title:       'Nothing matches',
        text:        'Try a different word, status, or category.',
        actionHref:  'dashboard.html#posts',
        actionLabel: 'Reset filters',
      });
      const reset = library.querySelector('a');
      reset?.addEventListener('click', (e) => {
        e.preventDefault();
        search.value = ''; statusFilter.value = 'all'; categoryFilter.value = 'all';
        renderLibrary(cachedBlogs);
      });
      return;
    }

    library.innerHTML = filtered.map(postRow).join('');
  }

  // ── Load & render everything ─────────────────────────────────────────

  let cachedBlogs = [];

  async function renderAll() {
    // Show loading skeletons in stats
    ['stat-total','stat-published','stat-draft'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '…';
    });

    const [blogs, stats] = await Promise.all([loadBlogs(), loadStats()]);
    cachedBlogs = blogs;

    if (stats) {
      renderStats(stats.total, stats.published, stats.drafts);
    } else {
      // Fallback: count from returned list
      renderStats(
        blogs.length,
        blogs.filter((b) => b.status === 'published').length,
        blogs.filter((b) => b.status === 'draft').length,
      );
    }

    renderRecent(blogs);
    renderLibrary(blogs);
  }

  // ── View switching ───────────────────────────────────────────────────

  function showView() {
    const hash = window.location.hash;
    const view = hash === '#posts'   ? 'posts'
               : hash === '#profile' ? 'profile'
               : 'overview';
    document.querySelectorAll('[data-view]').forEach((sec) => {
      sec.hidden = sec.dataset.view !== view;
    });
    setTopbar(view);
    if (window.innerWidth < 980) {
      document.querySelector('.app-shell')?.classList.remove('is-sidebar-open');
    }
  }

  // ── Profile form ─────────────────────────────────────────────────────

  profileForm.elements.fullName.value = user.fullName;
  profileForm.elements.username.value = user.username;
  profileForm.elements.email.value    = user.email;
  profileForm.elements.bio.value      = user.bio || '';

  // Update the member-card in profile view
  const profileAvatar = document.getElementById('profile-avatar');
  const profileName   = document.getElementById('profile-name');
  const profileHandle = document.getElementById('profile-handle');
  const profileBio    = document.getElementById('profile-bio-display');
  if (profileAvatar) profileAvatar.textContent = BlogUI.initial(user.fullName);
  if (profileName)   profileName.textContent   = user.fullName;
  if (profileHandle) profileHandle.textContent = `@${user.username}`;
  if (profileBio)    profileBio.textContent    = user.bio || '';

  document.getElementById('member-since').textContent =
    `Member since ${BlogUI.formatDate(user.createdAt)}`;

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    BlogUI.clearFieldErrors(profileForm);

    const fullName = profileForm.elements.fullName.value.trim();
    const username = profileForm.elements.username.value.trim();
    const bio      = profileForm.elements.bio.value.trim();
    let invalid    = false;

    if (!/^[A-Za-z][A-Za-z .'-]{1,59}$/.test(fullName)) {
      BlogUI.setFieldError(profileForm, 'fullName', 'Use letters, spaces, hyphens, or apostrophes (2–60 characters).');
      invalid = true;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      BlogUI.setFieldError(profileForm, 'username', 'Use 3–20 letters, numbers, or underscores.');
      invalid = true;
    }
    if (bio.length > 280) {
      BlogUI.setFieldError(profileForm, 'bio', 'Keep the bio under 280 characters.');
      invalid = true;
    }
    if (invalid) { BlogUI.focusFirstInvalid(profileForm); return; }

    const btn = profileForm.querySelector('[type="submit"]');
    BlogUI.setBusy(btn, true, 'Saving…');

    const result = await BlogStore.updateUser(user.id, { fullName, username, bio });
    BlogUI.setBusy(btn, false, 'Save changes');

    if (!result.ok) {
      BlogUI.setFieldError(profileForm, result.field || 'username', result.message);
      return;
    }

    // Reflect updates in sidebar
    document.getElementById('user-name').textContent   = result.user.fullName;
    document.getElementById('user-handle').textContent = `@${result.user.username}`;
    document.getElementById('user-avatar').textContent = BlogUI.initial(result.user.fullName);
    if (profileAvatar) profileAvatar.textContent = BlogUI.initial(result.user.fullName);
    if (profileName)   profileName.textContent   = result.user.fullName;
    if (profileHandle) profileHandle.textContent = `@${result.user.username}`;
    if (profileBio)    profileBio.textContent    = result.user.bio || '';
    welcome.textContent = `${BlogUI.greeting()}, ${BlogUI.firstName(result.user.fullName)}.`;

    BlogUI.toast('Profile updated.', 'success');
  });

  // ── Password form ─────────────────────────────────────────────────────

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    BlogUI.clearFieldErrors(passwordForm);

    const current  = passwordForm.elements.currentPassword.value;
    const next     = passwordForm.elements.newPassword.value;
    const confirm  = passwordForm.elements.confirmPassword.value;
    let invalid    = false;

    if (!current) {
      BlogUI.setFieldError(passwordForm, 'currentPassword', 'Enter your current password.');
      invalid = true;
    }
    if (next.length < 8 || next.length > 72 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
      BlogUI.setFieldError(passwordForm, 'newPassword', 'Use 8–72 characters with a letter and a number.');
      invalid = true;
    }
    if (next !== confirm) {
      BlogUI.setFieldError(passwordForm, 'confirmPassword', 'Passwords do not match.');
      invalid = true;
    }
    if (invalid) { BlogUI.focusFirstInvalid(passwordForm); return; }

    const btn = passwordForm.querySelector('[type="submit"]');
    BlogUI.setBusy(btn, true, 'Updating…');

    const result = await BlogStore.updateUser(user.id, {
      currentPassword: current,
      password:        next,
    });
    BlogUI.setBusy(btn, false, 'Update password');

    if (!result.ok) {
      BlogUI.setFieldError(passwordForm, result.field || 'currentPassword', result.message);
      return;
    }
    passwordForm.reset();
    BlogUI.toast('Password updated.', 'success');
  });

  // ── Delete blog ───────────────────────────────────────────────────────

  document.getElementById('dashboard-root').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-delete-blog]');
    if (!btn) return;
    const me = BlogStore.currentUser();

    const yes = await BlogUI.confirm({
      title:       'Delete this story?',
      message:     'The story will be permanently removed from the database.',
      confirmText: 'Delete',
      danger:      true,
    });
    if (!yes) return;

    const result = await BlogStore.deleteBlog(btn.dataset.deleteBlog, me && me.id);
    if (!result.ok) { BlogUI.toast(result.message, 'error'); return; }

    BlogUI.toast('Story deleted.', 'success');
    await renderAll();
  });

  // ── Filter controls ───────────────────────────────────────────────────

  [search, statusFilter, categoryFilter].forEach((ctrl) => {
    ctrl.addEventListener('input',  () => renderLibrary(cachedBlogs));
    ctrl.addEventListener('change', () => renderLibrary(cachedBlogs));
  });

  // ── Hash-based view switching ─────────────────────────────────────────

  window.addEventListener('hashchange', showView);

  // ── Boot ──────────────────────────────────────────────────────────────

  await renderAll();
  showView();
}

// ── Editor chrome (sidebar on create-blog page) ───────────────────────────

function initEditorChrome() {
  if (!BlogStore.currentUser()) return;
  renderSidebar('create');
  bindSidebar();
  setTopbar('create');
}

BlogApp.register('dashboard',     initDashboard);
BlogApp.register('editor-chrome', initEditorChrome);
