/**
 * Shared interface: theme, navigation, toasts, dialogs, and page boot.
 */
'use strict';

const BlogApp = {
  pages: {},
  register(name, setup) {
    this.pages[name] = setup;
  }
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso) {
  if (!iso) return 'Unpublished';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function plainText(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function readTime(html) {
  const words = plainText(html).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function initial(name) {
  const letter = String(name || '?').trim().charAt(0);
  return letter ? letter.toUpperCase() : '?';
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstName(fullName) {
  return String(fullName || 'there').trim().split(/\s+/)[0];
}

function safeNext(value) {
  if (!value) return 'dashboard.html';
  const decoded = value.trim();
  if (!/^[a-z0-9-]+\.html([?#][^\s]*)?$/i.test(decoded)) return 'dashboard.html';
  if (/^(login|register)\.html/i.test(decoded)) return 'dashboard.html';
  return decoded;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const LOGO = `
  <span class="logo-mark" aria-hidden="true">
    <svg viewBox="0 0 32 32">
      <rect width="32" height="32" rx="10" fill="currentColor"></rect>
      <path d="M8.2 23V9h2.3l5.5 8.4L21.5 9H23.8v14h-2.15v-8.7l-4.15 6.3h-1.3l-4.15-6.3V23H8.2z" fill="var(--on-accent)"></path>
    </svg>
  </span>
  <span class="logo-word">Blog<em>Sphere</em></span>
`;

function ensureToastRegion() {
  let region = document.querySelector('.toasts');
  if (!region) {
    region = document.createElement('div');
    region.className = 'toasts';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    document.body.appendChild(region);
  }
  return region;
}

function toast(message, type) {
  const region = ensureToastRegion();
  const item = document.createElement('div');
  const kind = type || 'info';
  const icons = {
    success: 'fa-solid fa-check',
    error: 'fa-solid fa-circle-exclamation',
    info: 'fa-solid fa-circle-info'
  };
  item.className = `toast toast-${kind}`;
  item.innerHTML = `<i class="${icons[kind] || icons.info}" aria-hidden="true"></i><span>${escapeHtml(message)}</span>`;
  region.appendChild(item);
  requestAnimationFrame(() => item.classList.add('is-in'));
  window.setTimeout(() => {
    item.classList.remove('is-in');
    window.setTimeout(() => item.remove(), 280);
  }, 3600);
}

function flash(message, type) {
  sessionStorage.setItem('blogsphere_flash', JSON.stringify({ message, type: type || 'success' }));
}

function consumeFlash() {
  const raw = sessionStorage.getItem('blogsphere_flash');
  if (!raw) return;
  sessionStorage.removeItem('blogsphere_flash');
  try {
    const data = JSON.parse(raw);
    if (data && data.message) toast(data.message, data.type || 'success');
  } catch (error) {
    console.error(error);
  }
}

function confirmDialog(options) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'modal';
    dialog.innerHTML = `
      <form method="dialog" class="modal-card">
        <h2>${escapeHtml(options.title || 'Please confirm')}</h2>
        <p>${escapeHtml(options.message || '')}</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-cancel autofocus>${escapeHtml(options.cancelText || 'Cancel')}</button>
          <button type="button" class="btn ${options.danger ? 'btn-danger' : 'btn-primary'}" data-ok>${escapeHtml(options.confirmText || 'Confirm')}</button>
        </div>
      </form>
    `;
    document.body.appendChild(dialog);
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (dialog.open) dialog.close();
      dialog.remove();
      resolve(value);
    };
    dialog.querySelector('[data-cancel]').addEventListener('click', () => finish(false));
    dialog.querySelector('[data-ok]').addEventListener('click', () => finish(true));
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish(false);
    });
    dialog.showModal();
  });
}

function promptDialog(options) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'modal';
    dialog.innerHTML = `
      <form class="modal-card" id="prompt-form">
        <h2>${escapeHtml(options.title || 'Enter a value')}</h2>
        <label class="field">
          <span>${escapeHtml(options.label || 'Value')}</span>
          <input name="value" type="url" required placeholder="https://" value="${escapeHtml(options.value || '')}">
          <small class="field-error" data-error-for="value"></small>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-cancel>${escapeHtml(options.cancelText || 'Cancel')}</button>
          <button type="submit" class="btn btn-primary">${escapeHtml(options.confirmText || 'Add link')}</button>
        </div>
      </form>
    `;
    document.body.appendChild(dialog);
    const input = dialog.querySelector('input');
    const error = dialog.querySelector('[data-error-for="value"]');
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (dialog.open) dialog.close();
      dialog.remove();
      resolve(value);
    };
    dialog.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (!/^https?:\/\//i.test(value)) {
        error.textContent = 'Enter a full http or https link.';
        input.classList.add('is-invalid');
        input.focus();
        return;
      }
      finish(value);
    });
    dialog.querySelector('[data-cancel]').addEventListener('click', () => finish(null));
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish(null);
    });
    dialog.showModal();
    input.focus();
    input.select();
  });
}

