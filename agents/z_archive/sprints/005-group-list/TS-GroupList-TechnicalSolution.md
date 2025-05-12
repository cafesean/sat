# Technical Solution: Group List Feature

## Overview
Implementation of collaborative group features including group creation, shared word banks, member management, and notifications.

## Technical Requirements
1. **Group Management**
   - Create/delete groups
   - Member invitation system (email/link)
   - Member role management (Admin/Member)

2. **Group Word Bank**
   - Shared word bank ownership
   - Collaborative word management
   - Access control

3. **Notifications**
   - In-app notifications for group activities
   - Email notifications (optional)
   - Notification preferences

4. **Sharing Word Banks**
   - Generate shareable links for word banks
   - Allow sharing via email
   - Implement read-only view for shared word banks
   - Implement functionality to copy shared word bank

## System Components
- **Frontend**:
  - Group creation/management UI
  - Member invitation flow
  - Group Word Bank interface
  - Notification center
  - Share button/option on Word Bank details
  - UI for viewing/copying shared word banks

- **Backend**:
  - Group service
  - Invitation service
  - Shared Word Bank service
  - Notification service
  - Word Bank sharing service (generate link, handle email invites)

## Data Model Changes
```prisma
model Group {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  members   GroupMember[]
  wordBanks WordBank[] // This likely needs adjustment for shared banks vs group banks
}

model GroupMember {
  id      String  @id @default(cuid())
  group   Group   @relation(fields: [groupId], references: [id])
  groupId String
  user    User    @relation(fields: [userId], references: [id])
  userId  String
  role    Role    @default(MEMBER)
}

enum Role {
  ADMIN
  MEMBER
}

// Model for individual word bank sharing
model SharedWordBank {
  id         String   @id @default(cuid())
  wordBank   WordBank @relation(fields: [wordBankId], references: [id])
  wordBankId String   @unique // Ensure one share record per bank
  shareLink  String   @unique // Unique shareable link
  sharedBy   User     @relation(fields: [sharedById], references: [id])
  sharedById String
  createdAt  DateTime @default(now())
  // Add permissions if needed (e.g., view, copy)
}

// Consider how Group Word Banks relate. Is it a specific type of WordBank?
// Or a separate model linking Group and WordBank?
// Example: A WordBank could have an optional groupId field.
// model WordBank {
//   ... existing fields ...
//   groupId String?
//   group   Group?  @relation(fields: [groupId], references: [id])
// }
```

## Implementation Tasks
- [x] TS005-1: Implement Group and GroupMember models
- [x] TS005-2: Implement SharedWordBank model (and potentially adjust WordBank model for group ownership)
- [x] TS005-3: Create group management logic
- [x] TS005-4: Build invitation system
- [x] TS005-5: Implement shared Word Bank functionality (distinguish between group-owned and individually shared)
- [x] TS005-6: Develop role-based permission system
- [x] TS005-7: Create notification service
- [x] TS005-8: Implement Word Bank sharing functionality (link generation, email)
- [x] TS005-9: Build group management UI
- [x] TS005-10: Implement member invitation flow
- [x] TS005-11: Add notification center UI
- [x] TS005-12: Build UI for sharing word banks
- [x] TS005-13: Build UI for viewing/copying shared word banks
- [x] TS005-14: Write unit tests for new services
- [x] TS005-15: Add integration tests for group and sharing features
## UAT Bug Fixes
- [x] Prevent duplicate word bank sharing
- [ ] Prevent duplicate group invitations (regressed - BU-0002)
- [ ] Prevent group creator leaving group (regressed - BU-0003)
- [x] Handle unique constraint error on group invitation
- [x] Improve error handling when group creator attempts to leave group
## UAT Bug Fixes (Frontend)
- [x] Word card error after accepting shared word bank invite
- [x] Missing group invitation acceptance step for new users

## Testing Considerations
1. Verify group creation and deletion flows
2. Test invitation acceptance/rejection
3. Validate role-based permissions
4. Confirm shared Word Bank access (both group-owned and individually shared)
5. Test notification delivery
6. Verify shareable link generation and access
7. Test copying shared word banks
8. Ensure read-only view for shared word banks works correctly