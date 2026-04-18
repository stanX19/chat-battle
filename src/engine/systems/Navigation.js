import { calculateAStarPath } from '../../pathfinding';
import { CELL_SIZE } from '../Constants';

export function getGridPos(x, y) {
   return [Math.floor(x / CELL_SIZE), Math.floor(y / CELL_SIZE)];
}

export function fuzzyMatch(query, list) {
  if (typeof query !== 'string' || !query || query === 'NONE' || query === 'SPATIAL') return null;
  const q = query.toLowerCase().trim();
  let best = null;
  let bestScore = -1;

  list.forEach(item => {
    const targetName = (item.name || item.type || (typeof item === 'string' ? item : '')).toLowerCase();
    let score = 0;
    
    if (targetName === q) score = 150; // Exact match priority
    else if (q.includes(targetName)) score = 120; // Inclusive match (e.g. "buff" in "get buff")
    else if (targetName.includes(q)) score = 100; // Partial match (e.g. "scout" in "scout-1")
    
    // VISUAL ALIAS MAPPING (Sync with Renderer.js)
    const visualAliases = {
      'triangle': ['ranged', 'gunner', 'shooter'],
      'square': ['melee', 'guard', 'scout', 'scout-0', 'scout-1', 'guard-0', 'guard-1'],
      'block': ['melee', 'guard', 'scout', 'scout-0', 'scout-1', 'guard-0', 'guard-1'],
      'hexagon': ['sniper'],
      'diamond': ['boss', 'overseer', 'the overseer', 'warden']
    };

    for (let alias in visualAliases) {
      if (q.includes(alias) && visualAliases[alias].some(v => targetName.includes(v))) {
         score = Math.max(score, 85); // High confidence match for visual descriptions
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  });

  return bestScore > 20 ? best : null;
}

export function findSafestCell(state) {
  const { hero, grid, enemies } = state;
  let bestScore = -Infinity;
  let bestCell = null;
  
  const width = grid[0].length;
  const height = grid.length;

  // Pre-calculate nearest enemy distances to optimize safety search
  const enemyPositions = enemies.map(e => ({ x: e.x, y: e.y, weight: e.type === 'BOSS' ? 5 : (e.type === 'RANGED' ? 2 : 1) }));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 1) continue; // Wall
      
      const px = x * CELL_SIZE + CELL_SIZE/2;
      const py = y * CELL_SIZE + CELL_SIZE/2;

      let safetyScore = 0;
      let minEnemyDist = Infinity;

      enemyPositions.forEach(e => {
        const dist = Math.hypot(e.x - px, e.y - py);
        minEnemyDist = Math.min(minEnemyDist, dist);
        
        // Safety = Distance * Weight
        // We use a non-linear penalty for proximity to enemies
        if (dist < 100) safetyScore -= (100 - dist) * 10 * e.weight;
        safetyScore += dist * e.weight;
      });

      // Hazard Penalty (Traps are NOT safe)
      if (grid[y][x] === 2) safetyScore -= 5000;

      // Nearest threat priority (Extra weight on distance from closest enemy)
      safetyScore += minEnemyDist * 2;

      // Distance bias: Prefer cells away from current position to encourage active movement
      const hPos = hero.pos || { x: hero.x, y: hero.y };
      const distFromStart = Math.hypot(hPos.x - px, hPos.y - py);
      safetyScore += distFromStart * 0.1;

      if (safetyScore > bestScore) {
        bestScore = safetyScore;
        bestCell = [x, y];
      }
    }
  }
  return bestCell;
}

export function hasLineOfSight(grid, start, end) {
  const [x1, y1] = [Math.floor(start.x / CELL_SIZE), Math.floor(start.y / CELL_SIZE)];
  const [x2, y2] = [Math.floor(end.x / CELL_SIZE), Math.floor(end.y / CELL_SIZE)];
  
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  let x = x1;
  let y = y1;
  let n = 1 + dx + dy;
  const x_inc = (x2 > x1) ? 1 : -1;
  const y_inc = (y2 > y1) ? 1 : -1;
  let error = dx - dy;
  const dx2 = dx * 2;
  const dy2 = dy * 2;

  for (; n > 0; --n) {
    if (grid[y] && grid[y][x] === 1) return false; // Hit a wall
    if (x === x2 && y === y2) break;

    if (error > 0) {
      x += x_inc;
      error -= dy2;
    } else {
      y += y_inc;
      error += dx2;
    }
  }
  return true;
}

export { calculateAStarPath };
