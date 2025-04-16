# Ticket 1: Audit & Optimize next/image Usage for LCP/CLS

**Epic Link:** EPIC-CWV
**Issue Type:** Task
**Summary:** [P1] Audit & Optimize next/image Usage for LCP/CLS

**Description:**
- Review all significant images across the application (e.g., logos, user content placeholders, UI elements).
- Ensure the `next/image` component is used instead of standard `<img>` tags where appropriate.
- Validate and implement correct `priority`, `loading`, and sizing props (explicit `width`/`height` or `fill` with appropriate CSS) to prevent layout shifts and optimize loading for the Largest Contentful Paint.

**Acceptance Criteria:**
- Major images identified and refactored.
- LCP and CLS metrics related to images show measurable improvement in DevTools/Lighthouse.
- Code reviewed and merged.

**Priority:** P1 - Highest