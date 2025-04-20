# Group List Feature UAT Bugs

Identified bugs during User Acceptance Testing of the Group List feature.

- [ ] BU-0001: Prevent duplicate sharing of word banks: Sharing a word bank with another user twice results in a "This word bank is already shared with the specified group" error.
- [ ] BU-0002: Prevent duplicate group invitations: Generating an invite link for a user already in the group results in a "User is already a member of this group" error. (Backend Verified)
**Bug Report Notes:**
tRPC failed on group.inviteUserToGroup: This user already has a pending invitation to this group.
POST /api/trpc/group.inviteUserToGroup

The logic for this should be to just show a friendly message under the input box that an invite is pending with this user, and add an option to resend. We can add a future feature to list all pending invites below the input box, and to allow cancellation of the invite.
- [ ] BU-0003: Prevent group creators from leaving their own group: Group creators can attempt to leave their own group, resulting in an error. The UI should prevent this action, but the backend should also enforce this rule. (Backend Verified)
**Bug Report Notes:**
tRPC failed on group.leaveGroup: As the group creator, you cannot leave this group. You can either transfer ownership to another member or delete the group entirely if you no longer need it.

The logic for this should be to check if the owner of the group is the current user. If so, then don't show the button. We'll add a future feature to "Transfer" ownership of group to another user.
- [ ] BU-0004: Build error: Unexpected token `div` in src/app/groups/invite/[inviteToken]/page.tsx (Resolved - Application is running)
- [ ] BU-0005: Shared link acceptance error: Fixed React navigation errors by moving redirect logic into useEffect hooks and wrapping in setTimeout to avoid render conflicts. Build compilation I/O errors resolved. Development server starts cleanly.
- [x] BU-0006: React Hook order error on Group Invite page (Resolved)

**Bug Report Notes:**
Encountered a React Hook order error when loading a shared group invite URL. This prevents the shared link acceptance flow from being tested.

**Error Message:**
```
React has detected a change in the order of Hooks called by AcceptInvitePage. This will lead to bugs and errors if not fixed. For more information, read the Rules of Hooks: https://react.dev/link/rules-of-hooks

   Previous render            Next render
   ------------------------------------------------------
1. useContext                 useContext
2. useContext                 useContext
3. useContext                 useContext
4. useEffect                  useEffect
5. useContext                 useContext
6. useContext                 useContext
7. useState                   useState
8. useEffect                  useEffect
9. useCallback                useCallback
10. useSyncExternalStore      useSyncExternalStore
11. useCallback               useCallback
12. useMemo                   useMemo
13. undefined                 useEffect
   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

**File and Line:**
src/app/groups/invite/[inviteToken]/page.tsx (59:12)

**Steps to Reproduce:**
1. Generate a shared link for a group.
2. Attempt to access the shared link in a browser.
3. Observe the React Hook order error in the console and the page failing to load correctly.

**Reference:**
TS-GroupList-TechnicalSolution.md (for relevant code context)
US-Group-List.md (for user story context)