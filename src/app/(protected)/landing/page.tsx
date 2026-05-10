import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { makeServerQueryClient } from '@/lib/react-query/serverQueryClient'
import { queryKeys } from '@/lib/react-query/queryKeys'
import LandingPage from '@/modules/landing/pages/LandingPage'

export const revalidate = 60

/*
This is used in App Router to enable:

ISR — Incremental Static Regeneration

Meaning:

Generate page once
Cache it
Reuse it for 60 seconds
Then regenerate in background

Why use it?

Perfect for:

landing pages
product lists
blogs
marketplace
jobs
shops

Where data changes occasionally.
*/

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

async function fetchJson(path: string) {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`)
  const json = await res.json()
  return json.data
}

export default async function Page() {
  const qc = makeServerQueryClient()

  await Promise.allSettled([
    qc.prefetchQuery({
      queryKey: queryKeys.jobs.all({ limit: 6 }),
      queryFn: () => fetchJson('/api/jobs?limit=6'),
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.shops.all({ limit: 6 }),
      queryFn: () => fetchJson('/api/shops?limit=6'),
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.listedProducts.all({ limit: 6 }),
      queryFn: () => fetchJson('/api/listed-products?limit=6'),
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.requestedProducts.all({ limit: 6 }),
      queryFn: () => fetchJson('/api/requested-products?limit=6'),
    }),
  ])

/*
| Method             | Waits For        | Fails If One Fails? |
| ------------------ | ---------------- | ------------------- |
| Promise.all        | all success      | ✅ Yes               |
| Promise.allSettled | all complete     | ❌ No                |
| Promise.race       | first completion | depends             |
| Promise.any        | first success    | only if all fail    |

*/


  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <LandingPage />
    </HydrationBoundary>
  )
}

/*
3. What is dehydrate(qc)?

This is the MOST important part.

dehydrate(qc)

React Query cache contains:

Maps
functions
class instances
complex JS objects

These CANNOT be sent from server → browser directly.

So dehydrate() converts the cache into a plain serializable JSON object.



=====================================
=====================================


What is hydration?

Hydration means:

Restore server data into browser cache
Server side
fetch data
↓
store in QueryClient
↓
dehydrate to JSON
↓
send HTML + JSON to browser
Browser side
HydrationBoundary receives JSON
↓
React Query rebuilds cache
↓
useQuery instantly gets data

That rebuilding process is called:Hydration


====================
====================

8. Why useQuery() does NOT refetch immediately?

Because cache already exists.

React Query checks:

Do I already have this queryKey in cache?

YES.

So:

Return cached data instantly
*/