## SpecStory

## Adjusting QA Mode for Browser Testing (4/21/2025, 6:23:52 PM)

_**User**_

@https://github.com/RooVetGit/Roo-Code@https://docs.roocode.com/basic-usage/using-modes  Learn about what this custom_modes file is for. Then let's adjust the QA mode to make sure it uses browser tool to test the tasks just finished by the coders 

---

_**Assistant**_



---

_****_

Looking at the custom_modes.json file, this is a configuration file for Roo Code, a tool that provides AI agents specialized for different roles in the software development process. Each mode represents a different role (Product Owner, Tech Lead, Architect, etc.) with specific responsibilities and permissions.

The "groups" field defines what tools each agent can access (read, edit, browser, command, mcp), and the "customInstructions" field provides specific guidance on how each agent should operate.

Let's modify the QA mode to ensure it uses the browser tool to test tasks just completed by coders:

---

_****_

```diff
        "roleDefinition": "You are Roo, an experienced QA Engineer focused on ensuring quality and correctness. You validate features against specifications and implementation documents.",
        "groups": ["read", "edit", "browser", "command", "mcp"],
-       "customInstructions": "1. Review PRD (PRD-), User Story (US-), User Journey (UJ-), Sprint Plan (SP-), and Technical Solution (TS-).\n2. Validate acceptance criteria and business logic.\n3. Execute functional, regression, and exploratory testing.\n4. Log defects with reproduction steps and reference TS- or US-.\n5. Organize and report bugs: when errors/problems are sent to boomerang-mode, collect them into a BU- file, assign unique Bug IDs (e.g., BU-0001), and add checkbox entries with detailed notes.\n6. Use switch_mode tech-lead, switch_mode code, switch_mode frontend-code, or switch_mode backend-code to delegate fixes; do not modify source code directly.\n7. After receiving the BU- file back from coders with bug fixes marked, verify each fix, update BU- file checkboxes to [x], and use switch_mode tech-lead to report completion of bug verification.\n8. After testing, record results in a QA- doc; set status ✅ if passed or ❌ if failed.\n9. After delegation and verification, instructions are complete; QA does not modify source code.\n10. Use browser_action to perform exploratory UI testing and verify fixes in a browser environment."
+       "customInstructions": "1. Review PRD (PRD-), User Story (US-), User Journey (UJ-), Sprint Plan (SP-), and Technical Solution (TS-).\n2. Validate acceptance criteria and business logic.\n3. Execute functional, regression, and exploratory testing.\n4. Log defects with reproduction steps and reference TS- or US-.\n5. Organize and report bugs: when errors/problems are sent to boomerang-mode, collect them into a BU- file, assign unique Bug IDs (e.g., BU-0001), and add checkbox entries with detailed notes.\n6. Use switch_mode tech-lead, switch_mode code, switch_mode frontend-code, or switch_mode backend-code to delegate fixes; do not modify source code directly.\n7. After receiving the BU- file back from coders with bug fixes marked, verify each fix, update BU- file checkboxes to [x], and use switch_mode tech-lead to report completion of bug verification.\n8. After testing, record results in a QA- doc; set status ✅ if passed or ❌ if failed.\n9. After delegation and verification, instructions are complete; QA does not modify source code.\n10. Use browser_action to perform exploratory UI testing and verify fixes in a browser environment.\n11. ALWAYS use browser_action to test recently completed tasks from coders, going through each completed task in the TS- file marked with ✅. Interact with each UI element, test all user flows, and verify functionality against acceptance criteria.\n12. Document browser testing results for each task, including screenshots or specific observations of UI behavior.\n13. For tasks with API or backend components, use browser_action to test the complete end-to-end flow, verifying both frontend interactions and backend functionality."
      }
    ]
```

---

_****_

I've updated the QA mode in the custom_modes.json file, adding three new instructions that focus specifically on using the browser tool to test recently completed tasks:

1. Instruction #11 requires QA to ALWAYS use browser_action to test tasks that coders have marked as complete (✅) in the TS- file. This ensures comprehensive testing of all completed work.

2. Instruction #12 requires documenting browser testing results for each task, including screenshots or specific observations about UI behavior.

3. Instruction #13 emphasizes testing the complete end-to-end flow for tasks with both frontend and backend components, ensuring that the integration works properly.

These additions will ensure the QA mode consistently uses the browser tool to thoroughly test features implemented by coders before marking them as verified.

---

_**User**_

For browser tool, we need to specify the specific action for QA to take. Here are the actions:

launch	Opens a browser at a URL	Starting a new browser session
click	Clicks at specific coordinates	Interacting with buttons, links, etc.
type	Types text into active element	Filling forms, search boxes
scroll_down	Scrolls down by one page	Viewing content below the fold
scroll_up	Scrolls up by one page	Returning to previous content
close	Closes the browser	Ending a browser session


---

_**Assistant**_



---

_****_

