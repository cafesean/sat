# Sprint Folder Guidelines

This directory contains all sprint-specific documents used during the development process.

## Folder Naming Convention

Each sprint folder must be named using the following format:

```
[NNN]-[short-sprint-title]
```

- `NNN` = a three-digit sequential sprint number starting from `001`.
- `short-sprint-title` = a lowercase, kebab-case summary of the sprint’s primary goal.

**Examples:**
 - `001-initial-setup`
 - `002-auth-integration`
 - `003-ai-review-flow`

Each folder created using this naming convention (e.g., `004-srs-practice`) represents a single sprint. All documents for that sprint (TS-, US-, UJ-, SP-, QA-, CR-) must be placed **inside** the corresponding sprint folder.

For example:
 - All files for Sprint 004 must go into: `/agents/sprints/004-srs-practice/`

## Contents of Each Sprint Folder

Each sprint folder should contain the relevant documents using the following prefixes:

- `SP-` for Sprint Plan  
- `UJ-` for User Journeys  
- `US-` for User Stories  
- `TS-` for Technical Solutions  
- `QA-` for QA Test Reports  
- `CR-` for Code Reviews (if applicable)

These documents should be used collaboratively by the Product Owner, Architect, Tech Lead, Developers, and QA during and after the sprint cycle.
