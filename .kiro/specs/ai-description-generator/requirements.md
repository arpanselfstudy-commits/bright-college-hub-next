# Requirements Document

## Introduction

This feature adds AI-powered description generation to the "List a Product" page in the Bright College Hub Next.js marketplace. A seller fills in the product name, category, price, condition, and years used, then clicks "Generate using AI" to receive a 2–3 sentence, polite product description that is auto-populated into the description textarea. The AI call is made exclusively through a Next.js API route (backend) to keep the API key secure. The feature also reorders the form fields into a more logical seller flow and introduces optional UX enhancements such as a character counter and a "regenerate" affordance.

## Glossary

- **AI_Description_Generator**: The Next.js API route (`POST /api/ai/generate-description`) that receives product context and returns a generated description string.
- **Gemini_API**: Google's Generative Language API (free tier, `gemini-1.5-flash` model) used as the AI provider.
- **List_Product_Form**: The client-side React form rendered by `ListProductView` that a seller uses to create a new marketplace listing.
- **Description_Field**: The `<textarea>` bound to the `description` field of `ListProductForm`.
- **Generate_Button**: The "Generate using AI" button rendered adjacent to the Description_Field.
- **Context_Fields**: The set of already-filled form fields used to build the AI prompt — Product Name, Category, Price, Condition, and Years Used.
- **Seller**: An authenticated user with role `USER` who is creating a product listing.
- **API_Key**: The `GEMINI_API_KEY` environment variable stored server-side and never exposed to the client.

---

## Requirements

### Requirement 1: Form Field Reordering

**User Story:** As a Seller, I want the listing form fields arranged in a logical top-to-bottom order, so that I can fill in the most important details first before writing a description.

#### Acceptance Criteria

1. THE List_Product_Form SHALL render fields in the following order from top to bottom: Product Name, Category, Price, Condition, Years Used, Description (with Generate_Button), Product Images, Contact Details (Phone Number, Email Address), Open to Negotiation checkbox, Submit button.
2. WHEN the List_Product_Form is rendered on a viewport narrower than 768 px, THE List_Product_Form SHALL stack all fields in a single column in the same top-to-bottom order.
3. THE List_Product_Form SHALL display Category and Price side-by-side in a two-column row on viewports 768 px wide or wider.
4. THE List_Product_Form SHALL display Condition and Years Used side-by-side in a two-column row on viewports 768 px wide or wider.

---

### Requirement 2: Secure Backend AI Route

**User Story:** As a developer, I want the Gemini API call to happen exclusively on the server, so that the API key is never exposed in client-side code or network responses.

#### Acceptance Criteria

1. THE AI_Description_Generator SHALL be implemented as a Next.js API route at `POST /api/ai/generate-description`.
2. THE AI_Description_Generator SHALL read the `GEMINI_API_KEY` exclusively from server-side environment variables and SHALL NOT include the key in any HTTP response.
3. WHEN a request arrives at `POST /api/ai/generate-description` without a valid authenticated session, THE AI_Description_Generator SHALL return HTTP 401 with error code `UNAUTHORIZED`.
4. WHEN a request body is missing one or more required Context_Fields (productName, category, price, condition, yearUsed), THE AI_Description_Generator SHALL return HTTP 400 with error code `VALIDATION_ERROR` and a message listing the missing fields.
5. THE AI_Description_Generator SHALL validate the incoming request body using a Zod schema before forwarding any data to the Gemini_API.

---

### Requirement 3: AI Prompt Construction

**User Story:** As a Seller, I want the AI to use the details I have already entered, so that the generated description is relevant to my specific product.

#### Acceptance Criteria

1. WHEN the AI_Description_Generator builds the prompt, THE AI_Description_Generator SHALL include all five Context_Fields: productName, category, price, condition, and yearUsed.
2. THE AI_Description_Generator SHALL instruct the Gemini_API to produce a description that is 2–3 sentences long, written in a polite and friendly tone suitable for a college student marketplace.
3. THE AI_Description_Generator SHALL instruct the Gemini_API to avoid including the price in the generated description text.
4. THE AI_Description_Generator SHALL instruct the Gemini_API to return plain text only, with no markdown formatting, bullet points, or headings.

---

### Requirement 4: AI Description Response Handling

