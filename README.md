# BlogSphere

A complete, modern, and fully responsive blogging platform built with **HTML5**, **CSS3**, and **Vanilla JavaScript (ES6+)**. All data — user accounts, sessions, and blog posts — is persisted in the browser's `localStorage` and `sessionStorage`.

---

## Table of Contents

1. [Live Demo](#live-demo)
2. [Features](#features)
3. [Project Structure](#project-structure)
4. [Pages Overview](#pages-overview)
5. [Getting Started](#getting-started)
6. [Demo Account](#demo-account)
7. [Sample Data](#sample-data)
8. [Testing Checklist](#testing-checklist)
9. [Technology Stack](#technology-stack)
10. [Design System](#design-system)
11. [Browser Support](#browser-support)

---

## Live Demo

Open `index.html` directly in any modern browser — no server or build step required.

---

## Features

### Authentication
- Register with full name, email, username, and password
- Duplicate email and username detection
- Password strength meter on registration
- "Remember me" (uses `localStorage`) vs session-only sign-in (`sessionStorage`)
- Forgot password / inline password reset flow
- Instant redirect to dashboard after sign-in
- Protected routes — `dashboard.html` and `create-blog.html` redirect unauthenticated visitors to `login.html`

### Blog Management (Dashboard)
- **Create** — rich text editor with Bold, Italic, Underline, H2, H3, blockquote, lists, and hyperlink tools
- **Edit** — open any existing story in the same editor
- **Publish** — makes the story appear on the public home page immediately
- **Draft** — saves a story privately; only the author can see it
- **Delete** — with a confirmation dialog before removal
- **Search + filter** — search by keyword; filter by status (published/draft) and category
- Stats panel showing total, published, and draft counts

### Home Page
- Featured grid (lead card + two side cards) when ≥ 3 stories exist
- Latest articles grid
- Keyword search (URL-synced) with live re-render
- Category chip bar (All + 5 categories)
- Empty states with actions

### Blog Details
- Full article view with cover image, metadata, and read-time estimate
- Like / unlike button (persisted per guest or logged-in user)
- Copy link button
- Edit and Delete buttons for the story author
- Related stories in the same category
- Draft banner visible only to the author

### UI / UX
- **Dark mode / Light mode** toggle — preference persisted in `localStorage`
- Toast notifications (success, error, info)
- Confirmation dialog for destructive actions
- Loading animation on page entry
- Back-to-top button
- Smooth scrolling
- Mobile hamburger menu
- Responsive sidebar on the dashboard (slide-in drawer on mobile)
- Empty-state illustrations
- Image fallback on broken `<img>` elements

---

## Project Structure

```
blog-application/
│
├── index.html          — Home feed
├── login.html          — Sign-in + password reset
├── register.html       — Account registration
├── dashboard.html      — User dashboard (overview, library, profile)
├── create-blog.html    — Story editor (create + edit)
├── blog-details.html   — Full article view
│
├── css/
│   ├── style.css       — Design tokens, shared layout, home, components
│   ├── auth.css        — Login and registration layout
│   ├── dashboard.css   — Dashboard shell and editor
│   └── responsive.css  — Media queries (1100 / 980 / 860 / 720 px)
│
├── js/
│   ├── storage.js      — All localStorage read/write (users, blogs, likes, session, theme)
│   ├── main.js         — Shared UI: theme, header, footer, toasts, dialogs, boot
│   ├── auth.js         — Login and registration form logic
│   ├── dashboard.js    — Dashboard views, sidebar, stats, profile forms
│   └── blogs.js        — Home feed, blog details, rich-text editor
│
├── assets/
│   └── images/
│       ├── favicon.svg
│       ├── cover-technology.svg
│       ├── cover-ai.svg
│       ├── cover-programming.svg
│       ├── cover-lifestyle.svg
│       ├── cover-education.svg
│       └── cover-energy.svg
│
└── README.md
```

---

## Pages Overview

| Page | File | Protection |
|------|------|-----------|
| Home | `index.html` | Public |
| Sign in | `login.html` | Redirects to dashboard if already signed in |
| Register | `register.html` | Redirects to dashboard if already signed in |
| Dashboard | `dashboard.html` | Requires authentication |
| Story editor | `create-blog.html` | Requires authentication |
| Blog details | `blog-details.html` | Public (draft visible to author only) |

---

## Getting Started

### Option 1 — Open directly (simplest)

1. Download or clone the repository.
2. Open `blog-application/index.html` in Chrome, Firefox, Edge, or Safari.
3. No internet connection is required after the first load (fonts and icons are fetched from CDNs on first open).

### Option 2 — Local development server (recommended)

Using the VS Code **Live Server** extension:

1. Right-click `index.html` → **Open with Live Server**.

Using Node.js:

```bash
npx serve blog-application
```

Using Python:

```bash
# Python 3
cd blog-application
python -m http.server 5500
```

Then open `http://localhost:5500` in your browser.

> **Note:** Opening HTML files via `file://` protocol works for most features, but some browsers restrict the Clipboard API (`navigator.clipboard`) over `file://`. Use a local server if you want the "Copy link" button to work.

---

## Demo Account

A demo account and seven sample stories are seeded automatically on first load.

| Field | Value |
|-------|-------|
| Email | `demo@blogsphere.com` |
| Password | `Demo1234!` |

Click the **"Sign in with demo account"** button on the login page to fill the form automatically.

---

## Sample Data

Seven sample stories are pre-loaded:

| Title | Category | Status |
|-------|----------|--------|
| The quiet rewrite of the personal computer | Technology | Published |
| What we talk about when we talk about agents | AI | Published |
| Small functions, long careers | Programming | Published |
| A desk that earns its keep | Lifestyle | Published |
| Learning in public, carefully | Education | Published |
| Batteries, grids, and the next decade | Technology | Published |
| Field notes from a slower morning | Lifestyle | **Draft** |

---

## Testing Checklist

Work through these steps to verify every feature:

1. **Register** — open `register.html`, fill in all fields, submit. Confirm redirect to `login.html`.
2. **Duplicate email** — register again with the same email. Confirm error message.
3. **Login** — sign in with the credentials you just registered. Confirm redirect to dashboard.
4. **Wrong credentials** — enter a bad password. Confirm error message, no redirect.
5. **Demo login** — sign out, open `login.html`, click "Sign in with demo account".
6. **Dashboard overview** — confirm stats panel and recent stories list are correct.
7. **Create a blog** — click "New story", fill title + description + content, choose a category. Click "Publish". Confirm toast and redirect to dashboard.
8. **Save as draft** — create another story and click "Save as draft". Confirm it appears only on the dashboard (not on the home page).
9. **Edit** — click the pencil icon on any story, change the title, save. Confirm updated title.
10. **Delete** — click the trash icon, confirm the dialog, verify story is removed.
11. **Search** — use the search bar on `index.html` to filter stories by keyword.
12. **Category filter** — click a category chip; confirm only matching stories are shown.
13. **Like** — click the heart on a story card or the detail page. Confirm count updates.
14. **Blog details** — click "Read more" on any card. Verify the full article loads.
15. **Dark mode** — click the moon icon. Confirm theme switches and persists on refresh.
16. **Logout** — click "Log out". Confirm redirect to home and session cleared.
17. **Auth guard** — while logged out, navigate to `dashboard.html`. Confirm redirect to `login.html`.
18. **Mobile** — resize the browser to < 860 px. Verify hamburger menus, sidebar drawer, and stacked layout.
19. **LocalStorage persistence** — refresh the page. Confirm stories, likes, and session are preserved.
20. **Password reset** — on `login.html`, click "Forgot password?", enter a registered email, set a new password, sign in with the new password.

---

## Technology Stack

| Technology | Purpose |
|-----------|---------|
| HTML5 | Semantic page structure |
| CSS3 (Flexbox + Grid) | Layout, design tokens, animations |
| Vanilla JavaScript ES6+ | Application logic, DOM manipulation |
| `localStorage` / `sessionStorage` | Data persistence |
| [Google Fonts](https://fonts.google.com) | Fraunces (display), Outfit (UI), Source Serif 4 (prose) |
| [Font Awesome 6](https://fontawesome.com) | Icons |
| `contenteditable` + `execCommand` | Rich text editor |

No frameworks, no bundlers, no dependencies to install.

---

## Design System

| Token | Light | Dark |
|-------|-------|------|
| `--bg` | `#f6f3ee` | `#12110f` |
| `--surface` | `#ffffff` | `#22211d` |
| `--ink` | `#1c1917` | `#f6f3ee` |
| `--accent` | `#0f6e56` | `#8ee0c6` |
| `--danger` | `#b42318` | `#ffb4ab` |
| `--radius` | `22px` | `22px` |
| `--font-display` | Fraunces | Fraunces |
| `--font-ui` | Outfit | Outfit |
| `--font-serif` | Source Serif 4 | Source Serif 4 |

---

## Browser Support

| Browser | Minimum version |
|---------|----------------|
| Chrome | 105+ |
| Firefox | 104+ |
| Edge | 105+ |
| Safari | 15.4+ |

> Requires support for CSS `color-mix()`, `backdrop-filter`, `clamp()`, and the HTML `<dialog>` element.

---

## License

This project is a frontend demo for educational and portfolio purposes. No backend or real authentication is included. Data is stored locally in the browser and is never transmitted anywhere.
