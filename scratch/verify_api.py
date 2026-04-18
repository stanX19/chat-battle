
import requests
import json

def test_lm_studio():
    base_url = "http://localhost:1234/v1"
    
    print(f"Checking connection to LM Studio at {base_url}...")
    
    # 1. Check Models
    try:
        models_res = requests.get(f"{base_url}/models", timeout=5)
        if models_res.status_code == 200:
            models = models_res.json()
            print("Successfully connected to LM Studio!")
            if models['data']:
                print(f"Available Models: {[m['id'] for m in models['data']]}")
                model_id = models['data'][0]['id']
            else:
                print("No models are currently loaded in LM Studio.")
                return
        else:
            print(f"Error checking models: {models_res.status_code}")
            return
    except Exception as e:
        print(f"Could not connect to LM Studio: {e}")
        print("Is LM Studio running and is the local server enabled (Port 1234)?")
        return

    # 2. Test Chat Completion
    payload = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello!"}
        ],
        "temperature": 0.7
    }
    
    print(f"\nTesting chat completion with model '{model_id}'...")
    try:
        chat_res = requests.post(f"{base_url}/chat/completions", json=payload, timeout=10)
        if chat_res.status_code == 200:
            result = chat_res.json()
            content = result['choices'][0]['message']['content']
            print("API Response Received:")
            print("-" * 20)
            print(content)
            print("-" * 20)
            print("SUCCESS: API is working correctly.")
        else:
            print(f"Chat Completion failed with status {chat_res.status_code}")
            print(chat_res.text)
    except Exception as e:
        print(f"Error during chat completion: {e}")

if __name__ == "__main__":
    test_lm_studio()
