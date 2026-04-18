# Project Master Details: "PROMPT OVERRIDE"

## Technical Vision
To transform the current "Always-Playing" prototype into a high-polish, state-driven game jam entry. The visual style is **Neural Terminal / Cyberpunk**, utilizing high-contrast colors (Cyan, Red, Green), CRT scanlines, and heavy glitch effects.

## Tech Stack
- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS 4.0 + Vanilla CSS
- **Game Engine**: Custom HTML5 Canvas Renderer
- **Persistence**: `localStorage` (Local Only)
- **Audio**: `Howler.js` (for SFX/Music) + Web Speech API (for Robotic TTS)

## Core Business Objectives
1. **Increase Polish**: Introduce a professional Main Menu, Shop, and Leaderboard.
2. **Onboarding**: Create a "Live Calibration" tutorial to teach players the typing mechanic.
3. **Mechanical Juice**: Add floating damage numbers and cinematic floor title transitions.
4. **Thematic Consistency**: Use Archetypal failure codes (e.g., `NEURAL_REJECTION`) instead of generic "Game Over".

## Shared Source of Truth
- **AppState**: All agents must respect the `appState` enum in `App.jsx`: `BOOT`, `MENU`, `TUTORIAL`, `PLAYING`, `SHOP`, `SETTINGS`, `LEADERBOARD`, `GAMEOVER`.
- **Global Constraints**:
  - Maintain the "Typing-Centric" gameplay. 
  - Do NOT modify the core A* pathfinding or combat math unless requested.
  - All UI must be responsive and use `backdrop-filter: blur()`.
