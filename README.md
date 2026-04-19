# 💠 CHAT BATTLE: NEURAL OVERRIDE

### *Kill and hunt in a sci-fi dungeon - but your sidekick can take over!*

![Chat Battle Banner](https://img.shields.io/badge/AESTHETIC-CYBERNETIC-00ffff?style=for-the-badge)
![Status](https://img.shields.io/badge/STATUS-OPERATIONAL-2cff7a?style=for-the-badge)
![License](https://img.shields.io/badge/LICENSE-GPL--v3-green?style=for-the-badge)

**Chat Battle** is a high-fidelity, hybrid tactical combat game where manual "WASD" action meets natural language AI orchestration. Navigate a corrupted geometry-driven world, collect orbiting materials, and survive the "Glitch" where your unit takes on a defiant mind of its own.

The idea came from a simple thought: what if we add LLM to games? And here it goes—you progress in levels, collect blades, and make use of the rogue mode to eliminate your enemies!

[![Chat Battle Demo](https://img.youtube.com/vi/M1143WuAfK4/maxresdefault.jpg)](https://youtu.be/M1143WuAfK4)

---

## ⚠️ MANDATORY: Neural Link Setup (LLM Setup)

To enable the tactical AI features and the sarcastic sidekick, you **must** host a local Large Language Model (LLM). This project is optimized for **LM Studio**.

> [!IMPORTANT]
> **LM Studio Requirement**
> 1. Download and install [LM Studio](https://lmstudio.ai/).
> 2. Download a compatible model (e.g., `Gemma 2B`, `Mistral 7B`, or `Llama 3`).
> 3. Navigate to the **Local Server** tab (↔️ icon).
> 4. Ensure the server is running on **Port 1234**.
> 
> The game expects the API at: `http://localhost:1234/v1`.

---

## 🕹️ Gameplay Mechanics

### 1. Dual-Mode Control
*   **Manual Override (NORMAL)**: You have direct control. Use **WASD** to move and **SPACE** to fire your primary weapon.
*   **Neural Sync (CHAT)**: Triggered when your **Glitch Intensity** hits 100%. The AI unit takes control. You become the **Operator**, issuing tactical commands via natural language in the chat input.

### 2. Orbiting Blades
Collect **Materials** from the floor or fallen enemies. They orbit your core, passively increasing your Attack and Defense. In AI mode, these can be launched as homing projectiles.

### 3. Tactical Environment
*   **Hazard Sectors (Rooms)**: Procedural dungeons with varying threat levels.
*   **The Glitch**: As you take damage, your unit's stability decreases. Higher glitch levels force the AI into more frequent "Defiant" behaviors.
*   **Sidekick Bot**: Geometric Unit #404 follows you, scavenges items, and offers "helpful" (often sarcastic) tactical quips.

---

## ⌨️ Controls

| Key / Input | Action |
| :--- | :--- |
| **W, A, S, D** | Manual Movement |
| **SPACEBAR** | Primary Attack / Launch Blades |
| **Chat Input** | Issue Commands (e.g., *"run away"*, *"attack the boss"*, *"explore"*, *"please yield control!"*, *"collect all materials"*) |

---

## 🛠️ Development Setup

If you wish to build or modify the game, follow these steps:

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18+)
*   **LM Studio** (Running on port 1234)

### Installation
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-repo/chat-battle.git
    cd chat-battle
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run in development mode**:
    ```bash
    npm run dev
    ```
    The game will be available at `http://localhost:5173`.

---

## 🎨 Aesthetic Notes
Chat Battle features a custom 2D Canvas engine with a hardware-driven aesthetic:
*   **Procedural XOR Circuitry**: Glowing wall textures generated at runtime.
*   **Hexadecimal Feedback**: Damage is calculated and displayed in Hex (e.g., `0x3C`).
*   **Data Fragment Particles**: Destroyed targets explode into spinning `0`s and `1`s.

---

## 🔗 Links & Credits
*   **Play on itch.io**: [stanx19.itch.io/chatbattle](https://stanx19.itch.io/chatbattle)
*   **Sound Source Citation**: [Kenney Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds)

---
*Created for UM Game Jam 2026.*
*Theme: Losing Control*
