# Ticket 17: Implement Optimistic Updates for Core Actions

**Epic Link:** EPIC-OPTIMISTIC
**Issue Type:** Story
**Summary:** [P1] Implement Optimistic Updates for Core Actions

**Description:**
- As a user, when I perform common actions like starring/unstarring a word, deleting a word, or submitting a practice answer, I want the UI to update instantly, even before the server confirms, so the app feels highly responsive.
- Use React's `useOptimistic` hook (preferred in React 19) or `startTransition` to implement optimistic UI updates for:
  - Starring/unstarring words.
  - Deleting words from a word bank.
  - Submitting practice answers (e.g., showing feedback placeholder immediately).

**Acceptance Criteria:**
- UI updates instantly for specified core actions.
- State reverts correctly if the background operation fails (see next ticket).
- Perceived responsiveness for these actions is significantly improved.
- Code reviewed and merged.

**Priority:** P1 - Highest