**User Story:** As a Seller, I want the generated description to appear automatically in the description box, so that I do not have to copy and paste it manually.

#### Acceptance Criteria

1. WHEN the Gemini_API returns a successful response, THE AI_Description_Generator SHALL return HTTP 200 with a JSON body containing a single `description` string field.
2. WHEN the client receives a successful response from `POST /api/ai/generate-description`, THE List_Product_Form SHALL set the value of the Description_Field to the returned `description` string.
3. WHEN the Description_Field is auto-populated by the AI response, THE List_Product_Form SHALL mark the `description` field as dirty so that react-hook-form validation re-evaluates it.
4. IF the Gemini_API returns an error or times out, THEN THE AI_Description_Generator SHALL return HTTP 502 with error code `AI_SERVICE_ERROR` and a human-readable message.
5. IF the Gemini_API returns an empty or whitespace-only string, THEN THE AI_Description_Generator SHALL return HTTP 502 with error code `AI_EMPTY_RESPONSE`.

---

### Requirement 5: Generate Button UX

**User Story:** As a Seller, I want clear feedback while the description is being generated, so that I know the system is working and do not submit the form prematurely.

#### Acceptance Criteria

1. THE List_Product_Form SHALL render the Generate_Button directly below the Description_Field label and above the textarea.
2. WHEN one or more Context_Fields (productName, category, price, condition, yearUsed) are empty or invalid, THE Generate_Button SHALL be disabled.
3. WHEN the Generate_Button is clicked and the AI request is in-flight, THE Generate_Button SHALL display a loading spinner and the label "Generating…" and SHALL be disabled until the request completes or fails.
4. WHEN the AI request completes successfully, THE Generate_Button SHALL return to its default enabled state with the label "Generate using AI".
5. IF the AI request fails, THEN THE List_Product_Form SHALL display a non-blocking toast notification with the error message, and THE Generate_Button SHALL return to its default enabled state.
6. WHEN the Description_Field already contains text and the Seller clicks the Generate_Button, THE List_Product_Form SHALL overwrite the existing description with the new AI-generated text.

---

### Requirement 6: Character Counter for Description Field

**User Story:** As a Seller, I want to see how many characters I have typed in the description, so that I can write a concise and complete listing.

#### Acceptance Criteria

1. THE List_Product_Form SHALL display a live character count below the Description_Field in the format `{n} / 500 characters`.
2. WHEN the character count reaches 500, THE Description_Field SHALL prevent additional input beyond 500 characters.
3. WHEN the character count is between 450 and 499, THE List_Product_Form SHALL render the character count in an amber/warning colour.
4. WHEN the character count reaches 500, THE List_Product_Form SHALL render the character count in a red/error colour.

---

### Requirement 7: Environment Configuration

**User Story:** As a developer, I want the AI API key managed through environment variables, so that secrets are never committed to source control.

#### Acceptance Criteria

1. THE AI_Description_Generator SHALL require a `GEMINI_API_KEY` environment variable to be set at runtime.
2. IF `GEMINI_API_KEY` is absent or empty at request time, THEN THE AI_Description_Generator SHALL return HTTP 503 with error code `AI_NOT_CONFIGURED` and the message "AI description generation is not configured."
3. THE List_Product_Form SHALL remain fully functional for manual description entry when `GEMINI_API_KEY` is not configured, with the Generate_Button hidden or disabled with a tooltip "AI not available".
4. THE project README or `.env.example` file SHALL document the `GEMINI_API_KEY` variable name and where to obtain a free-tier key.

---

### Requirement 8: Rate Limiting and Abuse Prevention

**User Story:** As a developer, I want to limit how often a single user can call the AI generation endpoint, so that the free-tier quota is not exhausted by a single bad actor.

#### Acceptance Criteria

1. THE AI_Description_Generator SHALL allow a maximum of 10 AI generation requests per authenticated user per hour.
2. WHEN a Seller exceeds the per-hour limit, THE AI_Description_Generator SHALL return HTTP 429 with error code `RATE_LIMIT_EXCEEDED` and a message indicating when the limit resets.
3. WHEN the client receives HTTP 429, THE List_Product_Form SHALL display a toast notification with the rate-limit message and SHALL disable the Generate_Button for the remainder of the current hour.
