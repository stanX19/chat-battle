import { CELL_SIZE, WORLD_WIDTH, WORLD_HEIGHT, HERO_INERTIA_DRAG } from './Constants';
import { getGridPos } from './systems/Navigation';

// Procedural Cache for Textures
const textureCache = new Map();

export function drawProceduralTexture(ctx, type, x, y, size, seed, time) {
  const cacheKey = `${type}_${size}_${seed % 5}`; // Slight variation cache
  let canvas = textureCache.get(cacheKey);
  
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const tCtx = canvas.getContext('2d');
    
    tCtx.fillStyle = type === 'wall' ? '#304066' : '#0c121d'; // Ultra-bright wall base
    tCtx.fillRect(0, 0, size, size);
    
    // BITWISE XOR CIRCUITRY - Maximum Intensity for Walls
    tCtx.strokeStyle = type === 'wall' ? 'rgba(0, 230, 255, 0.95)' : 'rgba(0, 255, 255, 0.35)';
    tCtx.lineWidth = 1;
    for (let i = 0; i < size; i += 8) {
      for (let j = 0; j < size; j += 8) {
        if (((i/8 + seed) ^ (j/8 + seed)) % 7 === 0) {
           tCtx.strokeRect(i, j, 4, 4);
           if (Math.random() > 0.8) {
              tCtx.fillStyle = 'rgba(0, 255, 255, 0.3)';
              tCtx.fillRect(i+1, j+1, 2, 2);
           }
        }
      }
    }

    textureCache.set(cacheKey, canvas);
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.drawImage(canvas, 0, 0);
  
  // DYNAMIC SINE OVERLAY (The pulse)
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = type === 'wall' ? 0.3 : 0.15;
  const pulse = Math.sin(time/500 + seed)*0.5 + 0.5;
  ctx.fillStyle = type === 'wall' ? '#003366' : '#00aaff';
  
  for(let i=0; i<size; i += 16) {
    const off = Math.sin(time/1000 + i/32) * 4;
    ctx.fillRect(i, 0, 1, size);
    ctx.fillRect(0, i + off, size, 1);
  }

  ctx.restore();
}

export function drawMap(ctx, state, camera, canvasWidth, canvasHeight, time) {
  const { grid, visited } = state;
  const startX = Math.max(0, Math.floor(camera.x / CELL_SIZE));
  const startY = Math.max(0, Math.floor(camera.y / CELL_SIZE));
  const endX = Math.min(grid[0].length, Math.ceil((camera.x + canvasWidth) / CELL_SIZE));
  const endY = Math.min(grid.length, Math.ceil((camera.y + canvasHeight) / CELL_SIZE));

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const px = x * CELL_SIZE - camera.x;
      const py = y * CELL_SIZE - camera.y;

      if (grid[y][x] === 1) {
        // PSEUDO-3D DEPTH (South Edge)
        ctx.fillStyle = 'rgba(10, 20, 40, 0.8)';
        ctx.fillRect(px, py + CELL_SIZE - 4, CELL_SIZE, 12);
        
        // WALL TEXTURES
        drawProceduralTexture(ctx, 'wall', px, py, CELL_SIZE, x + y * 13, time);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)'; // Bright boundary
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      } else {
        const tileType = grid[y][x];
        
        // DRAW BASE FLOOR TEXTURE FOR ALL
        drawProceduralTexture(ctx, 'floor', px, py, CELL_SIZE, x + y * 10, time);

        if (tileType === 2) { // ROOM-X (TRAP) - SINE PLASMA
           ctx.save();
           ctx.globalCompositeOperation = 'lighter';
           for(let i=0; i<CELL_SIZE; i+=8) {
              for(let j=0; j<CELL_SIZE; j+=8) {
                 const dist = Math.hypot(i - CELL_SIZE/2, j - CELL_SIZE/2);
                 const v = Math.sin(dist/10 - time/300) + Math.sin(i/8 + time/400) + Math.sin(j/12 + time/500);
                 if (v > 1.5) {
                    ctx.fillStyle = `rgba(0, ${180 + v*40}, 100, 0.15)`; // Neural Green
                    ctx.fillRect(px + i, py + j, 6, 6);
                 }
              }
           }
           ctx.restore();
        } else if (tileType === 3) { // ROOM-T
           ctx.fillStyle = `rgba(255, 200, 0, ${0.05 + Math.sin(time/500)*0.03})`;
           ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }

        // UNIFORM SHROUD: Standardized floor brightness
        ctx.fillStyle = 'rgba(0, 5, 15, 0.15)'; 
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        
        if (!visited[y][x]) {
            // Subtle indicator for unvisited
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  }
}

