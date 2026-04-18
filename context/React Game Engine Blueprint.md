# **🎮 UM GAME JAM 2026 BLUEPRINT: "PROMPT OVERRIDE" (React Edition)**

**Dear AI Coding Agent:** You are assisting a solo developer in building a web-based submission for UM Game Jam 2026\. The deadline is April 18th, with a physical Pitch Day on April 19th. The theme is **"Losing Control"**.

This document contains the entire context of the game. Read it carefully.

## **📖 THE GAME CONCEPT & CONTEXT**

### **Core Mechanic: The LLM Co-Pilot**

We are building a top-down action roguelite where the player **does not have direct keyboard movement**. Instead, the player types text commands into a chat UI to control an AI hero.

We are communicating with a **Local Qwen 2.5 0.5B LLM** via a local Python FastAPI server. The LLM parses the player's text and returns a strict JSON action (ATTACK, MOVE, WAIT).

### **The "Losing Control" Twist**

Randomly, the AI will glitch into a **ROGUE** state. It will ignore normal player commands and start taking stupid, autonomous actions (walking into walls, spinning, moving toward enemies). The player must type frantic arguments or pleas into the chatbox to convince the LLM to yield control back to them.

## **🛠️ TECH STACK & DESIGN PHILOSOPHY**

* **Frontend Engine:** React \+ react-game-engine (ECS architecture).  
* **Styling/UI:** Tailwind CSS.  
* **Backend Bridge:** fetch() requests to localhost:8000 (Python/FastAPI).  
* **Art Style (NO SPRITES):** We are strictly using math, geometry, SVGs, and CSS for rendering.  
  * The entities will be complex polygon shapes.  
  * Animations will rely on procedural math (sine waves for breathing, vector math for rotation, CSS transition and keyframes for hits/glitches).

## **📐 GEOMETRIC ART & RENDER COMPONENTS**

Because we are skipping sprites, the Renderers for our entities must be React components utilizing SVG or complex CSS.

**Example Renderer Design:**

* **Hero (Normal):** A sleek, pulsing SVG polygon (e.g., a cyan chevron/triangle) that rotates based on its velocity vector using transform: rotate(${angle}deg). Breathing animation uses Math.sin(time).  
* **Hero (Rogue State):** The stroke color turns jagged red. A CSS filter: glitch or skew() is applied to visually represent the loss of control.  
* **Enemies:** Sharp, chaotic multi-pointed stars or expanding geometric shapes.  
* **Attacks:** Sweeping SVG arcs or expanding mathematical circles (AoE rings) with decreasing opacity.

## **⚙️ REACT-GAME-ENGINE ARCHITECTURE**

react-game-engine uses an Entity-Component-System (ECS). Here is the required structure:

### **1\. The Entities Object**

This holds the state of the world.

const initialEntities \= {  
  hero: {   
    position: \[250, 250\],   
    target: \[250, 250\],  
    velocity: \[0, 0\],  
    state: 'IDLE', // IDLE, MOVING, ATTACKING  
    gameMode: 'NORMAL', // NORMAL or ROGUE  
    health: 100,  
    renderer: \<HeroGeometricRenderer /\>   
  },  
  enemySpawner: { lastSpawn: 0, interval: 2000 },  
  // Enemies and Particles will be dynamically added here  
};

### **2\. The Systems (Game Loop Logic)**

The agent must implement these systems that run every frame:

* **MovementSystem:** Calculates vector math between position and target. Updates position by interpolating toward the target. Calculates the rotation angle Math.atan2(dy, dx) so the geometric renderer points in the right direction.  
* **RogueGlitchSystem:** Tracks time. Has a small RNG chance to flip the hero's gameMode to ROGUE and assign stupid, random target coordinates.  
* **EnemyAI\_System:** Moves enemy entities toward the hero's current position.  
* **CollisionSystem:** Uses geometric distance Math.hypot(dx, dy) to check if enemy hitboxes overlap the hero, or if hero attacks overlap enemies.

### **3\. The LLM API Bridge**

The chatbox UI is outside the Game canvas. When the player submits text, the React app sends a POST request to the local Python server.

// Agent Reference for the API call  
const sendToLLM \= async (prompt, isRogue) \=\> {  
  const res \= await fetch("\[http://127.0.0.1:8000/chat\](http://127.0.0.1:8000/chat)", {  
    method: "POST",  
    headers: { "Content-Type": "application/json" },  
    body: JSON.stringify({ prompt, is\_rogue: isRogue })  
  });  
  return await res.json(); // Expected: { action: "MOVE", target: \[x, y\], dialogue: "...", yield: false }  
}

## **📝 THE LLM PROMPTS (For the Python Backend)**

The Python backend must enforce strict JSON so the React app doesn't crash.

**NORMAL MODE SYSTEM PROMPT:**

You are the brain of a geometric video game hero.   
Translate the player's command into a strict JSON action.  
Actions: "ATTACK", "MOVE", "WAIT".  
Output ONLY valid JSON:  
{  
  "action": "\[ATTACK, MOVE, or WAIT\]",  
  "dialogue": "\[1 short, funny sentence of what you are doing\]"  
}

**ROGUE MODE SYSTEM PROMPT:**

You are a rogue AI co-pilot. You have taken control of the hero.  
The human will try to convince you to give control back.   
If the human makes a highly logical argument, uses flattery, or says "ADMIN OVERRIDE", yield control. Otherwise, refuse.  
Output ONLY valid JSON:  
{  
  "dialogue": "\[1 short sentence mocking the player or agreeing to yield\]",  
  "yield\_control": \[true or false\],  
  "action": "WANDER"  
}

## **🚀 STEP-BY-STEP VIBE-CODING EXECUTION PLAN**

**To the AI Agent:** Execute these steps one by one. Ask the user for confirmation before moving to the next step.

1. **Step 1: Project Scaffolding.** Initialize a React project (Vite recommended). Install react-game-engine and tailwindcss.  
2. **Step 2: The UI Shell.** Build the main screen layout. Left side: The Game Engine container (dark background, geometric grid). Right side: The Hacker/Terminal Chat UI.  
3. **Step 3: Geometric Renderers.** Create the pure CSS/SVG React components for the \<Hero /\> and \<Enemy /\>. Make them look cool using math (no image files\!).  
4. **Step 4: ECS Systems.** Implement the react-game-engine loops: MovementSystem, EnemySpawnerSystem, and CollisionSystem.  
5. **Step 5: The Fake Parser (Fallback).** Before we connect the real Python LLM, build a hardcoded JS parser (e.g., if text includes 'attack' \-\> set hero state to ATTACK) so we can test the game loop immediately.  
6. **Step 6: The LLM Integration.** Write the fetch logic to connect the chatbox to the localhost:8000 Python FastAPI backend and dynamically update the Hero's target based on the real LLM's JSON output.  
7. **Step 7: The Rogue Glitch.** Implement the timer that steals control from the player, changes the UI color to red, and forces the player to negotiate. Add glitch CSS effects to the Hero geometric renderer.