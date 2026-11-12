/**
 * Dashboard shell, stats, library, and profile.
 */
'use strict';

const VIEW_TITLES = {
  overview: ['Overview', 'Dashboard'],
  posts: ['Library', 'My posts'],
  profile: ['Account', 'Profile'],
  create: ['Editor', 'Write a story']
};

function renderSidebar(active) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const user = BlogStore.currentUser();
  if (!user) return;
  const items = [
    ['overview', 'dashboard.html', 'fa-solid fa-table-cells', 'Overview'],
    ['posts', 'dashboard.html#posts', 'fa-solid fa-newspaper', 'My posts'],
    ['create', 'create-blog.html', 'fa-solid fa-pen-nib', 'Create blog'],
    ['profile', 'dashboard.html#profile', 'fa-solid fa-user', 'Profile']
  ];
  sidebar.innerHTML = `
    <a class="logo" href="index.html">
      <span class="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32"><rect width="32" height="32" rx="10" fill="currentColor"></rect>
        <path d="M8.2 23V9h2.3l5.5 8.4L21.5 9H23.8v14h-2.15v-8.7l-4.15 6.3h-1.3l-4.15-6.3V23H8.2z" fill="var(--on-accent)"></path></svg>
      </span>
      <span class="logo-word">Blog<em>Sphere</em></span>
    </a>
    <div class="sidebar-user">
      <span class="avatar" id="user-avatar">${BlogUI.escapeHtml(BlogUI.initial(user.fullName))}</span>
      <div>
        <strong id="user-name">${BlogUI.escapeHtml(user.fullName)}</strong>
        <span id="user-handle">@${BlogUI.escapeHtml(user.username)}</span>
      </div>
    </div>
    <nav class="sidebar-nav" aria-label="Dashboard">
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
  const shell = document.querySelector('.app-shell');
  const toggle = document.querySelector('.sidebar-toggle');
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
  const crumb = document.getElementById('crumb');
  const title = document.getElementById('view-title');
  if (crumb) crumb.textContent = titles[0];
  if (title && document.body.dataset.page === 'dashboard') title.textContent = titles[1];
  document.querySelectorAll('[data-nav]').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.nav === view);
  });
}

function postRow(blog) {
  const status = blog.status === 'published' ? 'Published' : 'Draft';
  return `
    <article class="post-row">
      <a class="post-thumb" href="${blog.status === 'published' ? `blog-details.html?id=${encodeURIComponent(blog.id)}` : `create-blog.html?id=${encodeURIComponent(blog.id)}`}">
        <img src="${BlogUI.escapeHtml(blog.image || BlogStore.coverFor(blog.category))}" alt="" data-fallback="${BlogUI.escapeHtml(BlogStore.coverFor(blog.category))}">
      </a>
      <div class="post-copy">
        <div class="post-tags">
          <span class="pill" data-category="${BlogUI.escapeHtml(blog.category)}">${BlogUI.escapeHtml(blog.category)}</span>
          <span class="badge badge-${BlogUI.escapeHtml(blog.status)}">${status}</span>
        </div>
        <h3><a href="create-blog.html?id=${encodeURIComponent(blog.id)}">${BlogUI.escapeHtml(blog.title)}</a></h3>
        <p>${BlogUI.escapeHtml(blog.description || 'No description yet.')}</p>
        <small>Updated ${BlogUI.escapeHtml(BlogUI.formatDate(blog.updatedAt))}</small>
      </div>
      <div class="post-actions">
        ${blog.status === 'published' ? `<a class="icon-btn" href="blog-details.html?id=${encodeURIComponent(blog.id)}" aria-label="View ${BlogUI.escapeHtml(blog.title)}"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}
        <a class="icon-btn" href="create-blog.html?id=${encodeURIComponent(blog.id)}" aria-label="Edit ${BlogUI.escapeHtml(blog.title)}"><i class="fa-solid fa-pen"></i></a>
        <button class="icon-btn danger" type="button" data-delete-blog="${BlogUI.escapeHtml(blog.id)}" aria-label="Delete ${BlogUI.escapeHtml(blog.title)}"><i class="fa-solid fa-trash"></i></button>
      </div>
    </article>
  `;
}

