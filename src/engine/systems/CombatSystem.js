import { 
  fuzzyMatch, 
  findSafestCell, 
  getGridPos, 
  calculateAStarPath,
  hasLineOfSight
} from './Navigation';
import { 
  CELL_SIZE, 
  HERO_STEER_FORCE, 
  WORLD_WIDTH, 
   WORLD_HEIGHT,
   DEATH_CAUSES
} from '../Constants';
import { steering } from '../utils/Steering';
import { generateSidekickQuip } from '../../aiBrain';
import { audioPlayer } from '../utils/AudioPlayer';
import { SIDEKICK_SCAVENGE_RANGE, STABILITY_THRESHOLD, SPACE_ATTACK_CD } from '../Constants';

function setSidekickDialogue(sk, q) {
   sk.dialogue = q;
   sk.dialogueTimer = Date.now();
   sk.lastEventTime = Date.now();
   audioPlayer.speak(q);
}

export function resolveIntent(target, state) {
    const { hero, enemies, items } = state;
    const t = (target || 'NONE').toLowerCase();
    console.log(`[CombatSystem] resolveIntent: "${target}"`);
    
    // Clear persistent target on new directional/explore commands
    if (['up', 'down', 'left', 'right', 'explore', 'search', 'safety', 'retreat', 'run'].includes(t)) {
       hero.lockedTargetId = null;
    }

    if (t === 'none' || t === 'wait' || t === 'stop') {
      return { order: 'AWAIT', targetType: 'NONE', targetPos: null };
    }
      if (t === 'explore' || t === 'search' || t === 'materials' || t === 'dots') {
         return { order: 'EXPLORE', targetType: 'NONE', targetPos: null };
    }
    if (t === 'all' || t === 'everything' || t === 'attack' || t === 'kill' || t === 'fight') {
      return { order: 'ATTACK', targetType: 'closest', targetPos: null };
    }
    if (t === 'safety' || t === 'retreat' || t === 'run') {
       return { order: 'MOVE', targetType: 'safety', targetPos: null }; 
    }

    if (t === 'confirm' || t === 'yes' || t === 'go' || t === 'ok') {
       return { order: 'CONFIRM_TRAP', targetType: 'NONE', targetPos: null };
    }
    if (t === 'reject' || t === 'no' || t === 'avoid' || t === 'cancel') {
       return { order: 'BYPASS_TRAP', targetType: 'NONE', targetPos: null };
    }
    if (t === 'yield' || t === 'exit_chat' || t === 'exit_rebel') {
       return { order: 'EXIT_CHAT', targetType: 'NONE', targetPos: null };
    }

    if (t.includes('up')) return { order: 'MOVE', targetType: 'SPATIAL', targetPos: { x: hero.pos.x, y: hero.pos.y - 10000 } };
    if (t.includes('down')) return { order: 'MOVE', targetType: 'SPATIAL', targetPos: { x: hero.pos.x, y: hero.pos.y + 10000 } };
    if (t.includes('left')) return { order: 'MOVE', targetType: 'SPATIAL', targetPos: { x: hero.pos.x - 10000, y: hero.pos.y } };
    if (t.includes('right')) return { order: 'MOVE', targetType: 'SPATIAL', targetPos: { x: hero.pos.x + 10000, y: hero.pos.y } };

    const enemyMatch = fuzzyMatch(target, enemies);
    if (enemyMatch) {
      return { order: 'ATTACK', targetType: enemyMatch.name, targetPos: { x: enemyMatch.x, y: enemyMatch.y } };
    }

    const itemMatch = fuzzyMatch(target, items);
    if (itemMatch) {
      return { order: 'MOVE', targetType: itemMatch.type, targetPos: { x: itemMatch.x, y: itemMatch.y } };
    }

    const hostileKeywords = ['scout', 'gunner', 'sniper', 'guard', 'boss', 'overseer', 'enemy', 'target', 'triangle', 'shooter', 'ranged', 'hexagon', 'square', 'block', 'diamond', 'guardian', 'elite', 'threat'];
    if (hostileKeywords.some(sw => t.includes(sw))) {
        hero.trapApproved = false; // Reset on new tactical intent
        hero.killsInSession = 0;   // Reset session-specific kill count for the new order
        
        // Resolve target or default to closest
        const specificMatch = fuzzyMatch(target, enemies);
        if (specificMatch) console.log(`[CombatSystem] Specific match found: ${specificMatch.name}`);
        
        return { 
            order: 'ATTACK', 
            targetType: specificMatch ? specificMatch.name : 'closest', 
            targetPos: specificMatch ? { x: specificMatch.x, y: specificMatch.y } : null 
        };
    }

    const finalIntent = { order: 'AWAIT', targetType: 'NONE', targetPos: null };
    console.log(`[CombatSystem] resolveIntent input: "${target}", resolved to:`, finalIntent.order);
    return finalIntent;
}

