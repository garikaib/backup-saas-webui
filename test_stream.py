import requests
import json
import sys
import time

API_URL = "https://wp.zimpricecheck.com:8081/api/v1"
USERNAME = "admin@example.com"
PASSWORD = "admin123"

def get_token():
    try:
        resp = requests.post(f"{API_URL}/auth/login", json={
            "username": USERNAME,
            "password": PASSWORD
        }, verify=False)
        return resp.json()["access_token"]
    except:
        sys.exit(1)

def main():
    token = get_token()
    url = f"{API_URL}/metrics/node/stream?token={token}&interval=2"
    print(f"Connecting to {url}")
    
    try:
        with requests.get(url, stream=True, verify=False) as resp:
            print("Connected. Listening for 5 seconds...")
            start_time = time.time()
            for line in resp.iter_lines():
                if time.time() - start_time > 5:
                    break
                if line:
                    decoded = line.decode('utf-8')
                    if decoded.startswith('data: '):
                        print(decoded)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
