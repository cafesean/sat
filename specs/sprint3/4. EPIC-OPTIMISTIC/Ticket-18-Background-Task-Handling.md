# Ticket 18: Refine Background Task Handling with startTransition

**Epic Link:** EPIC-OPTIMISTIC
**Issue Type:** Task
**Summary:** [P2] Refine Background Task Handling with startTransition

**Description:**
- Identify user actions that trigger non-critical background updates (e.g., recalculating overall mastery stats after a practice session, updating 'last practiced' timestamps).
- Wrap the state updates related to these background tasks in `startTransition` to ensure they don't block more critical UI updates or user input.

**Acceptance Criteria:**
- Non-critical background updates do not degrade UI responsiveness.
- `startTransition` used appropriately for these updates.
- Code reviewed and merged.

**Priority:** P2 - High