function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  if (next === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  BlogStore.setTheme(next);
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    const icon = button.querySelector('i');
    if (icon) icon.className = next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    button.setAttribute('aria-label', next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  });
}

function toggleTheme() {
  applyTheme(BlogStore.getTheme() === 'dark' ? 'light' : 'dark');
}

function logout() {
  BlogStore.clearSession();
  flash('You have been logged out.');
  window.location.href = 'index.html';
}

function renderMarketingHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;
  const user = BlogStore.currentUser();
  const page = document.body.dataset.page;
  const params = new URLSearchParams(window.location.search);
  const query = page === 'home' ? params.get('q') || '' : '';
  const categories = BlogStore.CATEGORIES.map((category) => {
    return `<a href="index.html?category=${encodeURIComponent(category)}">${escapeHtml(category)}</a>`;
  }).join('');
  const account = user
    ? `<a class="btn btn-ghost" href="dashboard.html">Dashboard</a>
       <button class="btn btn-primary" type="button" data-logout>Log out</button>`
    : `<a class="btn btn-ghost" href="login.html">Sign in</a>
       <a class="btn btn-primary" href="register.html">Get started</a>`;

  header.className = 'site-header';
  header.innerHTML = `
    <div class="nav-inner">
      <a class="logo" href="index.html">${LOGO}</a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu">
        <span></span><span></span><span></span>
      </button>
      <div class="nav-panel" id="site-nav">
        <nav class="primary-nav" aria-label="Primary">
          <a href="index.html" class="${page === 'home' ? 'is-active' : ''}">Home</a>
          <div class="menu">
            <button class="menu-btn" type="button" aria-expanded="false" aria-haspopup="true">
              Categories <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
            </button>
            <div class="menu-list" role="menu">${categories}</div>
          </div>
        </nav>
        <form class="nav-search" action="index.html" method="get" role="search">
          <label class="sr-only" for="nav-q">Search stories</label>
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input id="nav-q" data-search name="q" type="search" placeholder="Search stories" value="${escapeHtml(query)}">
        </form>
        <div class="nav-actions">
          <button class="icon-btn" type="button" data-theme-toggle aria-label="Switch to dark mode">
            <i class="fa-solid fa-moon" aria-hidden="true"></i>
          </button>
          ${account}
        </div>
      </div>
    </div>
  `;

  const toggle = header.querySelector('.nav-toggle');
  const setOpen = (open) => {
    header.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  toggle.addEventListener('click', () => setOpen(!header.classList.contains('is-open')));
  header.querySelectorAll('.nav-panel a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  const menu = header.querySelector('.menu');
  const menuBtn = header.querySelector('.menu-btn');
  menuBtn.addEventListener('click', () => {
    const open = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
    menu.classList.toggle('is-open', !open);
  });
  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target)) {
      menu.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      menu.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

function renderFooter() {
  const footer = document.getElementById('site-footer');
  if (!footer) return;
  const year = new Date().getFullYear();
  const categories = BlogStore.CATEGORIES.map((category) => {
    return `<a href="index.html?category=${encodeURIComponent(category)}">${escapeHtml(category)}</a>`;
  }).join('');
  footer.innerHTML = `
    <div class="footer-inner">
      <div>
        <a class="logo" href="index.html">${LOGO}</a>
        <p>A quiet place for finished thoughts. Accounts and stories stay in this browser.</p>
      </div>
      <div>
        <h2>Explore</h2>
        <a href="index.html">Latest stories</a>
        ${categories}
        <a href="register.html">Create an account</a>
      </div>
      <div>
        <h2>Account</h2>
        <a href="login.html">Sign in</a>
        <a href="dashboard.html">Dashboard</a>
        <a href="create-blog.html">Write a story</a>
      </div>
      <div>
        <h2>Connect</h2>
        <div class="socials">
          <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="BlogSphere on X"><i class="fa-brands fa-x-twitter"></i></a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="BlogSphere on GitHub"><i class="fa-brands fa-github"></i></a>
          <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="BlogSphere on LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>
          <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" aria-label="BlogSphere on Instagram"><i class="fa-brands fa-instagram"></i></a>
        </div>
        <a href="mailto:hello@blogsphere.dev">hello@blogsphere.dev</a>
      </div>
    </div>
    <p class="footer-note">© ${year} BlogSphere. A frontend demo with working local publishing.</p>
  `;
}

function mountToTop() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'to-top';
  button.setAttribute('aria-label', 'Back to top');
  button.hidden = true;
  button.innerHTML = '<i class="fa-solid fa-arrow-up" aria-hidden="true"></i>';
  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  });
  document.body.appendChild(button);
  window.addEventListener('scroll', () => {
    button.hidden = window.scrollY < 520;
  }, { passive: true });
}

