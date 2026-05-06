# Bright College Hub - Campus App (AI-Powered)

## Lighthouse Report

Scores captured on the live login page (`https://bright-college-hub-next.vercel.app/login`) using Lighthouse desktop strategy.

| Category       | Score |
| -------------- | ----- |
| Performance    | 94 🟢 |
| Accessibility  | 92 🟢 |
| Best Practices | 100 🟢 |
| SEO            | 60 🟡 |

> Scores measured on the live production build via [Google Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/).

---

Bright College Hub is a full-stack Next.js 16 App Router application for a college campus ecosystem. It combines user authentication, a student marketplace, product requests, campus shops, jobs, account management, CMS content, AI-powered description generation, and admin-facing APIs inside one Next.js project using the BFF pattern. The frontend is organized by feature modules, reusable components, custom hooks, React Query, and Zustand. The backend is implemented with Next.js Route Handlers, Mongoose, Zod validation, services, auth guards, secure cookies, JWT refresh rotation, password reset email, role-based authorization, and CDN-based image uploads. Rendering is mixed deliberately: static auth pages, dynamic list/account pages, ISR-backed detail pages, metadata generation, and React Query hydration for fast server-to-client data flow. The platform also includes AI-powered description generation on the List a Product and Request a Product forms — the AI call is made exclusively through a secure server-side Next.js route using the AICC API (OpenAI-compatible), with per-user in-memory rate limiting, Zod validation, auth guards, and a polished Generate Button UX including loading states, character counters, and toast error handling.

The main purpose of this README is to explain the project technically: what is implemented, why each major part exists, how data moves through the app, and how the frontend, backend, security, rendering, hooks, reusable components, and upload flow fit together.

## Live URL

