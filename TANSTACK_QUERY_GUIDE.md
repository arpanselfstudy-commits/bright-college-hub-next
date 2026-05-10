# TanStack Query (React Query v5) — Beginner to Master Guide
> A complete reference for how this campus marketplace Next.js app uses TanStack Query v5.


---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Setup](#2-setup)
3. [Query Keys](#3-query-keys)
4. [useQuery — Fetching Data](#4-usequery--fetching-data)
5. [useMutation — Writing Data](#5-usemutation--writing-data)
6. [useQueryClient and Cache Invalidation](#6-usequeryClient-and-cache-invalidation)
7. [The Full Data Flow — End to End](#7-the-full-data-flow--end-to-end)
8. [Patterns Used in This App](#8-patterns-used-in-this-app)
9. [TanStack Query Features NOT Used in This App](#9-tanstack-query-features-not-used-in-this-app)
10. [Quick Reference Cheat Sheet](#10-quick-reference-cheat-sheet)

---

## 1. Introduction

### What is TanStack Query?

TanStack Query (formerly known as React Query) is a library that manages **server state** in React applications. Version 5 is what this project uses, installed as `@tanstack/react-query ^5.95.2`.

To understand why it exists, you first need to understand the problem it solves.

### The Problem: Server State is Hard

In a React app, there are two kinds of state:

- **Client state** — things like "is this modal open?" or "what has the user typed in this input?" This lives entirely in the browser and never needs to be synced with a server.
- **Server state** — things like "what products are listed for sale?" or "what is the logged-in user's profile?" This data lives on a server, needs to be fetched over the network, can become stale, can be changed by other users, and needs to be kept in sync.

Server state is much harder to manage. Here is what a typical beginner approach looks like using plain `fetch` and `useEffect`:

```tsx
// The naive approach — lots of boilerplate, lots of problems
function JobsPage() {
  const [jobs, setJobs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setIsLoading(true)
    fetch('/api/jobs')
      .then(res => res.json())
      .then(data => {
        setJobs(data)
        setIsLoading(false)
      })
      .catch(err => {
        setError(err)
        setIsLoading(false)
      })
  }, [])

  if (isLoading) return <p>Loading...</p>
  if (error) return <p>Error!</p>
  return <JobList jobs={jobs} />
}
```

This approach has serious problems:

- **No caching** — every time you navigate to this page, it fetches again from scratch, even if the data hasn't changed.
- **No deduplication** — if two components on the same page both need jobs data, they each fire a separate network request.
- **No background refresh** — if the data changes on the server, the user sees stale data until they manually refresh the page.
- **Lots of boilerplate** — you write the same `isLoading`, `error`, `useEffect` pattern over and over.
- **Race conditions** — if the user navigates away and back quickly, two requests can be in flight and the older one might resolve last, overwriting newer data.

### The Solution: TanStack Query

TanStack Query replaces all of that with a smart cache and a set of hooks. Here is the same example with TanStack Query:

```tsx
// The TanStack Query approach — clean, cached, smart
function JobsPage() {
  const { data: jobs, isLoading } = useJobs()

  if (isLoading) return <p>Loading...</p>
  return <JobList jobs={jobs ?? []} />
}
```

Under the hood, TanStack Query:

- **Caches the result** — the second time you visit this page, data appears instantly from cache while a background refresh happens silently.
- **Deduplicates requests** — if ten components ask for the same data at the same time, only one network request fires.
- **Tracks loading and error states** — `isLoading`, `isError`, `data` are all provided automatically.
- **Automatically refetches** — when the user comes back to the browser tab, or when you tell it to after a mutation.
- **Handles retries** — if a request fails, it retries automatically (configurable).

### Why This App Uses It

This campus marketplace app has many data-fetching needs: jobs listings, shops, marketplace products (both listed and requested), and user profiles. Every one of these needs caching, loading states, and cache invalidation after mutations (e.g., after creating a product, the product list should refresh). TanStack Query handles all of this cleanly.

---
## 2. Setup

### How TanStack Query is Initialized

Before any component can use TanStack Query hooks, three things need to happen:

1. A `QueryClient` instance must be created (this is the cache engine).
2. The app must be wrapped in a `QueryClientProvider` (this makes the client available to all components).
3. The `QueryClient` must be configured with sensible defaults.

### The QueryClient — `src/lib/react-query/queryClient.ts`

The `QueryClient` is the heart of TanStack Query. Think of it as a smart clipboard that remembers every piece of data your app has ever fetched, along with rules for how long to keep it and when to throw it away.

```ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

Let's break down every option:

#### `staleTime: 1000 * 60 * 5` (5 minutes)

`staleTime` controls how long cached data is considered "fresh". While data is fresh, TanStack Query will serve it from cache without making a new network request.

- `1000` = 1 second in milliseconds
- `1000 * 60` = 1 minute
- `1000 * 60 * 5` = 5 minutes

**Analogy:** Imagine you ask a librarian for a book. They hand you a copy from the shelf. If you ask again within 5 minutes, they hand you the same copy — no trip to the back room needed. After 5 minutes, the copy is considered "stale" and the next time you ask, they'll go check if there's a newer edition.

The default `staleTime` in TanStack Query is `0`, meaning data is immediately stale after fetching. This app overrides it to 5 minutes, which is a good balance for data that doesn't change every second (like job listings or shop info).

#### `gcTime: 1000 * 60 * 10` (10 minutes)

`gcTime` (garbage collection time) controls how long **unused** cached data is kept in memory before being deleted entirely.

The difference from `staleTime`:
- `staleTime` = how long data is considered fresh (no refetch needed)
- `gcTime` = how long data stays in memory after no component is using it

So the flow is:
1. Data is fetched and cached. It's "fresh" for 5 minutes.
2. After 5 minutes, it's "stale" — the next access will trigger a background refetch.
3. If no component is using this data for 10 minutes, it's deleted from memory entirely.

Setting `gcTime` higher than `staleTime` (as this app does) means stale data is still available for instant display while a background refetch happens — a great user experience pattern.

#### `retry: 1`

When a query fails (network error, server error, etc.), TanStack Query will automatically retry it. `retry: 1` means it will try once more after the first failure, for a total of 2 attempts.

The default is `3` retries. This app uses `1` to fail faster and show error states sooner, which makes sense for a user-facing app where you want to surface errors quickly rather than silently retrying for a long time.

#### `refetchOnWindowFocus: false`

By default, TanStack Query refetches all active queries whenever the user switches back to the browser tab (window focus). This is a great feature for keeping data fresh, but it can cause jarring re-renders and unnecessary network traffic in apps where data doesn't change that frequently.

This app disables it. Data will still be refetched when it becomes stale (after 5 minutes) or when explicitly invalidated after a mutation.

#### Why it's exported as a singleton

Notice the file exports `queryClient` as a module-level constant — not created inside a React component or hook. This is intentional. The same instance is used:

1. In `providers.tsx` to wrap the app.
2. Directly in `useLogout.ts` to call `queryClient.clear()` outside of a React component context.

If it were created inside a component, you'd get a new instance on every render, losing all cached data.

---

### The Provider — `src/app/providers.tsx`

Once the `QueryClient` exists, it needs to be made available to every component in the app. This is done with `QueryClientProvider`, which uses React Context under the hood.

```tsx
'use client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/react-query/queryClient'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Wrap the entire app — every child component can now use TanStack Query hooks
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

This `Providers` component is marked `'use client'` because `QueryClientProvider` uses React Context, which is a client-side feature. In Next.js App Router, components are Server Components by default, so any component using browser APIs or React Context must be explicitly marked as a Client Component.

The `Providers` component is then used in the root layout (`src/app/layout.tsx`) to wrap the entire application, ensuring every page and component has access to the query client.

---
## 3. Query Keys

### What is a Query Key?

Every piece of data in the TanStack Query cache is identified by a **query key**. A query key is an array that uniquely identifies a particular piece of server data.

Think of the cache as a giant JavaScript object (a dictionary). The query key is the key, and the fetched data is the value:

```
cache = {
  ['auth', 'profile']          → { name: 'Alice', email: 'alice@uni.edu', ... }
  ['jobs', undefined]          → [{ id: '1', title: 'Tutor' }, ...]
  ['jobs', { page: 2 }]        → [{ id: '10', title: 'Driver' }, ...]
  ['jobs', 'abc123']           → { id: 'abc123', title: 'Tutor', ... }
  ['listed-products', undefined] → [{ id: 'p1', name: 'Laptop' }, ...]
}
```

Two queries with the same key share the same cache entry. Two queries with different keys are completely independent.

### The Query Keys Factory — `src/lib/react-query/queryKeys.ts`

Rather than scattering raw arrays like `['jobs', id]` throughout the codebase (which is error-prone and hard to refactor), this app centralizes all query keys in one file:

```ts
export const queryKeys = {
  auth: {
    // Static key — always the same array, no parameters
    profile: ['auth', 'profile'] as const,
  },
  jobs: {
    // Dynamic key — includes params so different filters get different cache entries
    all: (params?: object) => ['jobs', params] as const,
    // Dynamic key — includes the specific job ID
    byId: (id: string) => ['jobs', id] as const,
  },
  shops: {
    all: (params?: object) => ['shops', params] as const,
    byId: (id: string) => ['shops', id] as const,
  },
  listedProducts: {
    all: (params?: object) => ['listed-products', params] as const,
    byId: (id: string) => ['listed-products', id] as const,
  },
  requestedProducts: {
    all: (params?: object) => ['requested-products', params] as const,
    byId: (id: string) => ['requested-products', id] as const,
  },
  users: {
    all: ['users'] as const,
    byId: (id: string) => ['users', id] as const,
  },
}
```

### Static Keys vs Dynamic Keys

**Static keys** are plain arrays defined once. They never change:

```ts
// Always ['auth', 'profile'] — there's only one profile for the logged-in user
queryKeys.auth.profile  // → ['auth', 'profile']

// Always ['users'] — the full user list has no parameters
queryKeys.users.all     // → ['users']
```

**Dynamic keys** are functions that return arrays. They include parameters so that different combinations of filters or IDs get their own cache entries:

```ts
// Different params = different cache entries
queryKeys.jobs.all({ page: 1, limit: 9 })  // → ['jobs', { page: 1, limit: 9 }]
queryKeys.jobs.all({ page: 2, limit: 9 })  // → ['jobs', { page: 2, limit: 9 }]
queryKeys.jobs.all()                        // → ['jobs', undefined]

// Different IDs = different cache entries
queryKeys.jobs.byId('abc123')  // → ['jobs', 'abc123']
queryKeys.jobs.byId('xyz789')  // → ['jobs', 'xyz789']
```

This means if a user browses page 1 of jobs and then page 2, both pages are cached independently. Navigating back to page 1 shows the cached result instantly.

### Why `as const`?

The `as const` TypeScript assertion tells the compiler to treat the array as a **readonly tuple** with literal types, rather than a mutable `string[]`.

Without `as const`:
```ts
// TypeScript infers: string[]
const key = ['jobs', 'abc123']
```

With `as const`:
```ts
// TypeScript infers: readonly ['jobs', 'abc123']
const key = ['jobs', 'abc123'] as const
```

This gives you better type safety — TypeScript knows exactly what's in the array, not just that it's "some strings".

### How Keys Enable Cache Invalidation

The hierarchical structure of keys (starting with a resource name like `'jobs'` or `'listed-products'`) is not just for organization — it's the mechanism that makes **partial key matching** work during cache invalidation.

When you call `invalidateQueries({ queryKey: ['listed-products'] })`, TanStack Query invalidates **every cache entry whose key starts with `'listed-products'`**. That means:

- `['listed-products', undefined]` ✓ invalidated
- `['listed-products', { page: 1 }]` ✓ invalidated
- `['listed-products', 'p1']` ✓ invalidated
- `['listed-products', 'mine', { page: 1 }]` ✓ invalidated
- `['jobs', undefined]` ✗ not touched

This is why after creating, updating, or deleting a listed product, the app calls `invalidateQueries({ queryKey: ['listed-products'] })` — it refreshes every related query in one shot. More on this in Section 6.

---
## 4. `useQuery` — Fetching Data

### What is `useQuery`?

`useQuery` is the primary hook for **reading** data from the server. You give it a query key and a function that fetches the data, and it handles everything else: caching, loading states, error states, background refetching, and deduplication.

### Anatomy of a `useQuery` Call

Here is the general shape:

```ts
const result = useQuery({
  queryKey: [...],      // Unique identifier for this data in the cache
  queryFn: () => ...,   // Async function that fetches and returns the data
  enabled: true,        // Optional: whether to run the query at all
  staleTime: ...,       // Optional: override the global staleTime for this query
})
```

And the return values this app uses:

```ts
const {
  data,       // The fetched data (undefined while loading)
  isLoading,  // true only on the very first fetch (no cached data yet)
} = useQuery(...)
```

There are more return values (`isError`, `error`, `isFetching`, `status`, etc.) but this app primarily uses `data` and `isLoading`.

---

### `useProfile` — Auth-Gated Query with `staleTime: 0`

```ts
// src/modules/auth/hooks/useProfile.ts
'use client'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'
import { queryKeys } from '@/lib/react-query/queryKeys'

export function useProfile() {
  // Read authentication state from Zustand store
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.auth.profile,  // ['auth', 'profile']
    queryFn: () => authApi.getProfile().then((res) => res.data.data),
    enabled: isAuthenticated,          // Only fetch if the user is logged in
    staleTime: 0,                      // Always consider this data stale — always refetch
  })
}
```

**Key concepts here:**

- `enabled: isAuthenticated` — The query will not run at all if the user is not logged in. This prevents an unauthorized API call on page load. The `enabled` option accepts any boolean expression.

- `staleTime: 0` — This overrides the global 5-minute `staleTime` for this specific query. The user's profile is personal data that could change (e.g., they just updated their name), so we always want the freshest version. Setting `staleTime: 0` means the data is immediately stale after fetching, so TanStack Query will always refetch it in the background when the component mounts.

---

### `useJob` and `useJobs` — Conditional Fetching with `enabled: !!id`

```ts
// src/modules/jobs/hooks/useJobs.ts
'use client'
import { useQuery } from '@tanstack/react-query'
import { jobsApi } from '../api/jobs.api'
import { queryKeys } from '@/lib/react-query/queryKeys'
import type { JobsParams } from '../types'

// Fetch a paginated/filtered list of jobs
export function useJobs(params?: JobsParams) {
  return useQuery({
    queryKey: queryKeys.jobs.all(params),  // ['jobs', params] — unique per filter combo
    queryFn: () => jobsApi.getAll(params).then((r) => r.data.data),
    // No 'enabled' — always runs. No 'staleTime' — uses the global 5-minute default.
  })
}

// Fetch a single job by ID
export function useJob(jobId: string) {
  return useQuery({
    queryKey: queryKeys.jobs.byId(jobId),  // ['jobs', 'abc123']
    queryFn: () => jobsApi.getById(jobId).then((r) => r.data.data),
    enabled: !!jobId,  // Only fetch if jobId is a non-empty string
  })
}
```

**The `enabled: !!jobId` pattern:**

The double-bang `!!` converts any value to a boolean:
- `!!''` → `false` (empty string)
- `!!'abc123'` → `true` (non-empty string)
- `!!undefined` → `false`
- `!!null` → `false`

This is used whenever the ID comes from a URL parameter or prop that might not be available yet. Without this guard, TanStack Query would fire a request with an empty string as the ID, which would either fail or return wrong data.

**How `JobsPage` uses this:**

```tsx
// The page passes filter state as params — each unique combination is cached separately
const { data, isLoading } = useJobs({ page, limit: 9, search, jobType })

// data?.jobs ?? [] — use the jobs array, or an empty array if data is undefined
// isLoading — show a spinner on the first load
```

---

### `useShop` and `useShops` — Same Pattern for Shops

```ts
// src/modules/shops/hooks/useShops.ts
'use client'
import { useQuery } from '@tanstack/react-query'
import { shopsApi } from '../api/shops.api'
import { queryKeys } from '@/lib/react-query/queryKeys'
import type { ShopsParams } from '../types'

export function useShops(params?: ShopsParams) {
  return useQuery({
    queryKey: queryKeys.shops.all(params),
    queryFn: () => shopsApi.getAll(params).then((r) => r.data.data),
  })
}

export function useShop(shopId: string) {
  return useQuery({
    queryKey: queryKeys.shops.byId(shopId),
    queryFn: () => shopsApi.getById(shopId).then((r) => r.data.data),
    enabled: !!shopId,  // Guard against empty ID
  })
}
```

The shops hooks follow the exact same pattern as jobs. This consistency is intentional — it makes the codebase predictable and easy to navigate.

---

### `useListedProduct` and `useMyListedProducts` — User-Specific Data

```ts
// src/modules/marketplace/hooks/useListedProducts.ts (excerpt)

// Fetch a single listed product by ID
export function useListedProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.listedProducts.byId(id),  // ['listed-products', 'p1']
    queryFn: () => listedProductsApi.getById(id).then((r) => r.data.data),
    enabled: !!id,  // Guard against empty ID
  })
}

// Fetch only the current user's listed products
export function useMyListedProducts(params?: { page?: number; limit?: number }) {
  return useQuery({
    // Note: this key is NOT in queryKeys.ts — it's defined inline
    // ['listed-products', 'mine', params] — the 'mine' segment distinguishes it
    // from the public listing ['listed-products', params]
    queryKey: ['listed-products', 'mine', params],
    queryFn: () => listedProductsApi.myProducts(params).then((r) => r.data.data),
    staleTime: 0,  // Always fresh — user's own data must reflect their latest actions
  })
}
```

**Why `staleTime: 0` on `useMyListedProducts`?**

The user's own product list is shown on their profile/account page. If they just created or deleted a product, they expect to see the change immediately. Setting `staleTime: 0` ensures that every time this component mounts, it fetches fresh data from the server rather than serving a 5-minute-old cached version.

**How `ManageListingPage` uses these:**

```tsx
// Fetch the specific product being edited
const { data: product, isLoading } = useListedProduct(id)

// Show a loading spinner while fetching
if (isLoading) return <Spinner />

// Display the product data in a form
return <EditForm product={product} />
```

---

### `useUsers` — Typed Query Results

```ts
// src/modules/user/hooks/useUsers.ts
'use client'
import { useQuery } from '@tanstack/react-query'
import { userApi } from '../api/user.api'
import { queryKeys } from '@/lib/react-query/queryKeys'
import type { UsersResponse, UserResponse } from '../types'

// Generic type parameter tells TypeScript what shape `data` will have
export function useUsers() {
  return useQuery<UsersResponse>({
    queryKey: queryKeys.users.all,  // ['users'] — static key, no params
    queryFn: () => userApi.getAll().then((res) => res.data),
  })
}

export function useUser(id: string) {
  return useQuery<UserResponse>({
    queryKey: queryKeys.users.byId(id),
    queryFn: () => userApi.getById(id).then((res) => res.data),
    enabled: !!id,
  })
}
```

The `useQuery<UsersResponse>` generic type parameter tells TypeScript that `data` will be of type `UsersResponse`. Without it, TypeScript would infer `data` as `unknown`. This is the recommended pattern when your `queryFn` returns a type that TypeScript can't automatically infer.

---

### Summary: `useQuery` Options Used in This App

| Option | Type | What it does |
|--------|------|-------------|
| `queryKey` | `unknown[]` | Unique cache identifier. Required. |
| `queryFn` | `() => Promise<T>` | The function that fetches data. Required. |
| `enabled` | `boolean` | If `false`, the query does not run. Defaults to `true`. |
| `staleTime` | `number` (ms) | How long data is fresh. Overrides the global default. |

---
## 5. `useMutation` — Writing Data

### What is `useMutation`?

While `useQuery` is for **reading** data, `useMutation` is for **writing** data — creating, updating, or deleting resources on the server. Unlike queries, mutations don't run automatically. You call them manually in response to user actions (button clicks, form submissions, etc.).

### Anatomy of a `useMutation` Call

```ts
const mutation = useMutation({
  mutationFn: (variables) => ...,  // Async function that sends data to the server
  onSuccess: (data) => ...,        // Called when mutationFn resolves successfully
  onError: (error) => ...,         // Called when mutationFn throws or rejects
})
```

And the return values this app uses:

```ts
const {
  mutate,     // Function to trigger the mutation — call this on button click
  isPending,  // true while the mutation is in flight (replaces the old isLoading)
} = useMutation(...)
```

---

### `useLogin` — Mutation with Navigation and Store Update

```ts
// src/modules/auth/hooks/useLogin.ts
'use client'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { authApi } from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'
import type { LoginCredentials } from '../types'

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)  // Zustand action to save auth state
  const router = useRouter()

  return useMutation({
    // mutationFn receives the variables passed to mutate()
    mutationFn: (credentials: LoginCredentials) =>
      authApi.login(credentials).then((res) => res.data.data),

    onSuccess: (user) => {
      // Save the user to the Zustand auth store
      setAuth(user as unknown as Parameters<typeof setAuth>[0], '', '')
      toast.success('Welcome back!')
      // Navigate to the main app page
      router.push('/landing')
    },

    onError: (err: unknown) => {
      // Extract the error message from the Axios response, or use a fallback
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Login failed. Please try again.')
    },
  })
}
```

**How a component uses this:**

```tsx
const { mutate: login, isPending } = useLogin()

// On form submit:
login({ email: 'alice@uni.edu', password: 'secret' })

// Disable the button while the request is in flight:
<button disabled={isPending}>
  {isPending ? 'Signing in...' : 'Sign In'}
</button>
```

---

### `useRegister` — Simple Mutation with Redirect

```ts
// src/modules/auth/hooks/useRegister.ts
'use client'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { authApi } from '../api/auth.api'
import type { RegisterCredentials } from '../types'

export function useRegister() {
  const router = useRouter()
  return useMutation({
    mutationFn: (body: RegisterCredentials) =>
      authApi.register(body).then((res) => res.data.data),
    onSuccess: () => {
      toast.success('Account created! Please sign in.')
      router.push('/login')  // Redirect to login after successful registration
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Registration failed. Please try again.')
    },
  })
}
```

---

### `useCreateListedProduct` — Mutation with Cache Invalidation

This is the most important mutation pattern in the app. After creating a product, the product list cache must be refreshed so the new product appears.

```ts
// src/modules/marketplace/hooks/useListedProducts.ts (excerpt)
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { listedProductsApi } from '../api/marketplace.api'

export function useCreateListedProduct() {
  // Get the QueryClient instance — needed to invalidate cache entries
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: ListedProductPayload) =>
      listedProductsApi.create(payload).then((r) => r.data.data),

    onSuccess: () => {
      // Invalidate ALL listed-product queries — they will refetch automatically
      qc.invalidateQueries({ queryKey: ['listed-products'] })
      toast.success('Product listed successfully!')
    },

    onError: () => toast.error('Failed to list product.'),
  })
}
```

**How `ListProductPage` uses this:**

```tsx
const { mutate: create, isPending } = useCreateListedProduct()

// On form submit:
create(formData)

// Disable submit while in flight:
<button type="submit" disabled={isPending}>
  {isPending ? 'Listing...' : 'List Product'}
</button>
```

---

### `useUpdateListedProduct` — Mutation Scoped to an ID

```ts
// src/modules/marketplace/hooks/useListedProducts.ts (excerpt)

export function useUpdateListedProduct(id: string) {
  const qc = useQueryClient()
  return useMutation({
    // The ID is captured in the closure — the mutationFn only needs the payload
    mutationFn: (payload: ListedProductPayload) =>
      listedProductsApi.update(id, payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listed-products'] })
      toast.success('Product updated!')
    },
    onError: () => toast.error('Failed to update product.'),
  })
}
```

Notice that `id` is passed to the hook itself, not to `mutate()`. This is a common pattern when the ID is known at hook initialization time (e.g., from a URL parameter). The `mutationFn` only needs the payload (the new data), not the ID.

---

### `useDeleteListedProduct` — Mutation Where the Variable IS the ID

```ts
// src/modules/marketplace/hooks/useListedProducts.ts (excerpt)

export function useDeleteListedProduct() {
  const qc = useQueryClient()
  return useMutation({
    // Here the variable passed to mutate() IS the ID
    mutationFn: (id: string) => listedProductsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listed-products'] })
      toast.success('Product removed.')
    },
    onError: () => toast.error('Failed to delete product.'),
  })
}
```

**How `ManageListingPage` uses update and delete together:**

```tsx
const { mutate: update, isPending: updating } = useUpdateListedProduct(id)
const { mutate: remove, isPending: deleting } = useDeleteListedProduct()

// Update: pass the new payload
update(formData)

// Delete: pass the ID
remove(id)

// You can also pass per-call callbacks as a second argument to mutate():
remove(id, {
  onSuccess: () => router.push('/account/manage-listing'),
})
```

**Per-call callbacks** (the second argument to `mutate`) are useful when you need to do something specific after a mutation that only makes sense in one particular component — like navigating away after deletion. The hook-level `onSuccess` still runs first, then the per-call `onSuccess` runs.

---

### `useUpdateProfile` — Mutation that Updates Both Cache and Store

```ts
// src/modules/auth/hooks/useUpdateProfile.ts
'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { authApi } from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'
import { queryKeys } from '@/lib/react-query/queryKeys'

export function useUpdateProfile() {
  const qc = useQueryClient()
  const { setAuth } = useAuthStore()

  return useMutation({
    mutationFn: (payload: { name: string; email: string; phoneNumber: string; photo: string }) =>
      authApi.updateProfile(payload).then((r) => r.data.data),

    onSuccess: (updated) => {
      // Also update the Zustand auth store so the navbar reflects the new name/photo
      const { accessToken, refreshToken } = useAuthStore.getState()
      setAuth(updated, accessToken ?? '', refreshToken ?? '')

      // Invalidate the profile query so it refetches fresh data
      qc.invalidateQueries({ queryKey: queryKeys.auth.profile })
      toast.success('Profile updated!')
    },

    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to update profile.')
    },
  })
}
```

This mutation does double duty: it updates the TanStack Query cache (via `invalidateQueries`) AND the Zustand store (via `setAuth`). This ensures both the profile page and the navbar (which reads from the Zustand store) reflect the updated data immediately.

---

### `useForgotPassword` and `useResetPassword` — Simple Fire-and-Forget Mutations

```ts
// src/modules/auth/hooks/useForgotPassword.ts
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      authApi.forgotPassword(email).then((res) => res.data),
    onSuccess: (data) => {
      // The server returns a message — display it directly
      toast.success(data.message ?? 'Reset link sent! Check your email.')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to send reset link.')
    },
  })
}
```

```ts
// src/modules/auth/hooks/useResetPassword.ts
export function useResetPassword(token: string) {
  const router = useRouter()
  return useMutation({
    // token comes from the URL — captured in the closure like useUpdateListedProduct
    mutationFn: (password: string) =>
      authApi.resetPassword(token, password).then((res) => res.data),
    onSuccess: () => {
      toast.success('Password reset! Please sign in.')
      router.push('/login')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to reset password.')
    },
  })
}
```

These mutations don't need cache invalidation because they don't affect any cached query data — they're pure server-side operations.

---

### The `onError` Pattern — Extracting Axios Error Messages

Every mutation in this app uses the same error extraction pattern:

```ts
onError: (err: unknown) => {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
  toast.error(msg ?? 'Fallback error message.')
}
```

This works because Axios wraps HTTP error responses in an error object with a `response` property. The server returns error details in `response.data.message`. The optional chaining (`?.`) safely handles cases where the error is not an Axios error (e.g., a network timeout), falling back to the default message.

---

### Summary: `useMutation` Options Used in This App

| Option | Type | What it does |
|--------|------|-------------|
| `mutationFn` | `(variables: T) => Promise<R>` | The function that sends data to the server. Required. |
| `onSuccess` | `(data: R) => void` | Called after a successful mutation. |
| `onError` | `(error: unknown) => void` | Called after a failed mutation. |

| Return value | Type | What it does |
|-------------|------|-------------|
| `mutate` | `(variables: T, options?) => void` | Triggers the mutation. |
| `isPending` | `boolean` | `true` while the mutation is in flight. |

---
## 6. `useQueryClient` and Cache Invalidation

### What is `useQueryClient`?

`useQueryClient` is a hook that returns the `QueryClient` instance that was passed to `QueryClientProvider`. It gives you direct access to the cache from inside any component or hook.

```ts
import { useQueryClient } from '@tanstack/react-query'

function SomeHook() {
  const qc = useQueryClient()
  // qc is the same QueryClient instance created in queryClient.ts
}
```

The most important thing you can do with `qc` is invalidate queries after a mutation.

---

### `invalidateQueries` — The Cache Refresh Trigger

When you mutate data on the server (create, update, delete), the cached data in TanStack Query is now out of date. `invalidateQueries` tells TanStack Query: "this data is stale — refetch it the next time any component needs it."

```ts
// Invalidate a specific query by its exact key
qc.invalidateQueries({ queryKey: ['listed-products', 'p1'] })

// Invalidate ALL queries whose key starts with 'listed-products'
qc.invalidateQueries({ queryKey: ['listed-products'] })

// Invalidate ALL queries in the cache
qc.invalidateQueries()
```

When a query is invalidated:
1. If a component is currently mounted that uses that query, it **immediately refetches** in the background.
2. If no component is using that query right now, it's marked as stale and will refetch the next time a component mounts that uses it.

---

### Partial Key Matching — How One Call Refreshes Everything

This is the most powerful aspect of the key hierarchy design. Every mutation in this app uses a **partial key** for invalidation:

```ts
// From useCreateListedProduct, useUpdateListedProduct, useDeleteListedProduct:
qc.invalidateQueries({ queryKey: ['listed-products'] })
```

This single call invalidates ALL of these cache entries simultaneously:

| Cache Key | Invalidated? |
|-----------|-------------|
| `['listed-products', undefined]` | ✓ Yes — the public product list |
| `['listed-products', { page: 1, limit: 9 }]` | ✓ Yes — page 1 of the public list |
| `['listed-products', { page: 2, limit: 9 }]` | ✓ Yes — page 2 of the public list |
| `['listed-products', 'p1']` | ✓ Yes — the individual product detail |
| `['listed-products', 'mine', undefined]` | ✓ Yes — the user's own products |
| `['listed-products', 'mine', { limit: 50 }]` | ✓ Yes — the user's own products with limit |
| `['requested-products', undefined]` | ✗ No — different resource |
| `['jobs', undefined]` | ✗ No — different resource |

This works because TanStack Query checks if the invalidation key is a **prefix** of the cached key. `['listed-products']` is a prefix of `['listed-products', 'mine', { limit: 50 }]`, so it matches.

The same pattern applies to requested products:

```ts
// From useCreateRequestedProduct, useUpdateRequestedProduct, useDeleteRequestedProduct:
qc.invalidateQueries({ queryKey: ['requested-products'] })
```

And to the auth profile:

```ts
// From useUpdateProfile:
qc.invalidateQueries({ queryKey: queryKeys.auth.profile })
// queryKeys.auth.profile = ['auth', 'profile']
// This is an exact match — only the profile query is invalidated
```

---

### The Full Delete Flow — Step by Step

Here is exactly what happens when a user deletes a listed product from their profile page:

**Step 1:** The user is on `MyProfilePage`. Two queries are active:
```ts
// Both of these are mounted and have data in the cache
const { data: listedData } = useMyListedProducts({ limit: 50 })
// cache key: ['listed-products', 'mine', { limit: 50 }]

const { mutate: deleteListed } = useDeleteListedProduct()
```

**Step 2:** The user clicks "Delete" on a product. `mutate` is called:
```ts
deleteListed('product-id-123')
```

**Step 3:** `useDeleteListedProduct`'s `mutationFn` fires:
```ts
mutationFn: (id: string) => listedProductsApi.delete(id)
// → DELETE /api/listed-products/product-id-123
// → Server deletes the product and returns 200 OK
```

**Step 4:** `onSuccess` runs:
```ts
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['listed-products'] })
  // Marks ALL listed-product cache entries as stale
  toast.success('Product removed.')
}
```

**Step 5:** TanStack Query sees that `['listed-products', 'mine', { limit: 50 }]` is invalidated AND a component is currently using it. It immediately fires a background refetch:
```
GET /api/listed-products/my-products?limit=50
```

**Step 6:** The fresh data arrives. The component re-renders automatically. The deleted product is gone from the list — no manual state update needed.

The user sees the toast notification and the product disappears from the list, all without any manual `setState` calls.

---

### `queryClient.clear()` — The Nuclear Option

```ts
// src/modules/auth/hooks/useLogout.ts
import { queryClient } from '@/lib/react-query/queryClient'

export function useLogout() {
  const { clearAuth, refreshToken } = useAuthStore()
  const router = useRouter()

  return async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {}

    clearAuth()           // Clear the Zustand auth store
    queryClient.clear()   // Clear the ENTIRE TanStack Query cache
    toast.success('Logged out successfully.')
    router.push('/login')
  }
}
```

`queryClient.clear()` removes **every single cache entry** — all queries, all mutation state, everything. This is the right thing to do on logout for two reasons:

1. **Security** — The cache may contain sensitive user data (profile, private listings, etc.). Clearing it ensures this data is not accessible if another user logs in on the same device.

2. **Correctness** — Without clearing, the next user to log in would briefly see the previous user's cached data before their own data loads.

Notice that `useLogout` imports `queryClient` directly from the module (the singleton), rather than using `useQueryClient()`. This is because `useLogout` returns a plain async function, not a hook — it can't call `useQueryClient()` inside the returned function (that would violate the Rules of Hooks). The singleton pattern makes this possible.

---
## 7. The Full Data Flow — End to End

This section walks through a complete real-world scenario: a user visits the manage-listing page for a specific product, edits it, and saves. We'll trace every step from URL to cache update.

---

### The Scenario

The user navigates to `/account/manage-listing/abc123`. This is a dynamic route handled by `src/app/(protected)/account/manage-listing/[id]/page.tsx`. The page needs to:

1. Fetch the product with ID `abc123`
2. Display it in an edit form
3. Allow the user to update or delete it
4. After any change, refresh all related product lists

---

### Step 1 — Page Mounts, Hooks Initialize

```tsx
// src/app/(protected)/account/manage-listing/[id]/page.tsx
// (simplified to show the data flow)

function ManageListingPage({ params }: { params: { id: string } }) {
  const { id } = params  // 'abc123' from the URL

  // Hook 1: Fetch the specific product
  const { data: product, isLoading } = useListedProduct(id)

  // Hook 2: Mutation to update the product
  const { mutate: update, isPending: updating } = useUpdateListedProduct(id)

  // Hook 3: Mutation to delete the product
  const { mutate: remove, isPending: deleting } = useDeleteListedProduct()

  if (isLoading) return <LoadingSpinner />

  return (
    <EditForm
      product={product}
      onUpdate={(data) => update(data)}
      onDelete={() => remove(id, { onSuccess: () => router.push('/account/manage-listing') })}
      isUpdating={updating}
      isDeleting={deleting}
    />
  )
}
```

---

### Step 2 — `useListedProduct` Runs

```ts
// src/modules/marketplace/hooks/useListedProducts.ts
export function useListedProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.listedProducts.byId(id),  // ['listed-products', 'abc123']
    queryFn: () => listedProductsApi.getById(id).then((r) => r.data.data),
    enabled: !!id,  // 'abc123' is truthy, so this runs
  })
}
```

TanStack Query checks the cache for `['listed-products', 'abc123']`:

- **Cache miss (first visit):** `isLoading` is `true`. The `queryFn` fires: `GET /api/listed-products/abc123`. The response is stored in the cache. `isLoading` becomes `false`. The component re-renders with `data` populated.

- **Cache hit, data fresh (revisit within 5 minutes):** `isLoading` is `false` immediately. Data is served from cache. No network request.

- **Cache hit, data stale (revisit after 5 minutes):** `isLoading` is `false` immediately (stale data is shown). A background refetch fires silently. When it completes, the component re-renders with fresh data.

---

### Step 3 — User Edits and Submits

The user changes the product price and clicks "Save". The form calls:

```ts
update({ name: 'Laptop', price: 450, description: '...', category: 'Electronics' })
```

This triggers `useUpdateListedProduct(id)`'s `mutationFn`:

```ts
mutationFn: (payload: ListedProductPayload) =>
  listedProductsApi.update('abc123', payload).then((r) => r.data.data)
// → PUT /api/listed-products/abc123
// → Server updates the product and returns the updated object
```

While the request is in flight, `isPending` (aliased as `updating`) is `true`. The Save button is disabled.

---

### Step 4 — `onSuccess` Fires, Cache is Invalidated

The server responds with 200 OK. `onSuccess` runs:

```ts
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['listed-products'] })
  toast.success('Product updated!')
}
```

TanStack Query scans the cache for all keys starting with `['listed-products']` and marks them stale:

```
['listed-products', 'abc123']           → stale (the product we just edited)
['listed-products', undefined]          → stale (the public marketplace list)
['listed-products', { page: 1 }]        → stale (paginated marketplace)
['listed-products', 'mine', { limit: 50 }] → stale (user's profile page list)
```

---

### Step 5 — Active Queries Refetch

The `ManageListingPage` is still mounted and using `['listed-products', 'abc123']`. Because it's active and now stale, TanStack Query immediately fires a background refetch:

```
GET /api/listed-products/abc123
```

The response comes back with the updated price. The component re-renders. The form now shows the new price — confirming the save worked.

If the user navigates to the marketplace page (which uses `useListedProducts()`), that query is also stale, so it refetches and shows the updated product in the list.

If the user visits their profile page (which uses `useMyListedProducts({ limit: 50 })`), that query is also stale and refetches.

**All of this happens automatically from a single `invalidateQueries` call.**

---

### The Complete Flow Diagram

```
User clicks Save
      │
      ▼
mutate(payload) called
      │
      ▼
mutationFn fires → PUT /api/listed-products/abc123
      │
      ▼ (server responds 200 OK)
onSuccess runs
      │
      ├─→ qc.invalidateQueries({ queryKey: ['listed-products'] })
      │         │
      │         ├─→ ['listed-products', 'abc123'] marked stale → refetch
      │         ├─→ ['listed-products', undefined] marked stale → refetch on next mount
      │         ├─→ ['listed-products', 'mine', ...] marked stale → refetch
      │         └─→ (all other listed-product keys marked stale)
      │
      └─→ toast.success('Product updated!')
```

---
## 8. Patterns Used in This App

This section summarizes the recurring design patterns across all the hooks in this codebase. Understanding these patterns makes it easy to add new features consistently.

---

### Pattern 1: One Hook File Per Resource

Each domain module has a dedicated hooks file that contains all queries and mutations for that resource:

```
src/modules/auth/hooks/
  useProfile.ts          ← read: current user's profile
  useLogin.ts            ← write: login
  useRegister.ts         ← write: register
  useUpdateProfile.ts    ← write: update profile
  useForgotPassword.ts   ← write: request password reset
  useResetPassword.ts    ← write: confirm password reset
  useLogout.ts           ← write: logout + cache clear

src/modules/jobs/hooks/
  useJobs.ts             ← read: job list + single job

src/modules/shops/hooks/
  useShops.ts            ← read: shop list + single shop

src/modules/marketplace/hooks/
  useListedProducts.ts   ← read + write: listed products (CRUD)
  useRequestedProducts.ts ← read + write: requested products (CRUD)

src/modules/user/hooks/
  useUsers.ts            ← read: user list + single user
```

This keeps related logic together and makes it easy to find everything about a resource in one place.

---

### Pattern 2: Read and Write Hooks in the Same File

For resources that have both queries and mutations (like listed products), all hooks live in the same file:

```ts
// src/modules/marketplace/hooks/useListedProducts.ts

// READ hooks (useQuery)
export function useListedProducts(params?) { ... }
export function useMyListedProducts(params?) { ... }
export function useListedProduct(id) { ... }

// WRITE hooks (useMutation)
export function useCreateListedProduct() { ... }
export function useUpdateListedProduct(id) { ... }
export function useDeleteListedProduct() { ... }
```

This means a component that needs to both display and modify a resource only needs to import from one file.

---

### Pattern 3: `staleTime: 0` for User-Specific Data

Data that belongs to the currently logged-in user must always be fresh. If the user just created a product, they expect to see it immediately on their profile page — not after a 5-minute cache expiry.

The app uses `staleTime: 0` on:

```ts
// useProfile — the user's own profile
useQuery({ ..., staleTime: 0 })

// useMyListedProducts — the user's own listed products
useQuery({ ..., staleTime: 0 })

// useMyRequestedProducts — the user's own requested products
useQuery({ ..., staleTime: 0 })
```

Public data (jobs, shops, marketplace listings) uses the global 5-minute `staleTime` because it's acceptable to show slightly stale data to reduce network traffic.

---

### Pattern 4: `enabled: !!id` for Conditional Fetching

Any hook that fetches a single resource by ID uses `enabled: !!id` to prevent fetching with an empty or undefined ID:

```ts
// useJob, useShop, useListedProduct, useRequestedProduct, useUser all use this:
useQuery({
  queryKey: queryKeys.jobs.byId(jobId),
  queryFn: () => jobsApi.getById(jobId).then(...),
  enabled: !!jobId,  // Don't fetch if jobId is '', undefined, or null
})
```

Without this guard, navigating to a page before the ID is available in the URL params would fire a request like `GET /api/jobs/` (with an empty ID), which would either fail or return wrong data.

---

### Pattern 5: Centralized Query Keys in `queryKeys.ts`

All query keys are defined in one file (`src/lib/react-query/queryKeys.ts`) rather than scattered as raw arrays throughout the codebase.

**Benefits:**
- **Refactoring safety** — if you rename a resource from `'listed-products'` to `'products'`, you change it in one place.
- **Consistency** — every hook uses the same key structure, so invalidation always works correctly.
- **Discoverability** — you can see all cache keys at a glance.
- **Type safety** — `as const` gives TypeScript precise knowledge of the key structure.

The only exception in this app is `useMyListedProducts` and `useMyRequestedProducts`, which use inline keys (`['listed-products', 'mine', params]`) because the `'mine'` segment is a special sub-resource not represented in `queryKeys.ts`. This still works correctly with partial key invalidation because `['listed-products']` is a prefix of `['listed-products', 'mine', ...]`.

---

### Pattern 6: `queryClient.clear()` on Logout

When a user logs out, the entire cache is cleared:

```ts
// src/modules/auth/hooks/useLogout.ts
clearAuth()           // Clear Zustand auth store
queryClient.clear()   // Clear TanStack Query cache
```

This is a security best practice. Without it:
- User A logs out
- User B logs in on the same device
- User B briefly sees User A's cached profile, products, etc.

Clearing the cache on logout prevents this data leak entirely.

---

### Pattern 7: Consistent `onError` Error Extraction

Every mutation uses the same pattern to extract error messages from Axios responses:

```ts
onError: (err: unknown) => {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
  toast.error(msg ?? 'Fallback message.')
}
```

This could be extracted into a utility function if the codebase grows, but the current repetition is acceptable given the small number of mutations.

---
## 9. TanStack Query Features NOT Used in This App

TanStack Query v5 is a large library with many features beyond what this app uses. This section documents those features — what they do, when you'd use them, and how they'd look in this codebase. Understanding them helps you make informed decisions when the app's requirements grow.

---

### `useInfiniteQuery` — Infinite Scroll / Load More

**What it does:** Manages paginated data where each page is appended to the previous one, rather than replacing it. Perfect for "Load More" buttons or infinite scroll feeds.

**Why this app doesn't use it:** The app uses page-number pagination (page 1, page 2, etc.) where navigating to a new page replaces the current results. `useInfiniteQuery` is for accumulating results.

**How it would look:**

```ts
import { useInfiniteQuery } from '@tanstack/react-query'

export function useJobsInfinite(params?: Omit<JobsParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: ['jobs', 'infinite', params],
    queryFn: ({ pageParam = 1 }) =>
      jobsApi.getAll({ ...params, page: pageParam }).then((r) => r.data.data),
    // Tell TanStack Query what the next page number is
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasNextPage ? allPages.length + 1 : undefined,
    initialPageParam: 1,
  })
}

// In the component:
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useJobsInfinite()

// data.pages is an array of page results — flatten them to get all jobs:
const allJobs = data?.pages.flatMap((page) => page.jobs) ?? []

// Load more button:
<button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
  {isFetchingNextPage ? 'Loading...' : 'Load More'}
</button>
```

**When to use it:** Social media feeds, product catalogs with "Load More", chat message history.

---

### `useSuspenseQuery` — React Suspense Integration

**What it does:** Integrates with React's Suspense system. Instead of checking `isLoading` manually, you wrap the component in a `<Suspense>` boundary and the loading state is handled automatically. The hook never returns `undefined` for `data` — it always has data or throws to the nearest Suspense boundary.

**Why this app doesn't use it:** The app handles loading states manually with `isLoading` flags, which gives more control over exactly what the loading UI looks like per component.

**How it would look:**

```tsx
import { useSuspenseQuery } from '@tanstack/react-query'

// The hook — no isLoading needed, data is always defined
export function useJobSuspense(jobId: string) {
  return useSuspenseQuery({
    queryKey: queryKeys.jobs.byId(jobId),
    queryFn: () => jobsApi.getById(jobId).then((r) => r.data.data),
  })
}

// The component — no loading check needed
function JobDetail({ id }: { id: string }) {
  const { data: job } = useJobSuspense(id)  // data is always defined here
  return <div>{job.title}</div>
}

// The parent — handles loading with Suspense
function JobPage({ id }: { id: string }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <JobDetail id={id} />
    </Suspense>
  )
}
```

**When to use it:** When you want to co-locate loading UI with the component tree rather than inside each component. Works well with Next.js App Router's built-in `loading.tsx` files.

---

### `useQueries` — Parallel Queries in One Hook

**What it does:** Runs multiple independent queries in parallel and returns an array of results. Useful when you need to fetch several different resources at the same time and the number of queries is dynamic.

**Why this app doesn't use it:** The app calls multiple `useQuery` hooks separately in the same component, which achieves the same parallelism. `useQueries` is mainly needed when the number of queries is dynamic (e.g., fetching N items by ID where N is unknown at render time).

**How it would look:**

```ts
import { useQueries } from '@tanstack/react-query'

// Fetch multiple jobs by ID in parallel
export function useMultipleJobs(jobIds: string[]) {
  return useQueries({
    queries: jobIds.map((id) => ({
      queryKey: queryKeys.jobs.byId(id),
      queryFn: () => jobsApi.getById(id).then((r) => r.data.data),
      enabled: !!id,
    })),
  })
  // Returns an array: [{ data: job1, isLoading }, { data: job2, isLoading }, ...]
}
```

**When to use it:** Fetching a dynamic list of items by ID (e.g., a user's saved items), or when you need to combine results from multiple endpoints.

---

### `placeholderData` / `keepPreviousData` — Smooth Pagination UX

**What it does:** While a new page of data is loading, shows the previous page's data instead of a loading spinner. This prevents the jarring "flash of empty content" when paginating.

**Why this app doesn't use it:** The app shows a loading state between page changes. Adding `placeholderData` would be a UX improvement for the jobs and marketplace pages.

**How it would look:**

```ts
import { useQuery, keepPreviousData } from '@tanstack/react-query'

export function useJobs(params?: JobsParams) {
  return useQuery({
    queryKey: queryKeys.jobs.all(params),
    queryFn: () => jobsApi.getAll(params).then((r) => r.data.data),
    // Keep showing the previous page's data while the new page loads
    placeholderData: keepPreviousData,
  })
}

// In the component, use isFetching (not isLoading) to show a subtle loading indicator:
const { data, isLoading, isFetching } = useJobs({ page, limit: 9 })
// isLoading = true only on the very first load (no cached data at all)
// isFetching = true whenever a fetch is in progress (including page changes)
```

**When to use it:** Any paginated list where you want smooth transitions between pages.

---

### `select` — Transform Data Inside the Query

**What it does:** The `select` option lets you transform or filter the raw data returned by `queryFn` before it reaches the component. The transformation runs after the data is fetched but before it's stored in the cache result.

**Why this app doesn't use it:** The app transforms data in the `queryFn` itself using `.then((r) => r.data.data)`. The `select` option is an alternative approach that keeps the raw data in the cache while providing a transformed view to the component.

**How it would look:**

```ts
export function useJobTitles(params?: JobsParams) {
  return useQuery({
    queryKey: queryKeys.jobs.all(params),
    queryFn: () => jobsApi.getAll(params).then((r) => r.data.data),
    // Transform: extract only the titles from the jobs array
    select: (data) => data.jobs.map((job) => job.title),
  })
}

// data is now string[] instead of the full jobs response
const { data: titles } = useJobTitles()
```

**When to use it:** When multiple components need different "views" of the same underlying data, or when you want to memoize expensive transformations.

---

### `initialData` — Seed the Cache Before the First Fetch

**What it does:** Provides data to the cache before the first network request. The component renders immediately with this data, and a background fetch happens to get the real data.

**Why this app doesn't use it:** The app is a pure client-side SPA for data fetching. `initialData` is most useful with SSR (Server-Side Rendering) where you pre-fetch data on the server and pass it to the client.

**How it would look with Next.js SSR:**

```tsx
// In a Server Component (page.tsx):
async function JobsPage() {
  // Pre-fetch on the server
  const initialJobs = await jobsApi.getAll({ page: 1, limit: 9 })

  return <JobsClient initialData={initialJobs.data.data} />
}

// In the Client Component:
function JobsClient({ initialData }: { initialData: JobsData }) {
  const { data } = useJobs({ page: 1, limit: 9 }, {
    initialData,  // Seed the cache — no loading spinner on first render
  })
}
```

**When to use it:** SSR/SSG scenarios where you want zero loading time on the initial page render.

---

### `setQueryData` — Manually Write to the Cache

**What it does:** Directly writes data into the cache for a specific query key, without making a network request. This is called "optimistic updates" — you update the UI immediately, before the server confirms the change.

**Why this app doesn't use it:** The app uses `invalidateQueries` instead, which refetches from the server after every mutation. This is simpler and always correct, at the cost of an extra network request. `setQueryData` is faster but requires you to manually construct the new cache state.

**How it would look (optimistic delete):**

```ts
export function useDeleteListedProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => listedProductsApi.delete(id),
    // Optimistically remove the product from the cache BEFORE the server responds
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['listed-products'] })
      const previous = qc.getQueryData(['listed-products', 'mine', { limit: 50 }])
      qc.setQueryData(['listed-products', 'mine', { limit: 50 }], (old: any) => ({
        ...old,
        products: old.products.filter((p: any) => p._id !== id),
      }))
      return { previous }  // Return snapshot for rollback
    },
    // If the server request fails, roll back to the previous state
    onError: (err, id, context) => {
      qc.setQueryData(['listed-products', 'mine', { limit: 50 }], context?.previous)
      toast.error('Failed to delete product.')
    },
    // Always refetch to ensure cache is in sync with server
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['listed-products'] })
    },
  })
}
```

**When to use it:** High-frequency interactions where you want instant UI feedback (like toggling a like button, reordering items, or deleting items from a list).

---

### `prefetchQuery` — Pre-load Data Before Navigation

**What it does:** Fetches data and stores it in the cache before the user navigates to a page. When they do navigate, the data is already there — no loading spinner.

**Why this app doesn't use it:** The app doesn't implement hover-to-prefetch or route-based prefetching. Adding it would improve perceived performance.

**How it would look:**

```tsx
// Prefetch a job's details when the user hovers over a job card
function JobCard({ job }: { job: Job }) {
  const qc = useQueryClient()

  const handleMouseEnter = () => {
    qc.prefetchQuery({
      queryKey: queryKeys.jobs.byId(job._id),
      queryFn: () => jobsApi.getById(job._id).then((r) => r.data.data),
      staleTime: 1000 * 60 * 5,  // Don't prefetch if already cached and fresh
    })
  }

  return (
    <div onMouseEnter={handleMouseEnter}>
      <Link href={`/jobs/${job._id}`}>{job.title}</Link>
    </div>
  )
}
```

**When to use it:** Job/product listing pages where users are likely to click into a detail page. Hover-to-prefetch makes navigation feel instant.

---

### `onSettled` Mutation Callback — Runs After Both Success and Error

**What it does:** A callback that runs after a mutation completes, regardless of whether it succeeded or failed. Useful for cleanup that should always happen.

**Why this app doesn't use it:** The app handles success and error separately. `onSettled` would be useful if you wanted to always invalidate the cache, even on error (to ensure the UI reflects the true server state after a failed optimistic update).

**How it would look:**

```ts
useMutation({
  mutationFn: (id: string) => listedProductsApi.delete(id),
  onSuccess: () => toast.success('Product removed.'),
  onError: () => toast.error('Failed to delete product.'),
  // Always runs — good for cleanup or guaranteed cache invalidation
  onSettled: () => {
    qc.invalidateQueries({ queryKey: ['listed-products'] })
  },
})
```

**When to use it:** When combined with optimistic updates (`setQueryData`), `onSettled` ensures the cache is always synced with the server after the mutation resolves.

---

### `mutateAsync` — Promise-Based Mutations

**What it does:** An alternative to `mutate` that returns a Promise instead of using callbacks. Lets you use `async/await` syntax and handle the result inline.

**Why this app doesn't use it:** The app uses `mutate` with `onSuccess`/`onError` callbacks, which is the recommended pattern for most cases. `mutateAsync` is useful when you need to chain multiple async operations or use try/catch.

**How it would look:**

```tsx
const { mutateAsync: create, isPending } = useCreateListedProduct()

// Using mutateAsync with async/await:
const handleSubmit = async (data: ListedProductPayload) => {
  try {
    const newProduct = await create(data)
    // Do something with the returned product
    router.push(`/marketplace/${newProduct._id}`)
  } catch (err) {
    // Error is also thrown here (in addition to onError callback)
    console.error('Failed:', err)
  }
}
```

**When to use it:** When you need the return value of the mutation, or when you need to sequence multiple async operations after a mutation.

---

### `QueryObserver` / `MutationObserver` — Low-Level Observers

**What they do:** Low-level classes that let you observe query or mutation state outside of React components. Rarely needed in application code.

**When to use them:** Building custom integrations, testing utilities, or non-React environments. In normal React component code, always use `useQuery` and `useMutation` instead.

---

### `ReactQueryDevtools` — Browser Cache Inspector

**What it does:** A browser panel (similar to Redux DevTools) that shows you the entire TanStack Query cache in real time. You can see every query key, its data, its status (fresh/stale/fetching/error), and when it was last updated. You can also manually trigger refetches and invalidations.

**Why this app doesn't use it:** It's not installed or configured. It's a development-only tool and has zero impact on production.

**How to add it:**

```bash
npm install @tanstack/react-query-devtools
```

```tsx
// src/app/providers.tsx
'use client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/react-query/queryClient'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only renders in development — automatically excluded from production builds */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

**When to use it:** Always, during development. It's invaluable for debugging cache behavior, understanding why a query is or isn't refetching, and verifying that invalidation is working correctly.

---
## 10. Quick Reference Cheat Sheet

### Hooks and Functions Used in This App

| Hook / Function | Where | What it does |
|----------------|-------|-------------|
| `useQuery` | All read hooks | Fetches and caches server data. Returns `data`, `isLoading`, and more. |
| `useMutation` | All write hooks | Sends data to the server. Returns `mutate`, `isPending`, and more. |
| `useQueryClient` | All mutation hooks | Returns the `QueryClient` instance for cache operations. |
| `QueryClientProvider` | `providers.tsx` | Wraps the app and makes the query client available via context. |
| `queryClient.clear()` | `useLogout.ts` | Clears the entire cache. Used on logout to prevent data leaks. |
| `qc.invalidateQueries()` | All mutation `onSuccess` | Marks matching cache entries as stale and triggers refetch. |

---

### Query Hooks in This App

| Hook | File | Query Key | Notes |
|------|------|-----------|-------|
| `useProfile()` | `auth/hooks/useProfile.ts` | `['auth', 'profile']` | `enabled: isAuthenticated`, `staleTime: 0` |
| `useJobs(params?)` | `jobs/hooks/useJobs.ts` | `['jobs', params]` | Uses global `staleTime` (5 min) |
| `useJob(id)` | `jobs/hooks/useJobs.ts` | `['jobs', id]` | `enabled: !!id` |
| `useShops(params?)` | `shops/hooks/useShops.ts` | `['shops', params]` | Uses global `staleTime` (5 min) |
| `useShop(id)` | `shops/hooks/useShops.ts` | `['shops', id]` | `enabled: !!id` |
| `useListedProducts(params?)` | `marketplace/hooks/useListedProducts.ts` | `['listed-products', params]` | Public listing |
| `useMyListedProducts(params?)` | `marketplace/hooks/useListedProducts.ts` | `['listed-products', 'mine', params]` | `staleTime: 0` |
| `useListedProduct(id)` | `marketplace/hooks/useListedProducts.ts` | `['listed-products', id]` | `enabled: !!id` |
| `useRequestedProducts(params?)` | `marketplace/hooks/useRequestedProducts.ts` | `['requested-products', params]` | Public listing |
| `useMyRequestedProducts(params?)` | `marketplace/hooks/useRequestedProducts.ts` | `['requested-products', 'mine', params]` | `staleTime: 0` |
| `useRequestedProduct(id)` | `marketplace/hooks/useRequestedProducts.ts` | `['requested-products', id]` | `enabled: !!id` |
| `useUsers()` | `user/hooks/useUsers.ts` | `['users']` | Typed with `UsersResponse` |
| `useUser(id)` | `user/hooks/useUsers.ts` | `['users', id]` | `enabled: !!id` |

---

### Mutation Hooks in This App

| Hook | File | Invalidates | Side Effects |
|------|------|-------------|-------------|
| `useLogin()` | `auth/hooks/useLogin.ts` | Nothing | Updates Zustand store, navigates to `/landing` |
| `useRegister()` | `auth/hooks/useRegister.ts` | Nothing | Navigates to `/login` |
| `useLogout()` | `auth/hooks/useLogout.ts` | `queryClient.clear()` (all) | Clears Zustand store, navigates to `/login` |
| `useUpdateProfile()` | `auth/hooks/useUpdateProfile.ts` | `['auth', 'profile']` | Updates Zustand store |
| `useForgotPassword()` | `auth/hooks/useForgotPassword.ts` | Nothing | Shows server message in toast |
| `useResetPassword(token)` | `auth/hooks/useResetPassword.ts` | Nothing | Navigates to `/login` |
| `useCreateListedProduct()` | `marketplace/hooks/useListedProducts.ts` | `['listed-products']` | — |
| `useUpdateListedProduct(id)` | `marketplace/hooks/useListedProducts.ts` | `['listed-products']` | ID captured in closure |
| `useDeleteListedProduct()` | `marketplace/hooks/useListedProducts.ts` | `['listed-products']` | ID passed to `mutate()` |
| `useCreateRequestedProduct()` | `marketplace/hooks/useRequestedProducts.ts` | `['requested-products']` | — |
| `useUpdateRequestedProduct(id)` | `marketplace/hooks/useRequestedProducts.ts` | `['requested-products']` | ID captured in closure |
| `useDeleteRequestedProduct()` | `marketplace/hooks/useRequestedProducts.ts` | `['requested-products']` | ID passed to `mutate()` |

---

### Key Concepts at a Glance

| Concept | One-liner |
|---------|-----------|
| Query Key | Array that uniquely identifies a cache entry. Same key = same cache slot. |
| `staleTime` | How long data is "fresh". Fresh data is served from cache without refetching. |
| `gcTime` | How long unused data stays in memory before being garbage collected. |
| `enabled` | Boolean that controls whether a query runs. `false` = query is paused. |
| `invalidateQueries` | Marks cache entries as stale. Active queries refetch immediately. |
| Partial key matching | `['jobs']` invalidates `['jobs', params]`, `['jobs', id]`, etc. |
| `queryClient.clear()` | Removes everything from the cache. Use on logout. |
| `isPending` | `true` while a mutation is in flight. Use to disable submit buttons. |
| `isLoading` | `true` only on the very first fetch (no cached data). Use for skeleton screens. |
| `isFetching` | `true` whenever any fetch is in progress (including background refetches). |

---

### Features NOT Used — Quick Reference

| Feature | What it does | Use when |
|---------|-------------|----------|
| `useInfiniteQuery` | Accumulates pages for infinite scroll | "Load More" / infinite scroll UX |
| `useSuspenseQuery` | Integrates with React Suspense | You want Suspense-based loading boundaries |
| `useQueries` | Parallel queries with dynamic count | Fetching N items by ID where N is unknown |
| `placeholderData` | Shows old data while new page loads | Smooth pagination UX |
| `select` | Transforms data inside the query | Multiple components need different views of same data |
| `initialData` | Seeds cache before first fetch | SSR/SSG with pre-fetched server data |
| `setQueryData` | Manually writes to cache | Optimistic updates for instant UI feedback |
| `prefetchQuery` | Pre-loads data before navigation | Hover-to-prefetch on list items |
| `onSettled` | Runs after success OR error | Guaranteed cleanup after optimistic updates |
| `mutateAsync` | Promise-based mutation | Chaining async operations, needing return value |
| `ReactQueryDevtools` | Browser cache inspector | Always — during development |

---

*This guide covers TanStack Query `@tanstack/react-query` v5.95.x as used in this Next.js 16 App Router campus marketplace project.*
