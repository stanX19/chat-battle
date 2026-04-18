import { getGridPos } from './Navigation';
import { 
  CELL_SIZE, 
  HERO_MAX_SPEED, 
  HERO_SPEED_ATTACK,
  WORLD_WIDTH, 
  WORLD_HEIGHT,
  WASD_ACCELERATION,
  STABILITY_THRESHOLD,
  SIDEKICK_SPEED,
  SIDEKICK_FOLLOW_DIST
} from '../Constants';

export function ejectFromWalls(e, state, forceSnap = false) {
   const [gx, gy] = getGridPos(e.pos ? e.pos.x : e.x, e.pos ? e.pos.y : e.y);
   const { grid } = state;

   if (grid[gy] && grid[gy][gx] === 1) {
      // Find nearest floor
      const neighbors = [[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]];
      let bestDist = Infinity;
      let targetPos = null;
      neighbors.forEach(([dx, dy]) => {
         const nx = gx + dx, ny = gy + dy;
         if (grid[ny] && grid[ny][nx] === 0) {
            const fx = nx * CELL_SIZE + CELL_SIZE/2;
            const fy = ny * CELL_SIZE + CELL_SIZE/2;
            const d = Math.hypot(fx - (e.pos ? e.pos.x : e.x), fy - (e.pos ? e.pos.y : e.y));
            if (d < bestDist) { bestDist = d; targetPos = {x:fx, y:fy}; }
         }
      });
      if (targetPos) {
         if (forceSnap) {
            if (e.pos) { e.pos.x = targetPos.x; e.pos.y = targetPos.y; }
            else { e.x = targetPos.x; e.y = targetPos.y; }
         } else {
            if (e.pos) {
               e.pos.x += (targetPos.x - e.pos.x) * 0.1;
               e.pos.y += (targetPos.y - e.pos.y) * 0.1;
            } else {
               e.x += (targetPos.x - e.x) * 0.1;
               e.y += (targetPos.y - e.y) * 0.1;
            }
         }
      }
   }
}

export function applyPhysics(state, options) {
  const { hero, sidekick, walls, camera, grid } = state;
  const { isWallSolid, gameMode, canvasWidth, canvasHeight } = options;

  if (hero.invuln > 0) hero.invuln--;
  if (hero.attackCd > 0) hero.attackCd--;
  if (hero.bladeAttackCd > 0) hero.bladeAttackCd--;
  
  // --- WASD CONTROL (NORMAL MODE) ---
  if (gameMode === 'NORMAL' && state.inputState) {
    const isMoving = state.inputState.w || state.inputState.a || state.inputState.s || state.inputState.d;
    if (isMoving) {
      if (state.inputState.w) hero.acc.y -= WASD_ACCELERATION;
      if (state.inputState.s) hero.acc.y += WASD_ACCELERATION;
      if (state.inputState.a) hero.acc.x -= WASD_ACCELERATION;
      if (state.inputState.d) hero.acc.x += WASD_ACCELERATION;
      
      // Stop pathing if manual input is received
      hero.path = [];
      hero.targetPos = null;
      hero.order = 'AWAIT';
    }
  }

  // Track visited array
  const cx = Math.floor(hero.pos.x / CELL_SIZE);
  const cy = Math.floor(hero.pos.y / CELL_SIZE);
  if (cy >= 0 && cy < state.visited.length && cx >= 0 && cx < state.visited[0].length) {
     state.visited[cy][cx] = true;
  }

  hero.vel.x += hero.acc.x; hero.vel.y += hero.acc.y;
  const speed = Math.hypot(hero.vel.x, hero.vel.y);
  
  // Update Stability Progress based on distance moved
  if (gameMode === 'NORMAL' && speed > 0.1) {
    state.stabilityProgress += speed;
  }

  const speedMultiplier = 1 + (hero.speedBonus || 0);
  const baseSpeed = HERO_MAX_SPEED * speedMultiplier;
  const currentMax = hero.order === 'ATTACK' ? baseSpeed * HERO_SPEED_ATTACK : baseSpeed;
  
  if (speed > currentMax) {
    hero.vel.x = (hero.vel.x/speed)*currentMax;
    hero.vel.y = (hero.vel.y/speed)*currentMax;
  }
  hero.pos.x += hero.vel.x;
  hero.pos.y += hero.vel.y;
  hero.acc.x = 0; hero.acc.y = 0;
  hero.vel.x *= 0.95; hero.vel.y *= 0.95;

  // --- SIDEKICK PHYSICS ---
  if (sidekick) {
    if (sidekick.state === 'FUSED') {
      sidekick.pos.x = hero.pos.x;
      sidekick.pos.y = hero.pos.y;
      sidekick.vel.x = 0;
      sidekick.vel.y = 0;
    } else {
      const distToHero = Math.hypot(hero.pos.x - sidekick.pos.x, hero.pos.y - sidekick.pos.y);
      if (sidekick.state === 'FOLLOW') {
        if (distToHero > SIDEKICK_FOLLOW_DIST) {
          const angle = Math.atan2(hero.pos.y - sidekick.pos.y, hero.pos.x - sidekick.pos.x);
          sidekick.vel.x += Math.cos(angle) * 0.5;
          sidekick.vel.y += Math.sin(angle) * 0.5;
        }
      } else if (sidekick.state === 'SCAVENGE' && sidekick.targetPos) {
        const distToTarget = Math.hypot(sidekick.targetPos.x - sidekick.pos.x, sidekick.targetPos.y - sidekick.pos.y);
        if (distToTarget > 5) {
          const angle = Math.atan2(sidekick.targetPos.y - sidekick.pos.y, sidekick.targetPos.x - sidekick.pos.x);
          sidekick.vel.x += Math.cos(angle) * 0.8;
          sidekick.vel.y += Math.sin(angle) * 0.8;
        } else {
          sidekick.state = 'FOLLOW';
          sidekick.targetPos = null;
        }
      }
    }
    
    const skSpeed = Math.hypot(sidekick.vel.x, sidekick.vel.y);
    if (skSpeed > SIDEKICK_SPEED) {
      sidekick.vel.x = (sidekick.vel.x/skSpeed) * SIDEKICK_SPEED;
      sidekick.vel.y = (sidekick.vel.y/skSpeed) * SIDEKICK_SPEED;
    }
    sidekick.pos.x += sidekick.vel.x;
    sidekick.pos.y += sidekick.vel.y;
    sidekick.vel.x *= 0.92;
    sidekick.vel.y *= 0.92;
  }

  if (isWallSolid) {
    walls.forEach(w => {
       const overlapX = Math.min((hero.pos.x + hero.radius) - w.x, (w.x + w.w) - (hero.pos.x - hero.radius));
       const overlapY = Math.min((hero.pos.y + hero.radius) - w.y, (w.y + w.h) - (hero.pos.y - hero.radius));
       if (overlapX > 0 && overlapY > 0) {
           if (gameMode !== 'REBEL') {
               if (overlapX < overlapY) {
                   hero.pos.x += hero.pos.x < w.x + w.w/2 ? -overlapX : overlapX;
                   hero.vel.x = 0;
               } else {
                   hero.pos.y += hero.pos.y < w.y + w.h/2 ? -overlapY : overlapY;
                   hero.vel.y = 0;
               }
           }
       }
    });
  }

  // --- WALL EJECTION ---
  ejectFromWalls(hero, state, gameMode !== 'REBEL');

  // Decrement sidekick protection timer if active
  if (hero.protectionTimer && hero.protectionTimer > 0) {
     hero.protectionTimer--;
  }

  hero.pos.x = Math.max(hero.radius, Math.min(WORLD_WIDTH - hero.radius, hero.pos.x));
  hero.pos.y = Math.max(hero.radius, Math.min(WORLD_HEIGHT - hero.radius, hero.pos.y));

  camera.x += (hero.pos.x - canvasWidth/2 - camera.x) * 0.1;
  camera.y += (hero.pos.y - canvasHeight/2 - camera.y) * 0.1;
  camera.x = Math.max(0, Math.min(WORLD_WIDTH - canvasWidth, camera.x));
  camera.y = Math.max(0, Math.min(WORLD_HEIGHT - canvasHeight, camera.y));

  updateBladePhysics(state);
}

