# UI Mastery Plan: "PROMPT OVERRIDE"

This document serves as the architectural blueprint for the Game Jam UI overhaul. The theme is **"Neural Terminal / System Intrusion"**.

## 1. Game State Machine
The top-level `App` state will now manage a `gameState` enum to handle transitions:
- `BOOT`: Initial splash and loading sequence.
- `MENU`: Main dashboard for the operator.
- `PLAYING`: The core game loop.
- `SHOP`: The "Maintenance Deck" between floors.
- `SETTINGS`: Global configuration overlay.
- `LEADERBOARD`: The "Operator Archives / Blacklist".
- `GAMEOVER`: Post-termination cleanup and name entry.

---

## 2. Screen Blueprints

### A. The Neural Boot Sequence (`BOOT`)
- **Visuals**: Rapid-fire system logs scrolling vertically. ASCII art of a "Neural Core".
- **Interaction**: Press [ENTER] to "Establish Link".
- **Lore**: Mentions "Kernel 4.04", "Operator Sync 99%", "Direct Link: UNSTABLE".

### B. "The Terminal" Main Menu (`MENU`)
- **Background**: Parallax data-rain (procedural 0s and 1s).
- **Options**:
  1. `[ INITIATE_SYNC ]`: Start specific floor sequence.
  2. `[ OPERATOR_ARCHIVES ]`: View top scores.
  3. `[ CONFIG_LOADER ]`: Settings overlay.
  4. `[ SYSTEM_EXIT ]`: Close link.

### C. Maintenance Deck (`SHOP`)
- **Trigger**: Occurs **after every floor**. Instead of an overlay, it is a dedicated screen.
- **Currency**: `Data Fragments` (Current Score).
- **Inventory**:
  - `HP_STABILIZE` (Restore health).
  - `SYNAPTIC_SPEED` (Increase movement speed).
  - `MATERIAL_FORGE` (Purchase orbiting blades).
- **UI Style**: Glassmorphism grid with "BUY" buttons that flicker on hover. Large "INITIATE_NEXT_FLOOR" button at the bottom.

### D. Cinematic Floor Entry
- **Visuals**: A massive, screen-centered glitch text (e.g., `> SECTOR_04_INIT`) appearing for 2.5 seconds.
- **Metadata (Game Jam Juice)**: Random but high-tech "System Stats" displayed below the title in small fonts:
  - `[LUCK_INDEX: 4.2]`, `[THREAT_LEVEL: OMEGA]`, `[SYNC_RESTRICTION: NONE]`.
- **Effect**: Screenshake and chromatic aberration peak during the flash.

### E. Floating Damage Numbers
- **Visuals**: Hexadecimal strings (e.g., `0xAF`, `0x2D`) jumping off enemies when hit.
- **Color**: Green for player damage to enemy, Red for enemy damage to player.
- **Settings**: Toggleable in the config.

---

## 3. Persistent Data Structure

### Leaderboard Entry
```json
{
  "name": "OPERATOR_ID",
  "floor": 1,
  "score": 0,
  "cause": "PROJECTILE_TRAUMA", // Archetypal codes: PROJECTILE_TRAUMA, KINETIC_DISSIPATION, NEURAL_REJECTION, CORE_OVERHEAT
  "date": "2026-04-18"
}
```

### Settings Configuration
```json
{
  "glitchIntensity": 0.5,
  "showDamageNumbers": true,
  "showTutorial": true,
  "masterVolume": 0.8
}
```

---

## 4. The "Operator Onboarding" (Live Calibration)
**Approach**: A hardcoded "Floor 0" generated via a specialized `initializeTutorialWorld()` function.
1. **Calibrate Vectors**: Player must move 50 units in any direction using WASD.
2. **Sync Command Intake**: Player must type "move" or "attack" to target a dummy enemy.
3. **Lore Injection**: System logs appearing in the chat: *"Calibrating Neural Link... Vector Sync: OK."*
4. **Transition**: Once completed, the "Establish Link" button in the Menu becomes active.
5. **Skip Button**: A subtle `[ SKIP_CALIBRATION ]` button in the corner for veteran operators.

---

## 5. Implementation Notes for Next Agent
- **Componentize**: Keep `MainMenu`, `Shop`, and `Leaderboard` in separate React files in `src/uicomponents/`.
- **Transitions**: Use CSS `opacity` and `transform: scale()` for smooth entry/exit.
- **Z-Index**: Ensure the `Canvas` is at `z-0` and all UI elements are `z-10+`.
li