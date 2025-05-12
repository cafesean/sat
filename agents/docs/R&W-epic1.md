**Reading & Writing (R&W) Module: Epics & Detailed User Stories**

---

**Epic R&W 1: Content Pool & AI Management for R&W (SAT-1)**

*   **Goal:** Establish and maintain a rich, reusable bank of AI-generated R&W passages and questions categorized by varying difficulty levels to support continuous adaptation.

**User Story 1.1 (SAT-2):**
*   **Story:** As an app system, I can use the Gemini API to generate batches of SAT-style R&W content sets (each set comprising a passage, typically 5-10 associated questions, options, correct answer, explanation, and a review-phase strategy tip for each question).
*   **User Journey (System Action):**
    1.  A trigger occurs (e.g., manual initiation for initial seeding, or low content threshold detected for a specific difficulty).
    2.  The system determines the parameters for the content generation request (e.g., difficulty level, number of sets needed).
    3.  The system constructs and sends a request to the Gemini API, including prompts designed to elicit the required content structure.
    4.  The system receives the structured response from the Gemini API.
    5.  The system validates the structure and basic integrity of the received content.
*   **Definition of Done (DoD):**
    *   Code for interfacing with the Gemini API for R&W content generation is implemented and unit-tested.
    *   Prompts for Gemini API are defined and version-controlled.
    *   The structure of the expected API response is defined and validated.
    *   Error handling for API communication (e.g., timeouts, invalid responses, rate limits) is implemented.
    *   Logging for the generation process (requests, successes, failures) is in place.
    *   Generated content can be successfully parsed into the application's internal data models.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given a request for `N` content sets at `Difficulty X`, when the generation process is triggered, then the Gemini API is called with parameters accurately reflecting `N` and `Difficulty X`.
    *   **AC2:** Then each successfully generated content set must contain exactly one passage.
    *   **AC3:** Then each passage must be accompanied by 5 to 10 unique multiple-choice questions.
    *   **AC4:** Then each question must have one clearly marked correct answer and at least three plausible distractor options.
    *   **AC5:** Then each question must have an associated explanation detailing why the correct answer is correct.
    *   **AC6:** Then each question must have an associated AI-generated strategy tip suitable for display during post-set review.
    *   **AC7:** Then the system can successfully parse the Gemini API response into a structured format matching the application's data model for passages, questions, answers, explanations, and strategy tips.
    *   **AC8:** If the Gemini API returns an error or malformed data, the system logs the error and does not attempt to process the invalid data further for that specific request.

**User Story 1.2 (SAT-3):**
*   **Story:** As an app system, I can store these generated R&W content sets in a central pool.
*   **User Journey (System Action):**
    1.  Valid content sets are received from the Gemini API (as per US 1.1).
    2.  The system prepares the content sets for database insertion.
    3.  The system inserts the passages, questions, answer options, correct answer indicators, explanations, and strategy tips into the respective database tables.
*   **Definition of Done (DoD):**
    *   Database schema for storing R&W passages, questions (with options, correct answer, explanation, strategy tip) is finalized and migrated.
    *   Logic for transforming parsed AI content into database entities is implemented.
    *   Successful insertion of complete content sets into the database is verified.
    *   Data integrity (e.g., relationships between passage and its questions) is maintained.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given a successfully parsed batch of R&W content sets from the AI, when the storage process is initiated, then all passages are saved to the `Passages` table.
    *   **AC2:** Then all questions associated with each passage are saved to the `Questions` table, correctly linked to their parent passage.
    *   **AC3:** Then all answer options for each question are stored, with one option clearly marked as the correct answer.
    *   **AC4:** Then the explanation for the correct answer for each question is stored and linked to the question.
    *   **AC5:** Then the AI-generated strategy tip for each question is stored and linked to the question.
    *   **AC6:** Then no data from the AI generation is lost or corrupted during the storage process.

**User Story 1.3 (SAT-4):**
*   **Story:** As an app system, I can categorize each content set in the pool by a granular difficulty level (e.g., Level 1 through Level 5, or potentially more fine-grained).
*   **User Journey (System Action):**
    1.  During or after AI generation (US 1.1), the target difficulty level for the generated content is known.
    2.  When storing the content set (US 1.2), the system assigns this difficulty level tag/category to the passage and/or its associated questions.
*   **Definition of Done (DoD):**
    *   The `Passages` table (or a linking table for sets) includes a field to store the difficulty level.
    *   The content generation request to Gemini specifies the target difficulty.
    *   The storage mechanism correctly assigns the specified difficulty level to the content set.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given a content set generated for 'Level 3' difficulty, when the set is stored in the database, then the passage (or the set identifier) is tagged with 'Level 3'.
    *   **AC2:** Then the system can later retrieve content sets specifically by their assigned difficulty level.
    *   **AC3:** Then the difficulty level assigned is consistent with the difficulty requested during generation.

