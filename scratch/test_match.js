// Manually copied and simplified fuzzyMatch to avoid transition/import issues in scratch
export function fuzzyMatch(query, list) {
  if (typeof query !== 'string' || !query || query === 'NONE' || query === 'SPATIAL') return null;
  const q = query.toLowerCase().trim();
  let best = null;
  let bestScore = -1;

  list.forEach(item => {
    const targetName = (item.name || item.type || (typeof item === 'string' ? item : '')).toLowerCase();
    let score = 0;
    
    if (targetName === q) score = 150; 
    else if (q.includes(targetName)) score = 120; // Inclusive match (e.g. "buff" in "get buff")
    else if (targetName.includes(q)) score = 100; // Partial match (e.g. "scout" in "scout-1")
    
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  });

  return bestScore > 20 ? best : null;
}

const mockItems = [
    { name: 'buff', type: 'Health Potion', x: 100, y: 100 },
    { name: 'buff', type: 'Score Boost', x: 200, y: 200 },
    { name: 'Scout-1', type: 'MELEE', x: 300, y: 300 }
];

function test(query, list, expectedType) {
    const match = fuzzyMatch(query, list);
    const pass = match && (match.type === expectedType || match.name === expectedType);
    console.log(`Query: "${query}" -> Found: ${match ? match.type || match.name : 'null'} [${pass ? 'PASS' : 'FAIL'}]`);
}

console.log("--- Testing Inclusive Matching ---");
test("get buff", mockItems, "Health Potion"); 
test("pick up the buff", mockItems, "Health Potion");
test("go to buff", mockItems, "Health Potion");
test("scout", mockItems, "MELEE"); // AI outputs "scout", finds "Scout-1"

console.log("\n--- Testing Exact Matching ---");
test("buff", mockItems, "Health Potion");
test("Scout-1", mockItems, "Scout-1");