- Live app: [https://bright-college-hub-next.vercel.app](https://bright-college-hub-next.vercel.app)
- Login with: `collage-user@yopmail.com` / `12345678`

- Admin panel origin currently allowed by CORS: [https://bright-college-admin-react.vercel.app](https://bright-college-admin-react.vercel.app)

## How To Run The Project

1. Install dependencies from the lock file.

```bash
npm install
```

2. Create a local environment file with the project secrets and service configuration needed for database access, authentication, email, app URLs, and image upload.

3. Start the development server.

```bash
npm run dev
```

4. Open the app.

```text
http://localhost:3000
```

Other scripts:

```bash
npm run build
npm run start
npm run lint
```

`npm run build` creates a production build. `next.config.ts` uses `output: 'standalone'`, so the build can be deployed in container or server environments with only the runtime files needed by Next.js.

## User Stories And Product Capabilities

### Visitor And Authentication Flow

- A visitor can open the root route, which is redirected toward the protected landing area by `src/proxy.ts`; unauthenticated users are then sent to `/login` by the protected layout guard.
- A new user can register with name, email, and password.
- A registered user can log in with email and password.
- A logged-in user receives secure httpOnly auth cookies from the backend.
- A user can request a password reset by email.
- A user can open a reset-password link containing a token and submit a new password.
- A user can log out, which clears auth cookies and deletes the active refresh token record.

Why this flow exists:

- Passwords are hashed with `bcryptjs`.
- Access and refresh tokens are stored in httpOnly cookies instead of browser storage.
- The refresh-token database record is hashed before storage, so a leaked database does not expose usable refresh tokens.
- Token refresh happens through `/api/auth/refresh`, where the server can safely rotate cookies.

### Authenticated Campus User

After login, the user enters the `(protected)` route group. The protected layout reads the Zustand auth store after hydration and redirects unauthenticated users to `/login`.

An authenticated user can:

- View the landing dashboard with featured jobs, shops, listed products, and requested products.
- Browse marketplace listings with search, filters, pagination, and detail pages.
- Browse requested products from other students.
- View product and request details with owner/contact information.
- Create a new product listing with AI-assisted description generation.
- Upload product images through the CDN upload pipeline.
- Manage their own listed products.
- Edit existing product listings.
- Delete their own product listings.
- Create a product request with AI-assisted description generation.
- Manage their own requests.
- Edit or delete their own requests.
- View and update their profile.
- Upload a profile photo.
- Browse shops with search/filter support.
- Open a shop detail page with shop timing, items, contact details, and images.
- Browse jobs with search/filter support.
- Open a job detail page with salary, experience, responsibilities, deadline, and contact details.

### Admin-Facing Capability

The admin panel is a separate React SPA, but this Next.js project exposes admin-only APIs for it.

An admin can use protected endpoints to:

- Create, update, and delete shops.
- Create, update, and delete jobs.
- Create, update, and delete CMS content.
- Read admin dashboard metrics.

Why the admin panel is separate:

- The user-facing app benefits from Next.js routing, server rendering, metadata, and BFF APIs.
- The admin app is an internal SPA with its own deployment and UI needs.
- CORS in `src/proxy.ts` explicitly allows known admin origins and keeps credentialed requests locked to trusted domains.

## AI-Powered Description Generation

Bright College Hub includes an AI description generator on both the **List a Product** and **Request a Product** forms. A seller or buyer fills in the key product fields and clicks **✨ Generate using AI** to receive a 2–3 sentence, polite description that is automatically populated into the description textarea.

### How It Works

The AI call is made exclusively through a Next.js API route on the server. The API key is never exposed to the browser.

```text
User fills in product fields (name, category, price, condition, years used)
  -> clicks "✨ Generate using AI"
  -> useGenerateDescription hook calls POST /api/ai/generate-description
  -> route validates auth (401 if unauthenticated)
  -> route validates request body with Zod (400 on missing fields)
  -> in-memory rate limiter checks per-user quota (429 if exceeded)
  -> AICC_API_KEY is read from server-side environment
  -> prompt is built server-side from the product fields
  -> fetch call to AICC API (api.ai.cc) with gpt-4o-mini model
  -> response text is trimmed and validated (502 if empty)
  -> { description: string } returned to client
  -> hook calls setValue('description', text, { shouldDirty: true })
  -> description textarea is auto-populated
```

### AI Provider

The project uses **AICC** (`api.ai.cc`), an OpenAI-compatible proxy with smart model fallback and generous free quota. The model used is `gpt-4o-mini`, which is fast and cost-effective for short description generation.

Why AICC instead of Gemini or Grok directly:

- Gemini free-tier keys on new Google Cloud projects often have `limit: 0` on newer models.
- AICC provides a stable OpenAI-compatible endpoint with smart fallback across models.
- The same code works with any OpenAI-compatible provider by changing the base URL and model name.

### API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/ai/generate-description` | Generates a listing description from product name, category, price, condition, and years used |
| `POST` | `/api/ai/generate-request-description` | Generates a request description from product name, category, min price, and max price |

### Request Body — List a Product

```json
{
  "productName": "HP Laptop",
  "category": "ELECTRONICS",
  "price": "16",
  "condition": "USED",
  "yearUsed": 4
}
```

### Request Body — Request a Product

```json
{
  "name": "Water Bottle",
  "category": "SPORTS",
  "priceFrom": 5,
  "priceTo": 20
}
```

### Success Response

```json
{
  "code": 200,
  "success": true,
  "message": "OK",
  "data": {
    "description": "This well-maintained HP Laptop is a great choice for students looking for a reliable device for their studies. Used for 4 years, it remains in good working condition and is perfect for everyday academic tasks. A fantastic opportunity to own quality tech at a student-friendly price."
  }
}
```

### Prompt Design

The prompt is built entirely on the server to prevent client-side prompt injection. Key instructions sent to the AI:

- Write 2–3 sentences only.
- Use a polite, friendly tone suitable for a college student marketplace.
- Do **not** mention the price in the description text.
- Return plain text only — no markdown, no bullet points, no headings.

For request descriptions, the tone is adjusted to a "wanted ad" style — the student is looking to buy, not sell.

### Security

- `AICC_API_KEY` is a server-only environment variable and is never included in any HTTP response or client bundle.
- All requests to the AI route require a valid authenticated session (`getAuthUser` + `authorize(user, UserRole.USER)`).
- The request body is validated with a Zod schema before the AI call is made.
- The prompt is constructed server-side from validated field values only.

### Rate Limiting

An in-memory rate limiter prevents a single user from exhausting the free-tier quota.

- Maximum: **10 AI generation requests per user per hour**.
- Storage: module-level `Map<userId, { count, windowStart }>` — resets on server restart.
- On limit exceeded: HTTP 429 with `RATE_LIMIT_EXCEEDED` error code and an ISO reset timestamp in the message.
- The client disables the Generate button until the reset time passes.

### Generate Button UX

- The button is **disabled** until all required context fields are filled (name/productName, category, price/priceFrom+priceTo, condition, yearUsed).
- While generating, the button shows a spinner and the label **"Generating…"** and is disabled.
- On success, the description textarea is auto-populated and the button returns to its default state.
- On error, a toast notification shows the error message.
- On 429, the button is disabled until the rate-limit window resets.
- When `AICC_API_KEY` is not configured, the button is disabled with a tooltip "AI not available".

### Character Counter

Both description textareas include a live character counter:

- Displays `{n} / 500 characters` below the textarea.
- Hard cap of 500 characters enforced via `maxLength={500}`.
- Counter turns **amber** at 450–499 characters.
- Counter turns **red** at 500 characters.

---

## Dependencies

### Runtime Dependencies

- `next@16.2.1`: Next.js App Router framework, route handlers, layouts, metadata, rendering, image/font optimization.
- `react@19.2.4`, `react-dom@19.2.4`: React UI runtime.
- `@tanstack/react-query@^5.95.2`: Client/server query cache, mutations, prefetching, hydration, stale-time control.
- `axios@^1.13.6`: Browser API client for same-origin `/api/*` calls.
- `mongoose@^9.4.1`: MongoDB models, schemas, queries, and persistence.
- `bcryptjs@^3.0.3`: Password hashing during registration and password reset.
- `jsonwebtoken@^9.0.3`: Access token and refresh token creation/verification.
- `nodemailer@^8.0.5`: Password reset email delivery.
- `zod@^4.3.6`: Backend route-handler validation.
- `yup@^1.7.1`: Frontend form validation schemas.
- `react-hook-form@^7.72.1`: Form state and submission handling.
- `@hookform/resolvers@^5.2.2`: Connects validation schemas to React Hook Form.
- `zustand@^5.0.12`: Auth store and local client state.
- `react-dropzone@^15.0.0`: Drag-and-drop image selection.
- `react-hot-toast@^2.6.0`: Success/error notifications.
- `lucide-react@^1.7.0`: Icon system for UI controls and links.

### Development Dependencies

- `typescript@^5`: Strict typing across frontend and backend code.
- `eslint@^9`, `eslint-config-next@16.2.1`: Linting with Next.js and TypeScript rules.
- `vitest@^4.1.4`: Test runner.
- `fast-check@^4.6.0`: Property-based testing support.
- `tailwindcss@^4`, `@tailwindcss/postcss@^4`: Tailwind/PostCSS tooling available to the styling pipeline.
- `@types/node@^20`, `@types/react@^19`, `@types/react-dom@^19`: Core TypeScript definitions.
- `@types/bcryptjs@^2.4.6`, `@types/jsonwebtoken@^9.0.10`, `@types/nodemailer@^8.0.0`: Backend library TypeScript definitions.

## Project Structure

```text
src/
  app/
    (auth)/                 Public auth routes
    (protected)/            Authenticated application routes
    api/                    Next.js Route Handlers used as backend APIs
    layout.tsx              Root layout, fonts, metadata, providers
    providers.tsx           React Query and toast providers

  proxy.ts                  Request proxy/middleware behavior

  modules/
    auth/                   Login, register, reset password, auth hooks/store/API
    landing/                Authenticated dashboard landing page
    marketplace/            Product listing and requested product browsing
    user/                   Account, profile, listing/request management
    shops/                  Campus shop list and detail feature
    jobs/                   Campus job list and detail feature

  backend/
    models/                 Mongoose models
    services/               Business logic
    validators/             Zod backend validation
    queries/                Server-side read helpers for RSC prefetching
    actions/                Server actions for selected form flows
    lib/                    DB, JWT, cookies, auth guard, mailer, response helpers
    repositories/           Early repository placeholder; current persistence mainly uses services/models

  components/
    common/                 Shared UI primitives and feature-neutral components
    layouts/                Shared page layout components

  lib/
    axios/                  API client and API factory
    react-query/            Query client, keys, hydration helpers
    upload/                 Cloudinary, ImgBB, and image compression helpers
    zustand/                Store factory/persist helpers
    utils/                  Config and error helpers

  styles/                   Global design tokens, utilities, and page styles
```

## Next.js Rendering Strategies Used

This project uses multiple rendering strategies depending on the page type.

### Static Rendering

Auth pages such as login, register, forgot password, and reset password use `export const dynamic = 'force-static'`.

Why:

- These pages do not need per-request server data.
- They are mainly client forms.
- Static output keeps the public auth shell fast.

Examples:

- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`

### Dynamic Rendering

List and account pages use `export const dynamic = 'force-dynamic'`.

Why:

- Marketplace, shops, jobs, and account pages depend on filters, authenticated state, or user-owned data.
- These screens should avoid stale route output and let React Query/client hooks control live data.

Examples:

- `src/app/(protected)/marketplace/page.tsx`
- `src/app/(protected)/shops/page.tsx`
- `src/app/(protected)/jobs/page.tsx`
- `src/app/(protected)/account/*/page.tsx`

### ISR With `revalidate`

Detail pages use server prefetching plus `revalidate = 300`.

Why:

- Detail pages benefit from server-rendered first paint and SEO metadata.
- Data changes less frequently than list filters.
- A 5-minute revalidation window balances freshness and performance.

Examples:

- `src/app/(protected)/marketplace/[id]/page.tsx`
- `src/app/(protected)/shops/[id]/page.tsx`
- `src/app/(protected)/jobs/[id]/page.tsx`

The protected landing page uses `revalidate = 60` because its dashboard data changes more often.

### Server Components

App Router pages are server components by default unless marked with `'use client'`.

Used for:

- Server-side data prefetching.
- `generateMetadata`.
- `notFound()` handling.
- Query dehydration before rendering client views.

### Client Components

Interactive views, forms, filters, uploads, auth guards, and hooks use `'use client'`.

Used for:

- React Hook Form.
- Zustand auth state.
- React Query hooks.
- Dropzone uploads.
- Toast notifications.
- Router navigation after login/logout.

### Hydration With React Query

Detail pages and the landing page prefill a server query client, dehydrate it, and pass it into `HydrationBoundary`.

Flow:

```text
Server page -> backend query -> QueryClient.setQueryData/prefetchQuery -> dehydrate -> HydrationBoundary -> client view reads cached data
```

Why:

- The first render already has data.
- Client hooks can continue from the same cache.
- Detail pages avoid a blank loading state after navigation.

### Metadata API

The root layout defines default metadata and Open Graph text. Detail pages generate per-record metadata from database data.

Used for:

- Product detail titles/descriptions.
- Shop detail titles/descriptions.
- Job detail titles/descriptions.
- Auth pages with `robots: { index: false }`.

### Route Groups

- `(auth)` groups login, register, forgot password, and reset password without adding `auth` to the URL.
- `(protected)` groups authenticated pages under one guarded layout without adding `protected` to the URL.

Why:

- Layout behavior is shared.
- URLs stay clean.
- Auth gating is centralized.

### Dynamic Routes

- `[id]` is used for product, request, shop, job, and account edit/detail pages.
- `[token]` is used for password reset.

### Loading And Error Files

The app uses App Router `loading.tsx` and `error.tsx` files for protected route groups and major list pages. These give route-level loading and error UI without manually wiring every screen.

### `src/proxy.ts`

`src/proxy.ts` acts as the Next.js proxy/middleware layer.

It does three things:

- Adds CORS headers for `/api/*` requests from explicitly allowed origins.
- Handles `OPTIONS` preflight requests.
- Redirects `/` to `/landing` at the proxy level, while `src/app/page.tsx` also redirects root to `/login` when the page route is reached.

The matcher excludes static assets, optimized images, favicon, and public files so the proxy does not run unnecessarily for asset requests.

### `next/dynamic` And Browser-Only UI

The app uses `next/dynamic` with `ssr: false` for components that depend on browser-only behavior or should not be part of the server-rendered HTML.

Verified examples:

- `src/app/(auth)/login/LoginClient.tsx` dynamically imports `LoginPage` with SSR disabled because the login screen hydrates client auth state.
- `ImageUploader` is dynamically loaded in listing/profile forms because it depends on file/dropzone browser APIs.
- Contact and policy modals are dynamically loaded so modal code is split away from the first render path.

Why:

- Avoids hydration mismatch for browser-owned state.
- Keeps server components free of client-only APIs.
- Splits modal/upload UI out of the initial route bundle.

## Component Breaking And Reusability

The codebase separates components by responsibility.

### Page Components

`src/modules/<feature>/pages/*Page.tsx` files are feature entry components. App Router `page.tsx` files stay thin and delegate UI/logic to module pages.

Why:

- Next.js route files remain framework glue.
- Feature implementation stays testable and organized outside `src/app`.
- Modules can own their domain behavior.

### View Components

`*View.tsx` components render full feature screens.

Examples:

- `MarketplaceView`
- `ProductDetailView`
- `RequestDetailView`
- `ShopsView`
- `ShopDetailView`
- `JobsView`
- `JobDetailView`
- `MyProfileView`
- `ListProductView`
- `ManageListingView`
- `ManageRequestView`

### Feature Components

Feature modules break screens into smaller domain-specific components.

Marketplace:

- `ListedProductCard`
- `RequestedProductCard`
- `ProductGallery`
- `ProductInfo`
- `RequestImage`
- `RequestInfoCard`
- `ListedFilter`
- `RequestedFilter`

Jobs:

- `JobCard`
- `JobTitleCard`
- `JobsFilter`
- `JobOverview`
- `JobDescription`
- `JobResponsibilities`

Shops:

- `ShopCard`
- `ShopHeroBanner`
- `ShopContactCard`
- `ShopOpeningHours`
- `ShopTopItems`
- `ShopsFilter`

User/account:

- `ProfileHeader`
- `ProfileProductCard`
- Account form/view components for profile, listing, and request management.

### Shared Components

`src/components/common` contains reusable UI used across features:

- `AppHeader`
- `AppFooter`
- `BackButton`
- `FallbackImage`
- `FormError`
- `ImageUploader`
- `Input`
- `Loader`
- `Modal`
- `Pagination`
- `PolicyModal`
- `Search`
- `SkeletonCard`

Why:

- Shared UI avoids duplicated markup.
- Feature-specific UI remains inside feature modules.
- Components with no business-domain dependency can be reused safely.

### Layout Components

`src/components/layouts` contains broader page layout wrappers:

- `MainLayout`
- `UserLayout`

App Router layouts live in `src/app`, while reusable visual layout components live in `src/components/layouts`.

### Static Data Constants

Shared static values live in `src/utils/globalStaticData.ts`.

Currently centralized there:

- Landing hero image URLs.
- Job type labels and filter option arrays.
- Marketplace category background/text colors.
- Shop category items.
- Days of the week for shop timing displays.
- Footer navigation groups.
- Account sidebar links used by `UserLayout`.
- Reset-password decorative sizing constants.
- `formatPrice()` for consistent price display.

Why:

- Domain labels and option lists are not duplicated across cards, filters, and layouts.
- Navigation changes can be made in one file.
- Styling constants that map to business categories stay consistent across marketplace UI.

## Hooks Architecture

Hooks keep form, query, filter, mutation, and upload behavior out of view components.

### Auth Hooks

- `useLogin`
- `useLoginForm`
- `useRegister`
- `useRegisterForm`
- `useForgotPassword`
- `useForgotPasswordForm`
- `useResetPassword`
- `useResetPasswordForm`
- `useProfile`
- `useUpdateProfile`
- `useUpdateProfileForm`
- `usePasswordStrength`
- `useLogout`

These hooks separate form state, validation, API calls, and auth-store updates from UI markup.

### Marketplace Hooks

- `useListedProducts`
- `useRequestedProducts`
- `useMarketplaceFilters`

These drive listing/request data, query params, filters, and pagination.

### User Account Hooks

- `useListProductForm`
- `useManageListingActions`
- `useManageListingForm`
- `useRequestProductForm`
- `useManageRequestActions`
- `useManageRequestForm`
- `useEditProfileForm`
- `useImageUpload`
- `useUsers`

These own account workflows such as creating listings, updating listings, creating requests, managing requests, uploading images, and editing profile data.

### Jobs And Shops Hooks

- `useJobs`
- `useJobsFilters`
- `useShops`
- `useShopsFilters`

These keep list fetching and filter state reusable between page/view components.

## Complete App Workflow

### Startup

```text
Browser requests route
  -> src/proxy.ts may apply CORS or root redirect
  -> App Router selects layout/page
  -> RootLayout loads fonts, metadata, globals, and providers
  -> Providers attach React Query and toast support
  -> Route group layout wraps page
  -> Module page/view renders feature UI
```

### Login Workflow

```text
Login form
  -> useActionState submits a server action
  -> server action validates form data or delegates to auth service
  -> auth.service.loginUser()
  -> MongoDB user lookup
  -> bcrypt password compare
  -> JWT access + refresh token generation
  -> refresh token hash stored in MongoDB
  -> httpOnly cookies set
  -> temporary readable auth-user cookie hydrates Zustand auth store
  -> router navigates to protected area
```

Login and registration are implemented through server actions in `src/modules/auth/actions/auth.actions.ts`. This keeps the auth form submission on the server path while still letting the client hydrate auth state before navigation.

### Protected Page Workflow

```text
User opens protected route
  -> (protected)/layout hydrates
  -> Zustand auth store checked
  -> unauthenticated user is replaced to /login
  -> authenticated user sees AppHeader, page content, AppFooter
```

### List Page Workflow

```text
List page route
  -> force-dynamic page renders module page
  -> filter hook owns search/filter/page state
  -> React Query hook calls module API function
  -> apiClient calls same-origin /api/*
  -> Route Handler validates query params
  -> service builds MongoDB query
  -> paginated response returns to client
  -> view renders cards and pagination
```

### Detail Page Workflow

```text
Dynamic route [id]
  -> server page reads params
  -> backend query fetches record from MongoDB
  -> notFound() on missing record
  -> generateMetadata creates route metadata
  -> React Query cache is prefilled
  -> HydrationBoundary sends cache to client
  -> detail view renders immediately from hydrated data
```

### Create Listing Workflow

```text
List product form
  -> image files selected with ImageUploader/react-dropzone
  -> useImageUpload creates local previews
  -> submit uploads images to Cloudinary
  -> returned CDN URLs are added to form payload
  -> frontend validation runs
  -> POST /api/listed-products
  -> getAuthUser verifies accessToken cookie
  -> authorize(user, USER)
  -> Zod validates payload
  -> service creates ListedProduct in MongoDB with owner user id
  -> React Query invalidates related list/detail queries
  -> toast confirms result
```

### Request Product Workflow

```text
Request product form
  -> optional images uploaded to CDN
  -> payload contains name, category, price range, negotiation flag, description, contact
  -> POST /api/requested-products
  -> auth and USER authorization
  -> requested product service stores request with user id
  -> marketplace request lists can show the new request
```

### Password Reset Workflow

```text
Forgot password form
  -> POST /api/auth/forgot-password
  -> backend validates email
  -> user lookup in MongoDB
  -> random token generated
  -> SHA-256 token hash stored with 15-minute expiry
  -> reset email sent through Nodemailer
  -> user opens /reset-password/[token]
  -> POST /api/auth/reset-password/[token]
  -> token is hashed and matched
  -> password is bcrypt-hashed
  -> reset token fields are cleared
```

Forgot-password and reset-password forms also use server actions in the auth module, while API routes remain available under `/api/auth/*` for programmatic clients.

## Frontend Data Flow

The browser talks to the Next.js backend through a single Axios client.

```text
View component
  -> custom hook
  -> module api function
  -> apiClient
  -> /api/* Route Handler
  -> backend service/query
  -> MongoDB
  -> standardized response
  -> React Query cache
  -> UI re-render
```

Important frontend pieces:

- `src/lib/axios/axiosClient.ts` uses `baseURL: '/'`, so API calls stay same-origin.
- `withCredentials: true` sends httpOnly cookies automatically.
- A 401 response triggers `/api/auth/refresh`.
- While refresh is in progress, failed requests are queued.
- If refresh succeeds, queued requests replay.
- If refresh fails, auth state is cleared and the browser navigates to `/login`.
- React Query handles cache, stale time, retries, pagination data, and invalidation.
- Toasts show success and error feedback without coupling business logic to components.

## Backend Architecture

The backend lives inside Next.js Route Handlers under `src/app/api`.

The architecture is layered:

```text
Route Handler
  -> withErrorHandler
  -> getAuthUser / authorize when needed
  -> validate with Zod
  -> service
  -> model/query helper
  -> MongoDB
  -> success/error response helper
```

Why this structure is used:

- Route Handlers are the HTTP boundary.
- Validators keep bad input out of services.
- Services contain business rules.
- Models define persistence shape.
- Queries support server components and detail-page prefetching.
- `withErrorHandler` keeps response formatting consistent.

### Database Connection Caching

`connectDB()` in `src/backend/lib/db.ts` is called at the start of service/query functions and caches the Mongoose connection on `global._mongooseConn`.

Why:

- Next.js Route Handlers may run in serverless-style cold starts.
- Calling `connectDB()` inside each backend function guarantees a connection exists.
- The global cache prevents repeated MongoDB connection creation during hot reloads and repeated requests.

### Validation And Response Helpers

Backend input validation goes through `validate()` in `src/backend/lib/validate.ts`.

Behavior:

- Parses request data with a Zod schema.
- Converts Zod issues into an `AppError`.
- Uses `VALIDATION_ERROR` and structured `details` so clients can show predictable messages.

Response helpers live in `src/backend/lib/response.ts`:

- `sendSuccess(data, message, statusCode)` returns the standard success shape.
- `sendError(...)` exists as a manual fallback, but route handlers normally rely on `withErrorHandler`.

`withErrorHandler()` is the route-level error boundary:

- Returns `AppError` instances with their explicit HTTP status and `errorCode`.
- Converts unknown failures into `INTERNAL_SERVER_ERROR`.
- Hides internal error messages in production.

### Server Actions

The project uses server actions in two places:

- `src/modules/auth/actions/auth.actions.ts` is actively used by login, register, forgot-password, and reset-password pages.
- `src/backend/actions/*` contains server-action variants for auth, listed products, and requested products.

Why they exist beside Route Handlers:

- Route Handlers are the main API surface for React Query, Axios, admin clients, and Swagger-documented HTTP access.
- Server actions are useful for form submissions that should execute directly on the server without an extra client API wrapper.
- Both paths reuse backend services so the business rules stay centralized.

### Backend Query Layer

`src/backend/queries` contains server-side read helpers used by server components and metadata generation.

Examples:

- Detail pages call query helpers before rendering and place the result into React Query cache.
- `generateMetadata()` uses the same backend read path to build record-specific metadata.

Why:

- Server components can fetch from the database without going through Axios.
- Read logic stays close to backend models and services.
- Detail pages can return `notFound()` before the client view renders.

### Repository Status

`src/backend/repositories/user.repository.ts` currently exists as a placeholder/stub. The active backend persistence path in this codebase is the service layer calling Mongoose models directly.

## Backend Features

### Auth API

Routes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password/[token]`
- `PATCH /api/auth/profile`

Features:

- User registration.
- Login with password comparison.
- Access token generation.
- Refresh token generation and rotation.
- Refresh token reuse detection.
- Logout with refresh-token deletion.
- Password reset email.
- Profile update.

### Listed Products API

Routes:

- `GET /api/listed-products`
- `POST /api/listed-products`
- `GET /api/listed-products/[id]`
- `PUT /api/listed-products/[id]`
- `DELETE /api/listed-products/[id]`
- `GET /api/listed-products/my-products`

Features:

- Create owned marketplace listings.
- Browse listings with pagination and filters.
- Read listing detail.
- Update/delete only by owner.
- Filter by search, category, condition, year used, and owner.

### Requested Products API

Routes:

- `GET /api/requested-products`
- `POST /api/requested-products`
- `GET /api/requested-products/[id]`
- `PUT /api/requested-products/[id]`
- `DELETE /api/requested-products/[id]`
- `GET /api/requested-products/my-requests`

Features:

- Create product requests.
- Browse requested products with pagination and filters.
- Read request detail.
- Update/delete only by owner.
- Filter by search, category, negotiation status, fulfilled status, price range, and owner.

### Shops API

Routes:

- `GET /api/shops`
- `POST /api/shops`
- `GET /api/shops/[id]`
- `PUT /api/shops/[id]`
- `DELETE /api/shops/[id]`

Features:

- Public authenticated read access.
- Admin-only create/update/delete.
- Search by shop name, top items, and all items.
- Filter by distance and open day.
- Generated shop IDs such as `Shop-1234`.

### Jobs API

Routes:

- `GET /api/jobs`
- `POST /api/jobs`
- `GET /api/jobs/[id]`
- `PUT /api/jobs/[id]`
- `DELETE /api/jobs/[id]`

Features:

- Public authenticated read access.
- Admin-only create/update/delete.
- Search by job name and provider.
- Filter by job type, experience, salary range, and deadline range.
- Generated job IDs such as `Job-1234`.

### CMS API

Routes:

- `GET /api/cms`
- `POST /api/cms`
- `GET /api/cms/[type]`
- `PUT /api/cms/[type]`
- `DELETE /api/cms/[type]`

Features:

- Terms and conditions.
- Privacy policy.
- About us.
- FAQ.
- Admin-only mutations.

### Admin API

Routes:

- `GET /api/admin/dashboard`

Features:

- Admin-only dashboard data.
- Used by the separate React admin panel.

### Utility API

Routes:

- `GET /api/health`
- `GET /api/users`
- `POST /api/users`
- `GET /api/swagger`
- `GET /api-docs`

### AI API

Routes:

- `POST /api/ai/generate-description`
- `POST /api/ai/generate-request-description`

## Backend Data Flow

### Read Flow

```text
GET /api/jobs?search=designer&page=1
  -> route reads searchParams
  -> Zod validates query object
  -> service builds Mongo query
  -> Mongoose finds records + countDocuments
  -> response contains data and pagination metadata
```

### Write Flow

```text
POST /api/listed-products
  -> getAuthUser reads accessToken cookie
  -> JWT is verified
  -> user is loaded from MongoDB
  -> authorize checks USER role
  -> body is parsed and Zod validated
  -> service creates document with user id
  -> standardized success response returned
```

### Error Flow

```text
Route Handler throws AppError or validation error
  -> withErrorHandler catches it
  -> development can expose useful detail
  -> production hides internal server details
  -> client receives consistent error shape
```

Standard response concepts:

- `success`
- `message`
- `data`
- `code`
- `errorCode`
- optional validation `details`
- pagination fields for list responses

## Security Design

### httpOnly Cookie Auth

Access and refresh tokens are stored in httpOnly cookies through `src/backend/lib/cookies.ts`.

Why:

- JavaScript cannot read the token values.
- XSS impact is reduced compared with localStorage token storage.
- Browser automatically sends cookies with same-origin API calls.

Cookie behavior:

- `accessToken`: short-lived cookie.
- `refreshToken`: longer-lived cookie.
- `secure` is enabled in production.
- `sameSite` is `none` in production and `lax` in development.

### Refresh Token Rotation

On refresh:

- The refresh token cookie is read.
- The JWT is verified.
- The hashed token is looked up in MongoDB.
- A new access token and new refresh token are created.
- The database token hash is replaced.
- Cookies are reset.

Why:

- A refresh token is single-use after rotation.
- Stolen old refresh tokens can be detected.

### Token Reuse Handling

If a refresh token is valid as a JWT but its hash is missing in the database, the backend treats this as token reuse.

The app deletes all refresh tokens for that user and returns a `TOKEN_REUSE` error.

Why:

- Reuse means an old token may have been stolen.
- Deleting all sessions forces re-authentication.

### Password Security

- User passwords are hashed with `bcryptjs`.
- Password reset tokens are generated with `crypto.randomBytes`.
- Only a SHA-256 hash of the reset token is stored.
- Reset tokens expire after 15 minutes.
- Reset token fields are cleared after a successful reset.

### Role-Based Access Control

Roles:

- `USER`
- `ADMIN`

`authorize(user, ...roles)` protects mutation endpoints.

Examples:

- Users can create and manage their own listings and requests.
- Admins can create/update/delete jobs, shops, CMS records, and read dashboard metrics.

### CORS

Credentialed CORS is controlled in `src/proxy.ts`.

Allowed origins include:

- Local Next.js dev ports.
- Local admin panel dev ports.
- The deployed admin panel origin.

Why:

- Cookies require `Access-Control-Allow-Credentials: true`.
- Credentialed CORS cannot safely use `*`.
- Explicit origins prevent unknown websites from using the API with user cookies.

### Server-Side Auth Guard

`getAuthUser()`:

- Uses `cookies()` from Next.js.
- Reads the `accessToken` cookie.
- Verifies JWT with the access secret.
- Loads the user from MongoDB without password.
- Uses React `cache()` so repeated calls in one server request share the same lookup.

## File Upload Using CDN

Image upload code lives in `src/lib/upload`.

Primary production provider:

- Cloudinary through unsigned upload preset.

Fallback provider:

- ImgBB through API key.

Supporting utility:

- `compressImage()` can resize and compress an image to a base64 string for JSON-friendly payloads.

The active user upload flow uses `useImageUpload()` and `useProfilePhotoUpload()`:

```text
User selects files
  -> react-dropzone receives File objects
  -> local preview URL is created
  -> submit starts uploadAll/uploadPhoto
  -> file is posted directly to Cloudinary
  -> Cloudinary returns secure_url
  -> secure_url is stored in MongoDB as image/photo URL
  -> UI renders image through Next image-compatible remote patterns
```

Why CDN upload is used:

- The Next.js API does not need to handle large binary files.
- Images are delivered from a CDN.
- Cloudinary can optimize image format and delivery.
- MongoDB stores URLs instead of image blobs.

`next.config.ts` allows remote image hosts including Cloudinary, Unsplash, Pexels, LoremFlickr, and other HTTPS image sources.

## React Query Strategy

Client query defaults:

- `staleTime`: 5 minutes.
- `gcTime`: 10 minutes.
- `retry`: 1.
- `refetchOnWindowFocus`: false.

Server query defaults:

- `staleTime`: 1 minute.

Why:

- List pages stay responsive while filters and pagination change.
- Detail pages can hydrate server-fetched data into client cache.
- Mutations can invalidate specific keys after create/update/delete.

`queryKeys` centralizes cache keys so every feature uses stable, predictable cache identities.

### Query Key Registry

`src/lib/react-query/queryKeys.ts` defines the cache identity for every domain:

- `auth.profile`
- `jobs.all(params)` and `jobs.byId(id)`
- `shops.all(params)` and `shops.byId(id)`
- `listedProducts.all(params)` and `listedProducts.byId(id)`
- `requestedProducts.all(params)` and `requestedProducts.byId(id)`
- `users.all` and `users.byId(id)`

Why:

- Mutations can invalidate the exact list/detail cache they affect.
- Server prefetching and client hooks use the same key shape.
- Cache-key spelling does not drift between modules.

### `createQuery` Factory

`src/lib/react-query/createQuery.ts` wraps `useQuery` into a small factory for fixed read hooks.

It is best suited for simple reads where the query key and query function are known up front. Hooks that need runtime params, dynamic options, pagination, or conditional enabling use `useQuery` directly with `queryKeys`.

## API Factory And Axios Pattern

The project uses a shared API layer under `src/lib/axios`.

Why:

- Every module API function calls the same Axios client.
- Auth refresh behavior is centralized.
- API modules stay small and feature-specific.
- Same-origin `/api/*` requests work locally and in production without separate frontend API URLs.

### `createApi` Factory

`src/lib/axios/apiFactory.ts` provides a typed CRUD-style wrapper for a base path:

- `get`
- `post`
- `put`
- `patch`
- `delete`

Feature API modules can create small clients such as `createApi('/api/jobs')` and keep endpoint construction consistent while still using the shared Axios interceptor behavior.

## State Management

Zustand is used for client auth state.

Why:

- The protected layout needs fast client-side access to `isAuthenticated`.
- Auth pages need to update auth state after login/logout.
- Persist helpers under `src/lib/zustand` keep store creation consistent.

Important note:

- httpOnly cookies remain the real server auth source.
- Zustand is used for client UX and route guarding, not as the source of secure token truth.
- Store helpers under `src/lib/zustand` provide a small wrapper around store creation and persistence.
- The auth store persists user-facing auth state, while secure token material stays in cookies.

## Validation Strategy

Frontend validation:

- Yup schemas in feature modules.
- React Hook Form manages form state.
- Resolver packages connect schema validation to forms.

Backend validation:

- Zod schemas in `src/backend/validators`.
- Route handlers call `validate()` before services.

Why both exist:

- Frontend validation gives immediate user feedback.
- Backend validation protects the database and API boundary.
- Backend validation is authoritative.

## Styling Strategy

The app uses:

- Global CSS in `src/app/globals.css`.
- Design variables and utilities in `src/styles`.
- CSS Modules for component-scoped styling.

Why:

- Global files define broad design tokens and reset behavior.
- CSS Modules prevent component class-name collisions.
- Feature components keep their styles beside their UI code.

CSS support files:

- `src/styles/variables.css` keeps design tokens and repeated values.
- `src/styles/utilities.css` contains shared utility classes.
- `src/styles/pages.css` contains broader page-level styles.
- `src/styles/design.css` centralizes additional design imports and global styling helpers.

CSS Modules remain the default for component-specific layout and visual rules.

## Next.js Optimizations In The Project

`next.config.ts` includes:

- `compress: true` for response compression.
- `output: 'standalone'` for production deployment packaging.
- `experimental.optimizePackageImports: ['lucide-react']` to reduce icon import cost.
- `images.remotePatterns` for safe remote image optimization.

Root layout includes:

- `next/font/google` with Geist and Geist Mono.
- `display: 'swap'` to improve font loading behavior.
- Metadata defaults and Open Graph defaults.

The app also uses:

- App Router route groups.
- Dynamic routes.
- Route handlers.
- Server components.
- Client components.
- Suspense boundaries.
- `loading.tsx`.
- `error.tsx`.
- `notFound()`.
- `redirect()`.
- `generateMetadata()`.
- React Query hydration.

## Database Models

MongoDB collections are represented through Mongoose models.

Main models:

- `User`
- `RefreshToken`
- `ListedProduct`
- `RequestedProduct`
- `Shop`
- `Job`
- `Cms`

Important relationships:

- Listed products belong to a user.
- Requested products belong to a user.
- Shops and jobs store the admin/creator id.
- Refresh tokens belong to a user and store only hashed token values.

## Main Routes

Public/auth routes:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/reset-password/[token]`

Protected routes:

- `/landing`
- `/marketplace`
- `/marketplace/[id]`
- `/marketplace/request/[id]`
- `/shops`
- `/shops/[id]`
- `/jobs`
- `/jobs/[id]`
- `/account/my-profile`
- `/account/edit-profile`
- `/account/list-product`
- `/account/manage-listing`
- `/account/manage-listing/[id]`
- `/account/request-product`
- `/account/manage-request`
- `/account/manage-request/[id]`

API routes:

- `/api/auth/*`
- `/api/listed-products/*`
- `/api/requested-products/*`
- `/api/shops/*`
- `/api/jobs/*`
- `/api/cms/*`
- `/api/admin/dashboard`
- `/api/health`
- `/api/swagger`
- `/api-docs`

## Admin Panel Integration

The admin panel is not inside this repo. It is a separate React app that calls this project's `/api/*` routes.

Integration requirements:

- Admin origin must exist in `ALLOWED_ORIGINS` inside `src/proxy.ts`.
- Requests must include credentials so cookies are sent.
- Admin-only endpoints call `authorize(user, UserRole.ADMIN)`.
- CORS headers are only applied to trusted origins.

Admin data flow:

```text
Admin React app
  -> credentialed request to Next.js /api/*
  -> src/proxy.ts applies CORS if origin is allowed
  -> route handler verifies cookies
  -> authorize ADMIN
  -> service reads/writes MongoDB
  -> response returns to admin app
```

## API Documentation

The repository includes `swagger.yaml`.

Routes:

- `/api/swagger` serves the Swagger document or Swagger UI.
- `/api-docs` redirects to the Swagger UI route.

Why:

- The Next.js app is also the backend.
- API behavior needs to be inspectable by the separate admin frontend and future contributors.

## Environment And Security Notes

- Do not commit real `.env` secrets.
- JWT secrets must be strong in production.
- MongoDB connection strings must remain private.
- Email credentials must remain private.
- Cloudinary API secrets should not be exposed to the browser.
- The current browser upload flow should rely on unsigned upload presets and public Cloudinary cloud/preset values.
- Add new deployed frontend/admin domains explicitly to `ALLOWED_ORIGINS`.
- Never use wildcard CORS with credentialed cookies.
- `AICC_API_KEY` is a server-only variable — never prefix it with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_AI_ENABLED` is a build-time flag — toggling it requires a server restart.

## Why The BFF Pattern Is Used

This project intentionally keeps the backend inside Next.js instead of making the browser call an unrelated API directly.

Benefits:

- Same-origin API calls simplify authentication.
- httpOnly cookies work naturally with route handlers.
- Frontend and backend types live in one codebase.
- Server components can directly call backend query functions for prefetching.
- The admin panel can still consume the same API through controlled CORS.

The optional external Bright College Hub Express API is treated as separate infrastructure. Core auth, marketplace, jobs, shops, CMS, and account logic live in this Next.js project.

## Verified From Onboarding

The onboarding guide also describes a few patterns that were checked against the current code before being included here.

Included because they are present:

- `next/dynamic` with `ssr: false` for browser-only login, uploader, modal, and policy UI.
- `globalStaticData.ts` for shared labels, links, options, colors, and formatting.
- Mongoose connection caching in `connectDB()`.
- Zod `validate()` and `withErrorHandler()` as the backend validation/error boundary path.
- Route Handlers as the primary backend API layer.
- Server actions for auth forms and additional backend action variants.
- React Query query-key registry, hydration, and cache invalidation.
- Same-origin Axios client with cookie refresh handling.
- CDN image upload through Cloudinary, with ImgBB support present as a fallback helper.

## Technical Reading Order

For understanding the implementation quickly:

1. `src/app/layout.tsx`
2. `src/app/providers.tsx`
3. `src/proxy.ts`
4. `src/app/(auth)/login/page.tsx`
5. `src/modules/auth`
6. `src/lib/axios/axiosClient.ts`
7. `src/backend/lib/cookies.ts`
8. `src/backend/lib/authGuard.ts`
9. `src/backend/services/auth.service.ts`
10. `src/app/api/auth`
11. `src/app/(protected)/layout.tsx`
12. `src/modules/marketplace`
13. `src/modules/user`
14. `src/backend/services`
15. `src/backend/models`
16. `src/lib/upload`

## Summary

Bright College Hub is a Next.js full-stack campus platform. The frontend is organized by feature modules, reusable components, custom hooks, React Query, and Zustand. The backend is implemented with Next.js Route Handlers, Mongoose, Zod validation, services, auth guards, secure cookies, JWT refresh rotation, password reset email, role-based authorization, and CDN-based image uploads. Rendering is mixed deliberately: static auth pages, dynamic list/account pages, ISR-backed detail pages, metadata generation, and React Query hydration for fast server-to-client data flow. The platform also includes AI-powered description generation on the List a Product and Request a Product forms — the AI call is made exclusively through a secure server-side Next.js route using the AICC API (OpenAI-compatible), with per-user in-memory rate limiting, Zod validation, auth guards, and a polished Generate Button UX including loading states, character counters, and toast error handling.