function setFieldError(form, name, message) {
  const error = form.querySelector(`[data-error-for="${name}"]`);
  const field = form.elements[name] || form.querySelector(`[name="${name}"]`);
  if (error) error.textContent = message || '';
  if (field && 'classList' in field) {
    field.classList.toggle('is-invalid', Boolean(message));
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
  }
}

function clearFieldErrors(form) {
  form.querySelectorAll('[data-error-for]').forEach((error) => {
    error.textContent = '';
  });
  form.querySelectorAll('.is-invalid').forEach((field) => {
    field.classList.remove('is-invalid');
    field.setAttribute('aria-invalid', 'false');
  });
}

function focusFirstInvalid(form) {
  const field = form.querySelector('.is-invalid');
  if (field && typeof field.focus === 'function') field.focus();
}

function setBusy(button, busy, busyLabel) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.dataset.label || button.textContent.trim();
    button.disabled = true;
    button.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${escapeHtml(busyLabel)}`;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.label || busyLabel;
  }
}

function emptyState({ title, text, actionHref, actionLabel }) {
  const action = actionHref
    ? `<a class="btn btn-primary" href="${escapeHtml(actionHref)}">${escapeHtml(actionLabel || 'Continue')}</a>`
    : '';
  return `
    <div class="empty">
      <div class="empty-art" aria-hidden="true">
        <svg viewBox="0 0 160 120">
          <rect x="18" y="22" width="124" height="78" rx="14" fill="currentColor" opacity="0.12"></rect>
          <rect x="32" y="38" width="64" height="8" rx="4" fill="currentColor"></rect>
          <rect x="32" y="54" width="96" height="6" rx="3" fill="currentColor" opacity="0.45"></rect>
          <rect x="32" y="68" width="78" height="6" rx="3" fill="currentColor" opacity="0.45"></rect>
          <circle cx="118" cy="40" r="10" fill="currentColor" opacity="0.8"></circle>
        </svg>
      </div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
      ${action}
    </div>
  `;
}

function showAlert(element, message) {
  if (!element) return;
  element.hidden = !message;
  element.textContent = message || '';
}

document.addEventListener('click', (event) => {
  const themeButton = event.target.closest('[data-theme-toggle]');
  if (themeButton) {
    toggleTheme();
    return;
  }
  const logoutButton = event.target.closest('[data-logout]');
  if (logoutButton) {
    event.preventDefault();
    logout();
    return;
  }
  const passwordButton = event.target.closest('[data-toggle-password]');
  if (passwordButton) {
    const input = document.getElementById(passwordButton.dataset.togglePassword);
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    passwordButton.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    passwordButton.setAttribute('aria-pressed', show ? 'true' : 'false');
    const icon = passwordButton.querySelector('i');
    if (icon) icon.className = show ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
  }
});

function boot() {
  applyTheme(BlogStore.getTheme());
  const page = document.body.dataset.page;
  if (page === 'home' || page === 'details' || page === 'login' || page === 'register') {
    renderMarketingHeader();
    renderFooter();
  }
  if (page === 'home' || page === 'details') mountToTop();
  consumeFlash();
  if (page === 'editor' && typeof BlogApp.pages['editor-chrome'] === 'function') {
    BlogApp.pages['editor-chrome']();
  }
  const setup = BlogApp.pages[page];
  if (setup) setup();
  const loader = document.getElementById('page-loader');
  window.setTimeout(() => loader && loader.classList.add('is-done'), 420);
  window.setTimeout(() => loader && loader.remove(), 900);
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    boot();
  } catch (error) {
    console.error(error);
    toast('This page could not finish loading. Refresh and try again.', 'error');
    const loader = document.getElementById('page-loader');
    if (loader) loader.classList.add('is-done');
  }
});

window.BlogApp = BlogApp;
window.BlogUI = {
  escapeHtml,
  formatDate,
  plainText,
  readTime,
  initial,
  greeting,
  firstName,
  safeNext,
  toast,
  flash,
  confirm: confirmDialog,
  prompt: promptDialog,
  setFieldError,
  clearFieldErrors,
  focusFirstInvalid,
  setBusy,
  emptyState,
  showAlert,
  applyTheme
};
