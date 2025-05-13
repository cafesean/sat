**Epic R&W 1: Content Pool & AI Management for R&W**

*   **Goal:** Establish and maintain a rich, reusable bank of AI-generated R&W passages and questions categorized by varying difficulty levels to support continuous adaptation.

---

**User Story 1.1:** As an app system, I can use the Gemini API to generate batches of SAT-style R&W content sets (each set comprising a passage, typically 5-10 associated questions, options, correct answer, explanation, and a review-phase strategy tip for each question).

*   **Technical Stories:**
    1.  **TS1.1.1: Define R&W Content Set Structure & Schemas**
        *   **Description:** Define and implement Zod schemas for the expected input to and output from the Gemini API for generating a complete R&W content set. This includes the passage, an array of questions, and for each question: options, correct answer index/text, explanation, and the AI-generated strategy tip for post-review.
        *   **Affected Components:** `src/schemas/readingWriting.schema.ts` (new schemas or modifications).
        *   **Notes:** Ensure the schema aligns with what will be stored in the database.
    2.  **TS1.1.2: Develop Gemini Prompts for R&W Content Set Generation**
        *   **Description:** Design, implement, and version-control sophisticated prompts for the Gemini API to generate high-quality, SAT-style R&W content sets (passage, questions, options, correct answer, explanation, strategy tip) based on a given difficulty level and desired number of questions per passage.
        *   **Affected Components:** Internal documentation, possibly helper functions in `src/lib/api/gemini.ts` to construct prompts.
        *   **Notes:** Prompts need to instruct the AI on structure, tone, SAT-style, question types, and inclusion of all required fields. Iterative refinement will be needed.
    3.  **TS1.1.3: Implement Gemini API Client Function for R&W Content Generation**
        *   **Description:** Create or enhance a function within `src/lib/api/gemini.ts` (e.g., `generateRwContentSets(difficultyLevel: number, numberOfSets: number): Promise<ContentSet[]>`) that takes difficulty and quantity as input, constructs the appropriate prompts, calls the Gemini API, handles potential API errors (retries, specific error types), and parses the structured JSON response according to the defined Zod schema.
        *   **Affected Components:** `src/lib/api/gemini.ts`.
        *   **Notes:** Manage API key securely via `env.mjs`. Implement robust error handling and logging for API interactions.
    4.  **TS1.1.4 (Admin/System): Create tRPC Mutation to Trigger R&W Content Generation**
        *   **Description:** Implement a new tRPC mutation (e.g., `adminReadingWriting.generateAndStoreContentSets`) that can be called (e.g., by an admin or an automated process) to initiate the generation of R&W content sets for a specific difficulty level and quantity. This mutation will call the Gemini API client function (TS1.1.3).
        *   **Affected Components:** `src/server/api/routers/admin.ts` (or a new `readingWritingAdmin.ts`), `src/lib/api/gemini.ts`.
        *   **Notes:** This endpoint should be protected and only accessible by authorized processes/users. It will orchestrate generation and subsequent storage (covered in US 1.2).

---

**User Story 1.2:** As an app system, I can store these generated R&W content sets in a central pool.

*   **Technical Stories:**
    1.  **TS1.2.1: Enhance Prisma Schema for R&W Content**
        *   **Description:** Review and update the `Passage` and `Question` models in `prisma/schema.prisma`. Ensure `Passage` stores passage text and is linked to its questions. Ensure `Question` stores its text, options (string array), correct answer (e.g., index or specific text), AI-generated explanation, and the new AI-generated strategy tip. Add a `difficultyLevel` field to `Passage` (or a new `ContentSet` model if preferred for grouping a passage and its questions as one unit with a shared difficulty).
        *   **Affected Components:** `prisma/schema.prisma`.
        *   **Notes:** Run `pnpm prisma migrate dev --name update-rw-content-models` after changes.
    2.  **TS1.2.2: Implement Service for Storing R&W Content Sets**
        *   **Description:** Create a service function (e.g., in `src/server/services/readingWritingService.ts`) that takes the parsed and validated array of R&W content sets (from TS1.1.3 output) and saves them to the PostgreSQL database using Prisma Client. This includes creating `Passage` records and their associated `Question` records (with options, answer, explanation, strategy tip) in a transactional manner to ensure data integrity.
        *   **Affected Components:** New file `src/server/services/readingWritingService.ts`, `src/lib/db/prisma.ts`.
        *   **Notes:** Ensure relationships between passage and questions are correctly established.
    3.  **TS1.2.3: Integrate Content Storage into Generation tRPC Mutation**
        *   **Description:** Modify the tRPC mutation from TS1.1.4 (`adminReadingWriting.generateAndStoreContentSets`) to call the content storage service (TS1.2.2) after successfully generating content from the Gemini API.
        *   **Affected Components:** `src/server/api/routers/admin.ts` (or `readingWritingAdmin.ts`), `src/server/services/readingWritingService.ts`.

---

**User Story 1.3:** As an app system, I can categorize each content set in the pool by a granular difficulty level (e.g., Level 1 through Level 5, or potentially more fine-grained).

