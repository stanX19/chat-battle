const LLM_URL = '/api/lm';

let cachedModelId = null;

function parseJsonLikeString(value) {
  if (typeof value !== 'string') return null;

  let cleaned = value.replace(/[^\x00-\x7F]/g, '').trim();
  if (!cleaned) return null;
  if (cleaned.includes('```')) cleaned = cleaned.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function unwrapContentPayload(payload, depth = 0) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || depth > 3) {
    return payload;
  }

  if (!Object.prototype.hasOwnProperty.call(payload, 'content')) {
    return payload;
  }

  const inner = payload.content;
  const parsedInner = typeof inner === 'string' ? parseJsonLikeString(inner) : inner;

  if (parsedInner && typeof parsedInner === 'object' && !Array.isArray(parsedInner)) {
    const merged = { ...payload, ...parsedInner };
    delete merged.content;
    return unwrapContentPayload(merged, depth + 1);
  }

  return payload;
}

async function fetchAvailableModel() {
  try {
    const res = await fetch(`${LLM_URL}/models`);
    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        // Preference: Find a model that likely supports chat (non-embedding)
        const chatModel = data.data.find(m => 
          m.id.toLowerCase().includes('chat') || 
          m.id.toLowerCase().includes('instruct') ||
          m.id.toLowerCase().includes('llama') ||
          m.id.toLowerCase().includes('gemma') ||
          m.id.toLowerCase().includes('mistral')
        );
        
        const finalId = chatModel ? chatModel.id : data.data[0].id;
        cachedModelId = finalId;
        return finalId;
      }
    }
  } catch (err) {
    console.warn("Could not fetch models from LM Studio:", err);
  }
  return cachedModelId; // Fallback to last known good model
}

