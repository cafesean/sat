# Technical Solution: SRS Practice Enhancements

## Overview
Implementation of spaced repetition system (SRS) practice enhancements including session repeat, card randomization, and word starring features.

## Technical Requirements
1. **Repeat Session**
   - New API endpoint to clone completed session
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
   - API endpoints to toggle star status
   - UI components for starring
   - Filtering capability for starred words

## Technical Requirements
1. **Repeat Session**
   - New API endpoint to clone completed session
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
   - API endpoints to toggle star status
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
  - Session cloning service
  - Word randomization service
  - SRS priority calculation service
  - Star toggle API endpoints
  - Gemini API integration update for multiple sentences

## Data Model Changes
```prisma
model Word {
  // Existing fields
  starred Boolean @default(false)
  sampleSentences String[] // Assuming storing as an array of strings
}
```

## API Changes
1. `POST /api/practice/sessions/:id/clone` - Clone existing session
2. `PUT /api/words/:id/star` - Toggle star status
3. `GET /api/words?starred=true` - Filter starred words
4. Update relevant API endpoints (e.g., word details, practice session) to return multiple sample sentences

## Implementation Tasks
- [ ] Add starred field to Word model
- [ ] Add sampleSentences field to Word model
- [ ] Implement session cloning endpoint
- [ ] Create word randomization service
- [ ] Implement SRS priority algorithm
- [ ] Build Repeat Session UI component
- [ ] Implement star toggle UI
- [ ] Add starred words filter
- [ ] Update Gemini API integration for multiple sentences
- [ ] Update UI to display multiple sample sentences
- [ ] Write unit tests for new services
- [ ] Add integration tests for new endpoints

## Testing Considerations
1. Verify session cloning preserves all settings
2. Test randomization doesn't affect SRS priorities
3. Validate star status persists across sessions
4. Confirm starred words filter works correctly
5. Verify multiple sample sentences are fetched and displayed correctly