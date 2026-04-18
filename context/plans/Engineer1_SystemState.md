# Engineer 1: System Infrastructure & Main Menu

## Role: Lead Frontend Architect

## Task
Refactor the primary `App.jsx` to support a state-driven architecture and build the entry screens (Boot & Menu).

## Files to Work On
- `[MODIFY]` `src/App.jsx`
- `[NEW]` `src/uicomponents/MainMenu.jsx`
- `[NEW]` `src/uicomponents/BootSequence.jsx`

## Scope
### In Scope
- Implement `appState` logic in `App.jsx`.
- Create a high-polish, animated "Boot Sequence" with scrolling logs.
- Create the "The Terminal" Main Menu with standard options (Initiate, Archives, Config).
- Ensure transitions between `BOOT -> MENU -> PLAYING` are smooth.

### Out of Scope
- Implementing the game combat logic.
- Building the Shop or Leaderboard screens (Engineer 2).
- Adding Audio (Engineer 3).

## Tests
- Manual test: Ensure "Establish Link" in the menu transitions the game to the `PLAYING` state.
- Verify that `isGameOver` triggers the `GAMEOVER` status instead of just an overlay.

## Definition of Done (DoD)
- [ ] `App.jsx` uses `case` or `conditional` rendering based on `appState`.
- [ ] `MainMenu` is interactive and visually consistent.
- [ ] `BootSequence` has at least 3 stages of "System Initialization".

## Roadblock Protocol
If the existing `engineState` logic is too coupled to the App lifecycle to move into the `PLAYING` state, STOP and consult the Project Manager.

## Feedback Instructions
Write all completion notes to `context/plans/feedbacks/Engineer1Feedback.md`.
