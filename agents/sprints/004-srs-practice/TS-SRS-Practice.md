# Technical Solution: SRS Practice Enhancements

## Overview
Implementation of spaced repetition system (SRS) practice enhancements including session repeat, card randomization, and word starring features.

## Technical Requirements
1. **Repeat Session**
   - Implement logic to clone completed session
   - UI button to trigger repeat
   - Preserve original session settings

2. **Card Randomization**
   - Randomize word order before session start
   - Maintain randomization while respecting SRS priorities

3. **Spaced Repetition Integration**
   - Calculate word priority based on:
     - Previous performance
     - Time since last review
     - Mastery level

4. **Word Starring**
   - Add `starred` boolean field to Word model
   - Implement logic to toggle star status
   - UI components for starring
   - Filtering capability for starred words

5. **Improved Sample Sentences**
   - Modify Gemini API call to request multiple sentences
   - Update data model to store multiple sentences
   - Update UI to display multiple sentences

## System Components
- **Frontend**:
  - New Repeat Session button component
  - Star toggle UI component
  - Starred words filter component
  - UI component to display multiple sample sentences

- **Backend**:
  - Session cloning logic
  - Word randomization service
  - SRS priority calculation service
  - Star toggle logic
  - Gemini API integration update for multiple sentences

## Data Model Changes
```prisma
model Word {
  // Existing fields
  starred Boolean @default(false)
  sampleSentences String[] // Assuming storing as an array of strings
}
```

## Implementation Tasks
- [ ] TS004-2: Add sampleSentences field to Word model
- [ ] TS004-3: Implement session cloning logic
- [ ] TS004-4: Create word randomization service
- [ ] TS004-5: Implement SRS priority algorithm
- [ ] TS004-6: Build Repeat Session UI component
- [ ] TS004-7: Implement star toggle UI
- [ ] TS004-8: Add starred words filter
- [ ] TS004-9: Update Gemini API integration for multiple sentences
- [ ] TS004-10: Update UI to display multiple sample sentences
- [ ] TS004-11: Write unit tests for new services
- [ ] TS004-12: Add integration tests for new features

## Testing Considerations
1. Verify session cloning preserves all settings
2. Test randomization doesn't affect SRS priorities
3. Validate star status persists across sessions
4. Confirm starred words filter works correctly
5. Verify multiple sample sentences are fetched and displayed correctly