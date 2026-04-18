# Engineer 3: Auditory Systems & Robotic TTS

## Role: Senior Audio / UX Engineer

## Task
Implement the sound engine, sound mappings, and the robotic voice for the sidekick bot.

## Files to Work On
- `[NEW]` `src/engine/utils/AudioPlayer.js`
- `[MODIFY]` `src/App.jsx` (binding to events)
- `[MODIFY]` `src/engine/systems/CombatSystem.js` (adding zvuk triggers)

## Scope
### In Scope
- **Audio Core**: Integrate `Howler.js` and set up the Sound Registry (UI beeps, Combat swishes, Ambient drones).
- **Music Manager**: Implement crossfading between "Normal" (Ambient) and "Chaos" (Intense) loops.
- **Robotic TTS**: Use `window.speechSynthesis` to give the Sidekick a voice. Pitch-shift for a clinical effect.

### Out of Scope
- Creating the actual MP3 files (Player will provide these in `public/assets/audio/`).
- Building UI components.

## Tests
- Ensure sound doesn't "stack" excessively (use volume limits or debouncing).
- Verify that TTS triggers when the sidekick speaks a line.

## Definition of Done (DoD)
- [ ] Music crossfades correctly when switching `gameMode`.
- [ ] Combat SFX (Attack/Hit) are audible.
- [ ] Sidekick voice is functional and sounds robotic.

## Roadblock Protocol
If `Howler.js` is not loading properly via the Vite dev server, document the exact error in feedback.

## Feedback Instructions
Write all completion notes to `context/plans/feedbacks/Engineer3Feedback.md`.
