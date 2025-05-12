**Epic R&W 3: Learning Support System (In-Practice Hints & Post-Set Strategies) (SAT-27)**

*   **Goal:** Enhance user learning and strategic thinking in R&W by providing targeted support *during* question answering and deeper strategic insights *after* completing each set, with a bookmarking feature for valuable advice.

**User Story 3.1 (SAT-36):**
*   **Story:** As a user, while I am actively answering an individual R&W practice question within a content set, I can click/tap a "Hint" button or icon associated with that question.
*   **User Journey:**
    1.  User is on the R&W practice screen, focused on a specific question.
    2.  User sees a "Hint" button/icon near the question area.
    3.  User taps/clicks the "Hint" button.
*   **Definition of Done (DoD):**
    *   A "Hint" button/icon is present and functional for each R&W question during practice.
    *   The button is clearly visible and accessible.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I am answering an R&W question, then a "Hint" button/icon is displayed on the screen.
    *   **AC2:** When I tap the "Hint" button, then an action is triggered to display a hint (as per US 3.2).

**User Story 3.2 (SAT-28):**
*   **Story:** As a user, when I request a hint for a question, the app displays one or more relevant strategic tips or thinking prompts designed to guide me towards the correct approach without giving away the answer.
*   **User Journey:**
    1.  User taps the "Hint" button for a question (US 3.1).
    2.  The system identifies relevant hints from the "Hint Bank" based on the current question's type or tags.
    3.  A hint (or a short list of hints) is displayed to the user in a non-intrusive way (e.g., pop-up, expandable section).
*   **Definition of Done (DoD):**
    *   Logic for fetching and displaying hints from the Hint Bank is implemented.
    *   The UI for displaying hints is clear and user-friendly.
    *   Hints displayed are contextually relevant to the question or its general type.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I tap the "Hint" button for an "inference" type question, then a hint related to making inferences (e.g., "Look for clues in the text that suggest an idea not explicitly stated") is displayed.
    *   **AC2:** Then the displayed hint does not reveal the correct answer to the question.
    *   **AC3:** Then I can easily dismiss or close the hint display to return to the question.
    *   **AC4:** If multiple hints are relevant, the system displays them in a manageable way (e.g., one at a time, or a short scrollable list).

**User Story 3.3 (SAT-29):**
*   **Story:** As an app system, I can maintain a "Hint Bank" of reusable R&W strategic tips, with each hint categorized or tagged (e.g., by question type like "main idea," "inference," "vocabulary in context," or by skill like "identifying author's purpose," "eliminating distractors") to allow for contextual retrieval during practice. (The initial content for this Hint Bank will be expertly curated, potentially with AI assistance for generation and tagging).
*   **User Journey (System/Admin Action):**
    1.  (Initial Setup) Hint content is created and input into a database table.
    2.  Each hint is assigned categories or tags.
    3.  (Ongoing) New hints can be added, or existing ones modified/tagged by an admin or through a defined process.
*   **Definition of Done (DoD):**
    *   Database schema for the `HintBank` (storing hint text, categories, tags) is implemented.
    *   A method for populating and managing the Hint Bank content exists (even if initially direct database entry by devs).
    *   A diverse set of initial hints covering common R&W question types and strategies is populated.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given the Hint Bank needs to support "main idea" questions, then there are specific hints stored in the database tagged or categorized as relevant to "main idea" questions.
    *   **AC2:** Then the system can efficiently query the Hint Bank to find hints based on specific tags or categories.
    *   **AC3:** Then the initial Hint Bank contains at least `X` number of distinct, high-quality hints covering at least `Y` common R&W strategies/question types.

**User Story 3.4 (SAT-30):**
*   **Story:** As a user, after submitting my answers for an R&W content set and during the review phase for that set, I can see AI-generated, question-specific strategies or tips for each question, explaining effective methods for approaching that type of question or highlighting common pitfalls to avoid.
*   **User Journey:**
    1.  User has submitted an R&W set and is on the review screen for a specific question (as per US 2.9).
    2.  In addition to the explanation of the correct answer, a distinct section displays AI-generated strategic advice relevant to that specific question or its type.
*   **Definition of Done (DoD):**
    *   The AI generation process (US 1.1) includes creating a strategy tip for each question.
    *   This strategy tip is stored alongside the question (US 1.2).
    *   The review screen UI for individual questions includes a section to display this strategy tip.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I am reviewing a question from a completed set, then an AI-generated strategy tip specific to that question (or its type) is displayed alongside the answer explanation.
    *   **AC2:** Then the strategy tip is distinct from the answer explanation and focuses on *how* to approach such questions or think strategically.
    *   **AC3:** Then the strategy tip is clear, concise, and actionable.

