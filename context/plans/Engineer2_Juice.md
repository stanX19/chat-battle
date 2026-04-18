# Engineer 2: UI Features & Visual Juice

## Role: Senior UI/Graphics Engineer

## Task
Implement the secondary UI features that provide progression and kinetic feedback.

## Files to Work On
- `[MODIFY]` `src/engine/Renderer.js`
- `[MODIFY]` `src/App.jsx` (integration only)
- `[NEW]` `src/uicomponents/Shop.jsx`
- `[NEW]` `src/uicomponents/Leaderboard.jsx`
- `[NEW]` `src/uicomponents/FloorTitle.jsx`

## Scope
### In Scope
- **Maintenance Deck (Shop)**: Build a glassmorphism shop UI using `Data Fragments` (score) as currency.
- **Operator Archives (Leaderboard)**: Implement `localStorage` persistence and display high scores with "Archetypal Death" codes.
- **Cinematic Transitions**: Create the glitchy Floor Title overlay with random metadata stats.
- **Floating Damage Numbers**: Update `Renderer.js` to draw jumping hex-strings when damage occurs.

### Out of Scope
- Core game physics or pathfinding.
- Sound effect integration.
- Refining the AI brain prompt.

## Tests
- Verify that score is correctly subtracted after a purchase in the Shop.
- Verify that high scores persist after a page refresh.
- Check "Settings" toggle for Damage Numbers.

## Definition of Done (DoD)
- [ ] Shop is functional between floors.
- [ ] Leaderboard displays Rank, Name, Floor, and Cause of Death.
- [ ] Floor Transitions use the `> SECTOR_X_INIT` glitch style.
- [ ] Damage numbers are colorful and "hexadecimal" formatted.

## Feedback Instructions
Write all completion notes to `context/plans/feedbacks/Engineer2Feedback.md`.
