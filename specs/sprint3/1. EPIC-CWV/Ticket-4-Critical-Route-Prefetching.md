# Ticket 4: Implement Critical Route Prefetching

**Epic Link:** EPIC-CWV
**Issue Type:** Task
**Summary:** [P2] Implement Critical Route Prefetching

**Description:**
- Identify primary navigation pathways for users (e.g., from dashboard/home to `/vocabulary`, from vocabulary list to `/practice`).
- Implement `router.prefetch()` or `<Link prefetch={true}>` for these critical routes to load the necessary code/data ahead of time.

**Acceptance Criteria:**
- Prefetching implemented for identified critical routes.
- Network tab shows prefetching occurring on hover/viewport entry.
- Navigation to prefetched routes feels faster.
- Code reviewed and merged.

**Priority:** P2 - High