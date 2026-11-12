/**
 * Home feed, story pages, likes, and the story editor.
 */
'use strict';

const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A']);
const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META']);

function sanitizeHtml(unsafe) {
  const root = document.createElement('div');
  root.innerHTML = unsafe || '';
  [...root.querySelectorAll('*')].forEach((element) => {
    if (DROP_TAGS.has(element.tagName)) {
      element.remove();
      return;
    }
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      return;
    }
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (element.tagName === 'A' && name === 'href') {
        const href = attribute.value.trim();
        if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) element.removeAttribute(name);
      } else {
        element.removeAttribute(attribute.name);
      }
    });
    if (element.tagName === 'A' && element.hasAttribute('href')) {
      element.target = '_blank';
      element.rel = 'noopener noreferrer';
    }
  });
  return root.innerHTML;
}

function storyImage(blog) {
  return blog.image || BlogStore.coverFor(blog.category);
}

function actorId() {
  return BlogStore.currentUser()?.id || BlogStore.guestId();
}

function matchesQuery(blog, query) {
  if (!query) return true;
  const author = BlogStore.getUserById(blog.authorId);
  const haystack = [
    blog.title,
    blog.description,
    BlogUI.plainText(blog.content),
    blog.category,
    author?.fullName,
    author?.username
  ].join(' ').toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

function cardMarkup(blog, modifier) {
  const author = BlogStore.getUserById(blog.authorId);
  const authorName = author?.fullName || 'Unknown author';
  const like = BlogStore.getLikeState(blog.id, actorId());
  const href = `blog-details.html?id=${encodeURIComponent(blog.id)}`;
  return `
    <article class="card ${modifier || ''}">
      <a class="card-media" href="${href}" tabindex="-1" aria-hidden="true">
        <img src="${BlogUI.escapeHtml(storyImage(blog))}" alt="" data-fallback="${BlogUI.escapeHtml(BlogStore.coverFor(blog.category))}">
      </a>
      <div class="card-body">
        <div class="card-top">
          <a class="pill" data-category="${BlogUI.escapeHtml(blog.category)}" href="index.html?category=${encodeURIComponent(blog.category)}">${BlogUI.escapeHtml(blog.category)}</a>
          <button class="like-btn ${like.liked ? 'is-liked' : ''}" type="button" data-like="${BlogUI.escapeHtml(blog.id)}" aria-pressed="${like.liked ? 'true' : 'false'}" aria-label="${like.liked ? 'Unlike this story' : 'Like this story'}">
            <i class="${like.liked ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i>
            <span>${like.count}</span>
          </button>
        </div>
        <h3><a href="${href}">${BlogUI.escapeHtml(blog.title)}</a></h3>
        <p>${BlogUI.escapeHtml(blog.description)}</p>
        <div class="card-foot">
          <span class="avatar" aria-hidden="true">${BlogUI.escapeHtml(BlogUI.initial(authorName))}</span>
          <div>
            <strong>${BlogUI.escapeHtml(authorName)}</strong>
            <small>${BlogUI.escapeHtml(BlogUI.formatDate(blog.publishedAt))} · ${BlogUI.readTime(blog.content)} min read</small>
          </div>
          <a class="read-more" href="${href}">Read more <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
        </div>
      </div>
    </article>
  `;
}

function rankStories(posts) {
  const byDate = (a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt);
  return [
    ...posts.filter((post) => post.featured).sort(byDate),
    ...posts.filter((post) => !post.featured).sort(byDate)
  ];
}

function initHome() {
  const featuredSection = document.getElementById('featured-section');
  const featuredGrid = document.getElementById('featured-grid');
  const latestSection = document.getElementById('latest-section');
  const latestGrid = document.getElementById('latest-grid');
  const latestTitle = document.getElementById('latest-title');
  const empty = document.getElementById('home-empty');
  const summary = document.getElementById('result-summary');
  const categoryBar = document.getElementById('category-bar');
  const heroSearch = document.getElementById('hero-search');
  const storyCount = document.getElementById('story-count');
  const params = new URLSearchParams(window.location.search);
  let query = (params.get('q') || '').trim();
  let category = params.get('category') || 'All';
  if (category !== 'All' && !BlogStore.CATEGORIES.includes(category)) category = 'All';

  categoryBar.innerHTML = ['All', ...BlogStore.CATEGORIES].map((name) => {
    return `<button type="button" class="chip ${name === category ? 'is-active' : ''}" data-category="${BlogUI.escapeHtml(name)}">${BlogUI.escapeHtml(name)}</button>`;
  }).join('');

  const heroInput = heroSearch.elements.q;
  heroInput.value = query;

  function syncSearch(value) {
    document.querySelectorAll('[data-search]').forEach((input) => {
      if (input !== document.activeElement) input.value = value;
    });
    heroInput.value = value;
  }

  function render() {
    const published = BlogStore.getPublishedBlogs().filter((blog) => {
      const categoryOk = category === 'All' || blog.category === category;
      return categoryOk && matchesQuery(blog, query);
    });
    storyCount.textContent = String(BlogStore.getPublishedBlogs().length);
    categoryBar.querySelectorAll('.chip').forEach((chip) => {
      chip.classList.toggle('is-active', chip.dataset.category === category);
    });

    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', query);
    else url.searchParams.delete('q');
    if (category !== 'All') url.searchParams.set('category', category);
    else url.searchParams.delete('category');
    window.history.replaceState({}, '', url);

    const bits = [];
    bits.push(`${published.length} ${published.length === 1 ? 'story' : 'stories'}`);
    if (category !== 'All') bits.push(`in ${category}`);
    if (query) bits.push(`for “${query}”`);
    summary.textContent = `Showing ${bits.join(' ')}.`;

    featuredGrid.innerHTML = '';
    latestGrid.innerHTML = '';
    empty.innerHTML = '';

    if (!published.length) {
      featuredSection.hidden = true;
      latestSection.hidden = true;
      empty.innerHTML = BlogUI.emptyState({
        title: query || category !== 'All' ? 'No matching stories' : 'No published stories yet',
        text: query || category !== 'All'
          ? 'Try another word, or clear the filters to see the full journal.'
          : 'Published stories will appear here. Drafts stay on the author’s dashboard.',
        actionHref: query || category !== 'All' ? 'index.html' : 'register.html',
        actionLabel: query || category !== 'All' ? 'Clear filters' : 'Start writing'
      });
      if (query || category !== 'All') {
        const clear = empty.querySelector('a');
        clear.addEventListener('click', (event) => {
          event.preventDefault();
          query = '';
          category = 'All';
          syncSearch('');
          render();
        });
      }
      return;
    }

    const ranked = rankStories(published);
    const useFeatured = ranked.length >= 3 && !query && category === 'All';
    if (useFeatured) {
      featuredSection.hidden = false;
      const [lead, ...side] = ranked.slice(0, 3);
      featuredGrid.innerHTML = `
        ${cardMarkup(lead, 'card-lead')}
        <div class="feature-side">
          ${side.map((blog) => cardMarkup(blog, 'card-side')).join('')}
        </div>
      `;
      const rest = ranked.slice(3);
      latestTitle.textContent = 'Latest articles';
      latestSection.hidden = rest.length === 0;
      latestGrid.innerHTML = rest.map((blog) => cardMarkup(blog)).join('');
      if (!rest.length) {
        empty.innerHTML = '<p class="caught-up">You are up to date. Those three are the featured stories.</p>';
      }
    } else {
      featuredSection.hidden = true;
      latestSection.hidden = false;
      latestTitle.textContent = query || category !== 'All' ? 'Matching stories' : 'Latest articles';
      latestGrid.innerHTML = ranked.map((blog) => cardMarkup(blog)).join('');
    }
  }

  heroSearch.addEventListener('submit', (event) => {
    event.preventDefault();
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

  const navForm = document.querySelector('.nav-search');
  const navInput = document.getElementById('nav-q');
  if (navForm && navInput) {
    navForm.addEventListener('submit', (event) => {
      event.preventDefault();
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

  categoryBar.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-category]');
    if (!chip) return;
    category = chip.dataset.category;
    render();
    document.getElementById('stories').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  render();
}

function initDetails() {
  const root = document.getElementById('article-root');
  const relatedSection = document.getElementById('related-section');
  const relatedGrid = document.getElementById('related-grid');
  const params = new URLSearchParams(window.location.search);
  const blog = BlogStore.getBlog(params.get('id'));
  const me = BlogStore.currentUser();

  if (!blog || (blog.status !== 'published' && (!me || me.id !== blog.authorId))) {
    document.title = 'Story not found — BlogSphere';
    relatedSection.hidden = true;
    root.innerHTML = BlogUI.emptyState({
      title: 'This story is unavailable',
      text: 'It may be a draft, or the link may be out of date.',
      actionHref: 'index.html',
      actionLabel: 'Back to stories'
    });
    return;
  }

  const author = BlogStore.getUserById(blog.authorId);
  const authorName = author?.fullName || 'Unknown author';
  const like = BlogStore.getLikeState(blog.id, actorId());
  const owner = me && me.id === blog.authorId;
  document.title = `${blog.title} — BlogSphere`;

  root.innerHTML = `
    ${blog.status === 'draft' ? '<p class="draft-banner">This story is a draft. Only you can see it.</p>' : ''}
    <header class="article-head">
      <a class="pill" data-category="${BlogUI.escapeHtml(blog.category)}" href="index.html?category=${encodeURIComponent(blog.category)}">${BlogUI.escapeHtml(blog.category)}</a>
      <h1>${BlogUI.escapeHtml(blog.title)}</h1>
      <p class="lede">${BlogUI.escapeHtml(blog.description)}</p>
      <div class="article-meta">
        <span class="avatar" aria-hidden="true">${BlogUI.escapeHtml(BlogUI.initial(authorName))}</span>
        <div>
          <strong>${BlogUI.escapeHtml(authorName)}</strong>
          <small>${BlogUI.escapeHtml(BlogUI.formatDate(blog.publishedAt || blog.updatedAt))} · ${BlogUI.readTime(blog.content)} min read</small>
        </div>
        <div class="article-actions">
          ${blog.status === 'published' ? `
            <button class="like-btn ${like.liked ? 'is-liked' : ''}" type="button" data-like="${BlogUI.escapeHtml(blog.id)}" aria-pressed="${like.liked ? 'true' : 'false'}" aria-label="${like.liked ? 'Unlike this story' : 'Like this story'}">
              <i class="${like.liked ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i>
              <span>${like.count}</span>
            </button>` : ''}
          <button class="btn btn-ghost" type="button" id="copy-link"><i class="fa-solid fa-link" aria-hidden="true"></i> Copy link</button>
          ${owner ? `<a class="btn btn-ghost" href="create-blog.html?id=${encodeURIComponent(blog.id)}"><i class="fa-solid fa-pen" aria-hidden="true"></i> Edit</a>` : ''}
          ${owner ? `<button class="btn btn-danger" type="button" id="delete-story"><i class="fa-solid fa-trash" aria-hidden="true"></i> Delete</button>` : ''}
        </div>
      </div>
    </header>
    <figure class="article-cover">
      <img src="${BlogUI.escapeHtml(storyImage(blog))}" alt="" data-fallback="${BlogUI.escapeHtml(BlogStore.coverFor(blog.category))}">
    </figure>
    <div class="prose">${sanitizeHtml(blog.content)}</div>
  `;

  document.getElementById('copy-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      BlogUI.toast('Link copied.', 'success');
    } catch (error) {
      BlogUI.toast('Copy the address from the browser bar.', 'info');
    }
  });

  const deleteButton = document.getElementById('delete-story');
  if (deleteButton) {
    deleteButton.addEventListener('click', async () => {
      const yes = await BlogUI.confirm({
        title: 'Delete this story?',
        message: 'This removes the story from this browser. The action cannot be undone.',
        confirmText: 'Delete',
        danger: true
      });
      if (!yes) return;
      const result = BlogStore.deleteBlog(blog.id, me.id);
      if (!result.ok) {
        BlogUI.toast(result.message, 'error');
        return;
      }
      BlogUI.flash('Story deleted.');
      window.location.href = blog.status === 'draft' ? 'dashboard.html#posts' : 'index.html';
    });
  }

  if (blog.status !== 'published') {
    relatedSection.hidden = true;
    return;
  }

  const related = BlogStore.getPublishedBlogs()
    .filter((item) => item.id !== blog.id && item.category === blog.category)
    .slice(0, 3);
  if (!related.length) {
    relatedSection.hidden = true;
    return;
  }
  relatedSection.hidden = false;
  relatedGrid.innerHTML = related.map((item) => cardMarkup(item)).join('');
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const max = 1400;
      let width = image.width;
      let height = image.height;
      if (width > max) {
        height = Math.round(height * (max / width));
        width = max;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(image, 0, 0, width, height);
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

function initEditor() {
  const user = BlogStore.currentUser();
  if (!user) {
    window.location.replace('login.html?next=create-blog.html');
    return;
  }

  const form = document.getElementById('blog-form');
  const editor = document.getElementById('editor');
  const preview = document.getElementById('image-preview');
  const wordCount = document.getElementById('word-count');
  const heading = document.getElementById('editor-heading');
  const statusLabel = document.getElementById('editor-status');
  const publishButton = document.getElementById('publish-blog');
  const draftButton = document.getElementById('save-draft');
  const params = new URLSearchParams(window.location.search);
  const existing = params.get('id') ? BlogStore.getBlog(params.get('id')) : null;
  let imageData = '';
  let dirty = false;

  if (existing && existing.authorId !== user.id) {
    BlogUI.flash('You can only edit your own stories.', 'error');
    window.location.replace('dashboard.html');
    return;
  }

  BlogStore.CATEGORIES.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    form.elements.category.appendChild(option);
  });

  function updatePreview() {
    const category = form.elements.category.value || 'Technology';
    preview.src = imageData || BlogStore.coverFor(category);
    preview.hidden = false;
  }

  function updateWords() {
    const text = editor.textContent.replace(/\u00a0/g, ' ').trim();
    editor.classList.toggle('is-empty', text.length === 0);
    const words = text ? text.split(/\s+/).length : 0;
    const minutes = Math.max(1, Math.round(words / 200));
    wordCount.textContent = words ? `${words} ${words === 1 ? 'word' : 'words'} · ${minutes} min read` : 'Start writing to see a reading time.';
  }

  if (existing) {
    form.elements.title.value = existing.title;
    form.elements.description.value = existing.description;
    form.elements.category.value = existing.category;
    form.elements.imageUrl.value = existing.image.startsWith('data:') ? '' : existing.image;
    form.elements.featured.checked = existing.featured;
    editor.innerHTML = sanitizeHtml(existing.content);
    imageData = existing.image || '';
    heading.textContent = 'Edit story';
    document.title = 'Edit story — BlogSphere';
    statusLabel.textContent = existing.status === 'published' ? 'Editing a published story' : 'Editing a draft';
    publishButton.textContent = existing.status === 'published' ? 'Update story' : 'Publish';
    publishButton.dataset.label = publishButton.textContent;
  } else {
    form.elements.category.value = 'Technology';
    statusLabel.textContent = 'New story';
  }

  updatePreview();
  updateWords();
  dirty = false;

  form.addEventListener('input', () => {
    dirty = true;
  });
  editor.addEventListener('input', () => {
    dirty = true;
    updateWords();
  });
  form.elements.category.addEventListener('change', () => {
    const stock = !imageData || imageData.startsWith('assets/images/');
    if (stock) {
      imageData = '';
      updatePreview();
    }
  });

  form.querySelectorAll('[data-command]').forEach((button) => {
    button.addEventListener('click', () => {
      editor.focus();
      document.execCommand('styleWithCSS', false, false);
      document.execCommand(button.dataset.command, false, button.dataset.value || null);
      dirty = true;
      updateWords();
    });
  });

  document.getElementById('editor-link').addEventListener('click', async () => {
    editor.focus();
    const url = await BlogUI.prompt({
      title: 'Insert a link',
      label: 'Link address',
      confirmText: 'Add link'
    });
    if (!url) return;
    editor.focus();
    document.execCommand('createLink', false, url);
    dirty = true;
  });

  form.elements.imageUrl.addEventListener('change', () => {
    const value = form.elements.imageUrl.value.trim();
    if (!value) {
      imageData = '';
      updatePreview();
      return;
    }
    if (!/^https?:\/\//i.test(value) && !value.startsWith('assets/')) {
      BlogUI.setFieldError(form, 'imageUrl', 'Use a full http or https image address.');
      return;
    }
    const probe = new Image();
    probe.onload = () => {
      BlogUI.setFieldError(form, 'imageUrl', '');
      imageData = value;
      updatePreview();
    };
    probe.onerror = () => {
      BlogUI.setFieldError(form, 'imageUrl', 'That image address could not be loaded.');
    };
    probe.src = value;
  });

  form.elements.imageFile.addEventListener('change', async () => {
    const file = form.elements.imageFile.files && form.elements.imageFile.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      BlogUI.toast('Choose an image file.', 'error');
      form.elements.imageFile.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      BlogUI.toast('Please choose an image under 8 MB.', 'error');
      form.elements.imageFile.value = '';
      return;
    }
    try {
      const dataUrl = await resizeImage(file);
      if (dataUrl.length > 500000) {
        BlogUI.toast('That image is still too large to store. Try a smaller photo.', 'error');
        return;
      }
      imageData = dataUrl;
      form.elements.imageUrl.value = '';
      BlogUI.setFieldError(form, 'imageUrl', '');
      updatePreview();
      dirty = true;
    } catch (error) {
      BlogUI.toast(error.message || 'The image could not be prepared.', 'error');
    }
  });

  document.getElementById('clear-image').addEventListener('click', () => {
    imageData = '';
    form.elements.imageUrl.value = '';
    form.elements.imageFile.value = '';
    updatePreview();
    dirty = true;
  });

  form.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.tagName === 'INPUT') event.preventDefault();
  });

  const discard = document.getElementById('discard-link');
  discard.addEventListener('click', async (event) => {
    if (!dirty) return;
    event.preventDefault();
    const yes = await BlogUI.confirm({
      title: 'Discard changes?',
      message: 'Your unsaved edits will be lost.',
      confirmText: 'Discard',
      danger: true
    });
    if (yes) window.location.href = discard.href;
  });

  function validate(status) {
    BlogUI.clearFieldErrors(form);
    const title = form.elements.title.value.trim();
    const description = form.elements.description.value.trim();
    const contentText = editor.textContent.replace(/\u00a0/g, ' ').trim();
    let invalid = false;
    if (title.length < 4) {
      BlogUI.setFieldError(form, 'title', 'Give the story a title of at least 4 characters.');
      invalid = true;
    }
    if (title.length > 140) {
      BlogUI.setFieldError(form, 'title', 'Keep the title under 140 characters.');
      invalid = true;
    }
    if (!BlogStore.CATEGORIES.includes(form.elements.category.value)) {
      BlogUI.setFieldError(form, 'category', 'Choose a category.');
      invalid = true;
    }
    if (status === 'published') {
      if (description.length < 20) {
        BlogUI.setFieldError(form, 'description', 'Add a short description of at least 20 characters.');
        invalid = true;
      }
      if (contentText.length < 40) {
        BlogUI.setFieldError(form, 'content', 'Write at least a short paragraph before publishing.');
        invalid = true;
      }
    }
    if (description.length > 300) {
      BlogUI.setFieldError(form, 'description', 'Keep the description under 300 characters.');
      invalid = true;
    }
    if (invalid) {
      BlogUI.focusFirstInvalid(form);
      BlogUI.toast('Check the highlighted fields.', 'error');
    }
    return !invalid;
  }

  async function persist(status, button, busyLabel) {
    if (!validate(status)) return;
    BlogUI.setBusy(button, true, busyLabel);
    const payload = {
      id: existing ? existing.id : undefined,
      authorId: user.id,
      title: form.elements.title.value.trim(),
      description: form.elements.description.value.trim(),
      content: sanitizeHtml(editor.innerHTML),
      category: form.elements.category.value,
      image: imageData,
      featured: form.elements.featured.checked,
      status
    };
    try {
      const result = BlogStore.saveBlog(payload);
      if (!result.ok) {
        BlogUI.setBusy(button, false, busyLabel);
        BlogUI.toast(result.message, 'error');
        return;
      }
      const created = !existing;
      const message = status === 'draft'
        ? 'Draft saved.'
        : (existing && existing.status === 'published' ? 'Story updated.' : 'Story published.');
      BlogUI.flash(message);
      window.location.href = 'dashboard.html#posts';
      void created;
    } catch (error) {
      BlogUI.setBusy(button, false, busyLabel);
      BlogUI.toast(error.message || 'The story could not be saved.', 'error');
    }
  }

  draftButton.addEventListener('click', () => persist('draft', draftButton, 'Saving draft'));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    persist('published', publishButton, existing && existing.status === 'published' ? 'Updating' : 'Publishing');
  });
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-like]');
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const result = BlogStore.toggleLike(button.dataset.like, actorId());
  if (!result.ok) return;
  const selector = `[data-like="${CSS.escape(button.dataset.like)}"]`;
  document.querySelectorAll(selector).forEach((item) => {
    item.classList.toggle('is-liked', result.liked);
    item.setAttribute('aria-pressed', result.liked ? 'true' : 'false');
    item.setAttribute('aria-label', result.liked ? 'Unlike this story' : 'Like this story');
    const icon = item.querySelector('i');
    const count = item.querySelector('span');
    if (icon) icon.className = result.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    if (count) count.textContent = String(result.count);
  });
});

document.addEventListener('error', (event) => {
  const image = event.target;
  if (!image || image.tagName !== 'IMG' || !image.dataset.fallback || image.dataset.fallbackApplied) return;
  image.dataset.fallbackApplied = '1';
  image.src = image.dataset.fallback;
}, true);

BlogApp.register('home', initHome);
BlogApp.register('details', initDetails);
BlogApp.register('editor', initEditor);