export function executeHeroRoute(h, target, state, avoidTraps = false) {
   const dist = Math.hypot(target.x - h.pos.x, target.y - h.pos.y);
   
   // PRIORITIZE KILLING: Ignore trap warnings during attack orders
   const isAttacking = h.order === 'ATTACK';
   const actualAvoid = (avoidTraps || (!h.trapApproved && !isAttacking)) && !h.trapApproved;

   if (dist > CELL_SIZE * 0.5) { // Small buffer for pathing
      if (Date.now() - (h.lastPathCalc || 0) > 400 || !h.path || h.path.length === 0) {
         const sc = getGridPos(h.pos.x, h.pos.y);
         const tc = getGridPos(target.x, target.y);
         const newPath = calculateAStarPath(state.grid, sc, tc, CELL_SIZE, actualAvoid);
         
         // Trap interruption (Skip if attacking)
         if (newPath.length > 0 && !h.trapApproved && !isAttacking && avoidTraps) {
            const first = newPath[0];
            if (state.grid[first.gy][first.gx] === 2) {
               h.interruptedOrder = h.order;
               h.interruptedTargetType = h.targetType;
               h.interruptedTargetPos = h.targetPos ? { ...h.targetPos } : null;
               
               h.order = 'AWAIT';
               h.path = [];
               h.vel = { x: 0, y: 0 };
               h.acc = { x: 0, y: 0 };
               h.currentDialogue = "CAUTION: HAZARD SECTOR DETECTED. AUTHORIZATION?";
               h.dialogueTimer = Date.now();
               h.awaitingConfirmation = true;
               return;
            }
         }
         h.path = newPath;
         h.lastPathCalc = Date.now();
      }
      
      if (h.path && h.path.length > 0) {
         const wp = h.path[0];
         if (Math.hypot(wp.px - h.pos.x, wp.py - h.pos.y) < 20) h.path.shift();
         else {
            const force = steering.seek(h, { x: wp.px, y: wp.py });
            h.acc.x += force.x * HERO_STEER_FORCE;
            h.acc.y += force.y * HERO_STEER_FORCE;
            return;
         }
      }
   }
   
   // BRAKE-ON-ARRIVAL: Tighten movement at close proximity
   // Lowered threshold (15) ensures he reaches buffs (22px radius) and cell centers
   if (dist < 15) {
       h.vel.x *= 0.7;
       h.vel.y *= 0.7;
   }
   
   // Keep applying steering force until practically on deck
   if (dist > 5) {
       const force = steering.seek(h, target);
       h.acc.x += force.x * HERO_STEER_FORCE;
       h.acc.y += force.y * HERO_STEER_FORCE;
   }
}

export function executeEnemyRoute(e, targetPos, state) {
   const dist = Math.hypot(targetPos.x - e.x, targetPos.y - e.y);
   if (dist > CELL_SIZE * 1.5) {
      if (Date.now() - (e.lastPathCalc || 0) > 600 || !e.path || e.path.length === 0) {
         const sc = getGridPos(e.x, e.y);
         const tc = getGridPos(targetPos.x, targetPos.y);
         e.path = calculateAStarPath(state.grid, sc, tc, CELL_SIZE);
         e.lastPathCalc = Date.now();
      }
      if (e.path && e.path.length > 0) {
         const wp = e.path[0];
         const wpDist = Math.hypot(wp.px - e.x, wp.py - e.y);
         if (wpDist < 15) e.path.shift();
         else {
            e.x += ((wp.px - e.x) / wpDist) * e.speed;
            e.y += ((wp.py - e.y) / wpDist) * e.speed;
            return;
         }
      }
   }
   if (dist > 5) {
      e.x += ((targetPos.x - e.x) / dist) * e.speed;
      e.y += ((targetPos.y - e.y) / dist) * e.speed;
   }
}

