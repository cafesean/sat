# Sprint 2: User Profile & Settings

## Profile Page Implementation

* ✅ Create profile page route: `src/app/profile/page.tsx`
* ✅ Implement profile form with fields:
  - Name (text input)
  - Grade level (select dropdown with options 1-16)
  - Language preference (select dropdown with: English, Spanish, French, German, Chinese (Simplified), Chinese (Traditional), Japanese, Korean, Bahasa, Malay, Hindi, Vietnamese, Thai)
* ✅ Add avatar feature:
  - Allow upload/change of profile picture
  - S3 storage integration
* ✅ Create `user.updateProfile` tRPC mutation
* ✅ Add profile link to navigation

## Backend Changes

* ✅ Update User model validation in `src/schemas/auth.schema.ts`
* ✅ Create `userRouter` with profile-related procedures

## UI Components

* ✅ Create reusable ProfileForm component
* ⬜ Implement AvatarUpload component
* ✅ Add loading states and error handling
Add flags into languages list
"Save" button should become enabled only if any of the input fields are changed. The button becomes disabled after save is completed.
Profile page should be a modal, not a full page


## Next Steps
* Implement avatar upload functionality
* Add profile completion indicators
* Connect grade level to practice difficulty
