import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { makeServerQueryClient } from '@/lib/react-query/serverQueryClient'
import { queryKeys } from '@/lib/react-query/queryKeys'
import JobDetailPage from '@/modules/jobs/pages/JobDetailPage'
import { getJobById } from '@/backend/queries/job.queries'

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  try {
    const { id } = await params
    const job = await getJobById(id)
    return {
      title: job.jobName,
      description: job.jobDescription?.slice(0, 160),
      openGraph: { title: job.jobName, description: job.jobDescription?.slice(0, 160) },
    }
  } catch {
    return { title: 'Job Not Found' }
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const qc = makeServerQueryClient()

  try {
    const job = await getJobById(id)
    qc.setQueryData(queryKeys.jobs.byId(id), JSON.parse(JSON.stringify(job)))
  } catch {
    notFound()
  }

  /*
Why setQueryData Instead of prefetchQuery?

This answers your main question.

Why Prefetch Is NOT Used Here

Usually you see:

await qc.prefetchQuery({
  queryKey,
  queryFn
})

But here:

job already fetched

because:

metadata needed it
page logic needed it

So no reason to fetch again.

If Using prefetchQuery

Would do:

Fetch once for metadata
Fetch AGAIN for prefetch

Duplicate DB query.

Bad.

  =========================
  Without Hydration

Flow becomes:

Server renders page
      ↓
Browser loads
      ↓
Client fetches AGAIN

Double request problem.

With Hydration
Server fetches once
      ↓
Browser reuses same data

Much faster.


======================

notFound
import { notFound } from 'next/navigation'

Special Next.js function.

If called:

notFound()

Next.js automatically renders:

404 page


=============================

Why Internal DB Call Instead of API Fetch?

This is one of the biggest modern Next.js optimizations.

Traditional Architecture
Next.js Server
     ↓
fetch('/api/jobs/123')
     ↓
API Route
     ↓
Database

Problem:

Server calling its own API

This is unnecessary.

Your Architecture
Next.js Server Component
      ↓
Direct DB query
      ↓
Database

Much faster.

Why Better?

Because it removes:

❌ HTTP overhead
❌ serialization overhead
❌ API route overhead
❌ extra latency
❌ duplicate validation

=================================

Why Detail Pages Often Use Direct DB Calls

Because detail pages are:

SEO critical pages

Examples:

jobs
products
blogs
shops

Need:

✅ metadata
✅ server rendering
✅ indexing
✅ social previews

Direct DB access is fastest and best.
  */

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <JobDetailPage />
    </HydrationBoundary>
  )
}
