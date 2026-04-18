# Project Manager: Operational Manual

## Overview
This document guides the Project Manager in validating and merging the parallel outputs of Engineers 1, 2, and 3.

## Sync Points
1. **AppState Integration**: Engineer 1 must complete the basic `appState` setup in `App.jsx` before Engineer 2 can properly bind the Shop/Leaderboard logic.
2. **Audio Triggers**: Engineer 3 needs the event callbacks from `App.jsx` and `CombatSystem.js` to be stable before final sound refined.

## Validation Criteria
### Phase 1: Infrastructure
- Does `App.jsx` render the `MainMenu` on start?
- Is the `bootSequence` present?

### Phase 2: Features
- Finish a floor: Does the game transition to `SHOP`?
- Can you buy a "Material" and see it reflected in the hero's stats?
- Enter a name on Game Over: Does it show up in `LEADERBOARD`?

### Phase 3: Audio
- Is the sidekick speaking with robotic TTS?
- Do combat sounds play?

## Merging Protocol
1. Read `feedbacks/Engineer[X]Feedback.md`.
2. Check for "ROADBLOCK" mentions.
3. If Engineer 1 finishes first, update `Engineer2_Juice.md` to reflect the new state access patterns.
4. If a conflict occurs between UI and Logic, prioritize the custom engine stability (`Renderer.js`).

---
"Leave nothing to guesswork. Ambiguity is the enemy of the jam."