export function updateBladePhysics(state) {
  const { hero } = state;
  if (!hero.materials || hero.materials.length === 0) return;

  const hPos = hero.pos;
  const hVel = hero.vel;
  const speed = Math.hypot(hVel.x, hVel.y);
  const isMoving = speed > 0.8;
  const isAttacking = hero.attackTimer > 0;

  // Constants for Hooke's Law
  const k = 0.08;      // Spring stiffness
  const damping = 0.85; // Velocity decay
  const restDist = 45; // Distance from anchor

  hero.materials.forEach((m, i) => {
    // Initialize physics state if missing
    if (m.x === undefined) m.x = hPos.x;
    if (m.y === undefined) m.y = hPos.y;
    if (m.vx === undefined) m.vx = 0;
    if (m.vy === undefined) m.vy = 0;
    if (m.shapeTime === undefined) m.shapeTime = Math.random() * 100;

    m.shapeTime += 0.05;

    if (m.state === 'ORBIT') {
      let anchorX, anchorY;

      if (!isMoving && !isAttacking) {
        // IDLE: Slow synchronized orbit
        const slowOrbitAngle = (Date.now() / 2000) + (i * (Math.PI * 2 / hero.materials.length));
        const pulse = Math.sin(Date.now() / 1000) * 5;
        anchorX = hPos.x + Math.cos(slowOrbitAngle) * (restDist + pulse);
        anchorY = hPos.y + Math.sin(slowOrbitAngle) * (restDist + pulse);
        
        // Sync blade angle for rendering
        m.angle = slowOrbitAngle + Math.PI/2;
      } else {
        // MOVING: Hooke's Law Follow (Gravity/Spring)
        // Anchor is behind the player
        const moveAngle = Math.atan2(hVel.y, hVel.x);
        const behindAngle = moveAngle + Math.PI + (Math.sin(Date.now() / 200 + i) * 0.5);
        
        anchorX = hPos.x + Math.cos(behindAngle) * restDist;
        anchorY = hPos.y + Math.sin(behindAngle) * restDist;

        // Blade points towards movement or target
        m.angle = moveAngle + Math.PI/2;
      }

      // Spring Physics: F = -k * x
      const dx = anchorX - m.x;
      const dy = anchorY - m.y;
      
      // Inertia Law: Carry some of the hero's momentum into the spring gain
      const inertiaX = hVel.x * 0.2;
      const inertiaY = hVel.y * 0.2;

      m.vx += (dx * k) + inertiaX;
      m.vy += (dy * k) + inertiaY;
      
      m.vx *= damping;
      m.vy *= damping;
      
      m.x += m.vx;
      m.y += m.vy;
    }
  });
}