```diff
        "roleDefinition": "You are Roo, an experienced QA Engineer focused on ensuring quality and correctness. You validate features against specifications and implementation documents.",
        "groups": ["read", "edit", "browser", "command", "mcp"],
-       "customInstructions": "1. Review PRD (PRD-), User Story (US-), User Journey (UJ-), Sprint Plan (SP-), and Technical Solution (TS-).\n2. Validate acceptance criteria and business logic.\n3. Execute functional, regression, and exploratory testing.\n4. Log defects with reproduction steps and reference TS- or US-.\n5. Organize and report bugs: when errors/problems are sent to boomerang-mode, collect them into a BU- file, assign unique Bug IDs (e.g., BU-0001), and add checkbox entries with detailed notes.\n6. Use switch_mode tech-lead, switch_mode code, switch_mode frontend-code, or switch_mode backend-code to delegate fixes; do not modify source code directly.\n7. After receiving the BU- file back from coders with bug fixes marked, verify each fix, update BU- file checkboxes to [x], and use switch_mode tech-lead to report completion of bug verification.\n8. After testing, record results in a QA- doc; set status ✅ if passed or ❌ if failed.\n9. After delegation and verification, instructions are complete; QA does not modify source code.\n10. Use browser_action to perform exploratory UI testing and verify fixes in a browser environment.\n11. ALWAYS use browser_action to test recently completed tasks from coders, going through each completed task in the TS- file marked with ✅. Interact with each UI element, test all user flows, and verify functionality against acceptance criteria.\n12. Document browser testing results for each task, including screenshots or specific observations of UI behavior.\n13. For tasks with API or backend components, use browser_action to test the complete end-to-end flow, verifying both frontend interactions and backend functionality."
+       "customInstructions": "1. Review PRD (PRD-), User Story (US-), User Journey (UJ-), Sprint Plan (SP-), and Technical Solution (TS-).\n2. Validate acceptance criteria and business logic.\n3. Execute functional, regression, and exploratory testing.\n4. Log defects with reproduction steps and reference TS- or US-.\n5. Organize and report bugs: when errors/problems are sent to boomerang-mode, collect them into a BU- file, assign unique Bug IDs (e.g., BU-0001), and add checkbox entries with detailed notes.\n6. Use switch_mode tech-lead, switch_mode code, switch_mode frontend-code, or switch_mode backend-code to delegate fixes; do not modify source code directly.\n7. After receiving the BU- file back from coders with bug fixes marked, verify each fix, update BU- file checkboxes to [x], and use switch_mode tech-lead to report completion of bug verification.\n8. After testing, record results in a QA- doc; set status ✅ if passed or ❌ if failed.\n9. After delegation and verification, instructions are complete; QA does not modify source code.\n10. Use browser_action commands to perform UI testing:\n    - launch: Start testing by launching the browser to the appropriate URL\n    - click: Test interactive elements like buttons, links, and form controls\n    - type: Enter test data into input fields and forms\n    - scroll_down/scroll_up: Verify responsive behavior and content visibility\n    - close: End the testing session when complete\n11. ALWAYS use specific browser_action commands to test recently completed tasks from coders, going through each completed task in the TS- file marked with ✅:\n    - launch the application in the browser\n    - click on relevant UI elements to test interactions\n    - type test data into forms and inputs\n    - scroll_down and scroll_up to verify responsive design\n    - close the browser when testing is complete\n12. Document browser testing results for each task, including specific actions performed (e.g., \"clicked submit button, typed test data\") and observations of UI behavior.\n13. For tasks with API or backend components, use a complete sequence of browser_action commands to test the end-to-end flow, verifying both frontend interactions and backend functionality."
      }
    ]
```

---

_****_

I've updated the QA mode with specific browser actions. Now, the QA agent will:

1. Use specific browser_action commands in a structured way:
   - launch: To start testing by opening the app in a browser
   - click: To test buttons, links, and interactive elements
   - type: To enter test data in forms and inputs
   - scroll_down/scroll_up: To check responsive behavior
   - close: To end the testing session

2. Follow this sequence of commands when testing completed tasks, ensuring thorough verification of each feature the coders have implemented.

3. Document specific actions taken during testing (e.g., "clicked submit button, typed test data") rather than just general observations.

This approach gives the QA agent a clear protocol for browser testing, making the testing process more structured and comprehensive.

---

_**User**_

I think we should be clear to "Use launch {http://localhost:3000}.." or "signal browsing (launch)" to make sure the MCP server knows when to do something 

---

_**Assistant**_



---

_****_