export function processExplore(state) {
  const h = state.hero;
  if (h.order !== 'EXPLORE' && h.order !== 'ATTACK' && !(h.order === 'MOVE' && h.targetType === 'NONE')) return;

  const [hx, hy] = getGridPos(h.pos.x, h.pos.y);

  if (!h.targetPos || h.path.length === 0 || Date.now() - h.lastPathCalc > 1000) {
     const [hx, hy] = getGridPos(h.pos.x, h.pos.y);

     // PRIORITIZE MATERIALS (Reachable ones only)
     const materials = state.items
        .filter(i => i.type === 'Material')
        .sort((a,b) => Math.hypot(a.x-h.pos.x, a.y-h.pos.y) - Math.hypot(b.x-h.pos.x, b.y-h.pos.y));

     for (const best of materials) {
        const path = calculateAStarPath(state.grid, [hx, hy], getGridPos(best.x, best.y), CELL_SIZE);
        if (path.length > 0) {
           h.targetPos = { x: best.x, y: best.y };
           h.path = path;
           h.lastPathCalc = Date.now();
           return;
        }
     }

     // BFS for NEAREST UNVISITED TILE (Ignore current tile)
     let queue = [[hx, hy]];
     let visitedBfs = new Set();
     let found = null;
     
     visitedBfs.add(`${hx},${hy}`); // Don't pick current tile

     while(queue.length > 0) {
        const [cx, cy] = queue.shift();
        
        // Check neighbors
        const neighbors = [[cx, cy-1], [cx+1, cy], [cx, cy+1], [cx-1, cy]];
        for (const [nx, ny] of neighbors) {
           if (nx < 0 || ny < 0 || nx >= state.grid[0].length || ny >= state.grid.length) continue;
           if (state.grid[ny][nx] === 1) continue; // Wall

           const hash = `${nx},${ny}`;
           if (visitedBfs.has(hash)) continue;
           visitedBfs.add(hash);

           if (!state.visited[ny][nx]) {
              found = [nx, ny];
              break;
           }
           queue.push([nx, ny]);
        }
        if (found) break;
     }

     if (found) {
        const path = calculateAStarPath(state.grid, [hx, hy], found, CELL_SIZE);
        if (path.length > 0) {
           h.path = path;
           h.lastPathCalc = Date.now();
           h.targetPos = { x: found[0] * CELL_SIZE + CELL_SIZE/2, y: found[1] * CELL_SIZE + CELL_SIZE/2 }; 
           return;
        }
     }

     // FALLBACK: PATROL OFFSET
     const fallbackOffsets = [
        [6, 0], [-6, 0], [0, 6], [0, -6], [4, 4], [-4, 4], [4, -4], [-4, -4]
     ];

     for (const [dx, dy] of fallbackOffsets) {
        const fx = Math.max(0, Math.min(state.grid[0].length - 1, hx + dx));
        const fy = Math.max(0, Math.min(state.grid.length - 1, hy + dy));
        if (state.grid[fy][fx] === 1) continue;

        const patrolPath = calculateAStarPath(state.grid, [hx, hy], [fx, fy], CELL_SIZE);
        if (patrolPath.length > 0) {
           h.path = patrolPath;
           h.lastPathCalc = Date.now();
           h.targetPos = { x: fx * CELL_SIZE + CELL_SIZE / 2, y: fy * CELL_SIZE + CELL_SIZE / 2 };
           return;
        }
     }

     h.order = 'AWAIT';
     h.path = [];
  }

  if (h.path && h.path.length > 0) {
     const wp = h.path[0];
     
     // TRAP DETECTION (Hesitation Logic)
     if (state.grid[wp.gy][wp.gx] === 2 && !h.trapApproved) {
        h.interruptedOrder = h.order; // Store for explore mode too
        h.interruptedTargetType = h.targetType;
        h.interruptedTargetPos = h.targetPos ? { ...h.targetPos } : null;

        h.order = 'AWAIT';
        h.path = [];
        h.vel = { x: 0, y: 0 };
        h.acc = { x: 0, y: 0 };
        h.currentDialogue = "SECTOR CORRUPTION DETECTED. PROCEED AT RISK?";
        h.dialogueTimer = Date.now();
        h.awaitingConfirmation = true;
        return;
     }

     const dist = Math.hypot(wp.px - h.pos.x, wp.py - h.pos.y);
     if (dist < 15) {
        h.path.shift();
     } else {
        const force = steering.seek(h, { x: wp.px, y: wp.py });
        h.acc.x += force.x * HERO_STEER_FORCE;
        h.acc.y += force.y * HERO_STEER_FORCE;
     }
  }
}

export function processMovement(state) {
  const h = state.hero;
  if (h.order !== 'MOVE') return;
  if (h.targetType === 'safety' || h.targetType === 'NONE') return;
  
  if (h.targetType && h.targetType.toUpperCase() !== 'SPATIAL') {
      const match = fuzzyMatch(h.targetType, [...state.enemies, ...state.items]);
      if (match) h.targetPos = { x: match.x, y: match.y };
  }

  if (h.targetType === 'SPIN') {
     h.vel.x += Math.cos(Date.now()/50) * 1.5;
     h.vel.y += Math.sin(Date.now()/50) * 1.5;
     if (Date.now() - h.dialogueTimer > 1000) h.order = 'AWAIT';
  } else if (h.targetPos) {
     executeHeroRoute(h, h.targetPos, state);
  }
}

export function processRun(state) {
  const h = state.hero;
  if (h.order !== 'RUN' && !(h.order === 'MOVE' && h.targetType === 'safety')) return;
  
  if (state.enemies.length === 0) {
     h.order = 'AWAIT';
     return;
  }

  if (!h.targetPos || Date.now() - (h.lastPathCalc || 0) > 500) {
    const safe = findSafestCell(state);
    if (safe) {
      h.targetPos = { x: safe[0] * CELL_SIZE + CELL_SIZE/2, y: safe[1] * CELL_SIZE + CELL_SIZE/2 };
      
      // Visual feedback
      if (h.currentDialogue !== "INITIATING_RETREAT_PROTOCOL") {
         h.currentDialogue = "INITIATING_RETREAT_PROTOCOL";
         h.dialogueTimer = Date.now();
      }
    }
  }

  if (h.targetPos) {
    executeHeroRoute(h, h.targetPos, state, true); // Safety mode ALWAYS avoids traps
  }
}

