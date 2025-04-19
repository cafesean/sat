# Lint Error Fix Plan

This document tracks the lint errors reported by `pnpm lint` and the plan to fix them.

## Errors to Fix (as of 2025-04-16 10:27 AM):

### react/no-unescaped-entities

-   [ ] **File:** `src/app/login/page.tsx`
    -   Line 169:17 - Escape single quote (`'`) in "Don't"
-   [ ] **File:** `src/app/vocabulary/banks/[bankId]/page.tsx`
    -   Line 418:48 - Escape double quote (`"`) around word name
    -   Line 418:107 - Escape double quote (`"`) around word name
-   [ ] **File:** `src/app/vocabulary/edit/[bankId]/page.tsx`
    -   Line 25:64 - Escape single quote (`'`) in "aren't"
    -   Line 47:82 - Escape single quote (`'`) in "don't"
-   [ ] **File:** `src/app/vocabulary/practice/[sessionId]/page.tsx`
    -   Line 168:34 - Escape single quote (`'`) in "Here's"
-   [ ] **File:** `src/app/vocabulary/practice/page.tsx`
    -   Line 115:25 - Escape single quote (`'`) in "haven't"
-   [ ] **File:** `src/components/features/vocab/WordHistoryDialog.tsx`
    -   Line 96:45 - Escape double quote (`"`) around word text
    -   Line 96:56 - Escape double quote (`"`) around word text

### @typescript-eslint/no-unused-vars (Rule Definition Not Found)

*Note: Installing `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` did not resolve this. Further investigation needed. Might require checking `.eslintrc.json` configuration for TypeScript plugin/parser setup, or potential conflicts.*

-   [ ] **File:** `src/lib/auth/options.ts`
    -   Line 56:9 - Investigate rule definition issue.
-   [ ] **File:** `src/server/api/routers/vocab.ts`
    -   Line 142:6 - Investigate rule definition issue.
    -   Line 153:5 - Investigate rule definition issue.

## Plan:

1.  Fix all `react/no-unescaped-entities` errors by replacing the characters with their HTML entities (`'` or `"`).
2.  Investigate the `@typescript-eslint/no-unused-vars` rule definition errors. Check `.eslintrc.json` and ensure `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` are correctly configured and installed.
3.  Run `pnpm lint --fix` if applicable after configuration changes.
4.  Run `pnpm lint` again to confirm all errors are resolved.
