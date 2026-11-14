# BlogSphere — Backend API

A complete REST API for the BlogSphere blogging platform built with **Node.js**, **Express.js**, and **MongoDB**.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Setup & Installation](#setup--installation)
5. [Environment Variables](#environment-variables)
6. [Running the Server](#running-the-server)
7. [Database Seeding](#database-seeding)
8. [API Endpoints](#api-endpoints)
9. [Authentication](#authentication)
10. [Data Models](#data-models)
11. [Testing with Postman](#testing-with-postman)
12. [Frontend Integration](#frontend-integration)

---

## Architecture Overview

```
Browser (HTML/CSS/JS)
        │  fetch()
        ▼
Express REST API  :5000
        │  Mongoose ODM
        ▼
MongoDB  :27017  (blogsphere database)
```

The frontend at `localhost:5500` calls the backend at `localhost:5000`. JWT tokens authenticate protected endpoints. All blog and user data is stored in MongoDB.

---

## Technology Stack

| Package | Version | Purpose |
|---------|---------|---------|
| Node.js | ≥ 18 | Runtime |
| Express | 4.x | HTTP framework |
| Mongoose | 8.x | MongoDB ODM |
| bcryptjs | 2.x | Password hashing (salt rounds: 12) |
| jsonwebtoken | 9.x | JWT generation & verification |
| express-validator | 7.x | Input validation |
| multer | 2.x | Image file upload |
| cors | 2.x | Cross-origin requests |
| dotenv | 16.x | Environment variables |

---

## Project Structure

```
backend/
├── config/
│   └── db.js                   MongoDB connection
├── controllers/
│   ├── authController.js       register, login, getMe, updateProfile, changePassword, resetPassword, checkEmail
│   └── blogController.js       CRUD + publish/draft toggle + like toggle + stats + image upload
├── middleware/
│   ├── authMiddleware.js       protect (require JWT) + optionalAuth
│   ├── errorMiddleware.js      global error handler + 404 catcher
│   └── validationMiddleware.js express-validator rule sets
├── models/
│   ├── User.js                 User schema (bcrypt pre-save hook)
│   └── Blog.js                 Blog schema (text indexes, virtuals)
├── routes/
│   ├── authRoutes.js           /api/auth/*
│   └── blogRoutes.js           /api/blogs/*
├── uploads/                    Uploaded images (git-ignored)
├── utils/
│   ├── generateToken.js        JWT sign + verify
│   └── seed.js                 Database seed script
├── .env                        Local config (git-ignored)
├── .env.example                Config template
├── .gitignore
├── package.json
└── server.js                   Entry point
```

---

## Setup & Installation

### Prerequisites
- Node.js 18+
- MongoDB running locally on port 27017

### Install dependencies

```bash
cd backend
npm install
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/blogsphere
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRES_IN=7d
CLIENT_URL=http://127.0.0.1:5500
NODE_ENV=development
```

**Never commit `.env` to version control.**

---

## Running the Server

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

Server starts on `http://localhost:5000`.
Health check: `GET http://localhost:5000/api/health`

---

## Database Seeding

Creates the demo user and 7 sample blogs (6 published + 1 draft):

```bash
npm run seed
```

| Field | Value |
|-------|-------|
| Demo email | `demo@blogsphere.com` |
| Demo password | `Demo1234!` |

---

## API Endpoints

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | — | Register new user |
| POST | `/login` | — | Log in, returns JWT |
| GET | `/me` | ✅ | Get current user profile |
| PATCH | `/profile` | ✅ | Update fullName, username, bio |
| PATCH | `/change-password` | ✅ | Change password |
| POST | `/reset-password` | — | Reset password by email |
| POST | `/check-email` | — | Check if email is registered |

### Blogs — `/api/blogs`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Optional | Published blogs (search, category, pagination) |
| POST | `/` | ✅ | Create blog |
| GET | `/my-blogs` | ✅ | Logged-in user's blogs (all statuses) |
| GET | `/stats` | ✅ | total / published / draft counts |
| GET | `/:id` | Optional | Single blog (draft: owner only) |
| PUT | `/:id` | ✅ | Update blog (owner only) |
| DELETE | `/:id` | ✅ | Delete blog (owner only) |
| PATCH | `/:id/publish` | ✅ | Publish a draft |
| PATCH | `/:id/draft` | ✅ | Move back to draft |
| POST | `/:id/like` | Optional | Toggle like |
| POST | `/upload-image` | ✅ | Upload cover image |

### Query Parameters — `GET /api/blogs`

| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `q` | string | `?q=python` | Full-text search |
| `category` | string | `?category=AI` | Filter by category |
| `page` | number | `?page=2` | Pagination page (default: 1) |
| `limit` | number | `?limit=10` | Results per page (default: 20) |

### Response Envelope

**Success:**
```json
{
  "success": true,
  "message": "Blog published successfully.",
  "data": { "blog": { ... } }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Email or password is incorrect."
}
```

**Validation error:**
```json
{
  "success": false,
  "message": "Title must be at least 4 characters.",
  "errors": { "title": "Title must be at least 4 characters." }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (owns resource but wrong action) |
| 404 | Not found |
| 500 | Server error |

---

## Authentication

1. Register or log in to receive a JWT.
2. Include the token in every protected request:
   ```
   Authorization: Bearer <your_token>
   ```
3. Tokens expire after 7 days (configurable via `JWT_EXPIRES_IN`).
4. Passwords are hashed with bcryptjs at salt rounds 12 — plain text is never stored.

---

## Data Models

### User

```js
{
  fullName:  String   // required, 2–60 chars
  email:     String   // unique, lowercase
  username:  String   // unique, 3–20 chars, letters/numbers/_
  password:  String   // bcrypt hash, never returned in responses
  bio:       String   // optional, max 280 chars
  createdAt: Date     // auto
  updatedAt: Date     // auto
}
```

### Blog

```js
{
  title:       String   // 4–140 chars
  description: String   // max 300 chars
  content:     String   // HTML string
  category:    String   // Technology|AI|Programming|Lifestyle|Education
  image:       String   // URL or base64 or assets/ path
  author:      ObjectId // ref: User
  status:      String   // "draft" | "published"
  featured:    Boolean
  publishedAt: Date     // null for drafts
  likes:       [String] // array of user/guest ID strings
  createdAt:   Date     // auto
  updatedAt:   Date     // auto
}
```

---

## Testing with Postman

Import these requests into Postman:

### 1. Register
```
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "fullName": "Jane Smith",
  "email": "jane@test.com",
  "username": "janesmith",
  "password": "Test1234!",
  "confirmPassword": "Test1234!"
}
```

### 2. Login
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{ "email": "jane@test.com", "password": "Test1234!" }
```
Save the returned `token`.

### 3. Create blog
```
POST http://localhost:5000/api/blogs
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My first blog post",
  "description": "A short description of twenty or more characters.",
  "content": "<p>Hello from the API!</p>",
  "category": "Technology",
  "status": "published"
}
```

### 4. Get all published blogs
```
GET http://localhost:5000/api/blogs
GET http://localhost:5000/api/blogs?category=AI
GET http://localhost:5000/api/blogs?q=agents&page=1&limit=5
```

### 5. Get single blog
```
GET http://localhost:5000/api/blogs/<blog_id>
```

---

## Frontend Integration

The frontend (`blog-application/js/api.js`) wraps every backend call in the same `BlogStore` interface the original localStorage app used. No page HTML or existing CSS was changed.

| Frontend page | Backend calls |
|---------------|--------------|
| `index.html` | `GET /api/blogs` with q/category params |
| `login.html` | `POST /api/auth/login` |
| `register.html` | `POST /api/auth/register` |
| `dashboard.html` | `GET /api/blogs/my-blogs`, `GET /api/blogs/stats`, `DELETE /api/blogs/:id` |
| `create-blog.html` | `POST /api/blogs`, `PUT /api/blogs/:id`, `GET /api/blogs/:id` |
| `blog-details.html` | `GET /api/blogs/:id`, `POST /api/blogs/:id/like`, `DELETE /api/blogs/:id` |

The frontend server runs on port **5500** and the backend on port **5000**.