export function processAttack(state) {
  const h = state.hero;
  if (h.order !== 'ATTACK') return;
  
  if (h.targetType === 'CURRENT_DIRECTION') {
     const angle = Math.atan2(h.vel.y, h.vel.x) || 0;
     state.weapons.push({ type: 'melee_sweep', x: h.pos.x + Math.cos(angle)*30, y: h.pos.y + Math.sin(angle)*30, radius: 25, life: 5, damage: 10, source: 'player' });
     audioPlayer.playSound('attack_blade');
     h.order = 'AWAIT';
     return;
  }
    const isGeneric = h.targetType === 'NONE' || h.targetType === 'closest' || h.targetType === 'all';
   let target = null;

   if (!isGeneric) {
      // NAMED TARGETING: Match strictly on every tick to follow specific name
      target = fuzzyMatch(h.targetType, state.enemies);
   } else {
      // GENERAL ATTACK: Always find any visible threat nearby
      const vw = state.camera.w || 800;
      const vh = state.camera.h || 600;
      
      const sightPool = state.enemies.filter(e => {
         const onScreen = e.x >= state.camera.x && e.x <= state.camera.x + vw &&
                        e.y >= state.camera.y && e.y <= state.camera.y + vh;
         return onScreen || (h.lastAttackerId && e.id === h.lastAttackerId);
      });

      if (sightPool.length > 0) {
         let nearestDist = Infinity;
         sightPool.forEach(e => {
            const d = Math.hypot(e.x - h.pos.x, e.y - h.pos.y);
            if (d < nearestDist) {
               nearestDist = d;
               target = e;
            }
         });
      } else {
         // SEARCH RADIUS (Increased to 1000 to catch snipers/ranged units)
         const searchPool = state.enemies.filter(e => Math.hypot(e.x - h.pos.x, e.y - h.pos.y) < 1000);
         if (searchPool.length > 0) {
            target = searchPool[0];
            console.log(`[CombatSystem] General attack: targeting ${target.name} via radius`);
         } else {
            // NO ENEMIES ON SIGHT
            if ((h.killsInSession || 0) > 0) {
               h.order = 'AWAIT';
               h.currentDialogue = "SECTOR_SECURED. STANDING_BY.";
               h.dialogueTimer = Date.now();
               return;
            } else {
               processExplore(state);
               return;
            }
         }
      }
   }

  if (target) {
     const dist = Math.hypot(target.x - h.pos.x, target.y - h.pos.y);
     const angle = Math.atan2(target.y - h.pos.y, target.x - h.pos.x);
     
     if (h.weapon === 'NANO_BLADE') {
        if (dist < 60) {
            if (!h.attackCd || h.attackCd <= 0) {
               const damage = 15 + (h.atk || 0);
               state.weapons.push({ type: 'melee_sweep', x: (h.pos.x + target.x)/2, y: (h.pos.y + target.y)/2, radius: 45, life: 8, damage, source: 'player' });
               audioPlayer.playSound('attack_blade');
               h.attackCd = SPACE_ATTACK_CD; // Standardized to 40
            }
        } else {
           executeHeroRoute(h, { x: target.x, y: target.y }, state, true);
        }
     } else if (h.weapon === 'PULSE_RIFLE') {
        if (dist < 400) {
            if (!h.attackCd || h.attackCd <= 0) {
               const damage = 8 + Math.floor((h.atk || 0) * 0.6);
               state.weapons.push({ type: 'projectile', x: h.pos.x, y: h.pos.y, vx: Math.cos(angle)*7, vy: Math.sin(angle)*7, radius: 6, life: 60, damage, source: 'player' });
               audioPlayer.playSound('attack_pulse');
               h.attackCd = 24; // Increased from 12 to ensure cadence
               state.particles.push({ x: h.pos.x, y: h.pos.y, vx: Math.cos(angle)*3, vy: Math.sin(angle)*3, life: 20, type: 'heat_trail', radius: 4 });
            }
        } else {
           executeHeroRoute(h, { x: target.x, y: target.y }, state, true);
        }
     } else if (h.weapon === 'RAIL_GUN') {
        if (dist < 800) {
           if (!h.attackCd || h.attackCd <= 0) {
              const damage = 40 + (h.atk || 0) * 2;
              state.weapons.push({ type: 'projectile', x: h.pos.x, y: h.pos.y, vx: Math.cos(angle)*15, vy: Math.sin(angle)*15, radius: 4, life: 100, damage, source: 'player', isPiercing: true });
              audioPlayer.playSound('attack_rail');
              h.attackCd = 100;
              state.cameraShake = 15;
              state.particles.push({ x: h.pos.x, y: h.pos.y, vx: Math.cos(angle)*8, vy: Math.sin(angle)*8, life: 45, type: 'heat_trail', radius: 8 });
           }
        } else {
           executeHeroRoute(h, { x: target.x, y: target.y }, state, true);
        }
     }

     // Rapid-fire blade support
     if (h.materials && h.materials.length > 0 && (!h.bladeAttackCd || h.bladeAttackCd <= 0)) {
        launchBlade(h, state, target);
        h.bladeAttackCd = SPACE_ATTACK_CD;
     }
  } else {
     h.order = 'AWAIT';
  }
}