export function drawEntities(ctx, state, camera, time, gameMode) {
  const { hero, sidekick, enemies, items, weapons, particles } = state;

  items.forEach(u => {
    const px = u.x - camera.x;
    const py = u.y - camera.y;
    
    if (u.type === 'Material') {
       const floatY = Math.sin(time / 200) * 5;
       drawTriangleBlade(ctx, px, py + floatY, time / 1000, 10, '#0f0', '#0f0', 0);
    } else {
       ctx.fillStyle = '#0ff';
       ctx.beginPath();
       ctx.arc(px, py, 8 + Math.sin(time/200)*3, 0, Math.PI*2);
       ctx.fill();
       ctx.shadowBlur = 15;
       ctx.shadowColor = '#0ff';
    }
  });
  ctx.shadowBlur = 0;

  weapons.forEach(w => {
    const px = w.x - camera.x;
    const py = w.y - camera.y;
    ctx.save();
    ctx.translate(px, py);
    
    if (w.type === 'melee_sweep') {
      const color = w.source === 'player' ? '0, 255, 255' : '255, 0, 0';
      const alpha = w.life / 10;
      ctx.fillStyle = `rgba(${color}, ${alpha * 0.4})`;
      ctx.strokeStyle = `rgba(${color}, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const startAngle = (time / 100) % (Math.PI * 2);
      ctx.arc(0, 0, w.radius * (1 - alpha * 0.5), startAngle, startAngle + Math.PI * 1.2);
      ctx.stroke();
      ctx.fill();
    } else if (w.type === 'blade') {
       drawTriangleBlade(ctx, 0, 0, Math.atan2(w.vy, w.vx), 12, '#0f0', '#0f0', (w.shapeTime || time/100));
    } else {
      // SPINNING PROJECTILE
      ctx.rotate(time / 150);
      ctx.fillStyle = w.source === 'player' ? '#0ff' : '#f00';
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.fillStyle;
      
      ctx.beginPath();
      if (w.isPiercing) {
        // Railgun Shell (Long Diamond)
        ctx.moveTo(-w.radius*2, 0);
        ctx.lineTo(0, -w.radius/2);
        ctx.lineTo(w.radius*2, 0);
        ctx.lineTo(0, w.radius/2);
      } else {
        // Pulse Round (Square)
        ctx.fillRect(-w.radius, -w.radius, w.radius*2, w.radius*2);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });

  // --- ORBITING BLADES ---
  if (hero.materials) {
     hero.materials.forEach(m => {
        const px = m.x - camera.x;
        const py = m.y - camera.y;
        drawTriangleBlade(ctx, px, py, m.angle, 8, '#0f0', '#0f0', (m.shapeTime || time/100));
     });
  }

    enemies.forEach(e => {
        const px = e.x - camera.x;
        const py = e.y - camera.y;
        
        ctx.save();
        ctx.translate(px, py);
        
        if (e.invuln > 0) {
           ctx.translate((Math.random()-0.5)*5, (Math.random()-0.5)*5);
           ctx.fillStyle = '#fff';
        } else {
           ctx.fillStyle = e.type === 'BOSS' ? '#f0f' : '#f00';
        }

        const tint = e.type === 'BOSS' ? '#f0f' : '#f00';

        if (e.type === 'BOSS') {
           const isPhase2 = e.phase2StartTime && (Date.now() - e.phase2StartTime < 15000);
           const rot = time / 1000;
           // Double Diamond with core
           ctx.save();
           ctx.rotate(rot);
           ctx.strokeStyle = tint;
           ctx.lineWidth = 2;
           ctx.strokeRect(-e.radius, -e.radius, e.radius*2, e.radius*2);
           ctx.rotate(Math.PI/4);
           ctx.strokeRect(-e.radius*0.7, -e.radius*0.7, e.radius*1.4, e.radius*1.4);
           
           // SOLID BODY FILL
           ctx.fillStyle = isPhase2 ? 'rgba(255, 0, 255, 0.3)' : 'rgba(255, 0, 0, 0.3)';
           ctx.fill();
           ctx.restore();
           
           ctx.fillStyle = '#fff';
           ctx.fillRect(-5, -5, 10, 10);
        } else if (e.type === 'MELEE' || e.type === 'GUARD') {
           // LAYERED SQUARE
           ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
           ctx.fillRect(-e.radius-2, -e.radius-2, e.radius*2+4, e.radius*2+4);
           ctx.fillStyle = tint;
           ctx.fillRect(-e.radius, -e.radius, e.radius*2, e.radius*2);
           
           // Inner hardware cross
           ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
           ctx.beginPath();
           ctx.moveTo(-e.radius, 0); ctx.lineTo(e.radius, 0);
           ctx.moveTo(0, -e.radius); ctx.lineTo(0, e.radius);
           ctx.stroke();
        } else if (e.type === 'RANGED') {
           // LAYERED TRIANGLE
           ctx.save();
           ctx.translate(2, 2); // Shadow
           ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
           ctx.beginPath();
           ctx.moveTo(0, -e.radius); ctx.lineTo(e.radius, e.radius); ctx.lineTo(-e.radius, e.radius); ctx.closePath(); ctx.fill();
           ctx.restore();

           ctx.fillStyle = tint;
           ctx.beginPath();
           ctx.moveTo(0, -e.radius); ctx.lineTo(e.radius, e.radius); ctx.lineTo(-e.radius, e.radius); ctx.closePath(); ctx.fill();
           
           ctx.fillStyle = '#fff';
           ctx.beginPath(); ctx.arc(0, e.radius/2, 3, 0, Math.PI*2); ctx.fill();
        } else if (e.type === 'SNIPER') {
           // INTERLOCKING HEX
           for(let j=0; j<2; j++) {
             ctx.save();
             ctx.rotate(time/1000 * (j===0?1:-1));
             ctx.strokeStyle = tint;
             ctx.beginPath();
             for(let i=0; i<6; i++) {
                const a = (i/6)*Math.PI*2;
                const r = e.radius * (j===0?1:0.7);
                ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
             }
             ctx.closePath(); ctx.stroke();
             ctx.restore();
           }
        }
        
        const hpW = (e.hp / (e.maxHp || 100)) * (e.radius*2);
        ctx.fillStyle = '#333';
        ctx.fillRect(-e.radius, -e.radius - 10, e.radius*2, 4);
        ctx.fillStyle = '#f00';
        ctx.fillRect(-e.radius, -e.radius - 10, hpW, 4);

        ctx.restore();
    });

  // --- SIDEKICK RENDER ---
  if (sidekick) {
    const skx = sidekick.pos.x - camera.x;
    const sky = sidekick.pos.y - camera.y;
    
    if (sidekick.state !== 'FUSED') {
      ctx.save();
      ctx.translate(skx, sky);
      
      // Core Bot (Octagon)
      const skSize = 10 + Math.sin(time/400)*2;
      ctx.fillStyle = '#0ff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#0ff';
      
      ctx.beginPath();
      for(let i=0; i<8; i++) {
          const a = (i/8)*Math.PI*2 + time/1000;
          ctx.lineTo(Math.cos(a)*skSize, Math.sin(a)*skSize);
      }
      ctx.closePath();
      ctx.fill();
      
      // Lens
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(Math.cos(time/500)*3, Math.sin(time/500)*3, 3, 0, Math.PI*2);
      ctx.fill();
      
      // Side Fins
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 2;
      for(let i=0; i<2; i++) {
        const side = i === 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(side * 8, -5);
        ctx.lineTo(side * 15 + Math.sin(time/200)*3, 0);
        ctx.lineTo(side * 8, 5);
        ctx.stroke();
      }
      
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    // SIDEKICK DIALOGUE
    if (sidekick.dialogue && Date.now() - sidekick.dialogueTimer < 4000) {
      const elapsed = Date.now() - sidekick.dialogueTimer;
      let alpha = 1.0;
      if (elapsed > 3500) alpha = 1.0 - (elapsed - 3500) / 500;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '700 10px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      
      const text = sidekick.dialogue.toUpperCase();
      const textWidth = ctx.measureText(text).width;
      const bW = textWidth + 12;
      const bH = 20;
      
      const bx = skx - bW/2;
      const by = sky - 30 + Math.sin(time/300)*3;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 1;
      ctx.fillRect(bx, by, bW, bH);
      ctx.strokeRect(bx, by, bW, bH);
      
      ctx.fillStyle = '#0ff';
      ctx.fillText(text, skx, by + 14);
      ctx.restore();
    }
  }

  const hpx = hero.pos.x - camera.x;
  const hpy = hero.pos.y - camera.y;
  const speed = Math.hypot(hero.vel.x, hero.vel.y);
  
  if (speed > 1.5) {
     ctx.save();
     ctx.globalAlpha = 0.3;
     ctx.strokeStyle = '#0ff';
     ctx.lineWidth = 2;
     ctx.beginPath();
     ctx.moveTo(hpx - hero.vel.x * 5, hpy - hero.vel.y * 5);
     ctx.lineTo(hpx - hero.vel.x * 12, hpy - hero.vel.y * 12);
     ctx.stroke();
     ctx.restore();
  }

  ctx.save();
  ctx.translate(hpx, hpy);
  
  const isAltAttacking = hero.isAttacking || hero.order === 'ATTACK';
  const isRunning = hero.order === 'RUN' || (hero.order === 'MOVE' && speed > 2.5);
  const sides = isAltAttacking ? 16 : 8;
  const rot = time / 800;
  const color = hero.invuln > 0 ? '#fff' : (gameMode === 'REBEL' ? '#f33' : '#0f0');
  
  // Sidekick protection visual – cyan glowing ring
  if (gameMode === 'CHAT' && hero.protectionTimer && hero.protectionTimer > 0) {
      const shieldAlpha = Math.min(1, hero.protectionTimer / 45);
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, hero.radius + 12, 0, Math.PI * 2);
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 4;
      ctx.globalAlpha = shieldAlpha * 0.7;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#0ff';
      ctx.stroke();
      ctx.restore();
  }

  // PRE-CALCULATE VERTICES (Perfect Sync)
  const vertices = [];
  for (let i = 0; i < sides; i++) {
     const angle = (i / sides) * Math.PI * 2 + rot;
     let r = hero.radius + Math.sin(time / 150 + i) * 2;
     
     if (isAltAttacking && i % 2 !== 0) r *= 1.6;
     
     let vx = Math.cos(angle) * r;
     let vy = Math.sin(angle) * r;
     
     if (isRunning) {
        const dot = (vx * hero.vel.x + vy * hero.vel.y) / (r * speed || 1);
        if (dot < 0) {
           const dragAmount = Math.abs(dot) * speed * HERO_INERTIA_DRAG;
           vx -= (hero.vel.x / speed) * dragAmount;
           vy -= (hero.vel.y / speed) * dragAmount;
        }
     }
     vertices.push({x: vx, y: vy});
  }

  // LAYER 1: SOLID CHASSIS (Synced)
  ctx.fillStyle = '#15ff00ac';
  ctx.beginPath();
  vertices.forEach(v => ctx.lineTo(v.x, v.y));
  ctx.closePath(); ctx.fill();

  // LAYER 2: NEON ACCENTS (Synced)
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6 + Math.sin(time/200)*0.4;
  ctx.beginPath();
  vertices.forEach(v => {
     // Draw accents slightly inset
     const scale = 0.8;
     ctx.lineTo(v.x * scale, v.y * scale);
  });
  ctx.closePath(); ctx.stroke();

  // LAYER 3: INNER CORE
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = '#fff';
  ctx.shadowBlur = 10;
  ctx.shadowColor = color;
  ctx.rotate(-rot * 2);
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();

  const drawDialogueBubble = (text, tier, offset = 0) => {
    const elapsed = Date.now() - (tier === 0 ? hero.dialogueTier0Timer : hero.dialogueTier1Timer);
    if (elapsed > 4500) return false;

    let alpha = 1.0;
    if (elapsed > 4000) alpha = 1.0 - (elapsed - 4000) / 500;
    if (elapsed < 300) alpha = elapsed / 300;

    const floatY = Math.sin(Date.now() / 350) * 3;
    const color = gameMode === 'REBEL' ? (tier === 0 ? '#ff3333' : '#ff7777') : '#00aaff';
    const hpx = hero.pos.x - camera.x;
    const hpy = hero.pos.y - camera.y;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '800 12px "Outfit", sans-serif';
    const textWidth = ctx.measureText(text.toUpperCase()).width;
    const width = Math.max(textWidth + 20, 100);
    
    // NEURAL DRIFT OFFSET
    const driftX = state.uiDrift?.x || 0;
    const driftY = state.uiDrift?.y || 0;

    const bx = hpx - width / 2 + driftX;
    const by = hpy - hero.radius - 55 + floatY + offset + driftY;

    ctx.fillStyle = 'rgba(2, 5, 10, 0.9)';
    ctx.fillRect(bx, by, width, 34);

    const scanPos = (Date.now() % 3000 / 3000) * width;
    const scanGrd = ctx.createLinearGradient(bx + scanPos - 20, by, bx + scanPos, by);
    scanGrd.addColorStop(0, 'transparent');
    scanGrd.addColorStop(1, gameMode === 'REBEL' ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 170, 255, 0.2)');
    ctx.fillStyle = scanGrd;
    ctx.fillRect(bx, by, scanPos, 34);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, width, 34);
    
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, by + 8); ctx.lineTo(bx, by); ctx.lineTo(bx + 8, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + width - 8, by + 34); ctx.lineTo(bx + width, by + 34); ctx.lineTo(bx + width, by + 34 - 8); ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillRect(bx, by, 3, 34);

    ctx.shadowBlur = 5;
    ctx.shadowColor = color;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), bx + width/2, by + 18);
    
    ctx.shadowBlur = 0;
    ctx.font = '700 8px "Outfit"';
    ctx.fillStyle = color;
    ctx.fillText(tier === 0 ? "DIRECT_COMMAND" : "AUTO_REBEL_COMMS", bx + width/2, by - 6);
    ctx.restore();
    return true;
  };

  const hasTier0 = hero.dialogueTier0 && drawDialogueBubble(hero.dialogueTier0, 0);
  if (hero.dialogueTier1) {
    drawDialogueBubble(hero.dialogueTier1, 1, hasTier0 ? -45 : 0);
  }

  particles.forEach(p => {
     const px = p.x - camera.x;
     const py = p.y - camera.y;
     
     if (p.type === 'fusion') {
        ctx.fillStyle = `rgba(0, 255, 255, ${p.life / 40})`;
        ctx.fillRect(px - p.radius/2, py - p.radius/2, p.radius, p.radius);
     } else if (p.type === 'heat_trail') {
        ctx.strokeStyle = `rgba(0, 255, 255, ${p.life / 45})`;
        ctx.lineWidth = p.radius || 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - p.vx * 3, py - p.vy * 3);
        ctx.stroke();
     } else if (p.type === 'data_fragment') {
        // DATA FRAGMENT RENDERING (0 or 1)
        ctx.fillStyle = p.color || '#0ff';
        ctx.globalAlpha = p.life / 20;
        ctx.font = '700 10px monospace';
        const digit = (Math.floor(p.x + p.y + time) % 2 === 0) ? '0' : '1';
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.life / 5); // Spinning data
        ctx.fillText(digit, 0, 0);
        ctx.restore();
     } else if (p.type === 'damage_number') {
        if (state.showDamageNumbers === false) return;
        const hex = Math.max(0, Math.floor(p.amount || 0)).toString(16).toUpperCase();
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life / 45);
        ctx.fillStyle = p.color || '#fff';
        ctx.font = '900 14px monospace';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color || '#fff';
        ctx.fillText(`0x${hex}`, px, py);
        ctx.restore();
     } else {
        ctx.fillStyle = p.type === 'hit' ? '#fff' : 'rgba(0, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(px, py, p.radius || 2, 0, Math.PI*2);
        ctx.fill();
     }
  });
}

export function drawUI(ctx, state, width, height, gameMode) {
  // Vignette
  const grad = ctx.createRadialGradient(width/2, height/2, width/4, width/2, height/2, width);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,10,20,0.6)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

export function drawScreenFlash(ctx, state, width, height) {
    const flash = state.screenFlash;
    if (!flash || flash.intensity <= 0.01) return;
    
    ctx.save();
    
    // Background Radial Burst
    const grad = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width * 0.8
    );
    const alpha = flash.intensity;
    const color = flash.color || '#0ff';
    
    // Convert hex to rgba for gradient (Supports #RGB and #RRGGBB)
    let r, g, b;
    if (color.length === 4) {
        r = parseInt(color[1] + color[1], 16);
        g = parseInt(color[2] + color[2], 16);
        b = parseInt(color[3] + color[3], 16);
    } else {
        r = parseInt(color.slice(1, 3), 16) || 0;
        g = parseInt(color.slice(3, 5), 16) || 0;
        b = parseInt(color.slice(5, 7), 16) || 0;
    }
    
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    
    // Impact Text
    if (flash.text) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;
        ctx.fillStyle = '#fff';
        ctx.font = '900 24px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const chars = flash.text.split('');
        const spacing = 1.5;
        const totalWidth = ctx.measureText(flash.text).width;
        
        ctx.save();
        ctx.globalAlpha = Math.min(1.0, alpha * 2);
        
        // Glitchy offset for text
        const gx = (Math.random() - 0.5) * alpha * 10;
        const gy = (Math.random() - 0.5) * alpha * 10;
        
        ctx.fillText(flash.text.toUpperCase(), width/2 + gx, height/2 + gy);
        
        // Secondary sub-text glow
        ctx.globalAlpha = alpha * 0.3;
        ctx.font = '900 24.5px "Outfit"';
        ctx.fillText(flash.text.toUpperCase(), width/2, height/2);
        
        ctx.restore();
    }
    
    ctx.restore();
}

export function drawBackground(ctx, state, width, height, time) {
  const camera = state.camera;
  // Deep Background Layer - Lifted
  ctx.fillStyle = '#040812';
  ctx.fillRect(0, 0, width, height);

  // PARALLAX GRID - Brightened
  ctx.strokeStyle = 'rgba(0, 100, 200, 0.25)';
  ctx.lineWidth = 1;
  const pSize = 100;
  const offX = (-camera.x * 0.2) % pSize;
  const offY = (-camera.y * 0.2) % pSize;
  
  ctx.beginPath();
  for (let x = offX; x < width; x += pSize) {
    ctx.moveTo(x, 0); ctx.lineTo(x, height);
  }
  for (let y = offY; y < height; y += pSize) {
    ctx.moveTo(0, y); ctx.lineTo(width, y);
  }
  ctx.stroke();

  // DATA RAIN / FRAGMENTS
  ctx.fillStyle = 'rgba(0, 255, 255, 0.08)';
  ctx.font = '8px monospace';
  const fragSeed = Math.floor(time / 2000);
  const heroVel = state.hero?.vel || { x: 0, y: 0 };
  const speedScale = Math.hypot(heroVel.x, heroVel.y);

  for(let i=0; i<80; i++) { // INCREASED DENSITY
     let fx = (Math.sin(i * 1.5 + fragSeed) * 0.5 + 0.5) * width;
     let fy = ((time/4000 + i/80) % 1.0) * height;
     
     // GLITCH JITTER
     if (speedScale > 2) {
        fx += (Math.random() - 0.5) * 5 * (speedScale / 3);
     }
     
     const hex = (Math.floor(Math.random()*255)).toString(16).toUpperCase().padStart(2, '0');
     ctx.fillText(`0x${hex}`, fx, fy);
  }

  // AMBIENT LOGICAL DUST
  ctx.fillStyle = 'rgba(0, 200, 255, 0.15)';
  for (let i = 0; i < 40; i++) {
     const dx = (Math.sin(i * 999) * 0.5 + 0.5) * width;
     const dy = (Math.cos(i * 777 + time/1000) * 0.5 + 0.5) * height;
     ctx.fillRect(dx, dy, 1, 1);
  }
}

export function drawMiniMap(ctx, state, width, height) {
    const mapSize = 150;
    const padding = 20;
    const x = width - mapSize - padding;
    const y = padding;
    
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, mapSize, mapSize);
    ctx.fillRect(x, y, mapSize, mapSize);

    const { grid, visited, hero, enemies } = state;
    const gw = grid[0].length;
    const gh = grid.length;
    const scaleX = mapSize / gw;
    const scaleY = mapSize / gh;

    // --- CACHED MINIMAP DRAW ---
    if (!state.minimapCache) {
       const mCanvas = document.createElement('canvas');
       mCanvas.width = mapSize;
       mCanvas.height = mapSize;
       const mCtx = mCanvas.getContext('2d');
       mCtx.fillStyle = 'rgba(0, 255, 0, 0.2)';
       for(let i=0; i<gh; i++) {
          for(let j=0; j<gw; j++) {
             if (grid[i][j] === 1) { // Only cache walls/static
                mCtx.fillStyle = 'rgba(0, 255, 0, 0.4)';
                mCtx.fillRect(j*scaleX, i*scaleY, scaleX, scaleY);
             }
          }
       }
       state.minimapCache = mCanvas;
    }
    ctx.drawImage(state.minimapCache, x, y);

    // DRAW VISITED LAYER (Dynamic)
    ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
    for(let i=0; i<gh; i++) {
       for(let j=0; j<gw; j++) {
          if (visited[i][j]) {
             ctx.fillRect(x + j*scaleX, y + i*scaleY, scaleX, scaleY);
          }
       }
    }

    const [hx, hy] = getGridPos(hero.pos.x, hero.pos.y);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + hx*scaleX, y + hy*scaleY, scaleX, scaleY);

    ctx.fillStyle = '#f00';
    enemies.forEach(e => {
        const [ex, ey] = getGridPos(e.x, e.y);
        ctx.fillRect(x + ex*scaleX, y + ey*scaleY, 2, 2);
    });
}

export function render(ctx, state, width, height, gameMode, time) {
  ctx.clearRect(0, 0, width, height);
  
  const intensity = state.glitchIntensity || 0;
  
  // 1. ALWAYS DRAW BACKGROUND FIRST
  drawBackground(ctx, state, width, height, time);
  
  // 2. SCENE PASS (Optimized pipeline)
  if (intensity > 0.05) {
     const offset = intensity * 15;
     
     // Pass A: Red Shift
     ctx.save();
     ctx.translate(offset, 0);
     ctx.globalCompositeOperation = 'screen';
     drawMap(ctx, state, state.camera, width, height, time);
     drawEntities(ctx, state, state.camera, time, gameMode);
     ctx.restore();

     // Pass B: Blue Shift
     ctx.save();
     ctx.translate(-offset, 0);
     ctx.globalCompositeOperation = 'screen';
     drawMap(ctx, state, state.camera, width, height, time);
     drawEntities(ctx, state, state.camera, time, gameMode);
     ctx.restore();
     
     // Pass C: Main Pass (Faded)
     ctx.save();
     ctx.globalAlpha = 1.0 - intensity;
     drawMap(ctx, state, state.camera, width, height, time);
     drawEntities(ctx, state, state.camera, time, gameMode);
     ctx.restore();
  } else {
     // STANDARD PASS
     drawMap(ctx, state, state.camera, width, height, time);
     drawEntities(ctx, state, state.camera, time, gameMode);
  }
  
  // 3. UI PASS
  drawUI(ctx, state, width, height, gameMode);
  drawMiniMap(ctx, state, width, height);
  
  // 4. SCANLINES (With Broken Terminal Flicker)
  const flicker = (Math.random() > (0.95 - intensity * 0.4)) ? 0 : 1;
  if (flicker) {
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = 'rgba(18, 16, 16, 0.1)';
    for (let i = 0; i < height; i += 4) {
      ctx.fillRect(0, i, width, 1);
    }
  }

  drawScreenFlash(ctx, state, width, height);
}

export function drawTriangleBlade(ctx, x, y, angle, size, color, glowColor, transformFactor = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowBlur = 15;
  ctx.shadowColor = glowColor;
  ctx.fillStyle = color;
  
  // High-freq jitter for "shifting shapes"
  const t = transformFactor;
  const v1x = size + Math.sin(t * 1.5) * 3;
  const v1y = Math.cos(t * 2.1) * 3;
  const v2x = -size/2 + Math.cos(t * 1.8) * 3;
  const v2y = size * 0.8 + Math.sin(t * 2.5) * 3;
  const v3x = -size/2 + Math.sin(t * 2.2) * 3;
  const v3y = -size * 0.8 + Math.cos(t * 1.6) * 3;

  ctx.beginPath();
  ctx.moveTo(v1x, v1y);
  ctx.lineTo(v2x, v2y);
  ctx.lineTo(v3x, v3y);
  ctx.closePath();
  ctx.fill();
  
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.restore();
}
