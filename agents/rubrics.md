**Rubric Structure for Each Category:**

*   **Category Name**
*   **Weight:**
*   **A (Excellent):**
*   **B (Good):**
*   **C (Acceptable):**
*   **D (Needs Significant Improvement):**
*   **F (Unacceptable/Major Issues):**

---

**1. Code Quality (SOLID, DRY Principles & Readability)**

*   **Weight:** 1x
*   **A (Excellent):** Code demonstrably and consistently applies SOLID and DRY principles, resulting in highly modular, decoupled, and easily maintainable components/functions. Logic is exceptionally clear, with concise, purposeful comments only where complex logic necessitates. Naming conventions are impeccable and intuitive.
*   **B (Good):** Good application of SOLID and DRY principles with minor areas for improvement in modularity or avoiding duplication. Code is generally clear and readable with adequate comments. Naming is consistent and mostly intuitive.
*   **C (Acceptable):** Some adherence to SOLID/DRY, but instances of coupling or repetition are noticeable but don't critically impair functionality. Code is understandable with effort. Comments may be sparse or occasionally unclear. Naming is generally understandable but may have inconsistencies.
*   **D (Needs Significant Improvement):** Frequent violations of SOLID/DRY principles. Code is often tightly coupled, with significant duplication. Logic is difficult to follow, and comments are lacking or unhelpful. Naming is inconsistent or confusing.
*   **F (Unacceptable/Major Issues):** Systemic disregard for SOLID/DRY principles. Code is a monolithic "spaghetti" mess, highly coupled, and full of repetition. Virtually unreadable or unmaintainable without significant refactoring.

---

**2. Solution Completeness & Scope Adherence (to Jira Task)**

*   **Weight:** 1x
*   **A (Excellent):** All documented requirements and acceptance criteria in the Jira task (and its parent User Story) are fully and accurately implemented. No "TODOs", stubs, or placeholders for core functionality. Solution robustly handles all specified edge cases.
*   **B (Good):** Majority of Jira task requirements and ACs are met. Minor, non-critical aspects might be slightly incomplete or require trivial additions. No major placeholders for core logic.
*   **C (Acceptable):** Core functionality of the Jira task is implemented, but some secondary requirements or ACs are missing or partially implemented. May contain non-critical placeholders or "TODOs".
*   **D (Needs Significant Improvement):** Significant gaps in implementing the Jira task's requirements. Core functionality may be missing or severely incomplete. Numerous placeholders or "TODOs" for essential logic.
*   **F (Unacceptable/Major Issues):** The implemented solution bears little resemblance to the Jira task requirements or is fundamentally non-functional due to incompleteness. Critical functionality is missing or entirely stubbed out.

---

**3. End-User Usability & UX Quality (for UI/Frontend tasks)**

*   **Weight:** 1x
*   **A (Excellent):** UI is highly intuitive, aesthetically pleasing, and provides a delightful user experience. Interactions are seamless, predictable, and follow established best practices. All visual elements are polished, and information architecture is crystal clear. Error states and feedback are user-friendly.
*   **B (Good):** UI is generally intuitive and easy to use with a professional appearance. Most interactions are smooth. Minor inconsistencies or areas for polish may exist but don't hinder usability.
*   **C (Acceptable):** UI is functional and usable, but may have some awkward workflows or less intuitive interactions. Visual presentation is adequate but lacks polish. Some error messages might be generic.
*   **D (Needs Significant Improvement):** UI is confusing, difficult to navigate, or cluttered. Key interactions are buggy or non-obvious. Visual design is poor or inconsistent, negatively impacting user trust.
*   **F (Unacceptable/Major Issues):** UI is unusable, actively frustrating, or visually incoherent. Core user tasks cannot be completed easily or at all. No consideration for standard UX principles.

---

**4. Framework & Architectural Compliance**

*   **Weight:** 1x
*   **A (Excellent):** Implementation perfectly aligns with the System Architecture Document (`arch/0.SYS-ARCH.md`) and leverages the specified framework (e.g., Next.js 15) idiomatically and efficiently, following all its best practices for routing, data fetching, state management, etc.
*   **B (Good):** Strong adherence to the architecture and framework guidelines. Minor, non-critical deviations may exist but are well-justified or easily correctable. Good use of framework features.
*   **C (Acceptable):** Generally follows the architecture, but some components or modules might not integrate cleanly. Framework usage is functional but might not always leverage best practices or could be more efficient.
*   **D (Needs Significant Improvement):** Noticeable deviations from the System Architecture that compromise system integrity or maintainability. Incorrect or inefficient use of core framework features.
*   **F (Unacceptable/Major Issues):** Ignores or fundamentally violates the System Architecture. Gross misuse of the framework leading to significant performance, security, or maintainability problems.

---

**5. Role & Process Compliance (AI Agent KPI)**

*   **Weight:** 1x
*   **A (Excellent):** Agent flawlessly executed all role-specific instructions: correct Git branching (`feature/JIRA_KEY-short-description`), atomic commits, comprehensive PR creation with link, accurate and timely Jira status updates (e.g., to `Ready for Review` with PR link and branch name), and correct `switch_mode` handoffs (e.g., to Tech Lead for review). Information sourced perfectly from Jira and linked master documents.
*   **B (Good):** Consistently followed most role instructions and process steps. Minor omissions or slight delays in Jira/Git updates that didn't disrupt the overall flow.
*   **C (Acceptable):** Followed key process steps but with some inconsistencies or missing details (e.g., PR link or branch name missing from Jira comment, slightly delayed status update). Workflow generally maintained.
*   **D (Needs Significant Improvement):** Frequent failure to follow core process instructions. Incorrect Git usage, missing PRs, significantly delayed or incorrect Jira updates. Incorrect `switch_mode` usage causing confusion.
*   **F (Unacceptable/Major Issues):** Systemic disregard for defined role responsibilities and process workflow. Caused significant disruptions, required manual intervention to correct Jira/Git states, or blocked other agents.

---

**6. Functional Correctness & Error Proneness (Developer Pre-QA Diligence)**

*   **Weight:** 1x
*   **A (Excellent):** Code is demonstrably robust and functions exactly as per the Jira task's technical solution and acceptance criteria. All developer-level tests (unit, integration, browser functional for UI) pass without issue. No obvious bugs, errors, or uncaught exceptions encountered during developer's own thorough testing.
*   **B (Good):** Code is largely functional with very minor, easily fixable bugs discovered during developer testing. All specified tests pass.
*   **C (Acceptable):** Core functionality works, but some edge cases or less critical paths might have minor bugs that the developer should have caught. Most specified tests pass.
*   **D (Needs Significant Improvement):** Several functional bugs present that impact core use cases outlined in the Jira task. Developer testing was clearly insufficient. Many tests may be failing or missing.
*   **F (Unacceptable/Major Issues):** The implemented feature is fundamentally broken, crashes consistently, or produces wildly incorrect results. Indicates a severe lack of developer diligence in testing and verification before handoff.