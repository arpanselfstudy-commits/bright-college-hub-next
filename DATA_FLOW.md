# Master Data Flow — Bright College Hub

> Next.js 16 App Router · MongoDB (Mongoose) · Cookie-based JWT auth  
> Last updated: May 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Request Lifecycle — Every API Call](#2-request-lifecycle--every-api-call)
3. [Authentication & Token Flow](#3-authentication--token-flow)
   - 3.1 Register
   - 3.2 Login
   - 3.3 Silent Token Refresh
   - 3.4 Logout
   - 3.5 Forgot / Reset Password
4. [Middleware (Proxy) — Route Guard & CORS](#4-middleware-proxy--route-guard--cors)
5. [Feature Data Flows](#5-feature-data-flows)
   - 5.1 Marketplace — Listed Products
   - 5.2 Marketplace — Requested Products
   - 5.3 Jobs
   - 5.4 Shops
   - 5.5 CMS Pages
   - 5.6 AI Description Generation
   - 5.7 User Profile
6. [External Admin Panel API Data Flow](#6-external-admin-panel-api-data-flow)
   - 6.1 CORS Handshake
   - 6.2 Admin Authentication
   - 6.3 Dashboard Stats
   - 6.4 Activity Logs
   - 6.5 Admin-Managed Resources (Jobs, Shops, CMS)
7. [Database Models & Relationships](#7-database-models--relationships)
8. [Error Handling Pipeline](#8-error-handling-pipeline)
9. [Environment Variables Reference](#9-environment-variables-reference)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │  Next.js Frontend    │    │  External Admin Panel        │  │
│  │  (same origin)       │    │  (React SPA, separate origin)│  │
│  │  localhost:3000      │    │  bright-college-admin-react  │  │
│  │  or production URL   │    │  .vercel.app                 │  │
│  └──────────┬───────────┘    └──────────────┬───────────────┘  │
└─────────────┼────────────────────────────────┼─────────────────┘
              │                                │
              ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              src/proxy.ts  (Next.js Middleware)                 │
│  • CORS headers for /api/* (allowlist-based)                    │
│  • Auth guard: accessToken cookie → redirect unauthenticated    │
│  • Root redirect: / → /landing                                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐   ┌───────────────────────────────────┐
│  Next.js Page / Layout  │   │  Next.js Route Handlers           │
│  (Server Components)    │   │  src/app/api/**                   │
│  • getAuthUser() cache  │   │  • withErrorHandler wrapper       │
│  • SSR data fetch       │   │  • validate() (Zod)               │
└─────────────────────────┘   │  • getAuthUser() + authorize()    │
                              │  • Service layer call             │
                              └──────────────┬────────────────────┘
                                             │
                              ┌──────────────▼────────────────────┐
                              │  Backend Services                 │
                              │  src/backend/services/            │
                              │  • Business logic                 │
                              │  • connectDB() singleton          │
                              └──────────────┬────────────────────┘
                                             │
                              ┌──────────────▼────────────────────┐
                              │  MongoDB (Mongoose Models)        │
                              │  Users, Jobs, Shops,              │
                              │  ListedProducts, RequestedProducts│
                              │  RefreshTokens, ActivityLogs, CMS │
                              └───────────────────────────────────┘
```

---

## 2. Request Lifecycle — Every API Call

Every request to `/api/**` passes through the same pipeline regardless of feature:

```
Client (browser / admin SPA)
  │
  │  HTTP request (cookies sent automatically — withCredentials: true)
  ▼
src/proxy.ts  ──── CORS preflight? ──── YES ──► 204 + CORS headers
  │
  │  No preflight — set CORS headers on response, continue
  ▼
Next.js Route Handler  (src/app/api/...)
  │
  ├─ withErrorHandler()        wraps entire handler; catches AppError & unknown errors
  │
  ├─ getAuthUser()             reads accessToken cookie → jwt.verify → DB lookup (React cache)
  │
  ├─ authorize(user, role)     throws 401/403 if user is null or wrong role
  │
  ├─ req.json()                parse body
  │
  ├─ validate(schema, data)    Zod parse; throws 400 with field-level details on failure
  │
  ├─ Service function()        connectDB() + Mongoose query
  │
  └─ sendSuccess(data)         NextResponse.json { code, success, message, data }
```

**Standard response envelope:**
```json
{
  "code": 200,
  "success": true,
  "message": "OK",
  "data": { ... }
}
```

**Standard error envelope:**
```json
{
  "code": 401,
  "success": false,
  "message": "Unauthorized",
  "errorCode": "UNAUTHORIZED",
  "data": null
}
```

---

## 3. Authentication & Token Flow

### Token Strategy

| Token | Storage | Expiry | Purpose |
|-------|---------|--------|---------|
| `accessToken` | httpOnly cookie | 15 min | Authenticate every API request |
| `refreshToken` | httpOnly cookie | 7 days | Obtain new access token silently |

Both cookies are `httpOnly`, `secure` in production, and `sameSite: none` in production / `lax` in dev. The admin SPA (cross-origin) relies on `sameSite: none` + `secure` to send cookies.

---

### 3.1 Register

```
Browser
  │  POST /api/auth/register  { name, email, password }
  ▼
Route Handler
  ├─ validate(registerSchema)
  ├─ auth.service.registerUser()
  │    ├─ Check email uniqueness → 409 if duplicate
  │    ├─ bcrypt.hash(password, 10)
  │    └─ UserModel.create()
  └─ sendSuccess(userWithoutPassword, 201)
```

No cookies are set on register. The user must log in separately.

---

### 3.2 Login

```
Browser
  │  POST /api/auth/login  { email, password }
  ▼
Route Handler
  ├─ validate(loginSchema)
  ├─ auth.service.loginUser(email, password, deviceInfo)
  │    ├─ UserModel.findOne({ email })  → 401 if not found
  │    ├─ bcrypt.compare(password, hash)  → 401 if mismatch
  │    ├─ generateAccessToken(userId)   → JWT, 15 min
  │    ├─ generateRefreshToken(userId)  → JWT, 7 days
  │    ├─ RefreshTokenModel.create({ userId, token: sha256(refreshToken), expiresAt })
  │    └─ UserActivityLogModel.create({ userId, action: 'LOGIN', ip, deviceName })
  ├─ setAuthCookies(accessToken, refreshToken)  → sets both httpOnly cookies
  └─ sendSuccess(user)
```

The refresh token is **hashed (SHA-256)** before storage. The plain token lives only in the cookie.

---

### 3.3 Silent Token Refresh

Triggered automatically by the Axios response interceptor when any request returns 401.

```
Axios interceptor (src/lib/axios/axiosClient.ts)
  │
  │  Original request → 401 response
  │
  ├─ isRefreshing flag prevents duplicate refresh calls
  │  (concurrent 401s are queued in failedQueue)
  │
  │  POST /api/auth/refresh  (no body — refreshToken cookie sent automatically)
  ▼
Route Handler
  ├─ Read refreshToken from cookie
  ├─ auth.service.refreshUserToken(token)
  │    ├─ jwt.verify(token, JWT_REFRESH_SECRET)  → 401 if invalid
  │    ├─ sha256(token) → lookup in RefreshTokenModel
  │    ├─ Not found → deleteMany(userId) + 401 TOKEN_REUSE  (token rotation attack detected)
  │    ├─ generateAccessToken(userId)
  │    ├─ generateRefreshToken(userId)
  │    └─ Update stored token hash + expiresAt  (rotation: old token invalidated)
  ├─ setAuthCookies(newAccess, newRefresh)
  └─ sendSuccess(null, 'Token refreshed')

Back in interceptor:
  ├─ processQueue(null)  → replay all queued requests
  └─ Retry original request
```

If refresh fails, the interceptor clears the auth store and redirects to `/login`.

---

### 3.4 Logout

```
Browser
  │  POST /api/auth/logout
  ▼
Route Handler
  ├─ Read refreshToken cookie
  ├─ auth.service.logoutUser(token)
  │    ├─ sha256(token) → find in RefreshTokenModel
  │    ├─ UserActivityLogModel.create({ userId, action: 'LOGOUT' })
  │    └─ storedToken.deleteOne()
  ├─ clearAuthCookies()  → maxAge: 0 on both cookies
  └─ sendSuccess(null)
```

---

### 3.5 Forgot / Reset Password

```
FORGOT PASSWORD
  Browser  →  POST /api/auth/forgot-password  { email }
               ├─ UserModel.findOne({ email })  → 404 if not found
               ├─ crypto.randomBytes(32) → plainToken
               ├─ sha256(plainToken) → stored as resetPasswordToken
               ├─ resetPasswordExpire = now + 15 min
               ├─ user.save()
               └─ sendResetPasswordEmail(email, plainToken)  → Nodemailer

RESET PASSWORD
  Browser  →  POST /api/auth/reset-password/[token]  { password }
               ├─ sha256(token) → find user where token matches AND expiry > now
               ├─ 400 INVALID_OR_EXPIRED_TOKEN if not found
               ├─ bcrypt.hash(newPassword, 10)
               ├─ Clear resetPasswordToken + resetPasswordExpire
               └─ user.save()
```

---

## 4. Middleware (Proxy) — Route Guard & CORS

`src/proxy.ts` runs on every request except `_next/static`, `_next/image`, `favicon.ico`, and `public/`.

```
Incoming request
  │
  ├─ pathname starts with /api/*
  │    ├─ origin in ALLOWED_ORIGINS?
  │    │    YES → set CORS headers (Allow-Origin, Allow-Credentials, Allow-Methods, Allow-Headers)
  │    │    NO  → no CORS headers (browser will block cross-origin)
  │    ├─ method === OPTIONS → return 204 (preflight)
  │    └─ otherwise → NextResponse.next() with CORS headers
  │
  ├─ pathname === /
  │    └─ redirect → /landing
  │
  ├─ isLoggedIn = Boolean(cookies.get('accessToken'))
  │
  ├─ isAuthRoute (/login, /register, /forgot-password, /reset-password)
  │    isLoggedIn + isAuthRoute → redirect → /landing
  │
  └─ isProtectedRoute (/landing, /marketplace, /jobs, /shops, /account)
       !isLoggedIn + isProtectedRoute → redirect → /login
```

**Allowed origins for CORS:**
- `http://localhost:3000` / `3001` / `3002` (Next.js dev)
- `http://localhost:5173` / `5174` (Vite admin dev)
- `https://bright-college-admin-react.vercel.app` (production admin)

---

## 5. Feature Data Flows

### 5.1 Marketplace — Listed Products

**Public listing (authenticated users):**
```
GET /api/listed-products?page=1&limit=10&search=...&category=...&condition=...
  ├─ getAuthUser() → 401 if not logged in
  ├─ validate(listProductsQuerySchema)
  ├─ listedProduct.service.getListedProducts(filters)
  │    └─ ListedProductModel.find(query).populate('user', 'name email').paginate()
  └─ { products[], total, page, limit, pagination }
```

**Create listing:**
```
POST /api/listed-products  { productName, images[], category, condition, price, ... }
  ├─ authorize(user, USER)
  ├─ validate(createListedProductSchema)
  ├─ listedProduct.service.createListedProduct(data, userId)
  │    └─ ListedProductModel.create({ ...data, user: userId })
  └─ 201 + product
```

**Update / Delete (owner only):**
```
PUT  /api/listed-products/[id]  → findOneAndUpdate({ _id: id, user: userId })
DELETE /api/listed-products/[id] → findOneAndDelete({ _id: id, user: userId })
  Both enforce ownership at the DB query level (user field must match)
```

**My products:**
```
GET /api/listed-products/my-products
  ├─ getAuthUser() → inject userId into filters
  └─ getListedProducts({ userId })
```

---

### 5.2 Marketplace — Requested Products

Mirrors the listed products flow with these differences:

| Field | Listed Product | Requested Product |
|-------|---------------|-------------------|
| Price | String (fixed) | `{ from, to }` range |
| Status flag | `isAvailable` | `isFulfilled` |
| Images | Required | Optional |
| Condition | Required enum | Not present |

```
GET  /api/requested-products          → paginated list (auth required)
POST /api/requested-products          → create request (USER role)
GET  /api/requested-products/[id]     → single request
PUT  /api/requested-products/[id]     → update (owner only)
DELETE /api/requested-products/[id]   → delete (owner only)
GET  /api/requested-products/my-requests → current user's requests
```

---

### 5.3 Jobs

```
GET /api/jobs  (authenticated users — read only for USER role)
  ├─ Filters: search, jobType, minExperience, maxExperience,
  │           minSalary, maxSalary, deadlineFrom, deadlineTo
  └─ JobModel.find(query).sort({ createdAt: -1 }).paginate()

GET /api/jobs/[id]  → single job by MongoDB _id

POST /api/jobs  (ADMIN only)
  ├─ authorize(user, ADMIN)
  ├─ validate(createJobSchema)
  ├─ generateJobId()  → unique "Job-XXXX" string
  └─ JobModel.create({ ...data, jobId, createdBy: userId })

PUT  /api/jobs/[id]  (ADMIN only) → findByIdAndUpdate
DELETE /api/jobs/[id]  (ADMIN only) → findByIdAndDelete
```

---

### 5.4 Shops

```
GET /api/shops  (authenticated users)
  ├─ Filters: search (name/topItems/allItems), distance, openDay
  └─ ShopModel.find(query).paginate()

GET /api/shops/[id]  → single shop

POST /api/shops  (ADMIN only)
  ├─ generateShopId()  → unique "Shop-XXXX" string
  └─ ShopModel.create({ ...data, shopId, createdBy: userId })

PUT  /api/shops/[id]  (ADMIN only)
DELETE /api/shops/[id]  (ADMIN only)
```

Shop documents include full weekly timing (`shopTiming.monday.isOpen`, `opensAt`, `closesAt`), contact details, photos array, and top/all items lists.

---

### 5.5 CMS Pages

```
GET /api/cms              → all CMS pages (PUBLIC — no auth)
GET /api/cms/[type]       → single page by type e.g. ABOUT_US (PUBLIC)

POST /api/cms             (ADMIN only) → create new CMS type
PUT  /api/cms/[type]      (ADMIN only) → update by type or MongoDB _id
DELETE /api/cms/[type]    (ADMIN only) → delete by type or MongoDB _id
```

CMS types: `TERMS_AND_CONDITIONS`, `PRIVACY_POLICY`, `ABOUT_US`, `FAQ`.  
The `[type]` segment accepts either the type string or a 24-char MongoDB ObjectId.

---

### 5.6 AI Description Generation

```
POST /api/ai/generate-description
  { productName, category, condition, yearUsed, price }

  ├─ authorize(user, USER)
  ├─ validate(generateDescriptionSchema)
  ├─ checkRateLimit(userId)
  │    └─ In-memory map: 10 requests / hour per user
  │       → 429 RATE_LIMIT_EXCEEDED if exceeded
  ├─ Build prompt (product details → friendly marketplace description)
  ├─ fetch('https://api.ai.cc/v1/chat/completions')
  │    model: gpt-4o-mini, max_tokens: 150, temperature: 0.7
  │    30-second AbortController timeout
  └─ sendSuccess({ description: trimmedText })
```

Similarly, `POST /api/ai/generate-request-description` follows the same pattern for requested product descriptions.

---

### 5.7 User Profile

```
GET   /api/auth/profile   → getAuthUser() → return user (no password)
PATCH /api/auth/profile   { name, email, phoneNumber, photo }
  ├─ getAuthUser() → authorize(user, USER)
  ├─ Email uniqueness check if email changed
  └─ Object.assign(user, data) → user.save()
```

---

## 6. External Admin Panel API Data Flow

The admin panel is a **separate React SPA** hosted at `https://bright-college-admin-react.vercel.app`. It communicates with this Next.js app's `/api/**` endpoints over HTTPS using the same cookie-based auth.

### 6.1 CORS Handshake

Every cross-origin request from the admin SPA goes through this flow:

```
Admin SPA (Vite/React)
  │
  │  OPTIONS /api/admin/dashboard
  │  Origin: https://bright-college-admin-react.vercel.app
  ▼
src/proxy.ts
  ├─ pathname starts with /api/ ✓
  ├─ origin in ALLOWED_ORIGINS ✓
  ├─ method === OPTIONS
  └─ 204 response with headers:
       Access-Control-Allow-Origin: https://bright-college-admin-react.vercel.app
       Access-Control-Allow-Credentials: true
       Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
       Access-Control-Allow-Headers: Content-Type, Authorization

Admin SPA
  │  Actual GET /api/admin/dashboard
  │  Cookie: accessToken=...; refreshToken=...  (sent by browser automatically)
  ▼
Route Handler  (CORS headers set again on actual response)
```

**Key requirement:** The admin SPA's axios/fetch must use `withCredentials: true` so the browser sends the httpOnly cookies cross-origin.

---

### 6.2 Admin Authentication

The admin user logs in through the **same** `/api/auth/login` endpoint as regular users. The difference is the `role` field on the User document.

```
Admin SPA
  │  POST /api/auth/login  { email, password }
  ▼
auth.service.loginUser()
  ├─ Validates credentials (same as user login)
  ├─ Sets accessToken + refreshToken cookies
  └─ Returns user object  { _id, name, email, role: "ADMIN", ... }

Admin SPA stores user.role and conditionally shows admin UI.
```

Token refresh works identically — the Axios interceptor on the admin SPA calls `POST /api/auth/refresh` and the cookies rotate automatically.

---

### 6.3 Dashboard Stats

```
Admin SPA
  │  GET /api/admin/dashboard
  │  (accessToken cookie sent automatically)
  ▼
Route Handler
  ├─ getAuthUser()       → verify accessToken cookie
  ├─ authorize(user, ADMIN)  → 403 if role !== ADMIN
  └─ AdminService.getDashboardStats()
       └─ Promise.all([
            UserModel.countDocuments(),
            JobModel.countDocuments(),
            ShopModel.countDocuments(),
            ListedProductModel.countDocuments(),
            RequestedProductModel.countDocuments(),
            UserActivityLogModel.countDocuments({ action: 'LOGIN' }),
            UserActivityLogModel.countDocuments({ action: 'LOGOUT' }),
          ])

Response:
{
  "data": {
    "totalUsers": 142,
    "totalJobs": 38,
    "totalShops": 21,
    "totalListedProducts": 310,
    "totalRequestedProducts": 87,
    "totalLogins": 1204,
    "totalLogouts": 980
  }
}
```

---

### 6.4 Activity Logs

```
Admin SPA
  │  GET /api/admin/activity-logs?page=1&limit=20&action=LOGIN&userId=...
  ▼
Route Handler
  ├─ authorize(user, ADMIN)
  └─ AdminService.getActivityLogs({ page, limit, action, userId })
       └─ UserActivityLogModel.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip).limit(limit)

Response:
{
  "data": {
    "logs": [
      {
        "_id": "...",
        "userId": { "_id": "...", "name": "Alice", "email": "alice@..." },
        "action": "LOGIN",
        "ip": "192.168.1.1",
        "deviceName": "Mozilla/5.0 ...",
        "createdAt": "2026-05-10T..."
      }
    ],
    "pagination": { "total": 1204, "page": 1, "limit": 20, "pages": 61 }
  }
}
```

Activity logs auto-expire after **90 days** via a MongoDB TTL index.

---

### 6.5 Admin-Managed Resources (Jobs, Shops, CMS)

The admin panel uses the same `/api/jobs`, `/api/shops`, and `/api/cms` endpoints. The ADMIN role gate is enforced server-side on write operations.

```
┌─────────────────────────────────────────────────────────────────┐
│  Resource     │ Admin Can                │ User Can             │
├───────────────┼──────────────────────────┼──────────────────────┤
│ Jobs          │ GET, POST, PUT, DELETE   │ GET only             │
│ Shops         │ GET, POST, PUT, DELETE   │ GET only             │
│ CMS           │ GET, POST, PUT, DELETE   │ GET (public)         │
│ Listed Prods  │ GET (all)                │ GET, POST, PUT, DEL  │
│               │                          │ (own records only)   │
│ Req. Prods    │ GET (all)                │ GET, POST, PUT, DEL  │
│               │                          │ (own records only)   │
│ Admin Stats   │ GET /api/admin/dashboard │ ✗ (403)              │
│ Activity Logs │ GET /api/admin/activity  │ ✗ (403)              │
└───────────────┴──────────────────────────┴──────────────────────┘
```

**Full admin API surface:**

```
Auth
  POST /api/auth/login
  POST /api/auth/logout
  POST /api/auth/refresh
  GET  /api/auth/profile

Admin-only
  GET  /api/admin/dashboard
  GET  /api/admin/activity-logs

Jobs (admin write, user read)
  GET    /api/jobs
  POST   /api/jobs              ← ADMIN
  GET    /api/jobs/[id]
  PUT    /api/jobs/[id]         ← ADMIN
  DELETE /api/jobs/[id]         ← ADMIN

Shops (admin write, user read)
  GET    /api/shops
  POST   /api/shops             ← ADMIN
  GET    /api/shops/[id]
  PUT    /api/shops/[id]        ← ADMIN
  DELETE /api/shops/[id]        ← ADMIN

CMS (admin write, public read)
  GET    /api/cms
  POST   /api/cms               ← ADMIN
  GET    /api/cms/[type]
  PUT    /api/cms/[type]        ← ADMIN
  DELETE /api/cms/[type]        ← ADMIN
```

---

## 7. Database Models & Relationships

```
User
  _id, name, email, password (hashed), role (USER|ADMIN)
  phoneNumber?, photo?
  resetPasswordToken?, resetPasswordExpire?
  timestamps

RefreshToken
  userId → User._id
  token (SHA-256 hash of plain token)
  expiresAt  ← TTL index (auto-delete on expiry)
  deviceInfo { ip, name }

UserActivityLog
  userId → User._id
  action (LOGIN | LOGOUT)
  ip?, deviceName?
  createdAt  ← TTL index (auto-delete after 90 days)

Job
  jobId (unique "Job-XXXX"), jobName, jobProvider
  createdBy → User._id
  type (part-time | full-time)
  deadline, location, experience
  salary { from, to }
  responsibilities[], contactDetails { email, phoneNo }

Shop
  shopId (unique "Shop-XXXX"), name, type, location
  createdBy → User._id
  distance?, photo?, photos[], poster?
  topItems[], allItems[]
  contactDetails { email, phoneNo }
  shopTiming { monday…sunday: { isOpen, opensAt, closesAt } }

ListedProduct
  user → User._id
  productName, images[], category, condition
  price (string), isNegotiable, yearUsed
  description, contactDetails { phoneNo, email }
  isAvailable (default: true)

RequestedProduct
  user → User._id
  name, images[]?, category
  price { from, to }, isNegotiable
  description, contactDetails { phoneNo, email }
  isFulfilled (default: false)

CMS
  cmsId (unique "CMS-XXXX"), type (unique, uppercase)
  title, content, isActive
```

---

## 8. Error Handling Pipeline

```
Route Handler throws AppError or unknown error
  │
  └─ withErrorHandler catches it
       │
       ├─ AppError instance
       │    └─ { code: err.statusCode, success: false, message, errorCode, data: null }
       │
       └─ Unknown error
            ├─ production → "Internal Server Error"
            └─ development → err.message

Common error codes:
  UNAUTHORIZED          401  No valid accessToken
  FORBIDDEN             403  Wrong role
  INVALID_CREDENTIALS   401  Bad email/password
  EMAIL_ALREADY_EXISTS  409  Duplicate email on register
  INVALID_TOKEN         401  Bad/expired refresh token
  TOKEN_REUSE           401  Refresh token reuse detected (rotation attack)
  INVALID_OR_EXPIRED_TOKEN 400  Password reset token expired
  NOT_FOUND             404  Resource not found
  RATE_LIMIT_EXCEEDED   429  AI endpoint: >10 req/hour
  AI_NOT_CONFIGURED     503  Missing AICC_API_KEY
  AI_SERVICE_ERROR      502  AICC API call failed
  VALIDATION_ERROR      400  Zod schema failure (includes field details)
```

---

## 9. Environment Variables Reference

| Variable | Used In | Purpose |
|----------|---------|---------|
| `MONGODB_URI` | `src/backend/lib/db.ts` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | `src/backend/lib/jwt.ts` | Sign/verify 15-min access tokens |
| `JWT_REFRESH_SECRET` | `src/backend/lib/jwt.ts` | Sign/verify 7-day refresh tokens |
| `EMAIL_HOST` | `src/backend/lib/mailer.ts` | SMTP host for password reset emails |
| `EMAIL_PORT` | mailer | SMTP port |
| `EMAIL_USER` | mailer | SMTP username |
| `EMAIL_PASS` | mailer | SMTP password |
| `EMAIL_FROM` | mailer | Sender address |
| `NEXT_PUBLIC_APP_URL` | mailer / client | Base URL for reset-password links |
| `AICC_API_KEY` | AI routes | API key for ai.cc (OpenAI-compatible) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Upload lib | Cloudinary image uploads (optional) |
| `NEXT_PUBLIC_IMGBB_API_KEY` | Upload lib | ImgBB image uploads (optional) |
