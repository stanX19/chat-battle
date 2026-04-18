
function sanitizeResponse(raw) {
  const result = { action: 'WAIT', target: 'NONE', dialogue: "Processing signals." };
  
  try {
    if (!raw || typeof raw !== 'object') return result;

    // 1. Action Normalization
    const validActions = ['ATTACK', 'MOVE', 'WAIT', 'EXIT_CHAOS'];
    let action = String(raw.action || 'WAIT').toUpperCase().trim();
    if (!validActions.includes(action)) action = 'WAIT';
    result.action = action;

    // 2. Target Normalization
    let target = raw.target;
    if (target && typeof target === 'object') {
       target = target.name || target.id || target.text || target.target || JSON.stringify(target);
    }
    result.target = String(target || 'NONE').trim();

    // 3. Dialogue Normalization
    const isASCII = (str) => /^[\x00-\x7F]*$/.test(str);
    let dialogue = String(raw.dialogue || "Acknowledged.");
    if (!isASCII(dialogue)) dialogue = "Clean signal established.";
    result.dialogue = dialogue;

    return result;
  } catch (err) {
    return result;
  }
}

// Test Cases
const tests = [
  { name: "Perfect JSON", input: { action: "ATTACK", target: "Slime", dialogue: "Hi" } },
  { name: "Object Target", input: { action: "MOVE", target: { name: "SafeZone" }, dialogue: "Going" } },
  { name: "Malformed Target", input: { action: "MOVE", target: ["Array?"], dialogue: "Oops" } },
  { name: "Missing Fields", input: { action: "EXIT_CHAOS" } },
  { name: "Invalid Action", input: { action: "DANCE", target: "Party", dialogue: "Fun" } },
  { name: "Non-ASCII Dialogue", input: { action: "WAIT", target: "NONE", dialogue: "Hello 世界" } }
];

tests.forEach(t => {
  console.log(`--- Test: ${t.name} ---`);
  console.log("Input:", JSON.stringify(t.input));
  console.log("Output:", JSON.stringify(sanitizeResponse(t.input)));
  console.log("");
});
