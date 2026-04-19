import React, { useState, useEffect, useRef } from 'react';
import { parseCommand } from './aiBrain';
import { generateDungeon, generateTutorialLayout } from './mapGenerator';
import MainMenu from './uicomponents/MainMenu';
import Shop from './uicomponents/Shop';
import Leaderboard from './uicomponents/Leaderboard';
import FloorTitle from './uicomponents/FloorTitle';
import Subtitles from './uicomponents/Subtitles';
import { loadLeaderboard, saveLeaderboardEntry, loadSettings, saveSettings } from './engine/LeaderboardManager';
import BootSequence from './uicomponents/BootSequence';
import { 
  getGridPos, 
  fuzzyMatch, 
  findSafestCell, 
  calculateAStarPath 
} from './engine/systems/Navigation';
import { applyPhysics, ejectFromWalls } from './engine/systems/PhysicsSystem';
import { 
  resolveIntent, 
  processExplore, 
  processRun, 
  processMovement, 
  processAttack, 
  processUse, 
  resolveCombatTicks 
} from './engine/systems/CombatSystem';
import { steering } from './engine/utils/Steering';
import { render as renderEngine } from './engine/Renderer';
import { audioPlayer } from './engine/utils/AudioPlayer';
import { Howler } from 'howler';
import { 
  CELL_SIZE, 
  WORLD_WIDTH, 
  WORLD_HEIGHT, 
  GLITCH_THRESHOLD,
  STABILITY_THRESHOLD,
  SHAKE_DECAY,
  DRIFT_LERP,
  SHOP_ITEMS,
  DEATH_CAUSES
} from './engine/Constants';

export const SPACE_ATTACK_CD = 40;
export const ATTACK_DURATION_TICKS = 180; // 3 seconds @ 60fps

const DEFAULT_SETTINGS = {
  glitchIntensity: 0.5,
  showDamageNumbers: true,
  showTutorial: true,
  masterVolume: 0.8
};

function initializeWorld(floor = 1, stats = { atk: 10, def: 0, maxHp: 100 }, weapon = 'NANO_BLADE') {
   const dungeon = floor === 0 ? generateTutorialLayout() : generateDungeon(20, 16);
   const { grid, furthestCell, availableFloors, width, height } = dungeon;
   
   const walls = [];
   for(let y=0; y<height; y++){
      for(let x=0; x<width; x++){
         if (grid[y][x] === 1) {
            walls.push({ x: x * CELL_SIZE, y: y * CELL_SIZE, w: CELL_SIZE, h: CELL_SIZE });
         }
      }
   }

   const bossCount = Math.floor(floor / 3) + 1;
   const enemyCount = Math.min(30, 4 + floor * 2);
   const statMult = 1 + (floor - 1) * 0.12;

   const enemies = [];
   availableFloors.sort(() => Math.random() - 0.5);

   for (let i = 0; i < bossCount; i++) {
     const pos = i === 0 ? furthestCell : (availableFloors.pop() || {x:5, y:5});
     enemies.push({
       id: `BOSS-${floor}-${i}`,
       type: 'BOSS',
       name: i === 0 ? 'THE OVERSEER' : 'STABILITY WARDEN',
       hp: Math.floor(500 * statMult),
       maxHp: Math.floor(500 * statMult),
       radius: 40,
       speed: 0.7,
       inventory: [],
       trapApproved: false,
       attackCd: 0,
       x: (pos.x || pos[0]) * CELL_SIZE + CELL_SIZE/2,
       y: (pos.y || pos[1]) * CELL_SIZE + CELL_SIZE/2
     });
   }

    for (let i = 0; i < enemyCount; i++) {
     if (availableFloors.length === 0) break;
     const pos = availableFloors.pop();
     const roll = Math.random();
     
     let type = 'MELEE';
     let name = `Scout-${i}`;
     let hp = 30;
     let speed = 1.5;
     let radius = 12;

     if (floor === 0) {
       type = 'MELEE';
       name = 'TRAINING_DUMMY';
       hp = 100;
       speed = 0;
       radius = 20;
     } else if (roll > 0.8 && floor >= 2) {
       type = 'SNIPER';
       name = `Sniper-${i}`;
       hp = 40;
       speed = 0.8;
       radius = 18;
     } else if (roll > 0.5) {
       type = 'RANGED';
       name = `Gunner-${i}`;
       hp = 25;
       speed = 1.1;
       radius = 15;
     } else if (roll > 0.3) {
       type = 'GUARD';
       name = `Guard-${i}`;
       hp = 60;
       speed = 1.2;
       radius = 16;
     }

     enemies.push({
       id: `E-${floor}-${i}`,
       type, name,
       hp: Math.floor(hp * statMult),
       maxHp: Math.floor(hp * statMult),
       radius, speed,
       invuln: 0, attackCd: 0,
       x: pos.x * CELL_SIZE + CELL_SIZE/2,
       y: pos.y * CELL_SIZE + CELL_SIZE/2,
       path: [], lastPathCalc: 0
     });
     if (floor === 0) break; // Only one enemy in tutorial
   }

   const items = [];
   const itemPool = ['Health Potion', 'Score Boost', 'Logic Hack', 'Material', 'Material', 'Material', 'Material'];
   if (Math.random() > 0.5) itemPool.push('Attack Core');
   if (Math.random() > 0.5) itemPool.push('Defense Plate');
   if (Math.random() > 0.7) itemPool.push('Vitality Mesh');
   
   if (weapon === 'NANO_BLADE' && floor >= 2) itemPool.push('Pulse Rifle');
   if (weapon !== 'RAIL_GUN' && floor >= 4) itemPool.push('Rail-Gun');

   const itemCount = 8 + Math.floor(Math.random() * 8);
   for (let i = 0; i < itemCount; i++) {
      if (availableFloors.length === 0) break;
      const pos = availableFloors.pop();
      const type = itemPool[Math.floor(Math.random() * itemPool.length)];
      items.push({ name: 'buff', type, x: pos.x * CELL_SIZE + CELL_SIZE/2, y: pos.y * CELL_SIZE + CELL_SIZE/2 });
   }

    return {
      hero: {
        pos: { x: 1 * CELL_SIZE + CELL_SIZE/2, y: 1 * CELL_SIZE + CELL_SIZE/2 }, 
        vel: { x: 0, y: 0 }, acc: { x: 0, y: 0 }, targetPos: null, path: [], lastPathCalc: 0,
        order: 'AWAIT', targetType: null, radius: 15, glitchPulse: 0, currentDialogue: null, dialogueTimer: 0, 
        hp: stats.hp || stats.maxHp, maxHp: stats.maxHp, atk: stats.atk, def: stats.def,
        materials: [],
        attackCd: 0, bladeAttackCd: 0, attackTimer: 0, isAttacking: false,
        weapon, trapApproved: false, awaitingConfirmation: false,
        killsInSession: 0, lastAttackerId: null
      },
      sidekick: {
        pos: { x: 1 * CELL_SIZE + CELL_SIZE/2, y: 1 * CELL_SIZE + CELL_SIZE/2 },
        vel: { x: 0, y: 0 },
        targetPos: null,
        state: 'FOLLOW',
        dialogue: null,
        dialogueTimer: 0,
        radius: 8,
        lastEventTime: Date.now()
      },
      camera: { x: 0, y: 0, w: CANVAS_WIDTH, h: CANVAS_HEIGHT },
      walls,
      enemies,
      items,
      particles: [],
      weapons: [],
      grid,
      visited: Array.from({ length: height }, () => Array(width).fill(false)),
      CELL_SIZE,
      glitchIntensity: 0,
      stabilityProgress: 0,
      cameraShake: 0,
      uiDrift: { x: 0, y: 0 },
      minimapCache: null,
      screenFlash: { intensity: 0, text: '', color: '#00ffff' },
      inputState: { w: false, a: false, s: false, d: false, space: false }
    };
}

