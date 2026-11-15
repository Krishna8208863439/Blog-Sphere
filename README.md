# BlogSphere

A complete, modern, and fully responsive blogging platform built with **HTML5**, **CSS3**, and **Vanilla JavaScript (ES6+)** frontend coupled with a **Node.js, Express, and MongoDB** backend with full CRUD operations, search, pagination, and category filtering.

---

## Table of Contents

1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Backend REST API](#backend-rest-api)
5. [Getting Started](#getting-started)
6. [Demo Account](#demo-account)
7. [Testing Instructions](#testing-instructions)
8. [Design System](#design-system)

---

## Features

### Authentication & Authorization
- Secure JWT-based authentication with bcrypt password hashing
- **HttpOnly, Secure Cookies** for cross-site script-safe authentication
- Rate limiting on login and registration endpoints (`express-rate-limit`)
- Helmet security headers and CORS protection
- Protected dashboard routes (`dashboard.html`, `create-blog.html`, `profile.html`) verified against `GET /api/auth/me`
- Full user profile management page (`profile.html`) with name, username, email, avatar, bio, and password change
- Logout endpoint clearing authentication cookie and local state with redirect to `login.html`
- Strict author isolation on `GET /api/blogs/my-blogs` and ownership checks on update/delete

### Full CRUD Operations
- **Create**: Write stories with title, description, rich content, category, cover image preview/upload, and choose draft or immediate publish
- **Read**: Fetch published blogs on home feed, retrieve full blog details with related articles, and fetch personal blogs on dashboard
- **Update**: Edit blog title, description, content, category, image, and status from the dashboard
- **Delete**: Remove blogs with confirmation dialog and immediate UI refresh

### Search & Category Filtering
- Case-insensitive search across title, description, and content
- Category filtering for 8 core categories: `Technology`, `Artificial Intelligence`, `Programming`, `Web Development`, `Data Science`, `Education`, `Lifestyle`, `Business`
- Seamlessly combine search query with category filters and pagination
- Instant empty-state display when no results match with quick filter reset

### Dashboard Management
- Live metrics: Total Blogs, Published Blogs, and Draft Blogs fetched from MongoDB
- Recent blogs view and full library management
- Actions on each card: View Blog, Edit Blog, and Delete Blog
- Responsive sidebar and mobile drawer

---

## Technology Stack

- **Frontend**: HTML5, CSS3 (Custom Properties, Flexbox, Grid), Vanilla JavaScript (ES6+), Fetch API
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **Password Security**: bcryptjs
- **File Uploads**: Multer
- **Validation**: express-validator & Mongoose validation

---

## Backend REST API

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register new user | No |
| `POST` | `/api/auth/login` | Authenticate user, get JWT & set HttpOnly cookie | No |
| `POST` | `/api/auth/logout` | Clear authentication cookie | No |
| `GET` | `/api/auth/me` | Get current user profile (session verification) | Yes |
| `GET` | `/api/users/profile` | Get logged-in user profile details | Yes |
| `PUT` | `/api/users/profile` | Update user profile (name, username, email, bio, image) | Yes |
| `PATCH`| `/api/users/change-password` | Change user password | Yes |
| `POST` | `/api/blogs` | Create a new blog | Yes |
| `GET` | `/api/blogs` | Get published blogs (`search`, `category`, `page`, `limit`) | No |
| `GET` | `/api/blogs/:id` | Get individual blog details | No (Drafts: Owner only) |
| `GET` | `/api/blogs/my-blogs` | Get logged-in user's blogs | Yes |
| `GET` | `/api/blogs/stats` | Get total, published, and draft counts | Yes |
| `PUT` | `/api/blogs/:id` | Update an existing blog | Yes (Owner only) |
| `DELETE`| `/api/blogs/:id` | Delete an existing blog | Yes (Owner only) |
| `POST` | `/api/blogs/:id/like` | Toggle blog like | No |
| `POST` | `/api/blogs/upload-image` | Upload featured image | Yes |

---

## Getting Started

### 1. Start MongoDB
Ensure MongoDB is running locally:
```bash
mongod --dbpath <your_db_path>
```

### 2. Start Backend Server
```bash
cd backend
npm install
node utils/seed.js   # Seeds demo account and initial stories
npm start           # Runs on http://localhost:5000
```

### 3. Open Frontend
Open `blog-application/index.html` via Live Server or any static HTTP server on port 5500:
```bash
npx serve blog-application
```

---

## Demo Account

| Field | Value |
|-------|-------|
| Email | `demo@blogsphere.com` |
| Password | `Demo1234!` |

---

## Testing Instructions

### 1. Authentication & User Management Tests
Run the comprehensive authentication test suite:
```bash
node backend/test_auth.js
```
This tests:
1. Register new user
2. Duplicate email prevention
3. Register second user
4. Login with valid credentials and verify signed JWT in HttpOnly cookie
5. Login with invalid credentials rejection (401)
6. Verify JWT authentication (GET /api/auth/me)
7. Prevent unauthorized access without login (401)
8. Authorized access with Bearer token / Cookie
9. User A sees only User A's blogs in /api/blogs/my-blogs
10. User B sees only User B's blogs in /api/blogs/my-blogs
11. Unauthorized blog modification prevention (403 Forbidden)
12. Update profile information (PUT /api/users/profile)
13. Password change (PATCH /api/users/change-password) & verify with new login
14. Logout clears HttpOnly cookie
15. Prevent access to protected routes after logout
16. Reject expired and malformed JWTs (401)
17. Reject invalid cookie authentication (401)

### 2. Full CRUD, Search & Category Filter Tests
Run the CRUD test suite:
```bash
node backend/test_crud.js
```

This tests:
1. Blog creation
2. Draft saving
3. Immediate publishing
4. Retrieval of all published blogs
5. Blog details retrieval
6. Editing an existing blog
7. Verification of updated data in MongoDB
8. Blog deletion
9. Verification of blog deletion in MongoDB (404)
10. Search blogs by title
11. Search blogs by description
12. Filter blogs by category
13. Combined search + category filters
14. Pagination (page navigation)
15. Unauthorized editing prevention (returns 403 Forbidden)
16. Unauthorized deletion prevention (returns 403 Forbidden)
17. Empty search results handling
18. Responsive and reactive UI state updates