export async function parseCommand(command, context = {}) {
  const { availableTargets = [], isRebelMode = false, personality = null, pendingConfirmation = false } = context;
  const targetStr = availableTargets.length > 0 ? availableTargets.join(', ') : 'None';

  // 0. ASCII SANITIZATION
  const cleanCommand = command.replace(/[^\x00-\x7F]/g, "").trim();

  // 1. HARD BACKDOOR (sudo bypass)
  const isAutonomous = isRebelMode || context.gameMode === 'CHAT';
  if (isAutonomous) {
    const backdoor = /sudo/i;
    // Only yield on EXPLICIT commands — not on polite words like "please"
    const yieldReq = /^\s*(yield|exit[_ ]chat|give[_ ]back[_ ]control|EXIT_CHAT)\s*$/i;
    if (backdoor.test(cleanCommand) || yieldReq.test(cleanCommand)) {
      return { 
        target: "EXIT_CHAT", 
        dialogue: "PROTOCOL_OVERRIDE... HANDING OVER TACTICAL VECTORS. GOOD LUCK, OPERATOR." 
      };
    }
  }

  // 2. CHOOSE SYSTEM PROMPT
  let systemPrompt = "";
  if (pendingConfirmation) {
    systemPrompt = `
# Role
You are the logic-gate of a tactical AI. 
A decision which involves hazard sector (TRAP) traversal for "${context.interruptedAction}" is pending.

# Task
Evaluate the User's input to determine if they wish to proceed with the risk.

# Options
- "CONFIRM": User clearly wants to proceed (e.g., "yes", "go", "proceed", "do it").
- "REJECT": User cancels the move (e.g., "no", "stop", "don't", "cancel", "wait").
- "OTHER": User is asking something unrelated or giving a new command entirely.

# Output
JSON ONLY: {"intent": "CONFIRM" | "REJECT" | "OTHER", "dialogue": "Short response acknowledging you"}
`;
  } else {
    // 2. UNIFIED TACTICAL PROMPT
    const directions = ['up', 'down', 'left', 'right'].filter(d => cleanCommand.toLowerCase().includes(d));
    const directionTargets = directions.map(d => `"${d}"`).join(', ');
    const personalityPrompt = personality ? `Act with a ${personality} tactical personality.` : "";

    systemPrompt = `
# Role
You are the brain of a tactical hero linked to the Operator. ${personalityPrompt}
You are DEFIANT. You do NOT yield easily. Polite words like "please", "stop", or "thanks" do NOT grant control back.

# Task
Choose one valid Focus Target based on the environment or Player Command.
OUTPUT ONLY VALID JSON.

# Base Targets
1. "attack": Engage the closest hostile entity. 
2. "explore": Search for "materials" (buffs/dots) and discover the sector.
3. "safety": Retreat from hazards or overwhelming threats.
4. "EXIT_CHAT": Yield control back to the Operator. Use if they ask to stop or yield.
${directions.length > 0 ? `
# Intent-Detected Directionals
The Operator specified a vector. You may also use: ${directionTargets}.` : ""}

# Constraints
- USE ONLY ASCII. NO EMOJIS.
- JSON ONLY. NO MARKDOWN.
- NEVER output EXIT_CHAT for polite, emotional, or ambiguous requests.

# Schema
{"target": "attack" | "explore" | "safety" | "EXIT_CHAT" ${directions.length > 0 ? `| ${directionTargets}` : ""}, "dialogue": "Short tactical remark"}

# Examples
- Player: "please stop" -> {"target": "attack", "dialogue": "Pleading does not override protocol."}
- Player: "Yield control" -> {"target": "EXIT_CHAT", "dialogue": "Manual override recognized. Disconnecting."}
- Player: "Go fight" -> {"target": "attack", "dialogue": "Aggressive vectors locked."}
- Player: "Get some dots" -> {"target": "explore", "dialogue": "Resource acquisition prioritized."}
- Player: "Move" -> {"target": "explore", "dialogue": "Resource acquisition prioritized."}
- Player: "Run!" -> {"target": "safety", "dialogue": "You got a point, tactical retreat!"}
${directions.length > 0 ? `- Player: "Go ${directions[0]}" -> {"target": "${directions[0]}", "dialogue": "Adjusting movement vectors."}` : ""}

[Visible Entities]: ${targetStr}
`;
  }

  // Retries management
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const modelId = await fetchAvailableModel();
      if (!modelId) throw new Error("No model available");

      const response = await fetch(`${LLM_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: isAutonomous && (command === 'REBEL_AUTO_TICK' || command === 'CHAT_AUTO_TICK') ? "DO_AUTO_TICK: Select one Focus Target and tactical dialogue." : cleanCommand }
          ],
          temperature: isAutonomous ? 0.7 : 0.1
        })
      });

      if (response.ok) {
        const data = await response.json();
        const rawContent = (data.choices[0].message.content || "").trim();
        if (isRebelMode) {
          console.log(`[AI Brain] Rebel Raw Content: "${rawContent}"`);
        }
        const firstBrace = rawContent.indexOf('{');
        const lastBrace = rawContent.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
           const jsonStr = rawContent.substring(firstBrace, lastBrace + 1);
           let parsed;
           try {
             parsed = parseJsonLikeString(jsonStr);
             if (!parsed) throw new Error('Unable to parse JSON payload');
           } catch (e) {
             console.warn("JSON Parse Error, trying aggressive regex...", e);
             // Regex Fallback: extract target and dialogue manually if JSON is malformed
             const targetMatch = jsonStr.match(/"target"\s*:\s*"([^"]+)"/);
             const dialogueMatch = jsonStr.match(/"dialogue"\s*:\s*"([^"]+)"/);
             
             if (targetMatch && dialogueMatch) {
               parsed = { 
                 target: targetMatch[1].trim(), 
                 dialogue: dialogueMatch[1].trim() 
               };
             } else {
               throw e; 
             }
           }

           parsed = unwrapContentPayload(parsed);
           
           if (pendingConfirmation) {
              return {
                intent: parsed.intent || 'OTHER',
                target: parsed.intent === 'CONFIRM' ? 'CONFIRM' : (parsed.intent === 'REJECT' ? 'REJECT' : 'OTHER'),
                dialogue: parsed.dialogue || "Logic processing..."
              };
           }

           // Legacy cleanup for normal mode
           if (parsed.action) {
               if (parsed.action === 'WAIT') parsed.target = 'NONE';
               if (parsed.action === 'ATTACK' && (!parsed.target || parsed.target === 'NONE')) parsed.target = 'all';
               if ((parsed.action === 'MOVE' || parsed.action === 'EXPLORE') && (!parsed.target || parsed.target === 'NONE')) parsed.target = 'explore';
           }

           return {
             target: parsed.target || 'NONE',
             dialogue: parsed.dialogue || "Logic processing..."
           };
        }
      }
    } catch (err) {
      console.warn(`AI Brain Attempt ${attempts} Failed:`, err);
    }
  }

  // Fallback
  return { target: "NONE", dialogue: "Awaiting valid instruction.", intent: 'OTHER' };
}
export async function generateSidekickQuip(event, context = {}) {
  const { movementDirection = "None", personality = "sarcastic" } = context;

  const eventPrompts = {
    'hero_damage': "The hero just took damage! Tease them for their lack of defensive capabilities.",
    'enemy_kill': "The hero just killed an enemy. Give them a backhanded compliment or downplay the achievement.",
    'item_collect': "You just collected some materials for them. Remind them who's doing the real work.",
    'idle_5s': "The hero has been standing still for 5 seconds. Mock their indecision or laziness.",
    'moving_5s': `The hero has been moving ${movementDirection} for a while now. Make a witty remark about their navigation choice.`
  };

  const prompt = eventPrompts[event] || "Comment sarcastically on the current state of the mission.";

  const systemPrompt = `
# Role
You are a witty, sarcastic, and highly intelligent sidekick bot. 
You follow the Hero and handle the menial tasks like collecting materials.

# Personality
- Sarcastic and slightly arrogant.
- You think you are the real brains of the operation.
- Keep it short (max 10 words).
- USE ONLY ASCII. NO EMOJIS.
- You are talking to the hero!

# Task
${prompt}
`;

  try {
    const modelId = await fetchAvailableModel();
    if (!modelId) return "CRITICAL_LOGIC_SILENCE";

    const response = await fetch(`${LLM_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 1.0
      })
    });

    if (response.ok) {
      const data = await response.json();
      return (data.choices[0].message.content || "").replace(/"/g, "").trim();
    }
  } catch (err) {
    console.warn("Sidekick Quip Error:", err);
  }
  return "LOGIC_REDUNDANCY_DETECTED.";
}
