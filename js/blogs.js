/**
 * blogs.js — Home feed, blog-details page, and story editor.
 * All BlogStore calls are async (backed by the REST API via api.js).
 */
'use strict';

// ── HTML sanitizer ────────────────────────────────────────────────────────

const ALLOWED_TAGS = new Set([
  'P','BR','STRONG','B','EM','I','U','S',
  'H2','H3','H4',
  'UL','OL','LI',
  'BLOCKQUOTE','HR',
  'A','IMG',
  'TABLE','THEAD','TBODY','TR','TH','TD',
  'CODE','PRE',
]);
const DROP_TAGS = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','LINK','META','FORM','INPUT','BUTTON']);

function sanitizeHtml(unsafe) {
  const root = document.createElement('div');
  root.innerHTML = unsafe || '';
  root.querySelectorAll('*').forEach((el) => {
    if (DROP_TAGS.has(el.tagName)) { el.remove(); return; }
    if (!ALLOWED_TAGS.has(el.tagName)) { el.replaceWith(...el.childNodes); return; }
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (el.tagName === 'A' && name === 'href') {
        const href = attr.value.trim();
        if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) el.removeAttribute('href');
      } else if (el.tagName === 'IMG' && name === 'src') {
        // keep src
      } else {
        el.removeAttribute(attr.name);
      }
    });
    if (el.tagName === 'A' && el.hasAttribute('href')) {
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
    }
  });
  return root.innerHTML;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function storyImage(blog) {
  return blog.image || BlogStore.coverFor(blog.category);
}

function actorId() {
  const user = BlogStore.currentUser();
  return (user && user.id) ? user.id : BlogStore.guestId();
}

function matchesQuery(blog, query) {
  if (!query) return true;
  const haystack = [
    blog.title, blog.description,
    BlogUI.plainText(blog.content),
    blog.category,
    blog.author?.fullName || '',
    blog.author?.username || '',
  ].join(' ').toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => haystack.includes(w));
}

function authorName(blog) {
  if (blog.author && blog.author.fullName) return blog.author.fullName;
  return 'Unknown author';
}

// ── Blog card markup (home feed & related) ───────────────────────────────

function cardMarkup(blog, modifier) {
  const name   = authorName(blog);
  const liked  = blog.liked || false;
  const count  = blog.likesCount != null ? blog.likesCount : 0;
  const href   = `blog-details.html?id=${encodeURIComponent(blog.id)}`;
  return `
    <article class="card ${modifier || ''}">
      <a class="card-media" href="${href}" tabindex="-1" aria-hidden="true">
        <img src="${BlogUI.escapeHtml(storyImage(blog))}" alt=""
             data-fallback="${BlogUI.escapeHtml(BlogStore.coverFor(blog.category))}">
      </a>
      <div class="card-body">
        <div class="card-top">
          <a class="pill" data-category="${BlogUI.escapeHtml(blog.category)}"
             href="index.html?category=${encodeURIComponent(blog.category)}">
            ${BlogUI.escapeHtml(blog.category)}
          </a>
          <button class="like-btn ${liked ? 'is-liked' : ''}" type="button"
                  data-like="${BlogUI.escapeHtml(blog.id)}"
                  aria-pressed="${liked}"
                  aria-label="${liked ? 'Unlike' : 'Like'} this story">
            <i class="${liked ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i>
            <span>${count}</span>
          </button>
        </div>
        <h3><a href="${href}">${BlogUI.escapeHtml(blog.title)}</a></h3>
        <p>${BlogUI.escapeHtml(blog.description)}</p>
        <div class="card-foot">
          <span class="avatar" aria-hidden="true">${BlogUI.escapeHtml(BlogUI.initial(name))}</span>
          <div>
            <strong>${BlogUI.escapeHtml(name)}</strong>
            <small>
              ${BlogUI.escapeHtml(BlogUI.formatDate(blog.publishedAt))}
              · ${BlogUI.readTime(blog.content)} min read
            </small>
          </div>
          <a class="read-more" href="${href}">
            Read more <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </a>
        </div>
      </div>
    </article>
  `;
}