**User Story 3.5 (SAT-31):**
*   **Story:** As a user, during the R&W review phase for a content set, I can click/tap a "Bookmark" icon or button next to any displayed strategy/tip that I find particularly helpful.
*   **User Journey:**
    1.  User is reviewing a question and sees an AI-generated strategy tip (US 3.4).
    2.  User finds the tip useful and taps a "Bookmark" icon next to it.
    3.  The system provides visual feedback that the tip has been bookmarked.
*   **Definition of Done (DoD):**
    *   A "Bookmark" icon/button is present next to each AI-generated strategy tip on the question review screen.
    *   Tapping the bookmark button triggers logic to save the association between the user and the tip.
    *   Visual feedback (e.g., icon changes state) indicates successful bookmarking.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I am reviewing a question and its associated strategy tip, then a "Bookmark" icon/button is visible for that tip.
    *   **AC2:** When I tap the "Bookmark" icon, then the icon visually changes to indicate it's bookmarked (e.g., filled star vs. outline star).
    *   **AC3:** Then this specific strategy tip is associated with my user account as a bookmarked item in the database.
    *   **AC4:** I can tap the bookmark icon again to un-bookmark the tip, and the icon reverts to its original state, and the association is removed.

**User Story 3.6 (SAT-32):**
*   **Story:** As a user, I can access a dedicated "Study Notes Hub" (or "Bookmarked Strategies") section within the app, specifically for my R&W insights.
*   **User Journey:**
    1.  User navigates through the app's main menu or dashboard.
    2.  User finds and taps/clicks on the "Study Notes Hub" (or similarly named) entry.
    3.  The app displays the Study Notes Hub screen.
*   **Definition of Done (DoD):**
    *   A navigation path to the "Study Notes Hub" exists and is discoverable.
    *   The Study Notes Hub screen is implemented.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I am in the app, then I can find a menu item or link labeled "Study Notes Hub" (or "My Bookmarked Strategies").
    *   **AC2:** When I tap/click this item, then I am taken to the Study Notes Hub screen.

**User Story 3.7 (SAT-33):**
*   **Story:** As a user, in the R&W Study Notes Hub, I can view a consolidated list of all the R&W strategies and tips I have previously bookmarked.
*   **User Journey:**
    1.  User is on the Study Notes Hub screen.
    2.  The screen displays a list of all strategy tips they have bookmarked from R&W practice reviews.
    3.  Each item in the list shows the content of the bookmarked tip.
*   **Definition of Done (DoD):**
    *   The Study Notes Hub screen fetches and displays all bookmarked R&W tips for the logged-in user.
    *   The list is presented in a clear and readable format.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I have previously bookmarked 3 R&W strategy tips, when I open the Study Notes Hub, then those 3 tips are displayed in a list.
    *   **AC2:** Then the full text of each bookmarked tip is visible or easily expandable.
    *   **AC3:** If I have no bookmarked tips, then an appropriate empty state message is displayed.
    *   **AC4:** The list is ordered, perhaps by most recently bookmarked or by question type (if that data is stored with the bookmark).

**User Story 3.8 (SAT-34):**
*   **Story:** As a user, I can easily read and review my bookmarked strategies in the Study Notes Hub to reinforce my learning.
*   **User Journey:**
    1.  User is in the Study Notes Hub, viewing their list of bookmarked tips.
    2.  User can scroll through the list if it's long.
    3.  User can tap on a tip to potentially see more context if needed (though initially, just displaying the tip text might be enough).
*   **Definition of Done (DoD):**
    *   The display of bookmarked tips is optimized for readability.
    *   Users can comfortably browse their collection of notes.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I am in the Study Notes Hub, then the text of my bookmarked tips is clearly legible.
    *   **AC2:** If I have many bookmarked tips, then I can scroll through the list.

**User Story 3.9 (SAT-35):**
*   **Story:** As a user, I can remove (un-bookmark) items from my R&W Study Notes Hub if I no longer find them necessary.
*   **User Journey:**
    1.  User is in the Study Notes Hub.
    2.  User identifies a bookmarked tip they wish to remove.
    3.  User taps an "un-bookmark" or "delete" icon associated with that specific tip.
    4.  The tip is removed from the list, and the change is persisted.
*   **Definition of Done (DoD):**
    *   Each bookmarked tip in the Study Notes Hub has a clear control (e.g., icon) to un-bookmark/remove it.
    *   Removing a tip updates the displayed list immediately.
    *   The un-bookmark action is saved to the database.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I am viewing a bookmarked tip in the Study Notes Hub, then an "un-bookmark" or "delete" icon/button is visible for that tip.
    *   **AC2:** When I tap the "un-bookmark" icon for a tip, then that tip is immediately removed from my displayed list in the Study Notes Hub.
    *   **AC3:** Then that tip is no longer associated with my account as a bookmarked item in the database.
    *   **AC4:** The corresponding "Bookmark" icon on the original question review screen (if I revisit that question) would also reflect that it's no longer bookmarked by me.