function initDashboard() {
  const user = BlogStore.currentUser();
  if (!user) {
    const next = window.location.pathname.split('/').pop() + window.location.search + window.location.hash;
    window.location.replace(`login.html?next=${encodeURIComponent(next)}`);
    return;
  }

  renderSidebar('overview');
  bindSidebar();

  const welcome = document.getElementById('welcome');
  const profileForm = document.getElementById('profile-form');
  const passwordForm = document.getElementById('password-form');
  const search = document.getElementById('post-search');
  const statusFilter = document.getElementById('post-status');
  const categoryFilter = document.getElementById('post-category');
  const params = new URLSearchParams(window.location.search);

  welcome.textContent = `${BlogUI.greeting()}, ${BlogUI.firstName(user.fullName)}.`;
  BlogStore.CATEGORIES.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
  if (params.get('status') === 'published' || params.get('status') === 'draft') {
    statusFilter.value = params.get('status');
  }

  function blogs() {
    return BlogStore.getBlogsByAuthor(BlogStore.currentUser().id);
  }

  function renderStats(list) {
    const published = list.filter((blog) => blog.status === 'published').length;
    const drafts = list.filter((blog) => blog.status === 'draft').length;
    document.getElementById('stat-total').textContent = String(list.length);
    document.getElementById('stat-published').textContent = String(published);
    document.getElementById('stat-draft').textContent = String(drafts);
  }

  function renderRecent(list) {
    const recent = document.getElementById('recent-list');
    const slice = list.slice(0, 4);
    if (!slice.length) {
      recent.innerHTML = BlogUI.emptyState({
        title: 'No stories yet',
        text: 'Write the first one. You can keep it as a draft until it is ready.',
        actionHref: 'create-blog.html',
        actionLabel: 'Create new blog'
      });
      return;
    }
    recent.innerHTML = slice.map(postRow).join('');
  }

  function renderLibrary(list) {
    const library = document.getElementById('library-list');
    const filtered = list.filter((blog) => {
      const statusOk = statusFilter.value === 'all' || blog.status === statusFilter.value;
      const categoryOk = categoryFilter.value === 'all' || blog.category === categoryFilter.value;
      const q = search.value.trim().toLowerCase();
      const text = `${blog.title} ${blog.description} ${BlogUI.plainText(blog.content)}`.toLowerCase();
      return statusOk && categoryOk && (!q || text.includes(q));
    });
    document.getElementById('library-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'story' : 'stories'}`;
    if (!list.length) {
      library.innerHTML = BlogUI.emptyState({
        title: 'Your library is empty',
        text: 'Published stories appear on the home page. Drafts stay here until you publish them.',
        actionHref: 'create-blog.html',
        actionLabel: 'Create new blog'
      });
      return;
    }
    if (!filtered.length) {
      library.innerHTML = BlogUI.emptyState({
        title: 'Nothing matches',
        text: 'Try a different word, status, or category.',
        actionHref: 'dashboard.html#posts',
        actionLabel: 'Reset filters'
      });
      const reset = library.querySelector('a');
      reset.addEventListener('click', (event) => {
        event.preventDefault();
        search.value = '';
        statusFilter.value = 'all';
        categoryFilter.value = 'all';
        renderLibrary(blogs());
      });
      return;
    }
    library.innerHTML = filtered.map(postRow).join('');
  }

  function renderAll() {
    const list = blogs();
    renderStats(list);
    renderRecent(list);
    renderLibrary(list);
  }

  function showView() {
    const hash = window.location.hash;
    const view = hash === '#posts' ? 'posts' : hash === '#profile' ? 'profile' : 'overview';
    document.querySelectorAll('[data-view]').forEach((section) => {
      section.hidden = section.dataset.view !== view;
    });
    setTopbar(view);
    if (window.innerWidth < 980) document.querySelector('.app-shell')?.classList.remove('is-sidebar-open');
  }

  profileForm.elements.fullName.value = user.fullName;
  profileForm.elements.username.value = user.username;
  profileForm.elements.email.value = user.email;
  profileForm.elements.bio.value = user.bio || '';
  document.getElementById('member-since').textContent = `Member since ${BlogUI.formatDate(user.createdAt)}`;

  profileForm.addEventListener('submit', (event) => {
    event.preventDefault();
    BlogUI.clearFieldErrors(profileForm);
    const fullName = profileForm.elements.fullName.value.trim();
    const username = profileForm.elements.username.value.trim();
    const bio = profileForm.elements.bio.value.trim();
    let invalid = false;
    if (!/^[A-Za-z][A-Za-z .'-]{1,59}$/.test(fullName)) {
      BlogUI.setFieldError(profileForm, 'fullName', 'Enter your name using letters, spaces, hyphens, or apostrophes.');
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
    if (invalid) {
      BlogUI.focusFirstInvalid(profileForm);
      return;
    }
    const result = BlogStore.updateUser(user.id, { fullName, username, bio });
    if (!result.ok) {
      BlogUI.setFieldError(profileForm, result.field || 'username', result.message);
      return;
    }
    document.getElementById('user-name').textContent = result.user.fullName;
    document.getElementById('user-handle').textContent = `@${result.user.username}`;
    document.getElementById('user-avatar').textContent = BlogUI.initial(result.user.fullName);
    welcome.textContent = `${BlogUI.greeting()}, ${BlogUI.firstName(result.user.fullName)}.`;
    BlogUI.toast('Profile updated.', 'success');
  });

  passwordForm.addEventListener('submit', (event) => {
    event.preventDefault();
    BlogUI.clearFieldErrors(passwordForm);
    const current = passwordForm.elements.currentPassword.value;
    const next = passwordForm.elements.newPassword.value;
    const confirm = passwordForm.elements.confirmPassword.value;
    let invalid = false;
    if (!BlogStore.verifyPassword(user.id, current)) {
      BlogUI.setFieldError(passwordForm, 'currentPassword', 'That is not your current password.');
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
    if (invalid) {
      BlogUI.focusFirstInvalid(passwordForm);
      return;
    }
    const result = BlogStore.updateUser(user.id, { password: next });
    if (!result.ok) {
      BlogUI.toast(result.message, 'error');
      return;
    }
    passwordForm.reset();
    BlogUI.toast('Password updated.', 'success');
  });

  document.getElementById('dashboard-root').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-delete-blog]');
    if (!button) return;
    const blog = BlogStore.getBlog(button.dataset.deleteBlog);
    const me = BlogStore.currentUser();
    if (!blog || !me || blog.authorId !== me.id) {
      BlogUI.toast('You can only delete your own stories.', 'error');
      return;
    }
    const yes = await BlogUI.confirm({
      title: 'Delete this story?',
      message: `“${blog.title}” will be removed from this browser.`,
      confirmText: 'Delete',
      danger: true
    });
    if (!yes) return;
    const result = BlogStore.deleteBlog(blog.id, me.id);
    if (!result.ok) {
      BlogUI.toast(result.message, 'error');
      return;
    }
    BlogUI.toast('Story deleted.', 'success');
    renderAll();
  });

  [search, statusFilter, categoryFilter].forEach((control) => {
    control.addEventListener('input', () => renderLibrary(blogs()));
    control.addEventListener('change', () => renderLibrary(blogs()));
  });

  window.addEventListener('hashchange', showView);
  renderAll();
  showView();
}

function initEditorChrome() {
  if (!BlogStore.currentUser()) return;
  renderSidebar('create');
  bindSidebar();
  setTopbar('create');
}

BlogApp.register('dashboard', initDashboard);
BlogApp.register('editor-chrome', initEditorChrome);