function rankStories(posts) {
  const byDate = (a, b) =>
    new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt);
  return [
    ...posts.filter((p) => p.featured).sort(byDate),
    ...posts.filter((p) => !p.featured).sort(byDate),
  ];
}

// ═════════════════════════════════════════════════════════════════════════════
// HOME PAGE
// ═════════════════════════════════════════════════════════════════════════════
async function initHome() {
  const featuredSection = document.getElementById('featured-section');
  const featuredGrid    = document.getElementById('featured-grid');
  const latestSection   = document.getElementById('latest-section');
  const latestGrid      = document.getElementById('latest-grid');
  const latestTitle     = document.getElementById('latest-title');
  const empty           = document.getElementById('home-empty');
  const summary         = document.getElementById('result-summary');
  const categoryBar     = document.getElementById('category-bar');
  const heroSearch      = document.getElementById('hero-search');
  const storyCount      = document.getElementById('story-count');
  const params          = new URLSearchParams(window.location.search);

  let query    = (params.get('q') || '').trim();
  let category = params.get('category') || 'All';
  if (category !== 'All' && !BlogStore.CATEGORIES.includes(category)) category = 'All';

  // Category chips
  categoryBar.innerHTML = ['All', ...BlogStore.CATEGORIES].map((name) => `
    <button type="button" class="chip ${name === category ? 'is-active' : ''}"
            data-category="${BlogUI.escapeHtml(name)}">
      ${BlogUI.escapeHtml(name)}
    </button>
  `).join('');

  const heroInput = heroSearch.elements.q;
  heroInput.value = query;

  function syncSearch(value) {
    document.querySelectorAll('[data-search]').forEach((el) => {
      if (el !== document.activeElement) el.value = value;
    });
    heroInput.value = value;
  }

  async function render() {
    // Loading state
    latestGrid.innerHTML = `
      <div style="grid-column:1/-1;padding:3rem 1rem;text-align:center;color:var(--muted);">
        <span class="spinner" style="display:inline-block;width:1.6em;height:1.6em;vertical-align:middle;
              border:2px solid currentColor;border-right-color:transparent;border-radius:50%;
              animation:spin .7s linear infinite;margin-right:.5em;"></span>
        Loading stories…
      </div>`;
    featuredSection.hidden = true;
    empty.innerHTML = '';

    const published = await BlogStore.getPublishedBlogs({ q: query, category });

    storyCount.textContent = String(published.length);
    categoryBar.querySelectorAll('.chip').forEach((chip) => {
      chip.classList.toggle('is-active', chip.dataset.category === category);
    });

    // Sync URL
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
    if (category !== 'All') url.searchParams.set('category', category);
    else url.searchParams.delete('category');
    window.history.replaceState({}, '', url);

    // Summary
    const bits = [`${published.length} ${published.length === 1 ? 'story' : 'stories'}`];
    if (category !== 'All') bits.push(`in ${category}`);
    if (query) bits.push(`for "${query}"`);
    summary.textContent = `Showing ${bits.join(' ')}.`;

    featuredGrid.innerHTML = '';
    latestGrid.innerHTML   = '';
    empty.innerHTML        = '';

    if (!published.length) {
      featuredSection.hidden = true;
      latestSection.hidden   = true;
      empty.innerHTML = BlogUI.emptyState({
        title: query || category !== 'All' ? 'No matching stories' : 'No published stories yet',
        text: query || category !== 'All'
          ? 'Try another word, or clear the filters to see the full journal.'
          : 'Published stories will appear here. Drafts stay on the author\'s dashboard.',
        actionHref:  query || category !== 'All' ? 'index.html' : 'register.html',
        actionLabel: query || category !== 'All' ? 'Clear filters' : 'Start writing',
      });
      const clear = empty.querySelector('a');
      if (clear && (query || category !== 'All')) {
        clear.addEventListener('click', (e) => {
          e.preventDefault();
          query = ''; category = 'All';
          syncSearch('');
          render();
        });
      }
      return;
    }

    const ranked      = rankStories(published);
    const useFeatured = ranked.length >= 3 && !query && category === 'All';

    if (useFeatured) {
      featuredSection.hidden = false;
      const [lead, ...side]  = ranked.slice(0, 3);
      featuredGrid.innerHTML = `
        ${cardMarkup(lead, 'card-lead')}
        <div class="feature-side">${side.map((b) => cardMarkup(b, 'card-side')).join('')}</div>
      `;
      const rest = ranked.slice(3);
      latestTitle.textContent = 'Latest articles';
      latestSection.hidden    = rest.length === 0;
      latestGrid.innerHTML    = rest.map((b) => cardMarkup(b)).join('');
      if (!rest.length) empty.innerHTML = '<p class="caught-up">You are up to date.</p>';
    } else {
      featuredSection.hidden  = true;
      latestSection.hidden    = false;
      latestTitle.textContent = query || category !== 'All' ? 'Matching stories' : 'Latest articles';
      latestGrid.innerHTML    = ranked.map((b) => cardMarkup(b)).join('');
    }
  }

  // Events
  heroSearch.addEventListener('submit', (e) => {
    e.preventDefault();
    query = heroInput.value.trim();
    syncSearch(query);
    render();
  });
  heroInput.addEventListener('input', () => {
    query = heroInput.value.trim();
    const nav = document.getElementById('nav-q');
    if (nav) nav.value = heroInput.value;
    render();
  });

  const navForm  = document.querySelector('.nav-search');
  const navInput = document.getElementById('nav-q');
  if (navForm && navInput) {
    navForm.addEventListener('submit', (e) => {
      e.preventDefault();
      query = navInput.value.trim();
      syncSearch(query);
      render();
    });
    navInput.addEventListener('input', () => {
      query = navInput.value.trim();
      heroInput.value = navInput.value;
      render();
    });
  }

  categoryBar.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-category]');
    if (!chip) return;
    category = chip.dataset.category;
    render();
    document.getElementById('stories')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  });

  render();
}

