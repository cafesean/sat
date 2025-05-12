**Epic R&W 2: Continuously Adaptive Practice & Immediate Feedback (SAT-12)**

*   **Goal:** Provide a seamless and continuously adaptive R&W practice experience where question difficulty adjusts based on user performance after each small set, with immediate feedback and learning opportunities.

**User Story 2.1 (SAT-13):**
*   **Story:** As a user, I can start a new Reading & Writing practice session with a single action (e.g., tapping a "Start R&W Practice" button from the R&W module's main screen).
*   **User Journey:**
    1.  User navigates to the Reading & Writing module section of the app.
    2.  User sees and taps/clicks the "Start R&W Practice" button.
    3.  The app transitions to the practice interface, loading the first content set.
*   **Definition of Done (DoD):**
    *   A clear "Start R&W Practice" button/CTA is present on the R&W module's main screen.
    *   Tapping the button initiates the R&W practice session flow.
    *   The UI transitions smoothly to the practice screen.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I am on the R&W module main screen, when I tap the "Start R&W Practice" button, then a new R&W practice session begins.
    *   **AC2:** Then the first content set is loaded and displayed (as per US 2.2).

**User Story 2.2 (SAT-14):**
*   **Story:** As a user, when I begin an R&W practice session, the app presents me with an initial content set (passage and its ~5-10 questions) at a baseline difficulty level (e.g., medium, or based on my historical performance if available).
*   **User Journey:**
    1.  User initiates an R&W practice session (US 2.1).
    2.  The system selects an appropriate initial content set from the pool (e.g., a 'Level 3' set if that's the baseline, or a level based on prior user performance).
    3.  The passage and the first question of that set are displayed to the user.
*   **Definition of Done (DoD):**
    *   Logic for selecting an initial baseline difficulty level is implemented.
    *   The system correctly retrieves a content set from the pool corresponding to this baseline difficulty.
    *   The UI correctly renders the passage and the first question.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given a new user starts an R&W practice session, when the session loads, then a content set from a predefined baseline difficulty (e.g., 'Level 3') is displayed.
    *   **AC2:** (If historical performance is used) Given a user has consistently performed at 'Level 4', when they start a new session, then the initial content set is from 'Level 4' or a slightly adjusted level.
    *   **AC3:** Then the displayed content includes one passage and its associated questions (typically 5-10).
    *   **AC4:** Then the system marks this content set as "in progress" for the user.

**User Story 2.3 (SAT-15):**
*   **Story:** As a user, I can clearly see an indication of the difficulty level (e.g., "Level 3") of the current R&W content set I am working on.
*   **User Journey:**
    1.  User is actively working on an R&W content set.
    2.  A visual indicator of the current set's difficulty level is persistently displayed on the practice screen.
*   **Definition of Done (DoD):**
    *   The UI for the R&W practice screen includes an element to display the difficulty level.
    *   This element is updated correctly when a new content set of a different difficulty is loaded.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I am practicing an R&W set that was pulled from the 'Level 3' difficulty pool, when I am on the practice screen, then "Level 3" (or a similar indicator) is visibly displayed.
    *   **AC2:** If the next set loaded is 'Level 4', then the indicator updates to "Level 4".

**User Story 2.4 (SAT-16):**
*   **Story:** As a user, during an R&W practice set, I can read the provided passage(s).
*   **User Journey:**
    1.  An R&W content set is loaded.
    2.  The passage text is displayed in a readable format.
    3.  If the passage is long, scrolling is available.
*   **Definition of Done (DoD):**
    *   Passage text is rendered clearly and legibly.
    *   Appropriate formatting (paragraphs, etc.) from the source content is maintained.
    *   Users can scroll through longer passages if necessary.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given a passage is part of the current content set, when the set loads, then the full text of the passage is displayed.
    *   **AC2:** Then the text is easy to read (font, size, contrast).
    *   **AC3:** Then I can scroll vertically if the passage exceeds the viewable area.

**User Story 2.5 (SAT-17):**
*   **Story:** As a user, during an R&W practice set, I can select an answer for each multiple-choice question associated with the passage.
*   **User Journey:**
    1.  A question and its multiple-choice options are displayed.
    2.  User taps/clicks on one of the answer options.
    3.  The selected option is visually indicated.
    4.  User can change their selected answer before submitting the set.
    5.  User navigates between questions within the current set (e.g., "Next Question," "Previous Question" buttons for the current set).
*   **Definition of Done (DoD):**
    *   Questions and their respective multiple-choice options are displayed clearly.
    *   A mechanism for answer selection (e.g., radio buttons, tappable areas) is implemented.
    *   Visual feedback is provided for the selected answer.
    *   The user's selection for each question in the set is stored locally until submission.
    *   Navigation controls for moving between questions within the current set are functional.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given a multiple-choice question with options A, B, C, D, when I tap on option B, then option B is visually highlighted as my selected answer.
    *   **AC2:** If I then tap on option C, then option B is de-highlighted, and option C is highlighted as my new selected answer.
    *   **AC3:** My selected answers for all questions in the current set are retained as I navigate between them before submitting the set.
    *   **AC4:** I can navigate to the next and previous questions within the current set.

**User Story 2.6 (SAT-18):**
*   **Story:** As a user, after I have answered all questions in the current content set, I can submit my answers for that specific set.
*   **User Journey:**
    1.  User has selected answers for all questions in the active content set.
    2.  User finds and taps/clicks a "Submit Set" or "Finish Set" button.
    3.  The app processes the submission.
*   **Definition of Done (DoD):**
    *   A clear "Submit Set" button is available once all questions in the set have been addressed (or it's always available, prompting for unanswered questions).
    *   Submitting the set triggers the scoring and feedback display process.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I have answered all questions in the current R&W set, when I tap the "Submit Set" button, then my answers for that set are recorded.
    *   **AC2:** Then the app proceeds to the results/review screen for that set.
    *   **AC3 (Optional):** If I attempt to submit a set with unanswered questions, the app may prompt me to confirm or complete them.

**User Story 2.7 (SAT-19):**
*   **Story:** As a user, immediately after submitting a content set, I can view my score for that particular set (e.g., "You got 3 out of 5 correct!").
*   **User Journey:**
    1.  User submits an R&W content set (US 2.6).
    2.  The app immediately calculates and displays the score for that set on the review screen.
*   **Definition of Done (DoD):**
    *   Scoring logic that compares user answers to correct answers is implemented.
    *   The score is displayed prominently on the set review screen.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I submitted a set with 5 questions and answered 3 correctly, when the review screen loads, then my score is displayed as "3/5 correct" (or similar).
    *   **AC2:** The score calculation is accurate.

**User Story 2.8 (SAT-20):**
*   **Story:** As a user, immediately after submitting a content set, I can review each question within that set.
*   **User Journey:**
    1.  User is on the set review screen after submitting.
    2.  User can navigate through each question of the just-completed set.
*   **Definition of Done (DoD):**
    *   The set review screen allows navigation to each question from the submitted set.
    *   For each question, relevant information (question text, options, user's answer, correct answer, explanation) is displayed.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I am on the set review screen, then I can see the first question of the set along with its details.
    *   **AC2:** Then I can navigate to see the second question, third, and so on, until the end of the set.

**User Story 2.9 (SAT-26):**
*   **Story:** As a user, when reviewing a question from a completed set, I can see: the question and the passage it pertains to; my chosen answer; a clear indication of whether my answer was correct or incorrect; the correct answer; and a detailed, AI-generated explanation for why the correct answer is right.
*   **User Journey:**
    1.  User navigates to a specific question on the set review screen.
    2.  All the listed components (passage snippet if needed, question, user's answer, correctness, correct answer, explanation) are clearly displayed for that question.
*   **Definition of Done (DoD):**
    *   The UI for displaying individual question reviews is implemented.
    *   All specified data points are correctly fetched and rendered.
    *   Correct/incorrect answers are visually distinct.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I am reviewing a question I answered, then the question text is displayed.
    *   **AC2:** Then the relevant passage (or a snippet) is accessible or visible.
    *   **AC3:** Then my selected answer for that question is clearly shown.
    *   **AC4:** Then there is a visual indicator (e.g., green checkmark/red X, color coding) showing if my answer was correct or incorrect.
    *   **AC5:** Then the correct answer option is clearly indicated.
    *   **AC6:** Then the AI-generated explanation for the correct answer is displayed and readable.

**User Story 2.10 (SAT-21):**
*   **Story:** As a user, after reviewing the feedback for a completed content set, the app system automatically determines the difficulty level for my *next* content set based on my performance on the just-completed set (e.g., if I scored high, the next set may be from a harder difficulty pool; if I scored low, the next set may be from an easier or similar difficulty pool).
*   **User Journey (System & User):**
    1.  User finishes reviewing a content set.
    2.  The system analyzes the user's score/performance on that set.
    3.  Based on this analysis and adaptive logic, the system selects the difficulty level for the *next* content set.
    4.  When the user chooses to continue, this next difficulty level is used.
*   **Definition of Done (DoD):**
    *   Adaptive logic for adjusting difficulty based on performance is defined and implemented (e.g., thresholds for moving up/down difficulty levels).
    *   The system correctly identifies the user's performance on the last set.
    *   The system can select an appropriate next difficulty level based on this logic.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given a user scores >= 80% on a 'Level 3' set, when the system determines the next difficulty, then it selects 'Level 4' (or stays at 'Level 3' if it's the max, or applies defined progression logic).
    *   **AC2:** Given a user scores <= 40% on a 'Level 3' set, when the system determines the next difficulty, then it selects 'Level 2' (or stays at 'Level 3' if it's the min, or applies defined regression logic).
    *   **AC3:** Given a user scores between 41% and 79% on a 'Level 3' set, when the system determines the next difficulty, then it selects 'Level 3' (or applies defined maintenance logic).
    *   **AC4:** The selection of the next content set (US 2.11) uses this determined difficulty.

**User Story 2.11 (SAT-22):**
*   **Story:** As a user, after reviewing a set and its feedback, I can choose to proceed to the next content set at the newly adjusted difficulty level.
*   **User Journey:**
    1.  User is on the set review screen or a summary screen after review.
    2.  User sees and taps/clicks a "Next Set" or "Continue Practice" button.
    3.  The app loads a new content set based on the difficulty determined in US 2.10.
*   **Definition of Done (DoD):**
    *   A clear "Next Set" or "Continue Practice" button is available after set review.
    *   Tapping this button triggers the loading of a new content set.
    *   The new content set is fetched from the pool corresponding to the adaptively determined difficulty level.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I have reviewed a set and the system has determined my next difficulty is 'Level 4', when I tap "Next Set", then a new content set from the 'Level 4' pool is loaded and displayed.
    *   **AC2:** The difficulty indicator on the practice screen updates to 'Level 4'.

**User Story 2.12 (SAT-23):**
*   **Story:** As a user, I can choose to end my R&W practice session after completing and reviewing any content set.
*   **User Journey:**
    1.  User is on the set review screen or a summary screen after review.
    2.  User sees and taps/clicks an "End Session" or "Back to R&W Home" button.
    3.  The app navigates the user out of the active practice flow and back to a main R&W screen or dashboard.
*   **Definition of Done (DoD):**
    *   An "End Session" (or similar) button is available after set review.
    *   Tapping the button successfully terminates the current continuous practice flow.
    *   The app navigates to the appropriate screen outside the practice loop.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I am on the review screen for a completed set, when I tap "End Session", then the practice session loop terminates.
    *   **AC2:** Then I am navigated back to the R&W module's main screen (or a session summary page before that, if designed).

**User Story 2.13 (SAT-24):**
*   **Story:** As a user, I can access a practice history for the R&W module.
*   **User Journey:**
    1.  User navigates to a "Practice History" section, possibly within the R&W module or a general profile area.
    2.  The app displays a list of past R&W practice activities.
*   **Definition of Done (DoD):**
    *   A "Practice History" section for R&W is accessible in the app.
    *   The system logs completed R&W practice sets to associate them with the user.
    *   The system logs completed R&W practice sets to associate them with the user.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I have completed several R&W content sets, when I navigate to the R&W "Practice History", then I see a list of these completed activities.

**User Story 2.14 (SAT-25):**
*   **Story:** As a user, in my R&W practice history, I can see a list of the content sets I've completed, including the date, the assessed difficulty level of each set, and my score for each set, so I can track my performance trends.
*   **User Journey:**
    1.  User is viewing the R&W practice history list.
    2.  Each item in the list clearly displays the date, difficulty level of the set, and the score achieved for that set.
    3.  (Optional) User might be able to tap on a history item to see more details or review the questions from that set again.
*   **Definition of Done (DoD):**
    *   The practice history list items are designed to display the specified information.
    *   Data for date, difficulty, and score for each completed set is correctly fetched and displayed.
*   **Acceptance Criteria (AC):**
    *   **AC1:** Given I am viewing my R&W practice history, then for each entry corresponding to a completed set, the date of completion is displayed.
    *   **AC2:** Then for each entry, the difficulty level of that set (e.g., "Level 3") is displayed.
    *   **AC3:** Then for each entry, my score for that set (e.g., "4/5") is displayed.
    *   **AC4:** The list is ordered, typically with the most recent sets first.
