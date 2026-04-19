export function generateTutorialLayout() {
  const width = 12;
  const height = 10;
  // Box with a simple corridor
  const grid = Array.from({ length: height }, () => Array(width).fill(1));
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      grid[y][x] = 0;
    }
  }

  return {
    grid,
    furthestCell: { x: 8, y: 5 },
    availableFloors: [
      { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 },
      { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 },
      { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }
    ],
    width,
    height
  };
}

export function generateDungeon(width = 20, height = 16) {
  // Initialize all walls
  const grid = Array.from({ length: height }, () => Array(width).fill(1));

  function isBoundary(x, y) {
    return x <= 0 || x >= width - 1 || y <= 0 || y >= height - 1;
  }

  // Recursive Backtracker for classical maze
  const stack = [];
  const startX = 1;
  const startY = 1;
  
  grid[startY][startX] = 0;
  stack.push([startX, startY]);

  const dirs = [ [0, -2], [2, 0], [0, 2], [-2, 0] ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const [cx, cy] = current;
    
    // Shuffle directions
    dirs.sort(() => Math.random() - 0.5);
    
    let carved = false;
    for (let [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      
      if (!isBoundary(nx, ny) && grid[ny][nx] === 1) {
        grid[cy + dy/2][cx + dx/2] = 0; // Carve intermediate
        grid[ny][nx] = 0;               // Carve cell
        stack.push([nx, ny]);
        carved = true;
        break;
      }
    }
    
    if (!carved) {
      stack.pop();
    }
  }

  // Knock down random internal walls to create open rooms & cycles
  const wallsToKnock = Math.floor((width * height) * 0.1); // ~10% of total area
  let knocked = 0;
  while (knocked < wallsToKnock) {
    const rx = Math.floor(Math.random() * (width - 2)) + 1;
    const ry = Math.floor(Math.random() * (height - 2)) + 1;
    if (grid[ry][rx] === 1) {
       grid[ry][rx] = 0;
       knocked++;
    }
  }

  // Breadth-First Search to find furthest point
  const distances = Array.from({ length: height }, () => Array(width).fill(-1));
  distances[1][1] = 0;
  let queue = [[1, 1]];
  let maxDist = 0;
  let furthestCell = [1, 1];

  const stepDirs = [[0,-1],[1,0],[0,1],[-1,0]];
  
  while(queue.length > 0) {
    const [qx, qy] = queue.shift();
    const currentDist = distances[qy][qx];
    
    for (let [dx, dy] of stepDirs) {
      const nx = qx + dx;
      const ny = qy + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && grid[ny][nx] === 0 && distances[ny][nx] === -1) {
         distances[ny][nx] = currentDist + 1;
         queue.push([nx, ny]);
         if (distances[ny][nx] > maxDist) {
            maxDist = distances[ny][nx];
            furthestCell = [nx, ny];
         }
      }
    }
  }


  // 3. TAG SPECIAL SECTORS (ROOM-X, ROOM-T)
  // Find dead ends (only one floor neighbor)
  const floorCells = [];
  for(let y=1; y<height-1; y++) {
    for(let x=1; x<width-1; x++) {
       if (grid[y][x] === 0) {
         if ((x === 1 && y === 1) || (x === furthestCell[0] && y === furthestCell[1])) continue;
         
         let neighbors = 0;
         for (let [dx, dy] of stepDirs) {
            if (grid[y+dy][x+dx] === 0) neighbors++;
         }
         
         if (neighbors === 1 && Math.random() > 0.3) {
            grid[y][x] = 3; // ROOM-T (Treasure) at dead ends
         } else if (Math.random() < 0.04) {
            grid[y][x] = 2; // ROOM-X (Trap) randomly in corridors
         }
         floorCells.push({x, y, type: grid[y][x]});
       }
    }
  }

  return {
    grid,                 // 0: Floor, 1: Wall, 2: ROOM-X, 3: ROOM-T
    furthestCell,
    availableFloors: floorCells.filter(c => c.type === 0),
    width,
    height
  };
}