// ═════════════════════════════════════════════════════════════════════════════
// BLOG DETAILS PAGE
// ═════════════════════════════════════════════════════════════════════════════
async function initDetails() {
  const heroSlot       = document.getElementById('article-hero-slot');
  const articleContent = document.getElementById('article-content');
  const articleSkeleton = document.getElementById('article-skeleton');
  const articleSidebar = document.getElementById('article-sidebar');
  const relatedSection = document.getElementById('related-section');
  const relatedGrid    = document.getElementById('related-grid');
  const progressBar    = document.getElementById('read-progress');
  const params         = new URLSearchParams(window.location.search);
  const blogId         = params.get('id');

  // ── Reading progress ──────────────────────────────────────────────────
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const docH   = document.documentElement.scrollHeight - window.innerHeight;
      const pct    = docH > 0 ? Math.min(100, (window.scrollY / docH) * 100) : 0;
      progressBar.style.width = `${pct}%`;
      progressBar.setAttribute('aria-valuenow', Math.round(pct));
    }, { passive: true });
  }

  // ── Validate ID early ─────────────────────────────────────────────────
  if (!blogId || !/^[a-f0-9]{24}$/i.test(blogId)) {
    showError('Invalid story link', 'The blog ID in the URL is not valid. Please go back and try again.');
    return;
  }

  // ── Fetch ─────────────────────────────────────────────────────────────
  const blog = await BlogStore.getBlog(blogId);
  const me   = BlogStore.currentUser();

  // ── Not found / access denied ─────────────────────────────────────────
  if (!blog) {
    showError('Story not found', 'This story may have been deleted or the link is out of date.');
    return;
  }
  if (blog.status === 'draft') {
    const ownerId = blog.authorId || (blog.author && blog.author.id);
    if (!me || me.id !== ownerId) {
      showError('Story unavailable', 'This story is a draft and only visible to its author.');
      return;
    }
  }

  // ── Meta ──────────────────────────────────────────────────────────────
  document.title = `${blog.title} — BlogSphere`;
  document.querySelector('meta[name="description"]').setAttribute(
    'content', blog.description || `Read "${blog.title}" on BlogSphere`
  );

  const name       = authorName(blog);
  const liked      = blog.liked  || false;
  const likeCount  = blog.likesCount != null ? blog.likesCount : 0;
  const readMins   = BlogUI.readTime(blog.content);
  const ownerId    = blog.authorId || (blog.author && blog.author.id);
  const isOwner    = Boolean(me && me.id === ownerId);

  // ── Hide skeleton, show content ───────────────────────────────────────
  if (articleSkeleton) articleSkeleton.hidden = true;
  articleContent.hidden = false;

  // ── Hero image ────────────────────────────────────────────────────────
  if (heroSlot) {
    heroSlot.innerHTML = `
      <div class="article-hero">
        <img src="${BlogUI.escapeHtml(storyImage(blog))}"
             alt="${BlogUI.escapeHtml(blog.title)}"
             data-fallback="${BlogUI.escapeHtml(BlogStore.coverFor(blog.category))}">
      </div>`;
  }

  // ── Draft notice ──────────────────────────────────────────────────────
  const draftNotice = blog.status === 'draft'
    ? `<div class="draft-notice" role="alert">
         <i class="fa-solid fa-eye-slash" aria-hidden="true"></i>
         This story is a draft — only you can see it.
       </div>`
    : '';

  // ── Build table of contents from h2/h3 in content ────────────────────
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = sanitizeHtml(blog.content);
  const headings  = [...tempDiv.querySelectorAll('h2, h3')];
  let tocHtml = '';
  if (headings.length >= 2) {
    // Add IDs to headings in content
    headings.forEach((h, i) => { h.id = `section-${i}`; });
    tocHtml = `
      <div class="sidebar-card">
        <h3>In this article</h3>
        <ul class="toc-list">
          ${headings.map((h, i) => `
            <li>
              <a href="#section-${i}" style="padding-left:${h.tagName === 'H3' ? '1rem' : '0'}">
                ${BlogUI.escapeHtml(h.textContent)}
              </a>
            </li>`).join('')}
        </ul>
      </div>`;
  }

  // ── Author bio card ───────────────────────────────────────────────────
  const bio      = blog.author?.bio || '';
  const authorCard = `
    <div class="sidebar-card author-block">
      <h3>Written by</h3>
      <div class="byline-avatar">${BlogUI.escapeHtml(BlogUI.initial(name))}</div>
      <strong>${BlogUI.escapeHtml(name)}</strong>
      ${blog.author?.username ? `<small style="color:var(--muted)">@${BlogUI.escapeHtml(blog.author.username)}</small>` : ''}
      ${bio ? `<p class="author-bio">${BlogUI.escapeHtml(bio)}</p>` : ''}
    </div>`;

  // ── Share card ────────────────────────────────────────────────────────
  const shareCard = `
    <div class="sidebar-card">
      <h3>Share this story</h3>
      <div class="share-row">
        <button class="share-btn" id="share-copy" title="Copy link" aria-label="Copy link to clipboard">
          <i class="fa-solid fa-link" aria-hidden="true"></i>
        </button>
        <a class="share-btn" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(window.location.href)}"
           target="_blank" rel="noopener noreferrer" title="Share on X" aria-label="Share on X">
          <i class="fa-brands fa-x-twitter" aria-hidden="true"></i>
        </a>
        <a class="share-btn" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}"
           target="_blank" rel="noopener noreferrer" title="Share on LinkedIn" aria-label="Share on LinkedIn">
          <i class="fa-brands fa-linkedin-in" aria-hidden="true"></i>
        </a>
      </div>
    </div>`;

  // ── Inject sidebar ────────────────────────────────────────────────────
  if (articleSidebar) {
    articleSidebar.innerHTML = authorCard + tocHtml + shareCard;
    articleSidebar.hidden    = false;
  }

  // ── Article HTML ──────────────────────────────────────────────────────
  articleContent.innerHTML = `
    ${draftNotice}

    <div class="article-category-badge">
      <a class="pill" data-category="${BlogUI.escapeHtml(blog.category)}"
         href="index.html?category=${encodeURIComponent(blog.category)}">
        ${BlogUI.escapeHtml(blog.category)}
      </a>
    </div>

    <h1 class="article-title">${BlogUI.escapeHtml(blog.title)}</h1>

    ${blog.description
      ? `<p class="article-lede">${BlogUI.escapeHtml(blog.description)}</p>`
      : ''}

    <div class="article-byline">
      <div class="byline-avatar" aria-hidden="true">
        ${BlogUI.escapeHtml(BlogUI.initial(name))}
      </div>
      <div class="byline-info">
        <span class="byline-name">${BlogUI.escapeHtml(name)}</span>
        <span class="byline-meta">
          <span>${BlogUI.escapeHtml(BlogUI.formatDate(blog.publishedAt || blog.updatedAt))}</span>
          <span class="byline-dot">·</span>
          <span>${readMins} min read</span>
          ${blog.status === 'draft'
            ? `<span class="byline-dot">·</span>
               <span class="badge badge-draft" style="font-size:.78rem">Draft</span>`
            : ''}
        </span>
      </div>
      <div class="byline-actions">
        ${blog.status === 'published'
          ? `<button class="like-btn ${liked ? 'is-liked' : ''} btn btn-ghost"
                     type="button"
                     data-like="${BlogUI.escapeHtml(blog.id)}"
                     aria-pressed="${liked}"
                     aria-label="${liked ? 'Unlike' : 'Like'} this story"
                     style="border-radius:999px;padding:.5rem .9rem;gap:.4rem;">
               <i class="${liked ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i>
               <span id="like-count-main">${likeCount}</span>
             </button>`
          : ''}
        ${isOwner
          ? `<a class="btn btn-ghost"
                href="create-blog.html?id=${encodeURIComponent(blog.id)}">
               <i class="fa-solid fa-pen" aria-hidden="true"></i> Edit
             </a>
             <button class="btn btn-danger" type="button" id="delete-story">
               <i class="fa-solid fa-trash" aria-hidden="true"></i> Delete
             </button>`
          : ''}
      </div>
    </div>

    <div class="article-prose" id="article-prose">
      ${tempDiv.innerHTML}
    </div>

    <footer class="article-footer">
      <div class="article-tags">
        <a class="pill" data-category="${BlogUI.escapeHtml(blog.category)}"
           href="index.html?category=${encodeURIComponent(blog.category)}">
          ${BlogUI.escapeHtml(blog.category)}
        </a>
      </div>
      ${blog.status === 'published'
        ? `<button class="like-btn ${liked ? 'is-liked' : ''} btn btn-ghost"
                   type="button"
                   data-like="${BlogUI.escapeHtml(blog.id)}"
                   aria-pressed="${liked}"
                   aria-label="${liked ? 'Unlike' : 'Like'} this story"
                   style="margin-left:auto;border-radius:999px;padding:.5rem .9rem;gap:.4rem;">
             <i class="${liked ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i>
             <span>${likeCount}</span>
           </button>`
        : ''}
      <a class="btn btn-ghost" href="index.html">
        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back to stories
      </a>
    </footer>
  `;

  // ── Smooth scroll for ToC links ───────────────────────────────────────
  document.querySelectorAll('.toc-list a').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    });
  });

  // ── Copy link ─────────────────────────────────────────────────────────
  document.getElementById('share-copy')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      BlogUI.toast('Link copied to clipboard.', 'success');
    } catch (_) {
      BlogUI.toast('Copy the address from the browser bar.', 'info');
    }
  });

  // ── Delete ────────────────────────────────────────────────────────────
  document.getElementById('delete-story')?.addEventListener('click', async () => {
    const yes = await BlogUI.confirm({
      title: 'Delete this story?',
      message: `"${blog.title}" will be permanently removed. This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!yes) return;
    const result = await BlogStore.deleteBlog(blog.id, me && me.id);
    if (!result.ok) { BlogUI.toast(result.message, 'error'); return; }
    BlogUI.flash('Story deleted.');
    window.location.href = blog.status === 'draft' ? 'dashboard.html#posts' : 'index.html';
  });

  // ── Related stories ───────────────────────────────────────────────────
  if (blog.status === 'published') {
    const related = await BlogStore.getPublishedBlogs({ category: blog.category });
    const others  = related.filter((b) => b.id !== blog.id).slice(0, 3);
    if (others.length) {
      relatedSection.hidden = false;
      relatedGrid.innerHTML = others.map((b) => cardMarkup(b)).join('');
    }
  }

  // ── Helper: show error state ──────────────────────────────────────────
  function showError(title, text) {
    if (articleSkeleton) articleSkeleton.hidden = true;
    articleContent.hidden = false;
    articleContent.innerHTML = `
      <div class="error-state">
        <div class="error-icon"><i class="fa-regular fa-file-lines" aria-hidden="true"></i></div>
        <h1>${BlogUI.escapeHtml(title)}</h1>
        <p>${BlogUI.escapeHtml(text)}</p>
        <a class="btn btn-primary" href="index.html">
          <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back to stories
        </a>
      </div>`;
    relatedSection.hidden = true;
    document.title = `${title} — BlogSphere`;
  }
}

// ── showError is used before the function body closes — hoist it ──────────
// (declared inside initDetails via closure; also defined here as module-level
//  for the early-exit paths before blog is fetched)
function showErrorPage(title, text) {
  const articleContent  = document.getElementById('article-content');
  const articleSkeleton = document.getElementById('article-skeleton');
  const relatedSection  = document.getElementById('related-section');
  if (articleSkeleton) articleSkeleton.hidden = true;
  if (articleContent)  { articleContent.hidden = false; }
  if (articleContent) {
    articleContent.innerHTML = `
      <div class="error-state">
        <div class="error-icon"><i class="fa-regular fa-file-lines" aria-hidden="true"></i></div>
        <h1>${BlogUI.escapeHtml(title)}</h1>
        <p>${BlogUI.escapeHtml(text)}</p>
        <a class="btn btn-primary" href="index.html">
          <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back to stories
        </a>
      </div>`;
  }
  if (relatedSection) relatedSection.hidden = true;
  document.title = `${title} — BlogSphere`;
}

// ═════════════════════════════════════════════════════════════════════════════
// IMAGE RESIZE (editor upload helper)
// ═════════════════════════════════════════════════════════════════════════════
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const url   = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const max = 1400;
      let w = image.width, h = image.height;
      if (w > max) { h = Math.round(h * max / w); w = max; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(image, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file could not be read as an image.'));
    };
    image.src = url;
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// BLOG EDITOR
// ═════════════════════════════════════════════════════════════════════════════
async function initEditor() {
  const user = BlogStore.currentUser();
  if (!user) {
    window.location.replace('login.html?next=create-blog.html');
    return;
  }

  const form          = document.getElementById('blog-form');
  const editor        = document.getElementById('editor');
  const preview       = document.getElementById('image-preview');
  const wordCount     = document.getElementById('word-count');
  const heading       = document.getElementById('editor-heading');
  const statusLabel   = document.getElementById('editor-status');
  const publishButton = document.getElementById('publish-blog');
  const draftButton   = document.getElementById('save-draft');
  const params        = new URLSearchParams(window.location.search);
  const existing      = params.get('id') ? await BlogStore.getBlog(params.get('id')) : null;
  let imageData = '';
  let dirty     = false;

  if (existing) {
    const ownerId = existing.authorId || (existing.author && existing.author.id);
    if (ownerId !== user.id) {
      BlogUI.flash('You can only edit your own stories.', 'error');
      window.location.replace('dashboard.html');
      return;
    }
  }

  // Populate category select
  BlogStore.CATEGORIES.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    form.elements.category.appendChild(opt);
  });

  function updatePreview() {
    preview.src    = imageData || BlogStore.coverFor(form.elements.category.value || 'Technology');
    preview.hidden = false;
  }

  function updateWords() {
    const text  = editor.textContent.replace(/\u00a0/g, ' ').trim();
    editor.classList.toggle('is-empty', !text);
    const words = text ? text.split(/\s+/).length : 0;
    const mins  = Math.max(1, Math.round(words / 200));
    wordCount.textContent = words
      ? `${words} ${words === 1 ? 'word' : 'words'} · ${mins} min read`
      : 'Start writing to see a reading time.';
  }

  if (existing) {
    form.elements.title.value       = existing.title;
    form.elements.description.value = existing.description;
    form.elements.category.value    = existing.category;
    form.elements.imageUrl.value    = (existing.image || '').startsWith('data:') ? '' : (existing.image || '');
    form.elements.featured.checked  = existing.featured;
    editor.innerHTML                = sanitizeHtml(existing.content);
    imageData                       = existing.image || '';
    heading.textContent             = 'Edit story';
    document.title                  = 'Edit story — BlogSphere';
    statusLabel.textContent         = existing.status === 'published' ? 'Editing a published story' : 'Editing a draft';
    publishButton.textContent       = existing.status === 'published' ? 'Update story' : 'Publish';
    publishButton.dataset.label     = publishButton.textContent;
  } else {
    form.elements.category.value = 'Technology';
    statusLabel.textContent      = 'New story';
  }

  updatePreview();
  updateWords();
  dirty = false;

  form.addEventListener('input',   () => { dirty = true; });
  editor.addEventListener('input', () => { dirty = true; updateWords(); });
  form.elements.category.addEventListener('change', () => {
    if (!imageData || imageData.startsWith('assets/images/')) { imageData = ''; updatePreview(); }
  });

  // Toolbar commands
  form.querySelectorAll('[data-command]').forEach((btn) => {
    btn.addEventListener('click', () => {
      editor.focus();
      document.execCommand('styleWithCSS', false, false);
      document.execCommand(btn.dataset.command, false, btn.dataset.value || null);
      dirty = true; updateWords();
    });
  });

  document.getElementById('editor-link')?.addEventListener('click', async () => {
    editor.focus();
    const url = await BlogUI.prompt({ title: 'Insert a link', label: 'Link address', confirmText: 'Add link' });
    if (!url) return;
    editor.focus();
    document.execCommand('createLink', false, url);
    dirty = true;
  });

  // Image URL
  form.elements.imageUrl.addEventListener('change', () => {
    const val = form.elements.imageUrl.value.trim();
    if (!val) { imageData = ''; updatePreview(); return; }
    if (!/^https?:\/\//i.test(val) && !val.startsWith('assets/')) {
      BlogUI.setFieldError(form, 'imageUrl', 'Use a full http or https image address.');
      return;
    }
    const p = new Image();
    p.onload  = () => { BlogUI.setFieldError(form, 'imageUrl', ''); imageData = val; updatePreview(); };
    p.onerror = () => BlogUI.setFieldError(form, 'imageUrl', 'That image address could not be loaded.');
    p.src = val;
  });

  // Image file
  form.elements.imageFile.addEventListener('change', async () => {
    const file = form.elements.imageFile.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { BlogUI.toast('Choose an image file.', 'error'); form.elements.imageFile.value = ''; return; }
    if (file.size > 8 * 1024 * 1024) { BlogUI.toast('Image must be under 8 MB.', 'error'); form.elements.imageFile.value = ''; return; }
    try {
      const dataUrl = await resizeImage(file);
      if (dataUrl.length > 500000) { BlogUI.toast('Image is too large. Try a smaller photo.', 'error'); return; }
      imageData = dataUrl;
      form.elements.imageUrl.value = '';
      BlogUI.setFieldError(form, 'imageUrl', '');
      updatePreview(); dirty = true;
    } catch (err) {
      BlogUI.toast(err.message || 'Image could not be prepared.', 'error');
    }
  });

  document.getElementById('clear-image')?.addEventListener('click', () => {
    imageData = ''; form.elements.imageUrl.value = ''; form.elements.imageFile.value = '';
    updatePreview(); dirty = true;
  });

  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault();
  });

  const discard = document.getElementById('discard-link');
  discard?.addEventListener('click', async (e) => {
    if (!dirty) return;
    e.preventDefault();
    const yes = await BlogUI.confirm({ title: 'Discard changes?', message: 'Your unsaved edits will be lost.', confirmText: 'Discard', danger: true });
    if (yes) window.location.href = discard.href;
  });

  function validate(status) {
    BlogUI.clearFieldErrors(form);
    const title    = form.elements.title.value.trim();
    const desc     = form.elements.description.value.trim();
    const bodyText = editor.textContent.replace(/\u00a0/g, ' ').trim();
    let invalid    = false;
    if (title.length < 4)   { BlogUI.setFieldError(form, 'title', 'Title must be at least 4 characters.'); invalid = true; }
    if (title.length > 140) { BlogUI.setFieldError(form, 'title', 'Title cannot exceed 140 characters.');  invalid = true; }
    if (!BlogStore.CATEGORIES.includes(form.elements.category.value)) { BlogUI.setFieldError(form, 'category', 'Choose a category.'); invalid = true; }
    if (status === 'published') {
      if (desc.length < 20)     { BlogUI.setFieldError(form, 'description', 'Add at least 20 characters for the description.'); invalid = true; }
      if (bodyText.length < 40) { BlogUI.setFieldError(form, 'content', 'Write at least a paragraph before publishing.');        invalid = true; }
    }
    if (desc.length > 300) { BlogUI.setFieldError(form, 'description', 'Description cannot exceed 300 characters.'); invalid = true; }
    if (invalid) { BlogUI.focusFirstInvalid(form); BlogUI.toast('Check the highlighted fields.', 'error'); }
    return !invalid;
  }

  async function persist(status, btn, busyLabel) {
    if (!validate(status)) return;
    BlogUI.setBusy(btn, true, busyLabel);
    try {
      const result = await BlogStore.saveBlog({
        id:          existing?.id,
        authorId:    user.id,
        title:       form.elements.title.value.trim(),
        description: form.elements.description.value.trim(),
        content:     sanitizeHtml(editor.innerHTML),
        category:    form.elements.category.value,
        image:       imageData,
        featured:    form.elements.featured.checked,
        status,
      });
      if (!result.ok) { BlogUI.setBusy(btn, false, busyLabel); BlogUI.toast(result.message, 'error'); return; }
      const msg = status === 'draft' ? 'Draft saved.' : (existing?.status === 'published' ? 'Story updated.' : 'Story published.');
      BlogUI.flash(msg);
      window.location.href = 'dashboard.html#posts';
    } catch (err) {
      BlogUI.setBusy(btn, false, busyLabel);
      BlogUI.toast(err.message || 'The story could not be saved.', 'error');
    }
  }

  draftButton?.addEventListener('click', () => persist('draft', draftButton, 'Saving draft'));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    persist('published', publishButton, existing?.status === 'published' ? 'Updating' : 'Publishing');
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// GLOBAL: like button click handler
// ═════════════════════════════════════════════════════════════════════════════
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-like]');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const result = await BlogStore.toggleLike(btn.dataset.like, actorId());
  if (!result.ok) return;
  // Update ALL like buttons with this blog ID on the page
  document.querySelectorAll(`[data-like="${CSS.escape(btn.dataset.like)}"]`).forEach((el) => {
    el.classList.toggle('is-liked', result.liked);
    el.setAttribute('aria-pressed', String(result.liked));
    el.setAttribute('aria-label', (result.liked ? 'Unlike' : 'Like') + ' this story');
    const icon  = el.querySelector('i');
    const count = el.querySelector('span');
    if (icon)  icon.className = result.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    if (count) count.textContent = String(result.count);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GLOBAL: image fallback on broken src
// ═════════════════════════════════════════════════════════════════════════════
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!img || img.tagName !== 'IMG' || !img.dataset.fallback || img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = '1';
  img.src = img.dataset.fallback;
}, true);

// ═════════════════════════════════════════════════════════════════════════════
// Register pages with BlogApp boot system
// ═════════════════════════════════════════════════════════════════════════════
BlogApp.register('home',    initHome);
BlogApp.register('details', initDetails);
BlogApp.register('editor',  initEditor);
