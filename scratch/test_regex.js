
function testRegex(prompt) {
  const availableTargets = ["Slime", "Orc"];
  let intent = { action: 'WAIT', target: 'NONE', dialogue: "Holding position." };
  const lower = prompt.toLowerCase();

  if (lower.includes('flee') || lower.includes('run away') || lower.includes('retreat') || lower.includes('safety')) {
    intent = { action: 'MOVE', target: 'SAFETY', dialogue: "Seeking tactical safety!" };
  } else if (lower.includes('up') || lower.includes('down') || lower.includes('left') || lower.includes('right')) {
    let dir = 'up';
    if (lower.includes('down')) dir = 'down';
    else if (lower.includes('left')) dir = 'left';
    else if (lower.includes('right')) dir = 'right';
    intent = { action: 'MOVE', target: dir, dialogue: `Moving ${dir}ward.` };
  } else if (lower.includes('move') || lower.includes('go') || lower.includes('run') || lower.includes('walk')) {
    intent = { action: 'MOVE', target: availableTargets.length > 0 ? availableTargets[0] : 'NONE', dialogue: "Relocating geometric chassis." };
  } else if (lower.includes('attack') || lower.includes('kill') || lower.includes('hit') || lower.includes('fight')) {
    intent = { action: 'ATTACK', target: 'CLOSEST', dialogue: "Violence protocols engaged." };
  } else if (lower.includes('stop') || lower.includes('wait') || lower.includes('hold')) {
    intent = { action: 'WAIT', target: 'NONE', dialogue: "Holding position." };
  }
  return intent;
}

console.log("move down:", testRegex("move down"));
console.log("MOVE DOWN:", testRegex("MOVE DOWN"));
console.log("down:", testRegex("down"));
console.log("random:", testRegex("random"));
