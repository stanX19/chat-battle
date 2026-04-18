import urllib.request
import json
import re

LLM_URL = 'http://localhost:1234/v1'

def fetch_available_model():
    print(f"[-] Fetching models from {LLM_URL}/models ...")
    try:
        req = urllib.request.Request(f"{LLM_URL}/models")
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                if 'data' in data and len(data['data']) > 0:
                    model_id = data['data'][0]['id']
                    print(f"[+] Found available model: {model_id}")
                    return model_id
                else:
                    print("[-] Error: 'data' field is empty or missing in the response.")
    except Exception as e:
        print(f"[!] Failed to fetch models: {e}")
        
    return None

def test_chat_completion(model_id, prompt_text="hit the slime!"):
    print(f"\n[-] Testing chat completion with prompt: \"{prompt_text}\"")
    
    system_prompt = """
# Role
You are the brain of a brave but literal-minded video game hero. 

# Task
Your job is to read the "Player Command" and translate it into a strict JSON action.
You only have 4 available actions: "ATTACK", "MOVE", "USE", "WAIT".
If the player command is confusing, too complex, or misspelled, default to "WAIT" and say something confused.

Output ONLY valid JSON. Do not include markdown formatting or extra text. Use this exact schema:
{
  "action": "[ATTACK, MOVE, USE, or WAIT]",
  "target": "[Name of the object or enemy]",
  "dialogue": "[A short, funny, 1-sentence battle cry or confused statement from the hero]"
}

# Context
Visible Entities: slime, goblin, key
Inventory (Floating Items): health potion

# Examples
Player: "hit the slime!"
{"action": "ATTACK", "target": "slime", "dialogue": "Die, jelly monster!"}
""".strip()

    payload = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt_text}
        ],
        "temperature": 0.7
    }
    
    try:
        req = urllib.request.Request(
            f"{LLM_URL}/chat/completions", 
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        
        print("[-] Sending request to LLM, waiting for response...")
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                content = data['choices'][0]['message']['content']
                print("\n[--- Raw LLM Response ---]")
                print(content)
                print("[------------------------]\n")
                
                print("[-] Attempting to extract JSON...")
                json_match = re.search(r'\{[\s\S]*?\}', content)
                if json_match:
                    try:
                        parsed = json.loads(json_match.group(0))
                        print("[+] Parsed JSON payload successfully:")
                        print(json.dumps(parsed, indent=2))
                    except Exception as e:
                        print(f"[!] Failed to parse extracted JSON block: {e}")
                else:
                    print("[!] No JSON struct ('{ ... }') found in the response.")
    except urllib.error.HTTPError as e:
        print(f"[!] HTTP Error during chat completion: {e.code} {e.reason}")
        print(f"    Body: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"[!] Failed to get chat completion: {e}")

if __name__ == "__main__":
    model = fetch_available_model()
    if model:
        # Test 1: Expected to yield an ATTACK action
        test_chat_completion(model, "hit the slime!")
        
        # Test 2: Expected to yield a WAIT action due to confusion
        test_chat_completion(model, "do a backflip and kill god")
        
        # Test 3: Expected to yield a USE action
        test_chat_completion(model, "drink potion")
    else:
        print("\n[!] Cannot test chat completion without a model. Is LM Studio running and the local server started?")
