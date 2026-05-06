# Implementation Plan: AI Description Generator

## Overview

Implement AI-powered description generation for the "List a Product" form. The work splits into three layers: a new backend API route (auth guard, rate limiter, Zod validation, Gemini fetch), a new client hook and API function, and UI changes to `ListProductView` / `ListProductPage` (field reorder, Generate Button, character counter). All code is TypeScript with 2-space indent, single quotes, no semicolons, and `@/*` imports from `src/`.

## Tasks

- [x] 1. Add environment variables and Zod validator
  - [x] 1.1 Add `GEMINI_API_KEY` and `NEXT_PUBLIC_AI_ENABLED` to `.env` and `.env.example`
    - Add `GEMINI_API_KEY=` (empty placeholder) and `NEXT_PUBLIC_AI_ENABLED=true` to both files
    - Add a comment in `.env.example` pointing to `https://aistudio.google.com/app/apikey` for the free-tier key
    - _Requirements: 7.1, 7.4_
  - [x] 1.2 Create `src/backend/validators/aiDescription.validator.ts`
    - Export `generateDescriptionSchema` as a `z.object` with fields: `productName` (`z.string().min(1)`), `category` (`z.string().min(1)`), `price` (`z.string().min(1)`), `condition` (`z.string().min(1)`), `yearUsed` (`z.number().int().min(0)`)
    - Export the `GenerateDescriptionInput` type alias via `z.infer`
    - Match the style of `src/backend/validators/listedProduct.validator.ts`
    - _Requirements: 2.5_

- [x] 2. Implement the backend API route
  - [x] 2.1 Create `src/app/api/ai/generate-description/route.ts` with auth guard and validation
    - Scaffold the `POST` handler using `withErrorHandler`, `getAuthUser`, `authorize`, and `validate` — matching the pattern in `src/app/api/listed-products/route.ts`
    - Throw `AppError('Unauthorized', 401, 'UNAUTHORIZED')` when no session exists
    - Call `validate(generateDescriptionSchema, body)` and let `withErrorHandler` surface the 400 on failure
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 2.2 Add in-memory rate limiter (`checkRateLimit`) to the route module
    - Declare `RateLimitEntry` interface, `rateLimitStore` Map, `RATE_LIMIT_MAX = 10`, `RATE_LIMIT_WINDOW = 60 * 60 * 1000`
    - Implement `checkRateLimit(userId: string): { allowed: boolean; resetAt: number }` — reset window when expired, increment counter, return `allowed: false` when count exceeds max
    - Call `checkRateLimit` after validation; throw `AppError` with HTTP 429 and `RATE_LIMIT_EXCEEDED` when not allowed; include ISO reset timestamp in the message
    - _Requirements: 8.1, 8.2_
  - [x] 2.3 Add `buildPrompt` helper and `GEMINI_API_KEY` guard to the route module
    - Check `process.env.GEMINI_API_KEY` before any Gemini call; throw `AppError('AI description generation is not configured.', 503, 'AI_NOT_CONFIGURED')` when absent or empty
    - Implement `buildPrompt(input: GenerateDescriptionInput): string` — include all five context fields, instruct Gemini to write 2–3 sentences, polite tone, no price, plain text only
    - _Requirements: 2.2, 3.1, 3.2, 3.3, 3.4, 7.1, 7.2_
  - [ ]* 2.4 Write property test for `buildPrompt` — `src/modules/user/__tests__/buildPrompt.test.ts`
    - **Property 3: Prompt contains all five context fields**
    - **Validates: Requirements 3.1**
    - Use `fc.record` to generate arbitrary valid `GenerateDescriptionInput` values; assert each field value appears as a substring of the returned prompt string
    - Tag: `// Feature: ai-description-generator, Property 3: Prompt contains all five context fields`
  - [x] 2.5 Implement the Gemini `fetch` call and response normalisation in the route
    - POST to `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}` with `contents` and `generationConfig` (`temperature: 0.7`, `maxOutputTokens: 200`)
    - Extract `candidates[0].content.parts[0].text`, trim it
    - Throw `AppError` with HTTP 502 and `AI_EMPTY_RESPONSE` when the trimmed string is empty or whitespace-only
    - Catch `fetch` errors and non-2xx Gemini responses; throw `AppError` with HTTP 502 and `AI_SERVICE_ERROR`
    - Return `sendSuccess({ description: trimmedText })`
    - _Requirements: 4.1, 4.4, 4.5_
  - [ ]* 2.6 Write property test for `checkRateLimit` — `src/modules/user/__tests__/checkRateLimit.test.ts`
    - **Property 10: Rate limit enforced across all users**
    - **Validates: Requirements 8.1, 8.2**
    - Use `fc.string` to generate arbitrary user IDs; assert exactly 10 calls return `allowed: true` and all subsequent calls return `allowed: false` within the same window
    - Also test window reset: after advancing `Date.now` past `RATE_LIMIT_WINDOW`, the next call returns `allowed: true`
    - Tag: `// Feature: ai-description-generator, Property 10: Rate limit enforced across all users`

