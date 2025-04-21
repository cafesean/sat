# User Journey: SRS Practice Enhancements (Sprint 004)

## 1. Introduction

This document outlines the user journey for the features introduced in Sprint 004, focusing on enhancing practice sessions with Spaced Repetition System (SRS), improved sample sentences, and word starring capabilities. The goal is to create a more effective and engaging learning experience.

## 2. Personas

*   **Learner:** A user actively trying to expand their vocabulary using the application's practice features.
*   **Reviewer:** A user revisiting their word banks to consolidate learning or focus on specific words.

## 3. User Journey Map

### Scenario 1: Engaging with a Practice Session

**Goal:** Learner wants to practice words from a specific word bank and benefit from SRS and improved context.

| Step                      | User Action                                      | System Response / UI                                                                                                | Key Features Involved | UX Considerations         |
| :------------------------ | :----------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ | :-------------------- | :------------------------ |
| **1. Start Practice**   | Navigates to a Word Bank and clicks "Practice". | Practice session loads. The order of word cards presented is randomized.                                            | Card Randomization    | Seamless Integration      |
| **2. View Word Card**   | Sees the first word card.                        | The card displays the word. The system prioritizes cards based on the SRS algorithm (mastery level, review interval). | SRS Integration       | Clear Feedback, Performance |
| **3. Interact with Card** | Reviews the word, definition, etc.             | The user sees a "Star" icon (e.g., ☆) on the card. If available, multiple sample sentences are displayed clearly.      | Word Starring, Improved Sample Sentences | Clear Feedback, Content Quality |
| **4. Star a Word**      | Clicks the "Star" icon for a difficult word.   | The icon changes state (e.g., ★), indicating the word is starred. This status is saved instantly.                   | Word Starring         | Seamless Integration, Clear Feedback |
| **5. Reveal Answer**    | Clicks "Show Answer" or similar.               | The answer/details are revealed.                                                                                    |                       |                           |
| **6. Self-Assess**      | Selects their mastery level (e.g., "Easy", "Hard"). | The system records the assessment, updating the word's SRS data. The next card is presented based on SRS logic.     | SRS Integration       | Clear Feedback, Performance |
| **7. Continue Practice**| Repeats steps 2-6 for subsequent cards.        | The system continues presenting cards, prioritizing those needing review according to the SRS algorithm.              | SRS Integration       | Performance               |
| **8. Complete Session** | Finishes all cards or exits the session.       | A summary screen appears, showing performance metrics. A "Repeat Session" button is prominently displayed.          | Repeat Session        | Clear Feedback            |
| **9. Repeat Session**   | Clicks the "Repeat Session" button.            | A new practice session starts immediately with the same word bank, settings, and a newly randomized card order.     | Repeat Session, Card Randomization | Seamless Integration      |

### Scenario 2: Reviewing a Word Bank and Using Filters

**Goal:** Reviewer wants to focus on specific words they've marked within a word bank.

| Step                      | User Action                                       | System Response / UI                                                                                                   | Key Features Involved | UX Considerations         |
| :------------------------ | :------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------- | :-------------------- | :------------------------ |
| **1. Access Word Bank** | Navigates to a specific Word Bank page.           | The list/grid of words in the bank is displayed. Each word entry shows its star status (e.g., ★ if starred).             | Word Starring         | Seamless Integration      |
| **2. View Word Details**| Clicks on a word to see more details.             | The word detail view opens, showing definition, multiple sample sentences (if available), and the "Star" toggle icon. | Improved Sample Sentences, Word Starring | Content Quality, Clear Feedback |
| **3. Toggle Star**      | Clicks the "Star" icon on the detail view.        | The star status toggles instantly and is saved. The icon updates visually.                                             | Word Starring         | Seamless Integration      |
| **4. Filter Words**     | Finds and activates the "Filter" option.          | Filter options appear, including a toggle/checkbox for "Show Starred Only".                                            | Word Starring         | Seamless Integration      |
| **5. Apply Filter**     | Selects "Show Starred Only" and applies filter. | The word list updates to display only the words marked with a star within that bank.                                   | Word Starring         | Performance, Clear Feedback |
| **6. Practice Starred** | Clicks "Practice" while the filter is active.     | A practice session starts, containing *only* the starred words from the current bank.                                  | Word Starring, SRS Integration | Seamless Integration      |

## 4. Key User Experience Considerations Addressed

*   **Seamless Integration:** Star icons, repeat buttons, and filters are added naturally to existing practice and word bank interfaces.
*   **Clear Feedback:** Visual cues for starred status (☆/★), clear presentation of multiple sentences, and session completion summaries provide necessary feedback. SRS logic operates behind the scenes but influences card order transparently.
*   **Performance:** SRS calculations and filtering should be optimized for responsiveness, especially with large word banks. Instant feedback on starring is crucial.
*   **Mobile Responsiveness:** All new UI elements (buttons, icons, filters, sentence displays) must be designed and tested for usability on various screen sizes.
*   **Content Generation Quality:** The display of multiple sample sentences relies on the quality of generation from the Gemini API. The UI should handle cases gracefully if sentences are unavailable or limited.

## 5. Open Questions / Considerations

*   How should multiple sample sentences be displayed concisely on smaller practice cards vs. the full word detail view?
*   Should the "Repeat Session" button reset SRS progress for that session, or continue from the previous state? (Assumption: Starts fresh SRS-wise but uses the same word set).
*   Exact placement and styling of the "Star" icon and "Filter" options.