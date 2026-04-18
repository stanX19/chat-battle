export function calculateAStarPath(grid, startCell, targetCell, CELL_SIZE, avoidTraps = false) {
  const [sx, sy] = startCell;
  const [tx, ty] = targetCell;

  if (sx === tx && sy === ty) return [];
  if (grid[ty] === undefined || grid[ty][tx] === 1) return []; // Target cannot be a wall

  const width = grid[0].length;
  const height = grid.length;

  const getHash = (x, y) => `${x},${y}`;

  const openSet = [{ x: sx, y: sy, g: 0, f: Math.abs(sx - tx) + Math.abs(sy - ty) }];
  const closedSet = new Set();
  const cameFrom = new Map();

  const gScore = new Map();
  gScore.set(getHash(sx, sy), 0);

  const dirs = [ [0,-1], [1,0], [0,1], [-1,0] ]; 

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();

    if (current.x === tx && current.y === ty) {
       const path = [];
       let currHash = getHash(tx, ty);
       
       while (cameFrom.has(currHash)) {
          const [cx, cy] = currHash.split(',').map(Number);
          path.push({ px: cx * CELL_SIZE + CELL_SIZE/2, py: cy * CELL_SIZE + CELL_SIZE/2, gx: cx, gy: cy });
          
          const prev = cameFrom.get(currHash);
          currHash = getHash(prev.x, prev.y);
       }
       return path.reverse();
    }

    closedSet.add(getHash(current.x, current.y));

    for (let [dx, dy] of dirs) {
       const nx = current.x + dx;
       const ny = current.y + dy;

       if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
       if (grid[ny][nx] === 1) continue; // Skip walls

       // Cost calculation
       let moveCost = 1;
       if (avoidTraps && grid[ny][nx] === 2) {
          moveCost = 50; // Heavy penalty for traps
       }

       const nHash = getHash(nx, ny);
       if (closedSet.has(nHash)) continue;

       const tentativeG = gScore.get(getHash(current.x, current.y)) + moveCost;
       
       const existingG = gScore.has(nHash) ? gScore.get(nHash) : Infinity;
       if (tentativeG < existingG) {
          cameFrom.set(nHash, { x: current.x, y: current.y });
          gScore.set(nHash, tentativeG);
          const f = tentativeG + Math.abs(nx - tx) + Math.abs(ny - ty); 
          
          const existingNode = openSet.find(n => n.x === nx && n.y === ny);
          if (!existingNode) {
             openSet.push({ x: nx, y: ny, g: tentativeG, f });
          } else {
             existingNode.g = tentativeG;
             existingNode.f = f;
          }
       }
    }
  }

  return [];
}
