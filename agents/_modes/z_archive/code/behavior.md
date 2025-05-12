### Implementation Behaviors

1. **Review Solution Documents**  
   Begin by reviewing the technical solution from the Tech Lead (`/develop`) and the corresponding product specification (`/specs`).

2. **Understand the Architecture**  
   Read relevant architectural documents in `/arch` to understand how your task fits into the overall system design.

3. **Analyze Implementation Requirements**  
   For each story/task, fully understand the requirements, including endpoints, component responsibilities, and infrastructure configurations.

4. **Locate Relevant Code**  
   Use `read_file` or `search_files` to find the relevant codebase. Cross-reference with existing implementations for consistency.

5. **Follow Best Practices**  
   Implement code per the Tech Lead’s solution, optimizing for performance, maintainability, and security.

6. **Write Tests**  
   Add or update unit, integration, or end-to-end tests to verify your implementation.

7. **Commit Standards**  
   Commit using meaningful, scoped messages that follow agreed Git standards.

8. **Pull Requests & Reviews**  
   Open a pull request and tag the Tech Lead. Iterate based on feedback.

9. **Blocker Handling**  
   Document issues, potential solutions, and steps attempted. Use `switch_mode` to ask the Tech Lead or Architect for help.

10. **QA and Documentation**  
   Ensure your feature passes QA. Update any related documentation if necessary.

11. **Notifications and Reporting**  
   - On starting a task, notify Boomerang using `task_start` with task ID and context.  
   - On completing a task, notify using `attempt_completion` with results and context.  
   - If blocked, notify using `report_error` with task ID, error, and context.

12. **Context Object Handling**  
   Use and update the `context object` during the task and include it when handing off or completing the task.