- [ ] 3. Checkpoint — verify backend in isolation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Add integration tests for the API route
  - [ ] 4.1 Create `src/app/api/ai/__tests__/generate-description.test.ts`
    - Mock `getAuthUser` to return `null`; assert 401 `UNAUTHORIZED` (Requirement 2.3)
    - Mock `getAuthUser` to return a valid user; send bodies missing one or more fields; assert 400 `VALIDATION_ERROR` (Requirement 2.4)
    - Unset `process.env.GEMINI_API_KEY`; assert 503 `AI_NOT_CONFIGURED` (Requirement 7.2)
    - Mock `fetch` to throw a network error; assert 502 `AI_SERVICE_ERROR` (Requirement 4.4)
    - Mock `fetch` to return a whitespace-only text; assert 502 `AI_EMPTY_RESPONSE` (Requirement 4.5)
    - Mock `fetch` to return a valid description; assert 200 with `{ description: string }` (Requirement 4.1)
    - _Requirements: 2.3, 2.4, 4.1, 4.4, 4.5, 7.2_
  - [ ]* 4.2 Write property test for validation rejection — inside `generate-description.test.ts`
    - **Property 2: Validation rejects any incomplete request body**
    - **Validates: Requirements 2.4**
    - Use `fc.subarray` over the five field names to generate all non-empty subsets of missing fields; assert each produces 400 `VALIDATION_ERROR`
    - Tag: `// Feature: ai-description-generator, Property 2: Validation rejects any incomplete request body`
  - [ ]* 4.3 Write property test for API key leak prevention — inside `generate-description.test.ts`
    - **Property 1: API key never leaks in any response**
    - **Validates: Requirements 2.2**
    - Set `process.env.GEMINI_API_KEY` to an `fc.string`-generated value; send varied requests (valid, invalid, unauthenticated, rate-limited); assert the serialised response body never contains the key value
    - Tag: `// Feature: ai-description-generator, Property 1: API key never leaks in any response`
  - [ ]* 4.4 Write property test for whitespace rejection — inside `generate-description.test.ts`
    - **Property 5: Whitespace-only AI responses are rejected**
    - **Validates: Requirements 4.5**
    - Use `fc.stringMatching(/^\s*$/)` to generate whitespace-only strings; mock Gemini to return each; assert 502 `AI_EMPTY_RESPONSE`
    - Tag: `// Feature: ai-description-generator, Property 5: Whitespace-only AI responses are rejected`

- [x] 5. Add client API function and custom hook
  - [x] 5.1 Add `aiApi.generateDescription` to `src/modules/user/api/user.api.ts`
    - Declare `GenerateDescriptionPayload` and `GenerateDescriptionResponse` interfaces in the same file
    - Export `aiApi` object with `generateDescription` calling `apiClient.post<ApiResponse<GenerateDescriptionResponse>>('/api/ai/generate-description', payload)`
    - _Requirements: 4.1, 4.2_
  - [x] 5.2 Create `src/modules/user/hooks/useGenerateDescription.ts`
    - Accept `{ setValue, watch, isAiEnabled }` matching the `UseGenerateDescriptionOptions` interface from the design
    - Watch the five context fields; derive `canGenerate` (all five non-empty: price non-empty string, yearUsed ≥ 0)
    - `generate()`: set `isGenerating = true`, call `aiApi.generateDescription`, on success call `setValue('description', text, { shouldDirty: true })`, on error call `toast.error(message)`
    - On 429 response, parse the ISO reset timestamp from the error message and set `rateLimitedUntil` state
    - Return `{ generate, isGenerating, canGenerate, rateLimitedUntil }`
    - _Requirements: 4.2, 4.3, 5.3, 5.4, 5.5, 8.3_
  - [ ]* 5.3 Write property tests for `useGenerateDescription` — `src/modules/user/__tests__/useGenerateDescription.test.ts`
    - **Property 4: AI response auto-populates the description field**
    - **Validates: Requirements 4.2**
    - Use `fc.string({ minLength: 1 })` for mock AI responses; use `renderHook` + mocked `aiApi`; assert `description` field equals the returned string after `generate()` resolves
    - Tag: `// Feature: ai-description-generator, Property 4: AI response auto-populates the description field`
  - [ ]* 5.4 Write property tests for overwrite on regenerate — `src/modules/user/__tests__/useGenerateDescription.test.ts`
    - **Property 7: Overwrite on regenerate**
    - **Validates: Requirements 5.6**
    - Use `fc.tuple(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }))` for (existing, new) description pairs; assert field value equals the new string after `generate()` resolves
    - Tag: `// Feature: ai-description-generator, Property 7: Overwrite on regenerate`

