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
  - API endpoints for shared word bank access and copying

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

## API Changes
1. `POST /api/groups` - Create new group
2. `POST /api/groups/:id/invite` - Send group invitation
3. `POST /api/groups/:id/join` - Accept invitation
4. `GET /api/groups/:id/members` - List group members
5. `PUT /api/groups/:id/members/:userId/role` - Update member role
6. `DELETE /api/groups/:id/members/me` - Leave group
7. `DELETE /api/groups/:id` - Delete group
8. `POST /api/wordbanks/:id/share` - Generate shareable link/send email invite
9. `GET /api/sharedwordbanks/:shareLink` - View shared word bank (read-only)
10. `POST /api/sharedwordbanks/:shareLink/copy` - Copy shared word bank

## Implementation Tasks
- [ ] Implement Group and GroupMember models
- [ ] Implement SharedWordBank model (and potentially adjust WordBank model for group ownership)
- [ ] Create group management endpoints
- [ ] Build invitation system
- [ ] Implement shared Word Bank functionality (distinguish between group-owned and individually shared)
- [ ] Develop role-based permission system
- [ ] Create notification service
- [ ] Implement Word Bank sharing functionality (link generation, email)
- [ ] Build group management UI
- [ ] Implement member invitation flow
- [ ] Add notification center UI
- [ ] Build UI for sharing word banks
- [ ] Build UI for viewing/copying shared word banks
- [ ] Write unit tests for new services
- [ ] Add integration tests for group and sharing features

## Testing Considerations
1. Verify group creation and deletion flows
2. Test invitation acceptance/rejection
3. Validate role-based permissions
4. Confirm shared Word Bank access (both group-owned and individually shared)
5. Test notification delivery
6. Verify shareable link generation and access
7. Test copying shared word banks
8. Ensure read-only view for shared word banks works correctly