export function resolveCombatTicks(state, isWallSolid, callbacks, gameMode) {
  const { hero: h, sidekick: sk, weapons, enemies, items, particles } = state;

  // --- MANUAL ATTACK (SPACEBAR) ---
  if (state.inputState?.space && h.attackCd <= 0 && gameMode === 'NORMAL') {
     const angle = Math.atan2(h.vel.y, h.vel.x) || 0;
     const damage = 15 + (h.atk || 0);
     weapons.push({ 
       type: 'melee_sweep', 
       x: h.pos.x + Math.cos(angle)*35, 
       y: h.pos.y + Math.sin(angle)*35, 
       radius: 50, 
       life: 10, 
       damage, 
       source: 'player' 
     });
       audioPlayer.playSound('attack_blade');
     h.attackCd = SPACE_ATTACK_CD;
     
     // Manual blade support
     if (h.materials && h.materials.length > 0 && h.bladeAttackCd <= 0) {
        launchBlade(h, state);
        h.bladeAttackCd = SPACE_ATTACK_CD;
     }
     
     // Random chance for sidekick to mock manual effort
     if (sk && Date.now() - sk.lastEventTime > 2000 && Math.random() < 0.1) {
        generateSidekickQuip('hero_damage', { personality: 'mocking' }).then(q => {
           if (q && q.split(/\s+/).length <= 10) {
             setSidekickDialogue(sk, q);
           }
        });
     }
  }

  // --- SIDEKICK IDLE/MOVING QUIPS ---
  if (sk && Date.now() - sk.lastEventTime > 5000) {
     sk.lastEventTime = Date.now();
     const hSpeed = Math.hypot(h.vel.x, h.vel.y);
     if (hSpeed < 0.2) {
        generateSidekickQuip('idle_5s').then(q => {
           if (q && q.split(/\s+/).length <= 10) {
             setSidekickDialogue(sk, q);
           }
        });
     } else {
        let dir = "North";
        if (Math.abs(h.vel.x) > Math.abs(h.vel.y)) dir = h.vel.x > 0 ? "East" : "West";
        else dir = h.vel.y > 0 ? "South" : "North";
        
        generateSidekickQuip('moving_5s', { movementDirection: dir }).then(q => {
           if (q && q.split(/\s+/).length <= 10) {
             setSidekickDialogue(sk, q);
           }
        });
     }
  }

  // --- SIDEKICK SCAVENGING ---
  if (sk && sk.state === 'FOLLOW' && !sk.isFused) {
     const scavengeTarget = items.find(i => Math.hypot(i.x - h.pos.x, i.y - h.pos.y) < SIDEKICK_SCAVENGE_RANGE);
     if (scavengeTarget) {
        sk.state = 'SCAVENGE';
        sk.targetPos = { x: scavengeTarget.x, y: scavengeTarget.y };
     }
  }

  for (let i = weapons.length - 1; i >= 0; i--) {
     const w = weapons[i];
     w.life--;
     if (w.life <= 0) {
        if (w.type === 'blade') {
           state.items.push({ name: 'buff', type: 'Material', x: w.x, y: w.y });
        }
        weapons.splice(i, 1);
        continue;
     }

     if (w.source === 'player') {
          enemies.forEach(e => {
             if (e.invuln > 0) return;
             if (Math.hypot(e.x - w.x, e.y - w.y) < w.radius + e.radius) {
                 // --- BOSS RAMPAGE REFLECTION FEAT ---
                 const isBossRampage = e.type === 'BOSS' && e.phase2StartTime && (Date.now() - e.phase2StartTime < 15000);
                 if (isBossRampage && w.type === 'blade') {
                     const dist = Math.hypot(w.x - e.x, w.y - e.y) || 1;
                     const nx = (w.x - e.x) / dist;
                     const ny = (w.y - e.y) / dist;
                     const dot = w.vx * nx + w.vy * ny;
                     
                     // Physics accurate bounce: v' = v - 2(v.n)n
                     w.vx = (w.vx - 2 * dot * nx) * 1.1;
                     w.vy = (w.vy - 2 * dot * ny) * 1.1;
                     
                     w.source = 'enemy';
                     w.sourceEntityId = e.id;
                     w.isHoming = false;
                     w.targetId = null;
                     w.damage = 20;
                     
                     state.glitchIntensity = Math.max(state.glitchIntensity || 0, 0.4);
                     audioPlayer.playSound('boss_reflect');
                     return; // Skip damage processing for this enemy
                 }

                 e.hp -= w.damage;
                audioPlayer.playSound('enemy_hit');
                 e.invuln = 10;

                         particles.push({
                            x: e.x + (Math.random() - 0.5) * 12,
                            y: e.y - 12,
                            vx: (Math.random() - 0.5) * 0.6,
                            vy: -1.0,
                            life: 45,
                            type: 'damage_number',
                            amount: w.damage,
                            color: '#2cff7a'
                         });
                 
                 // ENEMY KNOCKBACK
                 const angle = Math.atan2(e.y - w.y, e.x - w.x);
                 const force = (w.damage / 10) + 2;
                 e.vx = (e.vx || 0) + Math.cos(angle) * force;
                 e.vy = (e.vy || 0) + Math.sin(angle) * force;

                 state.cameraShake = Math.max(state.cameraShake || 0, 4);
                 for(let k=0; k<5; k++) particles.push({ x: e.x, y: e.y, life: 10, type: 'data_fragment', color: '#f00', vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4 });
                 
                 if (!w.isPiercing) w.life = 0;
              }
          });
     } else if (w.source === 'enemy') {
          if (Math.hypot(h.pos.x - w.x, h.pos.y - w.y) < w.radius + h.radius) {
             if (!h.invuln || h.invuln <= 0) {
                 const reducedDmg = Math.max(1, w.damage - (h.def || 0));
                callbacks.onDamageHero(reducedDmg, DEATH_CAUSES.PROJECTILE);
                 h.invuln = 30;
                 state.cameraShake = 12;

                 // HERO KNOCKBACK
                 const angle = Math.atan2(h.pos.y - w.y, h.pos.x - w.x);
                 const force = (reducedDmg / 5) + 3;
                 h.vel.x += Math.cos(angle) * force;
                 h.vel.y += Math.sin(angle) * force;
                
                // Track source of aggressive logic
                if (w.sourceEntityId) {
                   h.lastAttackerId = w.sourceEntityId;
                }

                // SIDEKICK TRASH TALK ON DAMAGE
                if (sk && Date.now() - sk.lastEventTime > 2000) {
                   generateSidekickQuip('hero_damage').then(q => {
                      if (q && q.split(/\s+/).length <= 10) {
                        setSidekickDialogue(sk, q);
                      }
                   });
                }
              }
             if (!w.isPiercing) w.life = 0;
          }
     }

     if (w.type === 'projectile' || w.type === 'blade') {
        // SWORD RANGE TARGET LOCK (Homing)
        if (w.type === 'blade' && w.isHoming && w.targetId) {
           const target = state.enemies.find(e => e.id === w.targetId);
           if (target) {
              const distToTarget = Math.hypot(target.x - w.x, target.y - w.y);
              
              // MAGNETIC LOCK: Snap to target if very close to prevent overshooting
              if (distToTarget < 30) {
                 w.x = target.x;
                 w.y = target.y;
                 w.life = 0; // Trigger immediate impact and drop
              } else {
                 const angle = Math.atan2(target.y - w.y, target.x - w.x);
                 const speed = Math.hypot(w.vx, w.vy);
                 // Sharp steering interpolation
                 w.vx += (Math.cos(angle) * speed - w.vx) * 0.45;
                 w.vy += (Math.sin(angle) * speed - w.vy) * 0.45;
              }
           }
        }
        
        w.x += w.vx; w.y += w.vy;
        if (w.type === 'blade') {
           w.shapeTime = (w.shapeTime || 0) + 0.1;
        }
     }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
     const e = enemies[i];
     if (e.invuln > 0) e.invuln--;
     if (e.attackCd > 0) e.attackCd--;

     if (e.hp <= 0) {
         callbacks.onScore(e.type === 'BOSS' ? 1000 : 50);
         
         // Record the logic termination
         h.killsInSession = (h.killsInSession || 0) + 1;
         
         // SIDEKICK TRASH TALK ON KILL
         if (sk && Date.now() - sk.lastEventTime > 2000) {
            generateSidekickQuip('enemy_kill').then(q => {
               if (q && q.split(/\s+/).length <= 10) {
                 setSidekickDialogue(sk, q);
               }
            });
         }
         
         enemies.splice(i, 1);
        for(let p=0; p<15; p++) particles.push({ x: e.x, y: e.y, life: 25, type: 'hit' });

        // Win only when ALL bosses are eliminated
        if (e.type === 'BOSS' && !enemies.some(en => en.type === 'BOSS')) {
           callbacks.onWin();
        }

        continue;
     }

     const dist = Math.hypot(h.pos.x - e.x, h.pos.y - e.y);
     
     // --- THE ARCHITECT (BOSS) AI ---
     if (e.type === 'BOSS') {
        const threshold = (e.maxHp || 500) * 0.5;
        if (e.hp < threshold && !e.phase2StartTime) e.phase2StartTime = Date.now();
        const isPhase2 = e.phase2StartTime && (Date.now() - e.phase2StartTime < 15000);
       
       if (isPhase2 && Date.now() - (e.lastTeleport || 0) > 4000) {
          e.lastTeleport = Date.now();
          const gx = Math.floor(e.x / CELL_SIZE), gy = Math.floor(e.y / CELL_SIZE);
          let foundPos = null;
          for(let k=0; k<10; k++) {
             const tx = gx + Math.floor(Math.random()*6-3), ty = gy + Math.floor(Math.random()*6-3);
             if (state.grid[ty] && state.grid[ty][tx] === 0) {
                foundPos = { x: tx*CELL_SIZE+CELL_SIZE/2, y: ty*CELL_SIZE+CELL_SIZE/2 }; break;
             }
          }
          if (foundPos) {
             e.x = foundPos.x; e.y = foundPos.y;
             state.glitchIntensity = 0.8;
             for(let a=0; a<Math.PI*2; a+=Math.PI/6) {
                weapons.push({ type: 'projectile', x: e.x, y: e.y, vx: Math.cos(a)*6, vy: Math.sin(a)*6, radius: 10, life: 60, damage: 15, source: 'enemy', sourceEntityId: e.id });
             }
          }
       }

       if (dist < 800) {
          executeEnemyRoute(e, h.pos, state);
          if (Date.now() - (e.lastAttack || 0) > (isPhase2 ? 800 : 1200)) {
             e.lastAttack = Date.now();
             audioPlayer.playSound('enemy_fire', { cooldownMs: isPhase2 ? 120 : 160 });
             const count = isPhase2 ? 10 : 4;
             for(let a=0; a<Math.PI*2; a+=Math.PI/count) {
               weapons.push({ type: 'projectile', x: e.x, y: e.y, vx: Math.cos(a)*4, vy: Math.sin(a)*4, radius: 8, life: 120, damage: 10, source: 'enemy', sourceEntityId: e.id });
             }
          }
       } else {
          e.x += Math.cos(Date.now()/500) * 0.5; e.y += Math.sin(Date.now()/800) * 0.5;
       }
     } 
     // --- SNIPER AI ---
     else if (e.type === 'SNIPER') {
       if (dist < 350) {
          const safety = findSafestCell({ ...state, hero: e });
          if (safety) executeEnemyRoute(e, { x: safety[0]*CELL_SIZE+CELL_SIZE/2, y: safety[1]*CELL_SIZE+CELL_SIZE/2 }, state);
       } else if (dist < 800) {
          if (dist > 600) executeEnemyRoute(e, h.pos, state);
          if (Date.now() - (e.lastShot || 0) > 4000 && hasLineOfSight(state.grid, e, h.pos)) {
             e.lastShot = Date.now();
             const angle = Math.atan2(h.pos.y - e.y, h.pos.x - e.x);
             audioPlayer.playSound('enemy_fire');
             weapons.push({ type: 'projectile', x: e.x, y: e.y, vx: Math.cos(angle)*12, vy: Math.sin(angle)*12, radius: 8, life: 100, damage: 40, source: 'enemy', sourceEntityId: e.id, isPiercing: true });
          }
       }
     } 
     // --- GUARD AI ---
     else if (e.type === 'GUARD') {
       const hvt = state.enemies.find(en => en.type === 'BOSS') || { x: e.x, y: e.y };
       const distToAnchor = Math.hypot(e.x - hvt.x, e.y - hvt.y);
       if (dist < 350) executeEnemyRoute(e, h.pos, state);
       else if (distToAnchor > 300) executeEnemyRoute(e, hvt, state);
     }
     // --- RANGED / MELEE AI ---
     else if (e.type === 'RANGED') {
       if (dist < 300) {
          if (Date.now() - (e.lastShot || 0) > 2000) {
            e.lastShot = Date.now();
            const angle = Math.atan2(h.pos.y - e.y, h.pos.x - e.x);
                  audioPlayer.playSound('enemy_fire');
            weapons.push({ type: 'projectile', x: e.x, y: e.y, vx: Math.cos(angle)*4, vy: Math.sin(angle)*4, radius: 5, life: 80, damage: 5, source: 'enemy', sourceEntityId: e.id });
          }
       } else if (dist < 700) {
          executeEnemyRoute(e, h.pos, state);
       }
     } else { 
       if (dist < 600) {
          executeEnemyRoute(e, h.pos, state);
       }
     }

     if (isWallSolid) {
        state.walls.forEach(w => {
           const overlapX = Math.min((e.x + e.radius) - w.x, (w.x + w.w) - (e.x - e.radius));
           const overlapY = Math.min((e.y + e.radius) - w.y, (w.y + w.h) - (e.y - e.radius));
           if (overlapX > 0 && overlapY > 0) {
               if (overlapX < overlapY) {
                   e.x += e.x < w.x + w.w/2 ? -overlapX : overlapX;
               } else {
                   e.y += e.y < w.y + w.h/2 ? -overlapY : overlapY;
               }
           }
        });
     }

     // --- ENEMY TRAP LOGIC ---
     const [egx, egy] = getGridPos(e.x, e.y);
     if (state.grid[egy] && state.grid[egy][egx] === 2) {
        if (!e.invuln || e.invuln <= 0) {
           e.hp -= 2;
           e.invuln = 15;
           for(let k=0; k<2; k++) particles.push({ x: e.x, y: e.y, life: 15, type: 'hit' });
        }
     }

     if ((e.type === 'MELEE' || e.type === 'GUARD') && dist < h.radius + e.radius + 5) {
        if (!e.attackCd || e.attackCd <= 0) {
           if (!h.invuln || h.invuln <= 0) {
              const reducedDmg = Math.max(1, 5 - (h.def || 0));
              callbacks.onDamageHero(reducedDmg, DEATH_CAUSES.KINETIC);
              h.invuln = 30;
           }
           e.attackCd = 120;
           e.x -= ((h.pos.x - e.x)/dist) * 20; 
           e.y -= ((h.pos.y - e.y)/dist) * 20;
        }
     }
  }

  items.forEach((u, idx) => {
    // Collect if Hero is near OR if Sidekick is near
    const distToHero = Math.hypot(u.x - h.pos.x, u.y - h.pos.y);
    const distToSidekick = sk ? Math.hypot(u.x - sk.pos.x, u.y - sk.pos.y) : Infinity;
    
    if (distToHero < h.radius + 15 || distToSidekick < (sk?.radius || 0) + 15) {
       if (u.type === 'Health Potion' || u.type === 'Health pack') {
         h.hp = Math.min(h.maxHp || 100, (h.hp || 100) + 20);
             callbacks.onDamageHero(0, DEATH_CAUSES.NEURAL); 
       }
        else if (u.type === 'Score Boost') callbacks.onScore(100);
        else if (u.type === 'Logic Hack') callbacks.onConsumeItem('Logic Hack');
        else if (u.type === 'Attack Core') callbacks.onConsumeItem('Attack Core');
        else if (u.type === 'Defense Plate') callbacks.onConsumeItem('Defense Plate');
        else if (u.type === 'Vitality Mesh') {
            h.maxHp += 20; h.hp += 20;
            callbacks.onConsumeItem('Vitality Mesh'); 
        }
        else if (u.type === 'Pulse Rifle') callbacks.onConsumeItem('Pulse Rifle');
        else if (u.type === 'Rail-Gun') callbacks.onConsumeItem('Rail-Gun');
        else if (u.type === 'Material') callbacks.onConsumeItem('Material');
        
        particles.push({ x: u.x, y: u.y, life: 15, type: 'hit' });
        items.splice(idx, 1);

        // SIDEKICK TRASH TALK ON COLLECT
        if (sk && distToSidekick < 30 && Date.now() - sk.lastEventTime > 2000) {
           generateSidekickQuip('item_collect').then(q => {
              if (q && q.split(/\s+/).length <= 10) {
                setSidekickDialogue(sk, q);
              }
           });
        }
    }
  });

  // --- ROOM-X (TRAP) LOGIC ---
  const [gx, gy] = getGridPos(h.pos.x, h.pos.y);
  if (state.grid[gy] && state.grid[gy][gx] === 2) {
      h.wasOnTrap = true; // Mark that we are currently in hazard
      if (!h.invuln || h.invuln <= 0) {
        callbacks.onDamageHero(2, DEATH_CAUSES.CORE); // Reduced damage (was 10)
          h.invuln = 15;
          for(let k=0; k<3; k++) particles.push({ x: h.pos.x, y: h.pos.y, life: 20, type: 'hit' });
          h.currentDialogue = "CAUTION: LOGIC_LEAK_IN_SECTOR";
          h.dialogueTimer = Date.now();
      }
  } else if (h.wasOnTrap) {
      // RESET AFTER EXIT
      h.trapApproved = false;
      h.wasOnTrap = false;
  }
}