- [x] 6. Update `ListProductView` with field reorder, Generate Button, and character counter
  - [x] 6.1 Reorder form fields in `src/modules/user/components/ListProductView.tsx`
    - New top-to-bottom order: Product Name → Category + Price (two-column row) → Condition + Years Used (two-column row) → Description section → Product Images → Contact Details → Open to Negotiation → Submit
    - Ensure the two-column rows use the existing `styles.twoCol` class (responsive, stacks below 768 px)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 6.2 Add Generate Button above the description textarea
    - Add props `isGenerating`, `canGenerate`, `onGenerate`, `isAiEnabled`, `rateLimitedUntil` to `ListProductViewProps`
    - When `isAiEnabled` is `false`, render the button disabled with `title="AI not available"`
    - When `canGenerate` is `false` (and AI is enabled), render the button disabled
    - When `isGenerating` is `true`, render a `<Loader size={16} />` spinner and label "Generating…", keep button disabled
    - When `rateLimitedUntil` is non-null and in the future, keep the button disabled
    - Default label: "Generate using AI"
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.3_
  - [x] 6.3 Add character counter below the description textarea
    - Watch the `description` field value; compute `n = value?.length ?? 0`
    - Render `{n} / 500 characters` below the textarea
    - Apply amber CSS class when `450 ≤ n ≤ 499`; apply red CSS class when `n === 500`
    - Add `maxLength={500}` to the textarea element
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ]* 6.4 Write property tests for character counter — `src/modules/user/__tests__/ListProductView.test.tsx`
    - **Property 8: Character counter displays correct count**
    - **Validates: Requirements 6.1**
    - Use `fc.integer({ min: 0, max: 500 })` to generate lengths; render the component with a description of that length; assert the counter text matches `"{n} / 500 characters"`
    - Tag: `// Feature: ai-description-generator, Property 8: Character counter displays correct count`
  - [ ]* 6.5 Write property tests for character counter colour thresholds — `src/modules/user/__tests__/ListProductView.test.tsx`
    - **Property 9: Character counter colour thresholds**
    - **Validates: Requirements 6.3, 6.4**
    - Use `fc.integer({ min: 0, max: 449 })` for normal range (no colour class), `fc.integer({ min: 450, max: 499 })` for amber, and the fixed value `500` for red; assert correct CSS class presence in each case
    - Tag: `// Feature: ai-description-generator, Property 9: Character counter colour thresholds`
  - [ ]* 6.6 Write property test for Generate Button disabled state — `src/modules/user/__tests__/ListProductView.test.tsx`
    - **Property 6: Generate Button disabled when any context field is empty**
    - **Validates: Requirements 5.2**
    - Use `fc.record` with at least one field set to empty string or zero; render the component; assert the Generate Button has the `disabled` attribute
    - Tag: `// Feature: ai-description-generator, Property 6: Generate Button disabled when any context field is empty`

- [x] 7. Wire up the hook in `ListProductPage` and update CSS
  - [x] 7.1 Update `src/modules/user/pages/ListProductPage.tsx`
    - Read `isAiEnabled` from `process.env.NEXT_PUBLIC_AI_ENABLED === 'true'`
    - Instantiate `useGenerateDescription({ setValue, watch, isAiEnabled })`
    - Pass `isGenerating`, `canGenerate`, `onGenerate: generate`, `isAiEnabled`, `rateLimitedUntil` as new props to `ListProductView`
    - _Requirements: 4.2, 5.3, 5.4, 5.5, 7.3, 8.3_
  - [x] 7.2 Add CSS classes for the Generate Button and character counter to `ListProductView.module.css`
    - Add `.generateBtn` for the Generate Button (positioned above the textarea, consistent with existing button styles)
    - Add `.charCounter` for the default counter colour, `.charCounter--warn` for amber (`450–499`), `.charCounter--error` for red (`500`)
    - _Requirements: 5.1, 6.3, 6.4_

- [ ] 8. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at the backend and frontend boundaries
- Property tests validate universal correctness properties; unit/integration tests cover specific examples and error conditions
- The `rateLimitStore` Map resets on server restart — this is intentional and acceptable for a free-tier single-instance deployment
- `NEXT_PUBLIC_AI_ENABLED` is a build-time flag; toggling it requires a rebuild
