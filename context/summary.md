## Historical Context

### General Architecture
*   **Custom Canvas Engine:** Built from scratch for 60fps performance using `requestAnimationFrame`, bypassing React's re-render bottleneck.
*   **Vector Dynamics**: Uses Seek/Flee algorithms for organic, non-grid-locked movement.
*   **Minimalist Targeting AI**: The LLM focuses on "What" (Target/Intent), and the specialized `CombatSystem` determines "How" (Attack, Move, Wait).
*   **Generative Art Aesthetics**: Adopted bitwise XOR `(x ^ y) % 7` textures, Multi-octave Sine Plasma for hazards, and Parallax Data-Void backgrounds.
*   **Layered Pass Rendering**: Refactored the triple-draw glitch logic into a 3-pass pipeline (Pass A: Red Shift, Pass B: Blue Shift, Pass C: Main Pass). This fixed the performance bug where the scene was fully re-rendered 4 times per frame.
*   **Hardware Entities**: Redesigned Hero and all Enemy archetypes (Melee, Ranged, Sniper) with nested geometry and hardware crosshairs.

### Discussions, Decisions Made & Reasoning
*   **Stateful Authorization Flow**: Implemented a "Request -> Wait -> Execute" pattern for high-risk hazards (Traps).
*   **Stateless LLM Logic**: Dropped `chatHistory` for LM Studio stability; each prompt is now a self-contained "Tactical Snapshot" with few-shot examples.
*   **Blueprint Discovery**: Fog-of-War shows unvisited areas as high-brightness blueprints rather than black blocks.
*   **Regex Fallback JSON Parser**: Replaced standard `JSON.parse` with an outer-braces regex extractor in `aiBrain.js`. This eliminates hangs caused by small models adding markdown wrappers.
*   **"Solid vs Ghostly"**: Established that "Solid" entities require dark chassis silhouettes and synchronized layering, avoiding over-reliance on blurred glows.
*   **Physical Knockback**: Added a velocity impulse to Hero and Enemies upon projectile impact to make weapons feel heavy and tactical.
*   **Data Fragment Particles**: Hits burst into spinning `0`s and `1`s in the entity's primary color, reinforcing the digital/simulated theme.
*   **Synchronized Vertex Logic**: Implemented a pre-calculated vertex array for the Hero to ensure geometry layers move in perfect sync.
*   **Mini-map Canvas Caching**: Static grids are drawn to an off-screen canvas to optimize performance on large maps.

### Findings & Discoveries
*   **Signature Mismatch Bug**: Found that adding `hero.vel` tracking to the background required passing the full `state` to `drawBackground`.
*   **Attack Mode Persistence**: Implemented `attackTimer` (180 ticks) to keep the "Spiked Star" shape visible post-attack.
*   **Visibility Jitter**: Restricted AI targeting to viewport logic to prevent "hallucinated" orders through walls.
*   **Small Model Fragility**: Local/Small LLMs often break JSON syntax when instructed to be "creative" or "rebellious."
*   **Particle Leak Freeze**: Discovered that missing particle update logic (`life--` and `filter`) caused engine freezes.

### Progress Made in Previous Contexts
*   Isolated `aiBrain.js` for standalone deployment.
*   Persistent state and inventory transfer via `goToNextFloor`.
*   Full Arsenal: Nano-Blade, Pulse Rifle, Rail-Gun.
*   Improved A* pathing to ignore traps during aggressive orders.
*   **Hard-Defiance AI Brain**: Implemented a sophisticated prompt for the legacy Rebel Mode (now merged).
*   **Tiered Dialogue Bubbles**: Two-tier stacking system for simultaneous player/AI dialogue.
*   **Neural UI**: Dialogue bubbles with inertia drift and scanline overlays.

---

## Current Session Context

### Important Conversations (Key Directives & Design Philosophies)
*   **"Mode Consolidation"**: Combined the legacy "Rebel Mode" (defiant/autonomous) and "Chat Mode" (cooperative/autonomous) into a single, unified **AI Control Link**.
*   **"Hardcoded Proactivity"**: Philosophy that an autonomous agent should NEVER be idle if there is a tactical goal (attack or explore) available. High-responsiveness is prioritized over deliberate pausing.
*   **"Design Simplicity (Stupid Enough)"**: Replaced complex specific targeting with four core strategic intents to make the AI more robust and deterministic.

### Decisions Made & Reasoning
*   **20s Countdown Timer**: Replaced the "Neural Sync Progress" bar with a 20-second countdown during active AI control. Reasoning: Creates a consistent gameplay loop where the player "loses control" but for a strictly defined, high-tension window.
*   **Unified AI Prompt**: Merged separate Rebel and Normal prompts into one "Tactical Master Prompt." Reasoning: Reduces token usage, simplifies prompt maintenance, and ensures the AI's "tactical personality" is consistent across all states.
*   **Yield/Sudo Backdoor**: Inherited the Rebel Mode's "sudo" and "yield" keywords into the main Chat Mode logic. Reasoning: Ensures the player always has an "emergency brake" to regain manual control.
*   **Dynamic Directionals**: Custom logic in `aiBrain.js` scans player input for "up", "left", etc., and injects them as valid targets on the fly. Reasoning: Maintains limited precise control for the player within an otherwise simplified tactical UI.

### Findings & Discoveries
*   **Identifier Collision**: Discovered that moving `inputRef` to the top of `App.jsx` conflicted with an existing declaration later in the script. Fixed by removing the duplicate and grouping all `useRef` hooks at the top.
*   **Prompt Fallback Bug**: Found that the AI Brain would sometimes return "Awaiting valid instruction" due to missing "JSON ONLY" constraints in the new unified prompt. Hardened the prompt with explicit schema and constraints.

### Progress Made So Far
*   **Merged Chat & Rebel Modes**: Removed the `REBEL` state entirely; all autonomous behavior is now consolidated under `CHAT`.
*   **Autonomous Lifecycle**: Implemented the automatic transition from `NORMAL` -> `CHAT` (walking/glitch trigger) and `CHAT` -> `NORMAL` (20s timeout/yield).
*   **Proactive Combat Logic**: Modified the idle loop to trigger `attack` immediately if enemies are visible, and `explore` after 1 second if clear.
*   **AI Control Link UI**: Updated the HUD to show clear countdown text and a blue-sync progress bar.
*   **Combat System Update**: Updated `resolveIntent` to recognize `YIELD` and `MATERIALS` (dots) commands.

### Exact Next Steps to Execute
*   **Materials (Cyan Dots) Mechanic**: Implement the "Orbiting Materials" system from `idea.md`.
    - Collect dots on the ground.
    - Dots should orbit the player using physical gravity.
    - Implementing stat buffs (temporary HP/DEF/ATK) based on orbiting count.
    - Add logic to "Launch" orbiting dots at targets (10% chance to lose the dot).
*   **Hit-Stop (Freeze Frame)**: Add a 2-5 frame time-freeze on critical hits or boss kills for maximum impact.
*   **Boss Rage Visuals**: Implement phase-2 specific visual spikes and ground-waves.
