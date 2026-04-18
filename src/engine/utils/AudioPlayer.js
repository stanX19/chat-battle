import { Howl, Howler } from 'howler';

const SOUND_ROOT = '../../../assets/sounds/kenney_sci-fi-sounds/Audio';
const JAM_SOUND_ROOT = '../../../assets/sounds/my-sound';

const toAssetUrl = (file) => new URL(`${SOUND_ROOT}/${file}`, import.meta.url).href;
const toJamAssetUrl = (file) => new URL(`${JAM_SOUND_ROOT}/${file}`, import.meta.url).href;

class AudioPlayer {
  constructor() {
    this.masterVolume = 0.85;
    this.musicVolume = 0.45;
    this.sfxVolume = 0.8;
    this.ttsVolume = 0.75;

    this.soundInstances = new Map();
    this.lastPlayedAt = new Map();
    this.activeVoices = new Map();
    this.missingSoundWarnings = new Set();
    this.lastRandomChoiceByGroup = new Map();

    this.currentMusicId = null;
    this.currentMusicHowl = null;

    this.speechQueue = [];
    this.speechBusy = false;
    this.lastSpeechAt = 0;
    this.voices = [];

    this.soundRegistry = {
      attack_blade: {
        src: toAssetUrl('forceField_001.ogg'),
        baseVolume: 0.7,
        cooldownMs: 80,
        maxConcurrent: 3,
        rateJitter: 0.08
      },
      attack_pulse: {
        src: toAssetUrl('laserSmall_001.ogg'),
        baseVolume: 0.65,
        cooldownMs: 65,
        maxConcurrent: 4,
        rateJitter: 0.1
      },
      attack_rail: {
        src: toAssetUrl('laserLarge_002.ogg'),
        baseVolume: 0.75,
        cooldownMs: 120,
        maxConcurrent: 2,
        rateJitter: 0.05
      },
      enemy_fire: {
        src: toJamAssetUrl('pew.m4a'),
        baseVolume: 0.85,
        cooldownMs: 100,
        maxConcurrent: 4,
        rateJitter: 0
      },
      enemy_hit: {
        src: toAssetUrl('impactMetal_001.ogg'),
        baseVolume: 0.65,
        cooldownMs: 45,
        maxConcurrent: 5,
        rateJitter: 0.12
      },
      hero_hit: {
        src: toAssetUrl('explosionCrunch_001.ogg'),
        baseVolume: 0.72,
        cooldownMs: 80,
        maxConcurrent: 2,
        rateJitter: 0.08
      },
      pickup_material: {
        src: toAssetUrl('computerNoise_003.ogg'),
        baseVolume: 0.55,
        cooldownMs: 100,
        maxConcurrent: 2,
        rateJitter: 0.04,
        maxDurationMs: 140
      },
      pickup_heal: {
        src: toAssetUrl('forceField_004.ogg'),
        baseVolume: 0.6,
        cooldownMs: 100,
        maxConcurrent: 2,
        rateJitter: 0.05,
        maxDurationMs: 180
      },
      pickup_score: {
        src: toAssetUrl('computerNoise_002.ogg'),
        baseVolume: 0.55,
        cooldownMs: 100,
        maxConcurrent: 2,
        rateJitter: 0.05,
        maxDurationMs: 140
      },
      pickup_logic: {
        src: toAssetUrl('computerNoise_000.ogg'),
        baseVolume: 0.58,
        cooldownMs: 100,
        maxConcurrent: 2,
        rateJitter: 0.03,
        maxDurationMs: 140
      },
      pickup_core: {
        src: toAssetUrl('engineCircular_002.ogg'),
        baseVolume: 0.62,
        cooldownMs: 120,
        maxConcurrent: 2,
        rateJitter: 0.05,
        maxDurationMs: 200
      },
      pickup_defense: {
        src: toAssetUrl('impactMetal_003.ogg'),
        baseVolume: 0.58,
        cooldownMs: 120,
        maxConcurrent: 2,
        rateJitter: 0.04,
        maxDurationMs: 180
      },
      pickup_vitality: {
        src: toAssetUrl('spaceEngineSmall_002.ogg'),
        baseVolume: 0.62,
        cooldownMs: 120,
        maxConcurrent: 2,
        rateJitter: 0.04,
        maxDurationMs: 200
      },
      pickup_weapon: {
        src: toAssetUrl('laserLarge_004.ogg'),
        baseVolume: 0.6,
        cooldownMs: 140,
        maxConcurrent: 2,
        rateJitter: 0.03,
        maxDurationMs: 220
      },
      victory_why_you_so_pro: {
        src: toJamAssetUrl('whyYouSoPro.m4a'),
        baseVolume: 0.95,
        cooldownMs: 500,
        maxConcurrent: 1,
        rateJitter: 0
      },
      victory_congratulations: {
        src: toJamAssetUrl('Congrations.m4a'),
        baseVolume: 0.95,
        cooldownMs: 500,
        maxConcurrent: 1,
        rateJitter: 0
      },
      loss_emotional_damage: {
        src: toJamAssetUrl('EmotionalDamage.m4a'),
        baseVolume: 0.95,
        cooldownMs: 500,
        maxConcurrent: 1,
        rateJitter: 0
      },
      loss_fahhh: {
        src: toJamAssetUrl('FAHHH.m4a'),
        baseVolume: 0.95,
        cooldownMs: 500,
        maxConcurrent: 1,
        rateJitter: 0
      },
      boss_down: {
        src: toAssetUrl('lowFrequency_explosion_000.ogg'),
        baseVolume: 0.8,
        cooldownMs: 400,
        maxConcurrent: 1,
        rateJitter: 0
      }
    };

    Howler.volume(this.masterVolume);
    this.loadVoices();
  }

  loadVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    this.voices = synth.getVoices() || [];
    if (this.voices.length === 0) {
      synth.onvoiceschanged = () => {
        this.voices = synth.getVoices() || [];
      };
    }
  }

  getSound(id) {
    if (this.soundInstances.has(id)) return this.soundInstances.get(id);
    const def = this.soundRegistry[id];
    if (!def) return null;

    const howl = new Howl({
      src: [def.src],
      preload: true,
      volume: (def.baseVolume ?? 1) * this.sfxVolume,
      pool: 8
    });
    this.soundInstances.set(id, howl);
    return howl;
  }

  playSound(id, opts = {}) {
    const def = this.soundRegistry[id];
    if (!def) {
      if (!this.missingSoundWarnings.has(id)) {
        this.missingSoundWarnings.add(id);
        console.warn(`[AudioPlayer] Unknown sound id: ${id}`);
      }
      return;
    }

    const now = Date.now();
    const lastAt = this.lastPlayedAt.get(id) || 0;
    const cooldownMs = opts.cooldownMs ?? def.cooldownMs ?? 0;
    if (now - lastAt < cooldownMs) return;

    const activeCount = this.activeVoices.get(id) || 0;
    const maxConcurrent = opts.maxConcurrent ?? def.maxConcurrent ?? 4;
    if (activeCount >= maxConcurrent) return;

    const howl = this.getSound(id);
    if (!howl) return;

    const volumeScale = opts.volumeScale ?? 1;
    const targetVolume = Math.max(
      0,
      Math.min(1, (def.baseVolume ?? 1) * this.sfxVolume * volumeScale)
    );
    howl.volume(targetVolume);

    const jitter = def.rateJitter ?? 0;
    const baseRate = opts.baseRate ?? 1;
    const rate = Math.max(0.5, Math.min(2, baseRate + (Math.random() * 2 - 1) * jitter));
    howl.rate(rate);

    const soundId = howl.play();
    this.lastPlayedAt.set(id, now);
    this.activeVoices.set(id, activeCount + 1);

    // Auto-stop after maxDurationMs to prevent long SFX from running too long
    const maxDuration = opts.maxDurationMs ?? def.maxDurationMs;
    if (maxDuration) {
      window.setTimeout(() => howl.stop(soundId), maxDuration);
    }

    const cleanup = () => {
      const remaining = Math.max(0, (this.activeVoices.get(id) || 1) - 1);
      this.activeVoices.set(id, remaining);
      howl.off('end', cleanup, soundId);
      howl.off('stop', cleanup, soundId);
    };

    howl.once('end', cleanup, soundId);
    howl.once('stop', cleanup, soundId);
  }

  playRandomSound(ids, opts = {}) {
    if (!Array.isArray(ids) || ids.length === 0) return null;
    const availableIds = ids.filter(id => this.soundRegistry[id]);
    if (availableIds.length === 0) return null;

    const groupKey = opts.groupKey ?? availableIds.join('|');
    const lastChoice = this.lastRandomChoiceByGroup.get(groupKey);
    let candidates = availableIds;

    if (availableIds.length > 1 && lastChoice) {
      const withoutLast = availableIds.filter(id => id !== lastChoice);
      if (withoutLast.length > 0) candidates = withoutLast;
    }

    const selectedId = candidates[Math.floor(Math.random() * candidates.length)];
    this.lastRandomChoiceByGroup.set(groupKey, selectedId);
    this.playSound(selectedId, opts);
    return selectedId;
  }

  // Music removed per project decision — no background music.
  stopMusic() {}
  playMusic() {}

  selectVoice() {
    if (!this.voices || this.voices.length === 0) return null;

    // 1. Filter to English-only voices to avoid accent issues
    const enVoices = this.voices.filter(v => v.lang && v.lang.startsWith('en'));
    const pool = enVoices.length > 0 ? enVoices : this.voices;

    // 2. Prefer a neutral/robotic-sounding male name
    const preferredNames = ['Daniel', 'Alex', 'David', 'Fred', 'Google UK English Male', 'Microsoft David', 'Microsoft Mark'];
    for (const name of preferredNames) {
      const match = pool.find(v => v.name.includes(name));
      if (match) return match;
    }

    // 3. Fallback: first English voice
    return pool[0] || null;
  }

  speak(text, opts = {}) {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;
    const cleanText = String(text).trim();
    if (!cleanText) return;

    // Skip if already speaking — do NOT queue, just drop it
    if (this.speechBusy || window.speechSynthesis.speaking) return;

    this.speakNow(cleanText, opts);
  }

  speakNow(text, opts = {}) {
    const synth = window.speechSynthesis;
    // Strip all non-alphanumeric chars (underscores, slashes, brackets, dots, etc.)
    // so "SYSTEM_SYNC_COMPLETE." becomes "SYSTEM SYNC COMPLETE"
    const sanitized = text.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    const utter = new SpeechSynthesisUtterance(sanitized.slice(0, 220));
    const voice = this.selectVoice();
    if (voice) utter.voice = voice;
    utter.pitch = opts.pitch ?? 0.45;
    utter.rate = opts.rate ?? 1.12;
    utter.volume = Math.max(0, Math.min(1, opts.volume ?? this.ttsVolume));

    this.speechBusy = true;
    this.lastSpeechAt = Date.now();
    utter.onend = () => {
      this.speechBusy = false;
      const next = this.speechQueue.shift();
      if (next) this.speakNow(next, opts);
    };
    utter.onerror = () => {
      this.speechBusy = false;
      const next = this.speechQueue.shift();
      if (next) this.speakNow(next, opts);
    };

    synth.speak(utter);
  }
}

export const audioPlayer = new AudioPlayer();
