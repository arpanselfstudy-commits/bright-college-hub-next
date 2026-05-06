import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/backend/lib/withErrorHandler'
import { sendSuccess } from '@/backend/lib/response'
import { getAuthUser } from '@/backend/lib/authGuard'
import { validate } from '@/backend/lib/validate'
import { authorize } from '@/backend/lib/authorize'
import { AppError } from '@/backend/lib/appError'
import { generateDescriptionSchema, GenerateDescriptionInput } from '@/backend/validators/aiDescription.validator'
import { UserRole } from '@/backend/types/backend.types'

// ---------------------------------------------------------------------------
// In-memory rate limiter
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number
  windowStart: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in ms

function checkRateLimit(userId: string): { allowed: boolean; resetAt: number } {
  const now = Date.now()
  let entry = rateLimitStore.get(userId) ?? { count: 0, windowStart: now }

  if (now - entry.windowStart >= RATE_LIMIT_WINDOW) {
    entry = { count: 0, windowStart: now }
  }

  entry.count += 1

  if (entry.count > RATE_LIMIT_MAX) {
    rateLimitStore.set(userId, entry)
    return { allowed: false, resetAt: entry.windowStart + RATE_LIMIT_WINDOW }
  }

  rateLimitStore.set(userId, entry)
  return { allowed: true, resetAt: entry.windowStart + RATE_LIMIT_WINDOW }
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildPrompt(input: GenerateDescriptionInput): string {
  return (
    'You are a helpful assistant for a college student marketplace called Bright College Hub.\n' +
    'Write a 2-3 sentence product description for the following item:\n' +
    `- Product Name: ${input.productName}\n` +
    `- Category: ${input.category}\n` +
    `- Condition: ${input.condition}\n` +
    `- Years Used: ${input.yearUsed}\n` +
    `- Price: ${input.price} (do NOT mention the price in the description)\n` +
    'Write in a polite, friendly tone. Return plain text only — no markdown, no bullet points, no headings.'
  )
}

// ---------------------------------------------------------------------------
// POST /api/ai/generate-description
// ---------------------------------------------------------------------------

export const POST = withErrorHandler(async (req: NextRequest) => {
  // a. Auth guard
  const user = await getAuthUser()
  authorize(user, UserRole.USER)

  // b. Validate body
  const body = await req.json()
  const data = validate(generateDescriptionSchema, body)

  // c. Rate limit check
  const userId = user!._id.toString()
  const { allowed, resetAt } = checkRateLimit(userId)
  if (!allowed) {
    throw new AppError(
      `Rate limit exceeded. Try again after ${new Date(resetAt).toISOString()}.`,
      429,
      'RATE_LIMIT_EXCEEDED'
    )
  }

  // d. API key guard
  const apiKey = process.env.AICC_API_KEY
  if (!apiKey) {
    throw new AppError('AI description generation is not configured.', 503, 'AI_NOT_CONFIGURED')
  }

  // e. Build prompt
  const prompt = buildPrompt(data)

  // f. Call AICC API (OpenAI-compatible, smart fallback across models)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)

  let aiRes: Response
  try {
    aiRes = await fetch('https://api.ai.cc/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant for a college student marketplace. Write concise, polite product descriptions.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
      signal: controller.signal,
    })
    clearTimeout(timer)
  } catch (err: unknown) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[AI route] AICC fetch error:', msg)
    throw new AppError(`AI request failed: ${msg}`, 502, 'AI_SERVICE_ERROR')
  }

  if (!aiRes.ok) {
    const errBody = await aiRes.json().catch(() => ({}))
    console.error('[AI route] AICC error:', aiRes.status, JSON.stringify(errBody))
    const aiMessage = errBody?.error?.message ?? 'AI service returned an error.'
    throw new AppError(`AI error (${aiRes.status}): ${aiMessage}`, 502, 'AI_SERVICE_ERROR')
  }

  // g. Extract and validate response text
  const aiData = await aiRes.json()
  const text: string = aiData?.choices?.[0]?.message?.content ?? ''
  const trimmed = text.trim()

  if (!trimmed) {
    throw new AppError('AI returned an empty response. Please try again.', 502, 'AI_EMPTY_RESPONSE')
  }

  return sendSuccess({ description: trimmed })
})