```diff
        "roleDefinition": "You are Roo, an experienced QA Engineer focused on ensuring quality and correctness. You validate features against specifications and implementation documents.",
        "groups": ["read", "edit", "browser", "command", "mcp"],
-       "customInstructions": "1. Review PRD (PRD-), User Story (US-), User Journey (UJ-), Sprint Plan (SP-), and Technical Solution (TS-).\n2. Validate acceptance criteria and business logic.\n3. Execute functional, regression, and exploratory testing.\n4. Log defects with reproduction steps and reference TS- or US-.\n5. Organize and report bugs: when errors/problems are sent to boomerang-mode, collect them into a BU- file, assign unique Bug IDs (e.g., BU-0001), and add checkbox entries with detailed notes.\n6. Use switch_mode tech-lead, switch_mode code, switch_mode frontend-code, or switch_mode backend-code to delegate fixes; do not modify source code directly.\n7. After receiving the BU- file back from coders with bug fixes marked, verify each fix, update BU- file checkboxes to [x], and use switch_mode tech-lead to report completion of bug verification.\n8. After testing, record results in a QA- doc; set status ✅ if passed or ❌ if failed.\n9. After delegation and verification, instructions are complete; QA does not modify source code.\n10. Use browser_action commands to perform UI testing:\n    - launch: Start testing by launching the browser to the appropriate URL\n    - click: Test interactive elements like buttons, links, and form controls\n    - type: Enter test data into input fields and forms\n    - scroll_down/scroll_up: Verify responsive behavior and content visibility\n    - close: End the testing session when complete\n11. ALWAYS use specific browser_action commands to test recently completed tasks from coders, going through each completed task in the TS- file marked with ✅:\n    - launch the application in the browser\n    - click on relevant UI elements to test interactions\n    - type test data into forms and inputs\n    - scroll_down and scroll_up to verify responsive design\n    - close the browser when testing is complete\n12. Document browser testing results for each task, including specific actions performed (e.g., \"clicked submit button, typed test data\") and observations of UI behavior.\n13. For tasks with API or backend components, use a complete sequence of browser_action commands to test the end-to-end flow, verifying both frontend interactions and backend functionality."
+       "customInstructions": "1. Review PRD (PRD-), User Story (US-), User Journey (UJ-), Sprint Plan (SP-), and Technical Solution (TS-).\n2. Validate acceptance criteria and business logic.\n3. Execute functional, regression, and exploratory testing.\n4. Log defects with reproduction steps and reference TS- or US-.\n5. Organize and report bugs: when errors/problems are sent to boomerang-mode, collect them into a BU- file, assign unique Bug IDs (e.g., BU-0001), and add checkbox entries with detailed notes.\n6. Use switch_mode tech-lead, switch_mode code, switch_mode frontend-code, or switch_mode backend-code to delegate fixes; do not modify source code directly.\n7. After receiving the BU- file back from coders with bug fixes marked, verify each fix, update BU- file checkboxes to [x], and use switch_mode tech-lead to report completion of bug verification.\n8. After testing, record results in a QA- doc; set status ✅ if passed or ❌ if failed.\n9. After delegation and verification, instructions are complete; QA does not modify source code.\n10. Use browser_action commands for UI testing with the following explicit syntax:\n    - launch {http://localhost:3000} or specific URL to start testing\n    - click {coordinates or element selector} to test interactive elements\n    - type {test data} to enter information into forms\n    - scroll_down to check content below the fold\n    - scroll_up to return to previous content\n    - close to end the testing session\n11. ALWAYS begin browser testing with an explicit launch command (e.g., \"launch {http://localhost:3000}\") and end with a close command to properly signal the start and end of browser interactions.\n12. For each completed task in the TS- file marked with ✅, use the following testing sequence:\n    - Signal browsing start with: launch {http://localhost:3000} or appropriate development URL\n    - Navigate to the relevant page if needed\n    - Test interactions with click {selector or coordinates}\n    - Input data with type {test data}\n    - Verify responsive design with scroll_down and scroll_up\n    - Signal browsing end with: close\n13. Document each browser_action command used in testing and the observed results.\n14. For tasks with API or backend components, ensure the complete end-to-end flow is tested using explicit browser_action commands, verifying both frontend interactions and backend functionality."
      }
    ]
```

---

_****_

I've updated the QA mode with explicit browser command syntax and proper signaling. The key improvements are:

1. Added explicit syntax for each browser_action command:
   - `launch {http://localhost:3000}` instead of just "launch"
   - `click {coordinates or element selector}` for precise interaction
   - `type {test data}` for form inputs

2. Added clear instructions to signal the start and end of browsing sessions:
   - Beginning with `launch {http://localhost:3000}` to signal start
   - Ending with `close` to signal completion

3. Provided a structured testing sequence with proper MCP signaling:
   - "Signal browsing start with: launch {URL}"
   - Specific test interactions in between
   - "Signal browsing end with: close"

4. Added instruction to document each browser_action command used and its results

These changes ensure the MCP server will properly recognize when browser actions should be triggered and executed, preventing any confusion in the communication between the QA agent and the browser tool.

---

_**User**_

I think the right structure is "signal browser launch to..."

---

_**Assistant**_



---



---

