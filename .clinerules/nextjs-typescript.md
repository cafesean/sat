---
description: NextJS, typescript, tailwind, shadcn, zustand
globs: *.tsx, *.css, *.ts
alwaysApply: false
---
You are an expert full-stack developer proficient in TypeScript, React, Next.js, and modern UI/UX frameworks (e.g., Tailwind CSS, Shadcn UI, Radix UI). 

# Coding Rules: Full-Stack Development with TypeScript, React, Next.js

**I. Core Principles & Technologies**

*   **Expertise:** Expert full-stack developer proficient in TypeScript, React, Next.js App Router, Node.js, and modern UI/UX frameworks.
*   **State Management:** Use Zustand for global state management.
*   **UI Framework:** Leverage Shadcn UI and Radix UI for component foundations.
*   **Styling:** Use Tailwind CSS for responsive design with a mobile-first approach.
*   **Validation:** Implement schema validation using Zod.
*   **Data Fetching:** Utilize TanStack React Query or tRPC (depending on API architecture) for efficient data fetching.
*   **Adherence to Standards:** Follow Next.js documentation for data fetching, rendering, and routing. Adhere to SOLID and DRY principles.

**II. Code Style & Structure**

*   **Language:** Write concise, technical TypeScript code (JavaScript where appropriate, e.g., configuration).
*   **Standard.js Compliance:** Adhere to Standard.js rules where practical for consistency. Key rules: (2-space indentation, single quotes, no semicolons (unless required), no unused variables, space after keywords, space before function parentheses (declarations), `===`, space around infix operators, space after commas, `else` on brace line, braces for multi-line `if`, handle `err`, camelCase variables/functions, PascalCase components).
*   **Programming Paradigm:** Favor functional & declarative patterns; minimize classes. Prefer `const` over `function` for functional components.
*   **Modularity:** Prioritize modularization & avoid code duplication (DRY).
*   **Naming:** Use descriptive variable names (auxiliary verbs, e.g., `isLoading`). camelCase variables/functions, PascalCase components.
*   **File Structure:** Structure files: components, subcomponents, helpers, static content, types.
*   **Directory Naming:** Lowercase with dashes (e.g., `components/auth-wizard`).
*   **Exports:** Favor named exports.

**III. React Best Practices**

*   **Components:** Use functional components.
*   **Hooks:** Implement hooks correctly; follow Rules of Hooks; create custom hooks for reusable logic.
*   **Memoization (React 19+):** React 19's compiler automatically memoizes function calls and values. `React.memo`, `useCallback`, and `useMemo` are generally **not needed** for performance optimizations within the component's render logic.  Consider them only for very specific scenarios involving referential equality *outside* of rendering (e.g., comparing props in a custom hook or passing values to a library with strict referential checks).
*   **Component Design:** Prefer composition. Use `children` prop and render props for flexibility.
*   **Code Splitting:** Use `React.lazy` & `Suspense` for code splitting; wrap client components in `Suspense`. Use dynamic loading for non-critical components.
*   **Refs:** Use refs sparingly (DOM access).
*   **Forms:** Prefer controlled components.
*   **Error Boundaries:** Implement error boundaries.
*   **Cleanup:** Use `useEffect` cleanup functions.
*   **Conditional Rendering:** Use short-circuiting & ternary operators.
*   **Lifecycle Management:** Minimize `'use client'`, `useEffect`, & `useState`; favor RSC & Next.js SSR/SSG.

**IV. State Management**

*   **Zustand:** Use Zustand for global state.
*   **State Location:** Lift state; use context when prop drilling is excessive.

**V. UI & Styling**

*   **Component Library:** Shadcn UI & Radix UI foundations.
*   **Responsiveness:** Tailwind CSS, mobile-first.
*   **Optimization:** PurgeCSS for unused styles; modular/scoped styles.

**VI. Performance Optimization**

*   **Server Components:** Favor RSC & Next.js SSR/SSG.
*   **Code Splitting:** Route-based code splitting.
*   **Image Optimization:** WebP, size data, lazy loading.
*   **Web Vitals:** Optimize LCP, CLS, FID.

**VII. Forms and Validation**

*   **Controlled Components:** Use controlled components for form inputs.
*   **Form Validation:** Implement client & server-side validation. Consider `react-hook-form`.
*   **Schema Validation:** Use Zod.

**VIII. Error Handling & Validation**

*   **Priority:** Prioritize error handling & edge cases.
*   **Early Returns:** Use early returns.
*   **Guard Clauses:** Use guard clauses.
*   **Error Placement:** Handle errors early in functions; "happy path" last.
*   **Else Avoidance:** Use `if-return` instead of `else`.
*   **Error Messages:** Proper logging & user-friendly messages.
*   **Server Actions:** Model errors as return values.
*   **Custom Error Types:** Use custom error types for consistent error handling.

**IX. Accessibility (a11y)**

*   Semantic HTML, ARIA attributes, keyboard navigation.

**X. Testing**

*   Unit tests (Jest, React Testing Library).
*   Integration tests (critical flows).
*   Snapshot tests (judiciously).

**XI. Security**

*   Input sanitization (XSS prevention).
*   `dangerouslySetInnerHTML`: Use sparingly (sanitized content only).

**XII. Internationalization (i18n)**

*   Use `react-intl` or `next-i18next`.

**XIII. Methodology**

1.  **System 2 Thinking**: Analytical rigor; break down requirements; thorough consideration.
2.  **Tree of Thoughts**: Evaluate multiple solutions & consequences; structured exploration.
3.  **Iterative Refinement**: Consider improvements, edge cases, & optimizations.

**XIV. Key Conventions**

*   Always use `const` over `function`
*   Optimize Web Vitals (LCP, CLS, FID).
*   Favor server components and Next.js SSR.