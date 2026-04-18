# Sound System Architecture: "Neural Auditory Link"

For a high-stakes roguelite like *Prompt Override*, sound is 50% of the atmosphere. We will use a **Layered Synths** approach—mixing clean, clinical electronic sounds with distorted, "glitchy" noise.

## 1. Technical Implementation
- **Library**: `Howler.js` (Recommended). It handles audio sprites and multi-channel playback efficiently.
- **Audio Manager**: A centralized utility to trigger one-shot SFX and crossfade between music layers.
- **Dynamic Layers**: The Music should have two layers:
  - **Layer A**: Ambient Bass (Playing always).
  - **Layer B**: Intense Percussion (Fades in during Combat or Rebel Mode).

---

## 2. The Sound Registry (Required Assets)

### A. UI & System (`/assets/audio/ui/`)
1. `BOOT_INIT.mp3`: A series of fast-paced modulated beeps (like a 56k modem in the future).
2. `MENU_SELECT.mp3`: A sharp, high-frequency "tink" for menu clicks.
3. `GLITCH_TRANSITION.wav`: A 1-second burst of white noise for screen shifts.
4. `TYPE_KEY.mp3`: Mechanical keyboard sound (short/fast) for the chat input.

### B. Combat & Feedback (`/assets/audio/combat/`)
1. `BLADE_SWISH.mp3`: A synthetic "whoosh" for orbiting blade attacks.
2. `PULSE_FIRE.mp3`: A punchy "pew" for ranged weapons.
3. `RAILGUN_CHARGE.mp3`: A 0.5s escalating hum followed by a crack.
4. `HIT_DATA.wav`: A "bit-crushed" crunch sound when hitting enemies.
5. `PLAYER_IMPACT.mp3`: A low-frequency thud with a signal-loss flicker.
6. `MATERIAL_PICKUP.mp3`: A rising crystalline chime.

### C. Atmospheric Music (`/assets/audio/music/`)
1. `NORMAL_MODE.mp3`: A cold, atmospheric synth-wave loop (80-90 BPM).
2. `REBEL_MODE_STINGER.mp3`: An aggressive 2-second alert sound when Rebel mode starts.
3. `CHAOS_LOOP.mp3`: A high-tempo (160 BPM) breakbeat or industrial techno loop.

---

## 3. The "Juice" (Sound Polish)
- **Pitch Randomization**: The "Hit" and "Fire" sounds should have a ±10% pitch variance so they don't feel repetitive.
- **Low-Pass Filtering**: When the game is paused or in a menu, we can apply a "muffled" filter to the gameplay music.
- **Glitch Sync**: When the `glitchIntensity` is high, we can trigger small bursts of static `SFX_STATIC` randomly.

---

## 4. Next Steps for Operator
1. **Gather Assets**: Download/Create the files listed above.
2. **Setup Folder**: Create `public/assets/audio/`.
3. **Integration**: The Execution Agent will then bind these sounds to the `executeCommand` and `onDamage` callbacks in `App.jsx`.
### D. Robotic System Voice (Sidekick)
Instead of an external API, we will use the **Web Speech API** (`window.speechSynthesis`). It is free, built into browsers, and requires no keys.

#### Implementation Logic:
```javascript
const speak = (text) => {
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(text);
  
  // Find a cold, robotic voice (typically 'Google US English' or 'Samantha')
  const voices = synth.getVoices();
  utter.voice = voices.find(v => v.name.includes('Google')) || voices[0];
  
  utter.pitch = 0.5; // Lower pitch = More robotic
  utter.rate = 1.1;  // Slightly faster for clinical feel
  utter.volume = 0.8;
  
  synth.speak(utter);
};
```
- **Filter Hook**: We can trigger `speak(dialogue)` whenever `sidekick.dialogue` or `hero.dialogueTier0` is updated in `App.jsx`.
