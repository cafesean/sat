# Sprint Plan: Group and Word Bank Sharing Enhancements

## Overview
This sprint focuses on refining the group and word bank sharing features based on recent user feedback. The goals are to improve permission handling, UI consistency, and group management capabilities.

---

## Tasks

### Backend Tasks

- [✅] TS-1001: Enforce sharing restrictions so only owners can add word banks to groups; users with access via groups can only generate share links.
- [✅] TS-1002: Fix `wordBank.shareWordBank` procedure to allow users with access (not just owners) to generate share links without errors.
- [✅] TS-1003: Ensure backend de-duplicates word banks in the main list to prevent duplicate entries for owners.
- [✅] TS-1004: Implement backend support for editing group names by group admins.
- [✅] TS-1005: Implement backend support for group admins to manage member roles, including promoting/demoting admins but protecting the group owner’s admin status.
- [✅] TS-1011: Modify `group.inviteUserToGroup` to allow any group member (not just admins) to generate group invite links.

### Frontend Tasks

- [✅] TS-1006: Remove duplicate "Create Group" buttons from the UI.
- [✅] TS-1007: Display a shared icon on word banks that are part of a group.
- [✅] TS-1008: Update sharing UI to conditionally show options based on ownership vs. shared access (e.g., only show "Generate Share Link" for non-owners, hide "Share with" dropdown and buttons for guest users).
- [✅] TS-1009: Add UI for group admins to edit group names.
- [✅] TS-1010: Add UI for group admins to manage member roles, with restrictions on changing the owner’s admin status.

---

## Notes

- Backend tasks TS-1001, TS-1002, and TS-1003 have partial implementations but require refinement based on the latest feedback.
- Frontend tasks will require collaboration with the frontend team to ensure UI/UX consistency.
- Testing and validation should cover permission boundaries, UI correctness, and edge cases such as group ownership transfer.
- Task TS-1011 changes the permission model for group invitations; further discussion may be needed to confirm this is the desired behavior.