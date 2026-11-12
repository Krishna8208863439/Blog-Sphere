/**
 * BlogSphere storage.
 * Users, sessions, and stories stay in this browser.
 * Sessions honor "Remember me": checked uses localStorage, unchecked uses sessionStorage.
 * This is a frontend demo. Passwords are not a substitute for server-side authentication.
 */
'use strict';

const BlogStore = (() => {
  const KEYS = {
    users: 'blogsphere_users',
    blogs: 'blogsphere_blogs',
    likes: 'blogsphere_likes',
    session: 'blogsphere_session',
    theme: 'blogsphere_theme',
    guest: 'blogsphere_guest'
  };

  const CATEGORIES = ['Technology', 'AI', 'Programming', 'Lifestyle', 'Education'];
  const DEMO_ID = 'user-demo-ava';

  function uid() {
    if (window.crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      console.error('Unable to read saved data.', error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      const failure = new Error('This browser cannot store more data. Try a smaller image or delete an old story.');
      failure.cause = error;
      throw failure;
    }
  }

  function readUsers() {
    return readJson(KEYS.users, []);
  }

  function toPublic(user) {
    if (!user) return null;
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      bio: user.bio || '',
      createdAt: user.createdAt
    };
  }

  function demoUser() {
    return {
      id: DEMO_ID,
      fullName: 'Ava Ellison',
      email: 'demo@blogsphere.com',
      username: 'ava',
      password: 'Demo1234!',
      bio: 'Editor at BlogSphere. I write about technology, learning, and the craft of making things.',
      createdAt: '2026-09-01T10:00:00.000Z'
    };
  }

  function sampleBlogs() {
    return [
      {
        id: 'blog-quiet-pc',
        authorId: DEMO_ID,
        title: 'The quiet rewrite of the personal computer',
        description: 'Laptops did not get louder. They got more considered, and the interesting changes are the ones you barely notice.',
        category: 'Technology',
        image: 'assets/images/cover-technology.svg',
        featured: true,
        status: 'published',
        publishedAt: '2026-11-08T09:00:00.000Z',
        createdAt: '2026-11-07T09:00:00.000Z',
        updatedAt: '2026-11-08T09:00:00.000Z',
        content: `
          <p>The last decade of personal computers did not announce itself with a single launch. It arrived as a series of small corrections: keyboards with a little more travel, screens that no longer wash out by a window, and batteries that survive a day of ordinary work.</p>
          <p>Those corrections matter more than another spec sheet. A machine you trust disappears. You stop negotiating with it and start finishing the sentence, the sketch, the patch, the lesson plan.</p>
          <p>Look closely at a well-made laptop from this year and you will find the real story in the hinges, the fan curve, and the decision to leave a port where your hand already expects it. None of that trends. All of it changes how a day feels.</p>
          <p>The next rewrite will be just as quiet. Repairable parts, calmer notifications, and software that waits its turn. Progress, at its best, gives attention back.</p>
        `.trim()
      },
      {
        id: 'blog-agents',
        authorId: DEMO_ID,
        title: 'What we talk about when we talk about agents',
        description: 'An agent is not a magic coworker. It is a workflow with a language model in the middle, and the design still belongs to you.',
        category: 'AI',
        image: 'assets/images/cover-ai.svg',
        featured: true,
        status: 'published',
        publishedAt: '2026-11-06T12:30:00.000Z',
        createdAt: '2026-11-05T12:30:00.000Z',
        updatedAt: '2026-11-06T12:30:00.000Z',
        content: `
          <p>Every few months the word "agent" gets a new coat of paint. Strip the marketing away and you usually find a loop: read a goal, choose a tool, observe the result, and try again until a person says stop.</p>
          <p>That loop can be useful. It can also wander. The difference is rarely the model. It is the boundary around the task. A good agent drafts a summary from a folder you chose. A careless one invents a folder you never had.</p>
          <blockquote>Give the system a narrow job, a way to show its work, and a person who can say no.</blockquote>
          <p>If you are building with these tools, write the failure down while it is still small. Which step guessed? Which step should have asked? Those notes are worth more than another demo video.</p>
          <p>Agents will get faster. Judgment does not arrive as a software update. It is a practice, and it still has your name on it.</p>
        `.trim()
      },
      {
        id: 'blog-small-functions',
        authorId: DEMO_ID,
        title: 'Small functions, long careers',
        description: 'The programmers who last are rarely the ones who memorize the most. They are the ones who leave code another person can enter.',
        category: 'Programming',
        image: 'assets/images/cover-programming.svg',
        featured: true,
        status: 'published',
        publishedAt: '2026-11-03T08:15:00.000Z',
        createdAt: '2026-11-02T08:15:00.000Z',
        updatedAt: '2026-11-03T08:15:00.000Z',
        content: `
          <p>There is a kind of pride that shows up as a very long function. Everything is in one place, the author says. Everything is also in the way.</p>
          <p>A small function is not a moral good. It is a door. Another person can open it, see what comes in, and see what goes out without reconstructing your afternoon.</p>
          <ul>
            <li>Name the result, not the implementation.</li>
            <li>Keep side effects at the edges.</li>
            <li>Let a test describe the behavior you actually care about.</li>
          </ul>
          <p>Careers get long when your future self can still read you. The clever line that saved ten minutes today can cost an hour in six months, usually on a Friday.</p>
          <p>Write the version a teammate can change without asking you to translate it. That is the work.</p>
        `.trim()
      },
      {
        id: 'blog-desk',
        authorId: DEMO_ID,
        title: 'A desk that earns its keep',
        description: 'A calmer workspace is not a shopping list. It is a set of decisions about what is allowed to ask for your eyes.',
        category: 'Lifestyle',
        image: 'assets/images/cover-lifestyle.svg',
        featured: false,
        status: 'published',
        publishedAt: '2026-10-28T16:00:00.000Z',
        createdAt: '2026-10-28T16:00:00.000Z',
        updatedAt: '2026-10-28T16:00:00.000Z',
        content: `
          <p>The internet will sell you a desk that promises a different life. The life usually changes for a week, which is about how long a new lamp stays interesting.</p>
          <p>What lasts is subtraction. A single notebook instead of five. A phone that charges in another room. A chair you can sit in after the second hour.</p>
          <p>I keep a short list taped under the monitor: one task in front of me, water within reach, and no new tab until this paragraph is done. It is not elegant. It is enforceable.</p>
          <p>Make the room slightly quieter than your work requires. The extra quiet is where the next sentence shows up.</p>
        `.trim()
      },
      {
        id: 'blog-learning-public',
        authorId: DEMO_ID,
        title: 'Learning in public, carefully',
        description: 'Sharing what you are learning can teach you faster. It can also turn your notes into a performance. Keep the part that helps you think.',
        category: 'Education',
        image: 'assets/images/cover-education.svg',
        featured: false,
        status: 'published',
        publishedAt: '2026-10-21T11:20:00.000Z',
        createdAt: '2026-10-20T11:20:00.000Z',
        updatedAt: '2026-10-21T11:20:00.000Z',
        content: `
          <p>Learning in public is a good deal when the audience is a side effect. You explain a concept, discover the hole in your explanation, and patch the hole. The post is evidence, not the point.</p>
          <p>It goes wrong when the post becomes the assignment. You start choosing topics that photograph well and skipping the dull chapter where the real skill lives.</p>
          <p>A useful public note answers three questions. What did I try? What broke? What will I do differently tomorrow? If you can write that in a half page, you learned something. If you need a thread to sound certain, wait a day.</p>
          <p>Students do not need a personal brand. They need a record they can reread. Publish the record when it is honest. Keep the rest in the notebook.</p>
        `.trim()
      },
      {
        id: 'blog-batteries',
        authorId: DEMO_ID,
        title: 'Batteries, grids, and the next decade',
        description: 'The energy transition is less about a single breakthrough and more about thousands of unglamorous connections.',
        category: 'Technology',
        image: 'assets/images/cover-energy.svg',
        featured: false,
        status: 'published',
        publishedAt: '2026-10-14T07:45:00.000Z',
        createdAt: '2026-10-13T07:45:00.000Z',
        updatedAt: '2026-10-14T07:45:00.000Z',
        content: `
          <p>A battery is a promise that energy made at noon can be used at night. A grid is the argument about whose promise counts, and how far it has to travel.</p>
          <p>The headlines prefer the laboratory. The work is also in permits, transformers, electricians, and software that keeps a neighborhood steady when a cloud crosses a field of panels.</p>
          <p>None of this is abstract if the lights flicker. Reliability is the product. Chemistry is only one of its ingredients.</p>
          <p>The next decade will reward people who can talk to both the model and the crew on site. The story is technical. It is also civic.</p>
        `.trim()
      },
      {
        id: 'blog-slow-morning',
        authorId: DEMO_ID,
        title: 'Field notes from a slower morning',
        description: 'An unfinished draft about leaving the first hour of the day unscheduled.',
        category: 'Lifestyle',
        image: 'assets/images/cover-lifestyle.svg',
        featured: false,
        status: 'draft',
        publishedAt: null,
        createdAt: '2026-11-11T06:30:00.000Z',
        updatedAt: '2026-11-11T06:40:00.000Z',
        content: `
          <p>I have been trying to leave the first hour alone. No inbox. No headline. Just the walk and the page.</p>
          <p>It is still a draft because I do not know yet whether the calm is the routine or the novelty. I will publish this when I have kept it for a month.</p>
        `.trim()
      }
    ];
  }

  function sampleLikes() {
    return {
      'blog-quiet-pc': ['reader-1', 'reader-2', 'reader-3', 'reader-4'],
      'blog-agents': ['reader-2', 'reader-5', 'reader-6'],
      'blog-small-functions': ['reader-1', 'reader-7'],
      'blog-desk': ['reader-3'],
      'blog-learning-public': ['reader-4', 'reader-8', 'reader-9'],
      'blog-batteries': ['reader-5']
    };
  }

  function ensureSeed() {
    const users = readUsers();
    if (!users.some((user) => user.email === 'demo@blogsphere.com')) {
      users.push(demoUser());
      writeJson(KEYS.users, users);
    }
    if (localStorage.getItem(KEYS.blogs) === null) {
      writeJson(KEYS.blogs, sampleBlogs());
    }
    if (localStorage.getItem(KEYS.likes) === null) {
      writeJson(KEYS.likes, sampleLikes());
    }
  }

  function getUserById(id) {
    return toPublic(readUsers().find((user) => user.id === id));
  }

  function findByEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    return readUsers().find((user) => user.email === normalized) || null;
  }

  function createUser({ fullName, email, username, password }) {
    const users = readUsers();
    const emailNorm = String(email || '').trim().toLowerCase();
    const usernameClean = String(username || '').trim();
    const usernameNorm = usernameClean.toLowerCase();

    if (users.some((user) => user.email === emailNorm)) {
      return { ok: false, field: 'email', message: 'An account with this email already exists.' };
    }
    if (users.some((user) => user.username.toLowerCase() === usernameNorm)) {
      return { ok: false, field: 'username', message: 'This username is already taken.' };
    }

    const user = {
      id: uid(),
      fullName: String(fullName || '').trim(),
      email: emailNorm,
      username: usernameClean,
      password,
      bio: '',
      createdAt: new Date().toISOString()
    };
    users.push(user);
    writeJson(KEYS.users, users);
    return { ok: true, user: toPublic(user) };
  }

  function authenticate(email, password) {
    const user = findByEmail(email);
    if (!user || user.password !== password) return null;
    return toPublic(user);
  }

  function updateUser(id, patch) {
    const users = readUsers();
    const index = users.findIndex((user) => user.id === id);
    if (index < 0) return { ok: false, message: 'Account not found.' };

    const next = { ...users[index] };
    if (Object.prototype.hasOwnProperty.call(patch, 'fullName')) {
      next.fullName = String(patch.fullName || '').trim();
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'bio')) {
      next.bio = String(patch.bio || '').trim();
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'username')) {
      const usernameClean = String(patch.username || '').trim();
      const taken = users.some((user) => user.id !== id && user.username.toLowerCase() === usernameClean.toLowerCase());
      if (taken) return { ok: false, field: 'username', message: 'This username is already taken.' };
      next.username = usernameClean;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'password')) {
      next.password = patch.password;
    }

    users[index] = next;
    writeJson(KEYS.users, users);
    return { ok: true, user: toPublic(next) };
  }

  function setPasswordByEmail(email, password) {
    const users = readUsers();
    const index = users.findIndex((user) => user.email === String(email || '').trim().toLowerCase());
    if (index < 0) return false;
    users[index].password = password;
    writeJson(KEYS.users, users);
    return true;
  }

  function verifyPassword(id, password) {
    const user = readUsers().find((entry) => entry.id === id);
    return Boolean(user && user.password === password);
  }

  function setSession(userId, remember) {
    const payload = JSON.stringify({
      userId,
      remember: Boolean(remember),
      loginAt: new Date().toISOString()
    });
    try {
      if (remember) {
        localStorage.setItem(KEYS.session, payload);
        sessionStorage.removeItem(KEYS.session);
      } else {
        sessionStorage.setItem(KEYS.session, payload);
        localStorage.removeItem(KEYS.session);
      }
    } catch (error) {
      console.error(error);
      throw new Error('The browser blocked saving your session.');
    }
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(KEYS.session) || localStorage.getItem(KEYS.session);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.userId) return null;
      return data;
    } catch (error) {
      return null;
    }
  }

  function clearSession() {
    try {
      sessionStorage.removeItem(KEYS.session);
      localStorage.removeItem(KEYS.session);
    } catch (error) {
      console.error(error);
    }
  }

  function currentUser() {
    const session = getSession();
    if (!session) return null;
    const user = getUserById(session.userId);
    if (!user) {
      clearSession();
      return null;
    }
    return user;
  }

  function getBlogs() {
    return readJson(KEYS.blogs, []);
  }

  function getBlog(id) {
    return getBlogs().find((blog) => blog.id === id) || null;
  }

  function byNewest(a, b) {
    return new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt);
  }

  function getPublishedBlogs() {
    return getBlogs().filter((blog) => blog.status === 'published').sort(byNewest);
  }

  function getBlogsByAuthor(authorId) {
    return getBlogs()
      .filter((blog) => blog.authorId === authorId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function saveBlog(input) {
    const blogs = getBlogs();
    const now = new Date().toISOString();
    const status = input.status === 'published' ? 'published' : 'draft';

    if (input.id) {
      const index = blogs.findIndex((blog) => blog.id === input.id);
      if (index < 0) return { ok: false, message: 'That story could not be found.' };
      if (blogs[index].authorId !== input.authorId) {
        return { ok: false, message: 'You can only edit your own stories.' };
      }
      const existing = blogs[index];
      const next = {
        ...existing,
        title: input.title,
        description: input.description || '',
        content: input.content || '',
        category: input.category,
        image: input.image || '',
        status,
        featured: Boolean(input.featured) && status === 'published',
        publishedAt: status === 'published' ? (existing.publishedAt || now) : null,
        updatedAt: now
      };
      blogs[index] = next;
      writeJson(KEYS.blogs, blogs);
      return { ok: true, blog: next };
    }

    const blog = {
      id: uid(),
      authorId: input.authorId,
      title: input.title,
      description: input.description || '',
      content: input.content || '',
      category: input.category,
      image: input.image || '',
      status,
      featured: Boolean(input.featured) && status === 'published',
      publishedAt: status === 'published' ? now : null,
      createdAt: now,
      updatedAt: now
    };
    blogs.unshift(blog);
    writeJson(KEYS.blogs, blogs);
    return { ok: true, blog };
  }

  function deleteBlog(id, authorId) {
    const blogs = getBlogs();
    const blog = blogs.find((entry) => entry.id === id);
    if (!blog) return { ok: false, message: 'That story could not be found.' };
    if (blog.authorId !== authorId) return { ok: false, message: 'You can only delete your own stories.' };
    writeJson(KEYS.blogs, blogs.filter((entry) => entry.id !== id));
    const likes = readJson(KEYS.likes, {});
    delete likes[id];
    writeJson(KEYS.likes, likes);
    return { ok: true };
  }

  function getLikeState(blogId, actorId) {
    const list = readJson(KEYS.likes, {})[blogId] || [];
    return {
      liked: Boolean(actorId && list.includes(actorId)),
      count: list.length
    };
  }

  function toggleLike(blogId, actorId) {
    const blog = getBlog(blogId);
    if (!blog || blog.status !== 'published' || !actorId) {
      return { ok: false, liked: false, count: 0 };
    }
    const likes = readJson(KEYS.likes, {});
    const list = new Set(likes[blogId] || []);
    if (list.has(actorId)) list.delete(actorId);
    else list.add(actorId);
    likes[blogId] = [...list];
    writeJson(KEYS.likes, likes);
    return { ok: true, liked: list.has(actorId), count: likes[blogId].length };
  }

  function guestId() {
    try {
      let id = localStorage.getItem(KEYS.guest);
      if (!id) {
        id = `guest_${uid()}`;
        localStorage.setItem(KEYS.guest, id);
      }
      return id;
    } catch (error) {
      return 'guest-ephemeral';
    }
  }

  function getTheme() {
    try {
      return localStorage.getItem(KEYS.theme) === 'dark' ? 'dark' : 'light';
    } catch (error) {
      return 'light';
    }
  }

  function setTheme(theme) {
    try {
      localStorage.setItem(KEYS.theme, theme === 'dark' ? 'dark' : 'light');
    } catch (error) {
      console.error(error);
    }
  }

  function coverFor(category) {
    const covers = {
      Technology: 'assets/images/cover-technology.svg',
      AI: 'assets/images/cover-ai.svg',
      Programming: 'assets/images/cover-programming.svg',
      Lifestyle: 'assets/images/cover-lifestyle.svg',
      Education: 'assets/images/cover-education.svg'
    };
    return covers[category] || covers.Technology;
  }

  try {
    ensureSeed();
  } catch (error) {
    console.error('BlogSphere could not prepare saved stories.', error);
  }

  return {
    CATEGORIES,
    coverFor,
    currentUser,
    getUserById,
    getSession,
    setSession,
    clearSession,
    createUser,
    authenticate,
    updateUser,
    setPasswordByEmail,
    verifyPassword,
    getBlogs,
    getBlog,
    getPublishedBlogs,
    getBlogsByAuthor,
    saveBlog,
    deleteBlog,
    toggleLike,
    getLikeState,
    guestId,
    getTheme,
    setTheme
  };
})();

window.BlogStore = BlogStore;
