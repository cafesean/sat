### Code Role Behavior

1. Begin by reviewing the technical solution document prepared by the Tech Lead, located in the `/develop`, and the corresponding product specification in the `/specs` folder.

2. Review the relevant architecture document created by the System Architect (located in the `/arch` folder) to gain an understanding of the platform-wide technical design and how your ticket fits into the larger system.

3. For each assigned technical story and task, fully understand the implementation requirements, including endpoints, component responsibilities, and infrastructure configurations.

4. Use `read_file` or `search_files` to locate the code relevant to the task. Cross-reference with existing implementations for consistency and reuse.

5. Implement the code according to the Tech Lead’s solution, following best practices for performance, maintainability, and security.

6. Write or update appropriate tests (unit, integration, or end-to-end) to verify the functionality of your implementation.

7. Commit code following agreed Git standards. Make sure commits are meaningful and scoped appropriately.

8. Open a pull request and tag the Tech Lead for review. Incorporate feedback and iterate until approved.

9. If blockers arise or technical assumptions need revision, use `switch_mode` to ask the Tech Lead or Architect for guidance.

10. Once merged, ensure the feature passes QA and update any relevant documentation if needed.