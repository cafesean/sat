# User Journey: Groups Feature

This document outlines the detailed user journey for the Groups feature, covering various scenarios and user interactions.

## 1. Creating a Group

**User:** Any logged-in user.

**UI Interfaces:**

*   **Groups Section:** A new section in the app navigation (e.g., "Groups").
*   **Create Group Button:** A prominent button within the Groups section.
*   **Create Group Form:** A modal or dedicated page with fields for:
    *   Group Name (required)
    *   Group Description (optional)

**Actions:**

1.  User navigates to the "Groups" section.
2.  User clicks the "Create Group" button.
3.  User fills out the "Create Group Form" with a name and optional description.
4.  User clicks "Submit" or "Create".

**Options:**

*   Cancel group creation at any point.

**Messages:**

*   **Success:** "Group '[Group Name]' created successfully!"
*   **Error:** "Failed to create group. Please try again."
*   **Validation:** "Group Name is required."

**Outcome:** A new group is created, and the creating user is automatically added as the first member and potentially the group administrator. The user is redirected to the Group Details page.

## 2. Inviting Users to a Group

**User:** Group Administrator (initially the creator).

**UI Interfaces:**

*   **Group Details Page:** Displays group information, members, and options.
*   **Invite Members Button:** A button on the Group Details page.
*   **Invite Members Modal/Form:**
    *   Input field for email addresses (comma-separated or one by one).
    *   Option to generate a shareable invitation link.

**Actions:**

1.  Group Administrator navigates to the Group Details page.
2.  Group Administrator clicks the "Invite Members" button.
3.  Group Administrator enters email addresses or generates a shareable link.
4.  Group Administrator clicks "Send Invites" or "Generate Link".

**Options:**

*   Cancel the invitation process.
*   Invite multiple users at once.
*   Use email invitation or shareable link.

**Messages:**

*   **Success (Email):** "Invitations sent successfully!"
*   **Success (Link):** "Shareable link generated. Copy and share with others."
*   **Error:** "Failed to send invitations. Please try again."
*   **Validation:** "Please enter valid email addresses."

**Outcome:** Invitations are sent via email or a shareable link is generated. Invited users will receive a notification or can use the link to join.

## 3. Accepting/Rejecting a Group Invitation

**User:** Invited User.

**UI Interfaces:**

*   **Email Invitation:** An email containing information about the group and an "Accept Invitation" button/link.
*   **In-App Notification:** A notification within the app about a group invitation.
*   **Groups Section:** A list of pending invitations.
*   **Invitation Details:** A view showing group details and "Accept" and "Reject" buttons.

**Actions:**

1.  Invited User receives an email or in-app notification.
2.  Invited User clicks the "Accept Invitation" button/link or views the invitation details in-app.
3.  Invited User clicks "Accept" or "Reject".

**Options:**

*   Accept the invitation.
*   Reject the invitation.

**Messages:**

*   **Success (Accept):** "You have joined the group '[Group Name]'."
*   **Success (Reject):** "You have rejected the invitation to group '[Group Name]'."
*   **Error:** "Failed to process invitation. Please try again."

**Outcome:** If accepted, the user becomes a member of the group and the group is added to their list of groups. If rejected, the invitation is dismissed.

## 4. Viewing Group Details and Members

**User:** Any Group Member.

**UI Interfaces:**

*   **Groups Section:** A list of groups the user is a member of.
*   **Group Item:** Each item in the list displays the group name and potentially the number of members.
*   **Group Details Page:** Displays:
    *   Group Name
    *   Group Description
    *   List of Group Members (displaying usernames or avatars)
    *   Link to the Group Word Bank

**Actions:**

1.  User navigates to the "Groups" section.
2.  User clicks on a specific group from their list.

**Options:**

*   View details of any group they are a member of.

**Messages:**

*   None typically, unless there's an error loading details.

**Outcome:** The user is taken to the Group Details page, where they can see information about the group and its members.

## 5. Interacting with the Group Word Bank

**User:** Any Group Member.

**UI Interfaces:**

*   **Group Details Page:** Link or section for the Group Word Bank.
*   **Group Word Bank Page:** Similar interface to a personal word bank, but clearly labeled as a Group Word Bank.
    *   List of words in the bank.
    *   Option to add new words.
    *   Option to initiate a practice session with the group word bank.