export function processUse(state, callbacks) {
  const h = state.hero;
  if (h.order !== 'USE') return;

  if (h.targetType === 'NOTHING' || !h.targetType || h.targetType === 'NONE') {
     state.particles.push({ x: h.pos.x, y: h.pos.y - 20, life: 15, radius: 6, type: 'trail' });
  } else {
     const worldMatch = fuzzyMatch(h.targetType, state.items);
     if (worldMatch) {
        h.order = 'MOVE';
        h.targetPos = { x: worldMatch.x, y: worldMatch.y };
        h.currentDialogue = "Item found in sector. Moving to retrieve.";
        h.dialogueTimer = Date.now();
        return;
     }
  }
  h.order = 'AWAIT';
}

export function launchBlade(h, state, target = null) {
  if (!h.materials || h.materials.length === 0) return;
  const blade = h.materials.pop();
  
  const dist = target ? Math.hypot(target.x - h.pos.x, target.y - h.pos.y) : 999;
  const isHoming = target && dist < 220; // Expanded Radar Range

  const angle = target 
    ? Math.atan2(target.y - h.pos.y, target.x - h.pos.x) 
    : (Math.atan2(h.vel.y, h.vel.x) || 0);

  state.weapons.push({
    type: 'blade',
    x: h.pos.x,
    y: h.pos.y,
    vx: Math.cos(angle) * 12,
    vy: Math.sin(angle) * 12,
    radius: 12,
    life: 100,
    damage: 20 + Math.floor((h.atk || 0) * 0.5),
    source: 'player',
    isHoming,
    targetId: target ? target.id : null
  });
}