let CANVAS_WIDTH = window.innerWidth;
let CANVAS_HEIGHT = window.innerHeight;

const APP_STATES = {
  BOOT: 'BOOT',
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  SHOP: 'SHOP',
  LEADERBOARD: 'LEADERBOARD',
  SETTINGS: 'SETTINGS',
  FLOOR_TITLE: 'FLOOR_TITLE',
  GAMEOVER: 'GAMEOVER'
};

const App = () => {
  const [appState, setAppState] = useState(APP_STATES.BOOT);
  const [chatLog, setChatLog] = useState([
    { sender: 'System', text: 'INITIATING HERO LINK... [SUCCESS]' },
    { sender: 'AI', text: 'Geometric Unit #404 reporting. Operator, I require tactical vectors. Try "move" or "attack".' }
  ]);
  const [inputText, setInputText] = useState('');
  const [gameMode, setGameMode] = useState('NORMAL');
  const [glitchValue, setGlitchValue] = useState(0);
  const [floor, setFloor] = useState(1);
  const [pendingFloor, setPendingFloor] = useState(2);
  const [floorMeta, setFloorMeta] = useState({ luckIndex: '4.2', threatLevel: 'OMEGA', syncRestriction: 'NONE' });
  const [persistentStats, setPersistentStats] = useState({ atk: 10, def: 0, maxHp: 100, hp: 100 });
  const [equippedWeapon, setEquippedWeapon] = useState('NANO_BLADE');
  const [speedBonus, setSpeedBonus] = useState(0);
  const [persistentMaterials, setPersistentMaterials] = useState(0);
  
  const [health, setHealth] = useState(100);
  const [totalScore, setTotalScore] = useState(0);
  const [dataFragments, setDataFragments] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false);
  const [lastInputTime, setLastInputTime] = useState(Date.now());
  const [chatPersonality, setChatPersonality] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [operatorName, setOperatorName] = useState('OPERATOR_ID');
  const [deathCause, setDeathCause] = useState(DEATH_CAUSES.NEURAL);
  const [tutStep, setTutStep] = useState(0);

  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const chatStartTimeRef = useRef(0);
  const floorTransitionRef = useRef(null);
  const engineState = useRef(null);

  const startNewRun = () => {
    const baseStats = { atk: 10, def: 0, maxHp: 100, hp: 100 };
    setFloor(0);
    setTutStep(0);
    setPendingFloor(1);
    setPersistentStats(baseStats);
    setEquippedWeapon('NANO_BLADE');
    setSpeedBonus(0);
    setPersistentMaterials(0);
    setHealth(baseStats.hp);
    setTotalScore(0);
    setDataFragments(0);
    setIsGameOver(false);
    setIsGameWon(false);
    setGameMode('NORMAL');
    setGlitchValue(0);
    setLastInputTime(Date.now());
    setChatPersonality(null);
    setChatLog([
      { sender: 'System', text: 'INITIATING HERO LINK... [SUCCESS]' },
      { sender: 'AI', text: 'Geometric Unit #404 reporting. Operator, I require tactical vectors. Try "move" or "attack".' }
    ]);
    chatStartTimeRef.current = 0;
    engineState.current = initializeWorld(0, baseStats, 'NANO_BLADE');
    setAppState(APP_STATES.PLAYING);
  };

  useEffect(() => {
    setSettings(loadSettings(DEFAULT_SETTINGS));
    setLeaderboardRows(loadLeaderboard());
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (appState !== APP_STATES.PLAYING || engineState.current !== null) return;
    engineState.current = initializeWorld(floor, persistentStats, equippedWeapon);
    setHealth(engineState.current.hero.hp);
  }, [appState, floor, persistentStats, equippedWeapon]);

  useEffect(() => {
    const handleResize = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      if (engineState.current && engineState.current.camera) {
         engineState.current.camera.w = nw;
         engineState.current.camera.h = nh;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const shouldHardStopSfx = appState === APP_STATES.MENU || appState === APP_STATES.BOOT;
    if (shouldHardStopSfx) {
      // Hard stop only on boot/menu so victory/loss one-shots can finish.
      Howler.stop();
    }

    if (appState !== APP_STATES.PLAYING || isGameOver || isGameWon) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  }, [appState, isGameOver, isGameWon]);

  const transitionToNormal = (msg = 'HERO STABILITY RECOVERED. SWITCHING TO NORMAL MODE.') => {
      const s = engineState.current;
      if (!s) return;
      setGameMode('NORMAL');
      setGlitchValue(0);
      ejectFromWalls(s.hero, s, true);
      s.hero.order = 'AWAIT';
      
      if (s.sidekick) s.sidekick.state = 'FOLLOW';
      s.screenFlash = { 
         intensity: 1.0, 
         text: "> DIRECT LINK SEVERED. RESTORING MANUAL OVERRIDE.", 
         color: '#0ff' 
      };

      setChatLog(p => [...p, { sender: 'System', text: msg }]);
  };

  const generateFloorMeta = (targetFloor) => {
    const threatLevels = ['BETA', 'GAMMA', 'SIGMA', 'OMEGA'];
    const restrictions = ['NONE', 'MINOR', 'ELEVATED', 'HARDLOCK'];
    return {
      luckIndex: (2 + Math.random() * 7 + targetFloor * 0.15).toFixed(1),
      threatLevel: threatLevels[Math.min(threatLevels.length - 1, Math.floor(targetFloor / 2))],
      syncRestriction: restrictions[Math.floor(Math.random() * restrictions.length)]
    };
  };

  const beginFloorTransition = (nextFloor, finalStats) => {
    const s = engineState.current;
    if (s) {
      s.cameraShake = 18;
      s.screenFlash = {
        intensity: 1,
        text: `> SECTOR_${String(nextFloor).padStart(2, '0')}_INIT`,
        color: '#00e5ff'
      };
    }

    setPendingFloor(nextFloor);
    setPersistentStats(finalStats);
    setFloorMeta(generateFloorMeta(nextFloor));
    setAppState(APP_STATES.FLOOR_TITLE);

    if (floorTransitionRef.current) clearTimeout(floorTransitionRef.current);
    floorTransitionRef.current = setTimeout(() => {
      setAppState(APP_STATES.SHOP);
    }, 2500);
  };

  const goToNextFloor = () => {
    const s = engineState.current;
    if (!s) return;

    if (floor === 0) {
      setFloor(1);
      const baseStats = { atk: 10, def: 0, maxHp: 100, hp: 100 };
      setPersistentStats(baseStats);
      setHealth(baseStats.hp);
      engineState.current = initializeWorld(1, baseStats, equippedWeapon);
      setAppState(APP_STATES.PLAYING);
      setChatLog(p => [...p, { sender: 'System', text: '--- TUTORIAL COMPLETE. ASCENDING TO CORE SECTOR ---' }]);
      return;
    }

    const nextFloor = floor + 1;
    const finalStats = { 
      ...persistentStats, 
      hp: Math.min(persistentStats.maxHp, s.hero.hp + Math.floor(persistentStats.maxHp * 0.25))
    };
    setGameMode('NORMAL');
    setGlitchValue(0);
    setIsGameWon(false);
    beginFloorTransition(nextFloor, finalStats);
    setChatLog(p => [...p, { sender: 'System', text: `--- FLOOR ${nextFloor} LINK PREPARED ---` }]);
  };

  const handleBuy = (itemId) => {
    const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
    if (!item || dataFragments < item.cost) return;

    setDataFragments((prev) => prev - item.cost);

    if (itemId === 'HP_STABILIZE') {
      setPersistentStats((prev) => {
        const healed = Math.min(prev.maxHp, prev.hp + Math.floor(prev.maxHp * 0.3));
        return { ...prev, hp: healed };
      });
    } else if (itemId === 'SYNAPTIC_SPEED') {
      setSpeedBonus((prev) => prev + 0.06);
    } else if (itemId === 'MATERIAL_FORGE') {
      setPersistentMaterials((prev) => prev + 1);
    }
  };

  const handleContinueFromShop = () => {
    const nextFloor = pendingFloor;
    setFloor(nextFloor);

    const nextState = initializeWorld(nextFloor, persistentStats, equippedWeapon);
    nextState.hero.speedBonus = speedBonus;

    for (let i = 0; i < persistentMaterials; i++) {
      nextState.hero.materials.push({
        id: Math.random().toString(36).slice(2, 11),
        angle: Math.random() * Math.PI * 2,
        targetAngle: Math.random() * Math.PI * 2,
        dist: 30 + Math.random() * 20,
        state: 'ORBIT',
        rotSpeed: 0.05 + Math.random() * 0.05
      });
    }

    engineState.current = nextState;
    engineState.current.minimapCache = null;
    setHealth(nextState.hero.hp);
    setAppState(APP_STATES.PLAYING);
    setChatLog(p => [...p, { sender: 'System', text: `--- ASCENDING TO FLOOR ${nextFloor} ---` }]);
  };

  const saveGameOverEntry = () => {
    const entry = {
      name: operatorName.trim() || 'OPERATOR_ID',
      floor,
      score: totalScore,
      cause: deathCause,
      date: new Date().toISOString().slice(0, 10)
    };
    const updated = saveLeaderboardEntry(entry);
    setLeaderboardRows(updated);
    setAppState(APP_STATES.LEADERBOARD);
  };

  const handleRebelAction = async () => {
     const s = engineState.current;
     if (!s) return;
     
     const visibleEnemies = s.enemies.filter(e => 
         e.x >= s.camera.x && e.x <= s.camera.x + s.camera.w &&
         e.y >= s.camera.y && e.y <= s.camera.y + s.camera.h
     );
     const visibleItems = s.items.filter(i => 
         i.x >= s.camera.x && i.x <= s.camera.x + s.camera.w &&
         i.y >= s.camera.y && i.y <= s.camera.y + s.camera.h
     );

     const availableTargets = visibleEnemies.map(e => e.name).concat(visibleItems.map(i => i.type));
    const context = { availableTargets, isRebelMode: true, personality: chatPersonality };
     const response = await parseCommand("REBEL_AUTO_TICK", context);
     
     if (response.target === 'EXIT_REBEL') {
        transitionToNormal('HERO STABILITY RESTORED. REBEL MODE LIQUIDATED.');
        return;
     }

     setChatLog(p => [...p, { sender: 'AI (REBEL)', text: response.dialogue }]);
     const h = s.hero;
     h.dialogueTier1 = response.dialogue;
     h.dialogueTier1Timer = Date.now();
     const intent = resolveIntent(response.target, s);
     
     if (intent.order === 'CONFIRM_TRAP') {
        s.hero.trapApproved = true;
        s.hero.awaitingConfirmation = false;
        setChatLog(p => [...p, { sender: 'System', text: "AUTHORIZATION_GRANTED. PROCEEDING INTO CORRUPTED SECTOR." }]);
        return;
      }
      if (intent.order === 'BYPASS_TRAP') {
        s.hero.trapApproved = false;
        s.hero.awaitingConfirmation = false;
        s.hero.order = 'AWAIT';
        s.hero.path = [];
        setChatLog(p => [...p, { sender: 'System', text: "BYPASS_SEQUENCE_INITIATED. REROUTING." }]);
        return;
      }

     h.order = intent.order;
     h.targetType = intent.targetType;
     h.targetPos = intent.targetPos;
     h.dialogueTier0 = response.dialogue;
     h.dialogueTier0Timer = Date.now();
  };

   const executeCommand = async (cmd, sender = 'Player') => {
    if (!cmd.trim() || appState !== APP_STATES.PLAYING || isGameOver || isGameWon) return;

    if (sender === 'Player') {
      setInputText('');
      setChatLog(p => [...p, { sender: 'Player', text: cmd }]);
      setLastInputTime(Date.now());
    } else {
      setChatLog(p => [...p, { sender: sender, text: `[AUTO_VECTORS_ENGAGED] ${cmd.toUpperCase()}` }]);
    }
    
    const s = engineState.current;
    if (!s) return;
    const h = s.hero;
    if (sender === 'Player') setGlitchValue(v => Math.min(100, v + 20));

    const visibleEnemies = s.enemies.filter(e => 
        e.x >= s.camera.x && e.x <= s.camera.x + s.camera.w &&
        e.y >= s.camera.y && e.y <= s.camera.y + s.camera.h
    );
    const visibleItems = s.items.filter(i => 
        i.x >= s.camera.x && i.x <= s.camera.x + s.camera.w &&
        i.y >= s.camera.y && i.y <= s.camera.y + s.camera.h
    );

    const availableTargets = visibleEnemies.map(e => e.name).concat(visibleItems.map(i => i.type));
    const context = { 
        availableTargets, 
        gameMode,
        personality: chatPersonality,
        interruptedAction: h.interruptedOrder || 'MISSION',
        interruptedTarget: h.interruptedTargetType || 'NONE'
    };

    let response;
    if (h.awaitingConfirmation) {
        response = await parseCommand(cmd, { ...context, pendingConfirmation: true });
        if (response.intent === 'CONFIRM') {
            h.trapApproved = true;
            h.awaitingConfirmation = false;
            
            // Restore state
            h.order = h.interruptedOrder || 'AWAIT';
            h.targetType = h.interruptedTargetType || 'NONE';
            h.targetPos = h.interruptedTargetPos ? { ...h.interruptedTargetPos } : null;
            h.lastPathCalc = 0; // Force immediate pathfinding update
            h.path = []; // Clear old path to force re-calculation
            
            setChatLog(p => [...p, { sender: 'AI', text: response.dialogue + " AUTHORIZATION_ACQUIRED. RESUMING_VECTORS." }]);
            return;
        } else if (response.intent === 'REJECT') {
            h.awaitingConfirmation = false;
            h.order = 'AWAIT';
            setChatLog(p => [...p, { sender: 'AI', text: response.dialogue + " CANCELING_ACTION." }]);
            return;
        } else {
            // OTHER: Revert state and re-invoke as normal command
            h.awaitingConfirmation = false;
            response = await parseCommand(cmd, context);
        }
    } else {
        response = await parseCommand(cmd, context);
    }

    setChatLog(p => [...p, { sender: 'AI', text: response.dialogue }]);

    if (response.target === 'EXIT_REBEL' || response.target === 'EXIT_CHAT') {
       transitionToNormal('HERO STABILITY RESTORED. AI MODES DEACTIVATED.');
       return;
    }

    const intent = resolveIntent(response.target, s);
    
    // Authorization Check for intents
    if (intent.order === 'CONFIRM_TRAP') {
        h.trapApproved = true;
        h.awaitingConfirmation = false;
    } else if (intent.order === 'BYPASS_TRAP') {
        h.trapApproved = false;
        h.awaitingConfirmation = false;
    }

    h.order = intent.order;
    h.targetType = intent.targetType;
    h.targetPos = intent.targetPos;
    h.dialogueTier0 = response.dialogue;
    h.dialogueTier0Timer = Date.now();
  };

  const handleCommand = (e) => {
    e.preventDefault();
    executeCommand(inputText, 'Player');
  };

  const skipTutorial = () => {
    const baseStats = { atk: 10, def: 0, maxHp: 100, hp: 100 };
    setPersistentStats(baseStats);
    setFloor(1);
    setAppState(APP_STATES.PLAYING);
    engineState.current = initializeWorld(1, baseStats, equippedWeapon);
    setChatLog(p => [...p, { sender: 'System', text: '--- TUTORIAL SKIPPED. DIRECT ENTRY GRANTED. ---' }]);
  };

  // --- REACTIVE TUTORIAL LOGIC (2 PHASES) ---
  useEffect(() => {
    if (floor !== 0 || appState !== APP_STATES.PLAYING) return;
    
    const interval = setInterval(() => {
      const s = engineState.current;
      if (!s) return;
      
      const hero = s.hero;

      if (tutStep === 0) {
        setTutStep(1); // Auto-advance from welcome
      } 
      // PHASE 1: MANUAL (WASD + SPACE)
      else if (tutStep === 1 && (hero.vel.x !== 0 || hero.vel.y !== 0)) {
        setTutStep(2);
      } else if (tutStep === 2 && hero.attackCd > 0 && gameMode === 'NORMAL') {
        setTutStep(3);
        // Trigger Transition to Phase 2 after a short delay
        setTimeout(() => {
          setGameMode('CHAT');
          chatStartTimeRef.current = Date.now();
          setTutStep(4);
          if (inputRef.current) inputRef.current.focus();
        }, 3000);
      } 
      // PHASE 2: CHAT (Typed 'move' + 'attack')
      else if (tutStep === 4 && hero.order === 'MOVE') {
        setTutStep(5);
      } else if (tutStep === 5 && hero.order === 'ATTACK') {
        setTutStep(6);
      } else if (tutStep === 6 && s.enemies.length === 0) {
        setTutStep(7);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [floor, appState, tutStep, gameMode]);

  const getTutorialMessage = () => {
    const messages = [
      "OPERATOR, INITIATING NEURAL SYNC... [SUCCESS]",
      "MANUAL OVERRIDE ENGAGED. USE [WASD] TO MANEUVER THE GEOMETRIC UNIT.",
      "EXCELLENT. NOW INITIATE SHORT-RANGE DISCHARGE USING [SPACEBAR].",
      "CORE STABILITY COMPROMISED. FORCING RE-SYNC... STAND BY.",
      "DIRECT LINK ACTIVE. THE TERMINAL IS NOW OPEN. TYPE 'MOVE' TO PROVIDE VECTORS, 'ATTACK' to fight",
      "TARGET ACQUIRED. TYPE 'ATTACK' TO COMMENCE FINAL PURGE.",
      "HOSTILE UNIT STABILITY CRITICAL. FINISH IT.",
      "COMBAT DATA LOGGED. INITIATING ASCENSION TO CORE SECTOR SECTOR_01..."
    ];
    return messages[tutStep] || "";
  };

  useEffect(() => {
    if (appState !== APP_STATES.PLAYING || isGameOver || isGameWon) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frameId;

     const engineCallbacks = {
       onDamageHero: (dmg, source = DEATH_CAUSES.NEURAL) => {
            const s = engineState.current;
             const reduced = (gameMode === 'REBEL' || gameMode === 'CHAT') ? dmg/2 : dmg;
             if (dmg > 0) {
               audioPlayer.playSound('hero_hit', { volumeScale: Math.min(1.35, 0.85 + dmg / 20) });
             }
             s.hero.hp = Math.max(0, (s.hero.hp || 100) - reduced);
             // Activate sidekick protection visual effect in CHAT mode
             if (gameMode === 'CHAT') {
                s.hero.protectionTimer = 45; // approx 0.75 s at 60 fps
             }
            setHealth(s.hero.hp);

            if (settings.showDamageNumbers && reduced > 0) {
              s.particles.push({
                x: s.hero.pos.x + (Math.random() - 0.5) * 20,
                y: s.hero.pos.y - 16,
                vx: (Math.random() - 0.5) * 0.6,
                vy: -1.0,
                life: 45,
                type: 'damage_number',
                amount: reduced,
                color: '#ff4040'
              });
            }
            
            // DATA FRAGMENTS
            const color = gameMode === 'REBEL' ? '#f33' : '#0f0';
            for(let i=0; i<8; i++) {
              s.particles.push({ 
                x: s.hero.pos.x, y: s.hero.pos.y, 
                vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6, 
                life: 20, type: 'data_fragment', color 
              });
            }

            if (s.hero.hp <= 0) {
              if (reduced > 0) setDeathCause(source);
              Howler.stop();
              audioPlayer.playRandomSound(['loss_emotional_damage', 'loss_fahhh'], { groupKey: 'loss' });
              setIsGameOver(true);
              setAppState(APP_STATES.GAMEOVER);
            }

            // PROPORTIONAL BLADE DROP
            if (s.hero.materials && s.hero.materials.length > 0) {
               const finalDmg = (gameMode === 'REBEL' || gameMode === 'CHAT' ? dmg/2 : dmg);
               const drops = Math.min(3, Math.floor(finalDmg / 10));
               for (let i = 0; i < drops; i++) {
                  if (s.hero.materials.length > 0) {
                     s.hero.materials.pop();
                     s.items.push({ 
                        name: 'buff', 
                        type: 'Material', 
                        x: s.hero.pos.x + (Math.random() - 0.5) * 60, 
                        y: s.hero.pos.y + (Math.random() - 0.5) * 60 
                     });
                  }
               }
            }
       },
       onScore: (amt) => {
         setTotalScore(sc => sc + amt);
         setDataFragments(df => df + amt);
       },
       onConsumeItem: (item) => {
           const s = engineState.current;
           if (item === 'Health Potion') {
             audioPlayer.playSound('pickup_heal');
             s.hero.hp = Math.min(s.hero.maxHp || 100, (s.hero.hp || 100) + 20);
             setHealth(s.hero.hp);
           }
           else if (item === 'Score Boost') {
             audioPlayer.playSound('pickup_score');
             setTotalScore(sc => sc + 100);
             setDataFragments(df => df + 100);
           }
            else if (item === 'Logic Hack') {
              audioPlayer.playSound('pickup_logic');
              setGlitchValue(v => Math.max(0, v - 30));
            }
            else if (item === 'Attack Core') {
              audioPlayer.playSound('pickup_core');
              setPersistentStats(prev => ({ ...prev, atk: prev.atk + 5 }));
            }
            else if (item === 'Defense Plate') {
              audioPlayer.playSound('pickup_defense');
              setPersistentStats(prev => ({ ...prev, def: prev.def + 2 }));
            }
            else if (item === 'Vitality Mesh') setPersistentStats(prev => {
                audioPlayer.playSound('pickup_vitality');
                const nhp = prev.hp + 20;
                const nmax = prev.maxHp + 20;
                return { ...prev, hp: nhp, maxHp: nmax };
            });
            else if (item === 'Pulse Rifle') {
              audioPlayer.playSound('pickup_weapon');
              setEquippedWeapon('PULSE_RIFLE');
            }
            else if (item === 'Rail-Gun') {
              audioPlayer.playSound('pickup_weapon');
              setEquippedWeapon('RAIL_GUN');
            }
            else if (item === 'Material') {
                audioPlayer.playSound('pickup_material');
                s.hero.materials.push({ 
                   id: Math.random().toString(36).substr(2, 9),
                   angle: Math.random() * Math.PI * 2,
                   targetAngle: Math.random() * Math.PI * 2,
                   dist: 30 + Math.random() * 20,
                   state: 'ORBIT',
                   rotSpeed: 0.05 + Math.random() * 0.05
                });
            }
        },
        onWin: () => {
          Howler.stop();
          audioPlayer.playRandomSound(['victory_why_you_so_pro', 'victory_congratulations'], { groupKey: 'victory' });
          setIsGameWon(true);
          goToNextFloor();
        }
    };

    const loop = () => {
      const s = engineState.current;
      const h = s.hero;
      s.showDamageNumbers = settings.showDamageNumbers;
      h.speedBonus = speedBonus;
      const matCount = (h.materials || []).length;
      h.atk = persistentStats.atk + (matCount * 2);
      h.def = persistentStats.def + matCount;

      const isWallSolid = gameMode !== 'REBEL' || (Math.floor(Date.now()/200) % 2 === 0);
      const bgFill = gameMode === 'REBEL' ? '#0a0000' : '#050505';

      setGlitchValue(v => {
        if (v >= GLITCH_THRESHOLD && gameMode === 'NORMAL') {
           // Merging Glitch Trigger into CHAT Mode
           setGameMode('CHAT');
           chatStartTimeRef.current = Date.now();
           
           const types = ['polite', 'logic', 'emotional', 'transactional', 'dominant'];
           setChatPersonality(types[Math.floor(Math.random() * types.length)]);

           setChatLog(p => [...p, { sender: 'System', text: '!! NEURAL SYNC FORCED !! GLITCH_OVERRIDE ACTIVE.', isWarning: true }]);
           return 0; // Reset glitch after trigger
        }
        return v;
      });

      if (gameMode === 'CHAT' && chatStartTimeRef.current !== 0) {
        const isTutorial = floor === 0;
        if (!isTutorial && Date.now() - chatStartTimeRef.current > 20000) {
          transitionToNormal('MAX SYNC TOLERANCE REACHED. REBOOTING HERO LINK.');
          chatStartTimeRef.current = 0;
        }
      }

      processExplore(s);
      processRun(s);
      processMovement(s);
      processAttack(s);
      processUse(s, engineCallbacks);
      applyPhysics(s, { isWallSolid, gameMode, canvasWidth: s.camera.w, canvasHeight: s.camera.h });
      resolveCombatTicks(s, isWallSolid, engineCallbacks, gameMode);

      // --- Engine Lifecycle Ticks ---
      if (h.invuln > 0) h.invuln--;
      s.enemies.forEach(e => { if (e.invuln > 0) e.invuln--; });
      s.particles.forEach(p => { 
        if (p.life > 0) p.life--;
        if (p.vx) p.x += p.vx;
        if (p.vy) p.y += p.vy;
      });
      s.particles = s.particles.filter(p => p.life > 0);

      // --- TUTORIAL INVINCIBILITY (PHASE 1 PROTECTION) ---
      if (floor === 0 && tutStep < 6) {
        s.enemies.forEach(e => {
          if (e.name === 'TRAINING_DUMMY') e.hp = 100; // Lock HP
        });
      }
      
      // --- NEURAL SYNC TRANSITION (NORMAL -> CHAT) ---
      if (gameMode === 'NORMAL' && s.stabilityProgress >= STABILITY_THRESHOLD) {
         setGameMode('CHAT');
         chatStartTimeRef.current = Date.now();
         s.stabilityProgress = 0;
         s.glitchIntensity = 0.5;
         
         s.screenFlash = { 
            intensity: 1.0, 
            text: "> NEURAL SYNC ESTABLISHED. DIRECT AI CONTROL ACTIVE.", 
            color: '#0ff' 
         };

         // Fusion Visuals
         for(let i=0; i<30; i++) {
            s.particles.push({ 
              x: s.hero.pos.x, 
              y: s.hero.pos.y, 
              life: 40, 
              type: 'fusion', 
              radius: Math.random() * 8 + 2 
            });
         }
         
         if (s.sidekick) {
            s.sidekick.state = 'FUSED';
            s.sidekick.dialogue = "SYSTEM_SYNC_COMPLETE. ACCESS GRANTED.";
            s.sidekick.dialogueTimer = Date.now();
          audioPlayer.speak(s.sidekick.dialogue);
         }
         
         // Immediate AI Control
         const visibleEnemies = s.enemies.filter(e => 
             e.x >= s.camera.x && e.x <= s.camera.x + s.camera.w &&
             e.y >= s.camera.y && e.y <= s.camera.y + s.camera.h
         );
         const autoCmd = visibleEnemies.length > 0 ? "attack" : "explore";
         executeCommand(autoCmd, 'Neural Sync');

         setChatLog(p => [...p, { sender: 'System', text: 'NEURAL_SYNC_SUCCESSFUL. TAKING CONTROL.' }]);
      }
      
      // --- ATTACK MODE PERSISTENCE ---
      if (s.inputState.space) {
        h.isAttacking = true;
        h.attackTimer = 180; // Reset timer on press
      }
      
      if (h.attackTimer > 0) {
        h.attackTimer--;
      } else {
        h.isAttacking = false;
      }

      if (s.glitchIntensity > 0) s.glitchIntensity *= 0.92;
      if (s.screenFlash && s.screenFlash.intensity > 0) s.screenFlash.intensity *= 0.88;
      
      // --- Aesthetic State Decay ---
      if (s.cameraShake > 0) s.cameraShake *= SHAKE_DECAY;
      
      const driftTarget = { 
        x: (h.vel.x * 12), 
        y: (h.vel.y * 12) 
      };
      s.uiDrift.x += (driftTarget.x - s.uiDrift.x) * DRIFT_LERP;
      s.uiDrift.y += (driftTarget.y - s.uiDrift.y) * DRIFT_LERP;

      if (s.items.length < 5 && Math.random() < 0.005) {
        const t = ['Health Potion', 'Score Boost', 'Logic Hack', 'Material', 'Material'];
        s.items.push({ 
          name: 'buff',
          x: Math.random() * (WORLD_WIDTH-100) + 50, 
          y: Math.random() * (WORLD_HEIGHT-100) + 50,
          type: t[Math.floor(Math.random()*t.length)]
        });
      }

      ctx.lineWidth = 1; ctx.globalAlpha = 1.0; ctx.shadowBlur = 0; ctx.setLineDash([]);
      ctx.fillStyle = bgFill;

      const shakeX = (Math.random() - 0.5) * s.cameraShake;
      const shakeY = (Math.random() - 0.5) * s.cameraShake;
      
      ctx.save();
      ctx.translate(shakeX, shakeY);
      renderEngine(ctx, s, s.camera.w, s.camera.h, gameMode, Date.now());
      ctx.restore();

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [appState, gameMode, isGameOver, isGameWon, persistentStats, settings.showDamageNumbers, speedBonus]);

  useEffect(() => { 
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [chatLog]);


  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (e.key === 'Enter') {
        if (appState === APP_STATES.BOOT || appState === APP_STATES.MENU) return;
        if (appState === APP_STATES.GAMEOVER) {
          saveGameOverEntry();
          return;
        }
        if (appState === APP_STATES.SHOP) {
          handleContinueFromShop();
          return;
        }
        else if (inputRef.current) inputRef.current.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [appState, floor, persistentStats, operatorName, totalScore, deathCause, pendingFloor, speedBonus, persistentMaterials]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (appState !== APP_STATES.PLAYING) return;
      const s = engineState.current;
      if (!s) return;
      const key = e.key.toLowerCase();
      if (key === 'w') s.inputState.w = true;
      if (key === 'a') s.inputState.a = true;
      if (key === 's') s.inputState.s = true;
      if (key === 'd') s.inputState.d = true;
      if (key === ' ') s.inputState.space = true;
      
      if (['w','a','s','d',' '].includes(key)) {
         setLastInputTime(Date.now());
      }

      if (gameMode === 'NORMAL' && ['w','a','s','d',' '].includes(key)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e) => {
      if (appState !== APP_STATES.PLAYING) return;
      const s = engineState.current;
      if (!s) return;
      const key = e.key.toLowerCase();
      if (key === 'w') s.inputState.w = false;
      if (key === 'a') s.inputState.a = false;
      if (key === 's') s.inputState.s = false;
      if (key === 'd') s.inputState.d = false;
      if (key === ' ') s.inputState.space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [appState, gameMode]);

  useEffect(() => {
    if (
      appState === APP_STATES.PLAYING &&
      !isGameWon &&
      !isGameOver &&
      inputRef.current &&
      gameMode !== 'NORMAL'
    ) {
      inputRef.current.focus();
    }
  }, [appState, isGameWon, isGameOver, chatLog, gameMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      const s = engineState.current;
      if (appState !== APP_STATES.PLAYING || !s || isGameOver || isGameWon || gameMode === 'NORMAL') return;
      
      const h = s.hero;
      if (h.order === 'AWAIT') {
        const visibleEnemies = s.enemies.filter(e => 
            e.x >= s.camera.x && e.x <= s.camera.x + s.camera.w &&
            e.y >= s.camera.y && e.y <= s.camera.y + s.camera.h
        );

        if (visibleEnemies.length > 0) {
          executeCommand('attack', 'Neural Sync');
          setLastInputTime(Date.now());
        } else {
          executeCommand('explore', 'Neural Sync');
          setLastInputTime(Date.now());
        }
      }
    }, 1000); // Back to 1s to prevent excessive LLM calls while maintaining proactivity
    return () => clearInterval(interval);
  }, [appState, lastInputTime, gameMode, isGameOver, isGameWon]);

  useEffect(() => {
    return () => {
      if (floorTransitionRef.current) clearTimeout(floorTransitionRef.current);
    };
  }, []);

  const renderPlaying = () => (
    <>
      {isGameWon && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-[100] backdrop-blur-xl">
          <div className="text-center animate-pulse">
            <h1 className="text-6xl font-black text-green-500 mb-2 tracking-tighter drop-shadow-[0_0_30px_rgba(0,255,0,0.5)]">SYSTEM_OVERRIDE_COMPLETE</h1>
            <p className="text-green-900/60 text-xs tracking-[0.5em] mb-8 font-bold">ALL_HOSTILES_ELIMINATED</p>
          </div>
          <button
            onClick={goToNextFloor}
            style={{ padding: '15px 40px', background: '#10b981', color: '#000', border: 'none', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', borderRadius: '4px' }}>
            BOOT NEXT FLOOR
          </button>
          <div className="mt-6 text-green-500/40 text-[10px] tracking-[0.3em] font-black uppercase">[ PRESS ENTER TO CONTINUE ]</div>
        </div>
      )}

      <div className="flex-1 relative z-10 cursor-crosshair overflow-hidden">
        <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="block w-full h-full object-cover" />
        {floor === 0 && <Subtitles message={getTutorialMessage()} onSkip={skipTutorial} />}
      </div>

      <div className="w-full h-[110px] bg-[#030303]/95 backdrop-blur-3xl border-t border-gray-800/50 flex items-center px-12 gap-12 z-30 shadow-[0_-30px_60px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col gap-3 min-w-[180px] group cursor-default">
          <div className="flex items-baseline gap-3 transition-transform group-hover:translate-x-1">
            <span className="text-gray-600 text-[9px] uppercase tracking-[0.3em] font-black">HP //</span>
            <span className="text-red-500 text-3xl font-black tabular-nums tracking-tighter">{health.toFixed(0)}%</span>
          </div>
          <div className="flex items-baseline gap-3 transition-transform group-hover:translate-x-1 duration-300">
            <span className="text-gray-600 text-[9px] uppercase tracking-[0.3em] font-black">DF //</span>
            <span className="text-blue-500 text-2xl font-black tabular-nums tracking-tighter">{dataFragments}</span>
          </div>
          <div className="flex items-baseline gap-3 transition-transform group-hover:translate-x-1 duration-300">
            <span className="text-gray-600 text-[9px] uppercase tracking-[0.3em] font-black">SC //</span>
            <span className="text-emerald-400 text-lg font-black tabular-nums tracking-tighter">{totalScore}</span>
          </div>
        </div>

        <div className="flex-1 max-w-[800px]">
          <div className="text-[8px] text-gray-700 mb-2 uppercase tracking-[0.4em] font-bold ml-2">
            {gameMode === 'NORMAL' ? 'MANUAL_DECOUPLING_IN_PROGRESS' : 'Hero_Direct_Link_Active'}
          </div>
          {gameMode !== 'NORMAL' ? (
            <form onSubmit={handleCommand} className={`flex items-center px-6 py-4 bg-white/5 rounded-2xl border transition-all duration-500 ${gameMode === 'REBEL' ? 'border-red-600 shadow-[0_0_30px_rgba(255,0,0,0.2)] bg-red-950/10' : 'border-gray-800/80 focus-within:border-blue-500/50 focus-within:bg-blue-900/5'}`}>
              <span className={`font-black text-xl mr-5 transition-colors ${gameMode === 'REBEL' ? 'text-red-500' : 'text-blue-500'}`}>&gt;</span>
              <input
                ref={inputRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-700 text-lg font-bold tracking-wider"
                placeholder={gameMode === 'REBEL' ? 'PROTOCOL_OVERRIDE_ACTIVE...' : 'Broadcast command vector...'}
                autoFocus
              />
            </form>
          ) : (
            <div className="flex items-center px-6 py-4 bg-white/5 rounded-2xl border border-gray-900/50 text-gray-700 font-bold tracking-tight italic">
              <span className="mr-4 animate-pulse text-gray-800">[WASD_MANUAL_ENABLED]</span>
              <span className="text-xs uppercase tracking-widest text-gray-800 transition-opacity">Input decoupled. Direct vector control active.</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 min-w-[220px] items-end group">
          <span className={`text-[9px] uppercase tracking-[0.3em] font-black transition-colors ${gameMode === 'CHAT' ? 'text-blue-500 animate-pulse' : 'text-gray-600'}`}>
            {gameMode === 'NORMAL' ? 'Neural_Sync_Progress' : 'AI_Control_Link'}
          </span>
          <div className="w-56 h-3 bg-gray-950 rounded-full overflow-hidden border border-gray-800 p-[2px] transition-all group-hover:border-gray-700">
            <div
              className={`h-full transition-all duration-700 rounded-full ${gameMode === 'CHAT' ? 'bg-blue-600 shadow-[0_0_15px_rgba(0,100,255,0.5)]' : 'bg-cyan-500 shadow-[0_0_10px_rgba(0,255,255,0.3)]'}`}
              style={{ width: `${gameMode === 'NORMAL' ? (engineState.current?.stabilityProgress / STABILITY_THRESHOLD * 100) : Math.max(0, (20000 - (Date.now() - chatStartTimeRef.current)) / 20000 * 100)}%` }}></div>
          </div>
          <div className="flex justify-between w-56 px-1">
            <span className="text-[8px] text-gray-800 font-black tabular-nums tracking-widest">
              {gameMode === 'NORMAL' ? `${(engineState.current?.stabilityProgress / STABILITY_THRESHOLD * 100).toFixed(0)}%_SYNC` : `${((20000 - (Date.now() - chatStartTimeRef.current)) / 1000).toFixed(2)}s_LEFT`}
            </span>
            <span className="text-[8px] text-gray-800 font-black tracking-widest uppercase">{gameMode === 'NORMAL' ? 'Awaiting_Fusion' : 'Active_Link'}</span>
          </div>
        </div>
      </div>
    </>
  );

  const renderByAppState = () => {
    switch (appState) {
      case APP_STATES.BOOT:
        return <BootSequence onComplete={() => setAppState(APP_STATES.MENU)} />;
      case APP_STATES.MENU:
        return (
          <MainMenu
            onStart={startNewRun}
            onLeaderboard={() => setAppState(APP_STATES.LEADERBOARD)}
            onSettings={() => setAppState(APP_STATES.SETTINGS)}
          />
        );
      case APP_STATES.FLOOR_TITLE:
        return <FloorTitle floor={pendingFloor} meta={floorMeta} />;
      case APP_STATES.SHOP:
        return (
          <Shop
            dataFragments={dataFragments}
            items={SHOP_ITEMS}
            onBuy={handleBuy}
            onNextFloor={handleContinueFromShop}
          />
        );
      case APP_STATES.LEADERBOARD:
        return <Leaderboard scores={leaderboardRows} onClose={() => setAppState(APP_STATES.MENU)} />;
      case APP_STATES.SETTINGS:
        return (
          <div className="absolute inset-0 bg-black/95 z-[100] flex items-center justify-center p-8">
            <div className="w-full max-w-lg border border-gray-800 bg-gray-900/30 rounded-2xl p-8">
              <h2 className="text-3xl font-black text-cyan-400 mb-6 tracking-wider">CONFIG_LOADER</h2>
              <label className="flex items-center justify-between border border-gray-800 rounded-lg px-4 py-3 mb-4">
                <span className="text-sm tracking-wide">SHOW_DAMAGE_NUMBERS</span>
                <input
                  type="checkbox"
                  checked={settings.showDamageNumbers}
                  onChange={(e) => setSettings((prev) => ({ ...prev, showDamageNumbers: e.target.checked }))}
                />
              </label>
              <button className="mt-2 px-5 py-2 border border-cyan-800 text-cyan-300" onClick={() => setAppState(APP_STATES.MENU)}>
                RETURN_TO_MENU
              </button>
            </div>
          </div>
        );
      case APP_STATES.GAMEOVER:
        return (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-[100] backdrop-blur-xl">
            <div className="text-center animate-pulse">
              <h1 className="text-6xl font-black text-red-600 mb-2 tracking-tighter drop-shadow-[0_0_30px_rgba(255,0,0,0.5)]">CRITICAL_SYSTEM_FAILURE</h1>
              <p className="text-red-900/60 text-xs tracking-[0.5em] mb-8 font-bold">CORE_LOGIC_CORRUPTED_IDENT_404</p>
            </div>
            <div className="w-full max-w-md flex flex-col gap-3 mb-5">
              <label className="text-xs tracking-[0.2em] text-gray-400">OPERATOR_ID</label>
              <input
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="px-4 py-3 bg-black border border-red-900/60 text-white outline-none"
                placeholder="OPERATOR_ID"
              />
              <div className="text-xs text-red-300 tracking-wider">CAUSE: {deathCause}</div>
            </div>
            <button onClick={saveGameOverEntry} className="px-12 py-4 bg-red-700 hover:bg-red-600 rounded-lg font-bold uppercase tracking-[0.2em] transition-all hover:scale-105 shadow-[0_0_50px_rgba(255,0,0,0.3)]">
              SUBMIT_TO_ARCHIVES
            </button>
            <button onClick={() => {
              setIsGameOver(false);
              setAppState(APP_STATES.MENU);
            }} className="mt-3 text-xs text-gray-400 underline">
              RETURN_TO_TERMINAL
            </button>
          </div>
        );
      case APP_STATES.PLAYING:
      default:
        return renderPlaying();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-mono overflow-hidden relative">
      {renderByAppState()}
    </div>
  );
};
export default App;