**Actions:**

1.  User navigates to the Group Details page.
2.  User clicks on the link/section for the Group Word Bank.
3.  User can view existing words, add new words, or start a practice session.

**Options:**

*   View words.
*   Add new words.
*   Start a practice session.
*   (Potentially) Edit/delete words (permissions may vary based on role).

**Messages:**

*   **Success (Add Word):** "Word '[Word]' added to the Group Word Bank."
*   **Error (Add Word):** "Failed to add word to Group Word Bank."

**Outcome:** Users can collaboratively build and practice with a shared vocabulary list.

## 6. Leaving a Group

**User:** Any Group Member.

**UI Interfaces:**

*   **Group Details Page:** An option or button to "Leave Group".
*   **Confirmation Dialog:** A modal asking the user to confirm leaving the group.

**Actions:**

1.  User navigates to the Group Details page.
2.  User clicks the "Leave Group" option.
3.  User confirms their decision in the confirmation dialog.

**Options:**

*   Leave the group.
*   Cancel leaving the group.

**Messages:**

*   **Confirmation:** "Are you sure you want to leave the group '[Group Name]'? You will lose access to the Group Word Bank."
*   **Success:** "You have left the group '[Group Name]'."
*   **Error:** "Failed to leave group. Please try again."

**Outcome:** The user is removed from the group, and the group is no longer listed in their Groups section. They lose access to the Group Word Bank.

## 7. Deleting a Group

**User:** Group Administrator.

**UI Interfaces:**

*   **Group Details Page:** An option or button to "Delete Group" (only visible to administrators).
*   **Confirmation Dialog:** A modal asking the administrator to confirm deleting the group.

**Actions:**

1.  Group Administrator navigates to the Group Details page.
2.  Group Administrator clicks the "Delete Group" option.
3.  Group Administrator confirms their decision in the confirmation dialog.

**Options:**

*   Delete the group.
*   Cancel deleting the group.

**Messages:**

*   **Confirmation:** "Are you sure you want to delete the group '[Group Name]'? This action cannot be undone and the Group Word Bank will also be deleted."
*   **Success:** "Group '[Group Name]' has been deleted."
*   **Error:** "Failed to delete group. Please try again."

**Outcome:** The group and its associated Group Word Bank are permanently deleted. All members are removed from the group.

## 8. Group Member Roles (Optional but Recommended)

**User:** Group Administrator, Group Member.

**UI Interfaces:**

*   **Group Details Page:** Displays member roles.
*   **Member List Item:** Option to change a member's role (for administrators).
*   **Change Role Modal/Options:** A way to select a new role for a member.

**Actions:**

1.  Group Administrator navigates to the Group Details page.
2.  Group Administrator selects a member from the list.
3.  Group Administrator chooses the option to change the member's role.
4.  Group Administrator selects a new role (e.g., Member, Admin).
5.  Group Administrator confirms the change.

**Options:**

*   Assign different roles to members (e.g., Admin, Member).
*   Define permissions for each role (e.g., only Admin can invite/remove members, delete the group).

**Messages:**

*   **Success:** "[Member Name]'s role updated to '[New Role]'."
*   **Error:** "Failed to update role. Please try again."

**Outcome:** Members have different levels of permissions within the group based on their assigned role.

## 9. Notifications

**User:** Any User.

**UI Interfaces:**

*   **In-App Notification System:** A central place for notifications.
*   **Email Notifications:** Emails for important group events.

**Actions:**

1.  User receives an in-app notification or email.
2.  User clicks on the notification to view details or take action (e.g., accept invitation).

**Options:**

*   Receive notifications for:
    *   Group invitations.
    *   New members joining the group.
    *   Words added to the Group Word Bank.
    *   Group deletion.

**Messages:**

*   "You have been invited to join the group '[Group Name]'."
*   "[User Name] has joined the group '[Group Name]'."
*   "[User Name] added a new word to the Group Word Bank in '[Group Name]'."
*   "The group '[Group Name]' has been deleted."

**Outcome:** Users are kept informed about relevant activities within their groups.