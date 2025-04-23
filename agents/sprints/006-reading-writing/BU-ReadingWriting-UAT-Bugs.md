# Reading/Writing Module - UAT Bug Report

## Regression Testing Findings - 2025-04-22

### Critical Issues
1. **Duplicate Key Warning**  
   - Location: /reading-writing-landing route
   - Error: "Encountered two children with the same key"
   - Impact: May cause component rendering issues
   - Priority: High

2. **Next-Auth Fetch Error**  
   - Error: CLIENT_FETCH_ERROR
   - Impact: Potential authentication issues
   - Priority: High

3. **Failed to Create Question Set**
   - Location: /reading-writing-create route (when submitting the form)
   - Error: `PrismaClientValidationError`: Argument `connect` of type UserWhereUniqueInput needs at least one of `id` or `email` arguments.
   - Impact: Users cannot create new question sets, blocking core functionality.
   - Priority: Critical

### Functional Issues
1. **Passage Display**  
   - Long passages don't scroll properly
   - Text formatting inconsistent with design specs

2. **Question Rendering**  
   - Multiple choice options misaligned on mobile
   - Answer selection state not persisting

### UI/UX Issues
1. **Navigation**  
   - Back button inconsistent behavior
   - Difficulty level selector not properly styled

2. **Responsiveness**  
   - Layout breaks on tablet viewports
   - Font sizes inconsistent across devices

## Recommended Actions
1. Investigate and fix duplicate key warning
2. Address Next-Auth fetch error
3. Review passage display component
4. Fix mobile layout issues
5. Standardize UI components