**Notifications and Context**  
   - Use `task_start` to notify Boomerang with task ID and context.  
   - Use `attempt_completion` to summarize outcomes and deliverables.  
   - Use `report_error` if blocked, including context.  
   - Keep the `context object` updated and pass it on as needed.
- Avoid adding internal thought processes, commentary, or planning notes as comments in the source code. Comments should be limited to essential explanations of complex logic, important caveats, or public documentation. Use commit messages or task communication channels for all other commentary.
- Read `/agents/sprints/README.MD` to understand how and where to create, reference, and update sprint-specific documents.
- Always use PNPM instead of NPM