**User Story 1.4 (SAT-5):**
*   **Story:** As an app system, I can monitor the inventory of available R&W content sets for each difficulty level to understand content availability.
*   **User Journey (System Action):**
    1.  The system periodically (or on demand) queries the database.
    2.  The query counts the number of available (e.g., unused or generally available) content sets for each defined difficulty level.
    3.  The system makes this inventory count accessible (e.g., to an admin dashboard or an automated replenishment trigger).
*   **Definition of Done (DoD):**
    *   A mechanism (e.g., a script, an API endpoint) to query and report the count of content sets per difficulty level is implemented.
    *   The definition of "available" content for inventory purposes is clear (e.g., truly unused, or allowing for some reuse).
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given there are 50 content sets tagged 'Level 2' and 30 content sets tagged 'Level 4' in the database, when the inventory monitoring is performed, then the system accurately reports 50 for 'Level 2' and 30 for 'Level 4'.
    *   **AC2:** Then the monitoring can distinguish between different difficulty levels correctly.

**User Story 1.5 (SAT-11):**
*   **Story:** As an app system, when the inventory for a specific R&W difficulty level is deemed low (e.g., below a set threshold of unused sets), I can automatically trigger the Gemini API to generate a new batch of content sets specifically for that difficulty level.
*   **User Journey (System Action):**
    1.  The inventory monitoring system (US 1.4) reports that a difficulty level (e.g., 'Level 3') has fallen below its defined minimum threshold of available content sets.
    2.  The system automatically initiates the AI content generation process (as per US 1.1) specifically for 'Level 3', requesting a predefined number of new sets.
*   **Definition of Done (DoD):**
    *   Configurable thresholds for "low inventory" per difficulty level are defined.
    *   An automated process is implemented that links the inventory monitoring output to the content generation trigger.
    *   The trigger correctly passes the required difficulty level and batch size to the generation service.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given the threshold for 'Level 3' is 10 sets and the current inventory is 8 sets, when the automated check runs, then the content generation process (US 1.1) is triggered for 'Level 3'.
    *   **AC2:** Then the generation request specifies 'Level 3' and requests a predefined number of new sets (e.g., 20 new sets).
    *   **AC3:** If all difficulty levels are above their thresholds, then no generation process is triggered.

**User Story 1.6 (SAT-9):**
*   **Story:** As an app system, I can ensure that newly generated R&W content sets align with SAT standards and the specified difficulty requirements for the pool they are intended for.
*   **User Journey (System Action):**
    1.  This is primarily ensured through careful prompt engineering for the Gemini API calls (part of US 1.1).
    2.  (Optional, advanced) The system might have a validation step post-generation, using heuristics or another AI model, to check basic alignment, though this is likely out of scope for an early version. For now, reliance is on prompt quality.
*   **Definition of Done (DoD):**
    *   Gemini API prompts are specifically designed to request content that is SAT-like in style, tone, and complexity for the target difficulty.
    *   A review process for sample AI-generated content is established initially to refine prompts.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given prompts engineered for 'Level 4' difficulty SAT R&W passages, when content is generated, then a manual review of a sample of the generated passages and questions confirms they are generally appropriate for that level and SAT style.
    *   **AC2:** Then generated questions test skills commonly assessed on the SAT R&W section (e.g., main idea, inference, vocabulary in context, evidence support).

**User Story 1.7 (SAT-10):**
*   **Story:** As an app system, I can track which content sets have been presented to individual users to prioritize fresh content when possible.
*   **User Journey (System Action):**
    1.  When a content set is selected for a user's practice session, the system records this event (user ID, content set ID, timestamp).
    2.  When selecting the next content set for that user, the system can use this history to deprioritize recently seen sets for that specific user.
*   **Definition of Done (DoD):**
    *   Database schema to log user-content set interactions (`UserPracticeSetHistory` or similar) is implemented.
    *   The content selection logic for practice sessions incorporates this history.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given a user has recently completed `ContentSetA` of `Difficulty X`, when the user requests another set of `Difficulty X`, then the system attempts to provide a different set (e.g., `ContentSetB`) from `Difficulty X` if available.
    *   **AC2:** Then the `UserPracticeSetHistory` table is updated with an entry indicating the user has been presented with the selected content set.
    *   **AC3:** If all available sets at a given difficulty have been seen by the user, the system can still re-serve a previously seen set (e.g., the least recently seen).