*   **Technical Stories:**
    1.  **TS1.3.1: Ensure Difficulty Level Parameterization in Generation and Storage**
        *   **Description:** Verify that the Gemini API generation function (TS1.1.3) accepts `difficultyLevel` as a parameter and that this difficulty is passed correctly to the prompt. Ensure the Prisma model for `Passage` (or `ContentSet`) has a `difficultyLevel: Int` field (covered in TS1.2.1) and that the content storage service (TS1.2.2) correctly populates this field when saving generated content.
        *   **Affected Components:** `src/lib/api/gemini.ts`, `prisma/schema.prisma`, `src/server/services/readingWritingService.ts`.
        *   **Notes:** This is largely an integration and verification task of previous technical stories.

---

**User Story 1.4:** As an app system, I can monitor the inventory of available R&W content sets for each difficulty level to understand content availability.

*   **Technical Stories:**
    1.  **TS1.4.1 (Admin/System): Create tRPC Query for R&W Content Inventory**
        *   **Description:** Implement a new tRPC query (e.g., `adminReadingWriting.getContentSetInventory`) that queries the database (e.g., `Passage` table) using Prisma Client to count the number of available content sets, grouped by `difficultyLevel`.
        *   **Affected Components:** `src/server/api/routers/admin.ts` (or `readingWritingAdmin.ts`), `src/lib/db/prisma.ts`.
        *   **Notes:** Define what "available" means (e.g., not soft-deleted or disabled). This might be a simple count initially.
    2.  **(Optional) TS1.4.2: Develop Admin Interface for Inventory Viewing**
        *   **Description:** Create a simple admin page/section where authorized users can view the content set inventory per difficulty level by calling the tRPC query from TS1.4.1.
        *   **Affected Components:** New admin page in `src/app/admin/reading-writing/inventory/page.tsx` (example path).

---

**User Story 1.5:** As an app system, when the inventory for a specific R&W difficulty level is deemed low (e.g., below a set threshold of unused sets), I can automatically trigger the Gemini API to generate a new batch of content sets specifically for that difficulty level.

*   **Technical Stories:**
    1.  **TS1.5.1: Define Configuration for Replenishment Thresholds and Batch Sizes**
        *   **Description:** Establish a way to configure minimum inventory thresholds and default batch generation sizes per difficulty level (e.g., via environment variables in `.env` validated by `src/env.mjs`, or a simple database configuration table).
        *   **Affected Components:** `.env`, `src/env.mjs`, potentially a new config service.
    2.  **TS1.5.2: Implement Automated Replenishment Logic (e.g., Cron Job)**
        *   **Description:** Develop a scheduled task (e.g., using Vercel Cron Jobs or a similar serverless scheduler) that periodically:
            *   Calls the `adminReadingWriting.getContentSetInventory` tRPC query (TS1.4.1).
            *   Compares current inventory against configured thresholds (TS1.5.1).
            *   If inventory is low for any difficulty level, calls the `adminReadingWriting.generateAndStoreContentSets` tRPC mutation (TS1.1.4/TS1.2.3) with the appropriate difficulty and batch size.
        *   **Affected Components:** New serverless function for the cron job, existing tRPC procedures.
        *   **Notes:** Ensure idempotency and robust error handling/logging for this automated process.

---

**User Story 1.6:** As an app system, I can ensure that newly generated R&W content sets align with SAT standards and the specified difficulty requirements for the pool they are intended for.

*   **Technical Stories:**
    1.  **TS1.6.1: Refine and Test Gemini Prompts for Quality and Alignment**
        *   **Description:** This is an ongoing task related to TS1.1.2. Continuously review sample outputs from the Gemini API and refine the prompts to improve the alignment of generated content with SAT standards (style, question types, passage complexity) and the intended difficulty level.
        *   **Affected Components:** Internal documentation, prompt construction logic in `src/lib/api/gemini.ts`.
        *   **Notes:** Establish a qualitative review process for a sample of generated content, especially early on.
    2.  **(Optional - Future) TS1.6.2: Implement Basic Post-Generation Validation Heuristics**
        *   **Description:** Develop simple server-side checks on generated content, e.g., verify number of questions per passage, presence of all required fields (explanation, strategy tip), option counts. This is not full semantic validation but a structural check.
        *   **Affected Components:** `src/server/services/readingWritingService.ts` or within the generation tRPC mutation.

---

**User Story 1.7:** As an app system, I can track which content sets have been presented to individual users to prioritize fresh content when possible.

*   **Technical Stories:**
    1.  **TS1.7.1: Update Prisma Schema for User-Content Set Interaction Logging**
        *   **Description:** Create a new model in `prisma/schema.prisma`, e.g., `UserAttemptedContentSet`, with fields like `id`, `userId` (linking to `User`), `passageId` (linking to `Passage`, assuming one passage per set), `attemptedAt` (DateTime).
        *   **Affected Components:** `prisma/schema.prisma`.
        *   **Notes:** Run `pnpm prisma migrate dev --name add-user-attempted-rw-set`.
    2.  **TS1.7.2: Implement Logging of Attempted Content Sets**
        *   **Description:** When a specific R&W content set (passage) is served to a user for a practice session (part of Epic R&W 2 logic), create a new record in the `UserAttemptedContentSet` table.
        *   **Affected Components:** The tRPC procedure responsible for initiating/serving an R&W practice set (to be defined in Epic R&W 2).
        *   **Notes:** This logging should occur when the set is *presented*, not necessarily upon completion.