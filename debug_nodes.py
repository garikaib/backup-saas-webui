
import requests
import json
import sys

# Configuration
API_URL = "https://wp.zimpricecheck.com:8081/api/v1"
USERNAME = "admin@example.com"
PASSWORD = "admin123"

def get_token():
    print("Logging in...")
    try:
        resp = requests.post(f"{API_URL}/auth/login", json={
            "username": USERNAME,
            "password": PASSWORD
        }, verify=False) # Disable SSL verification for development/testing if needed
        resp.raise_for_status()
        return resp.json()["access_token"]
    except Exception as e:
        print(f"Login failed: {e}")
        try:
             print(resp.text)
        except:
             pass
        sys.exit(1)

def check_endpoint(name, url, token):
    print(f"\n--- Checking {name} ({url}) ---")
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = requests.get(f"{API_URL}{url}", headers=headers, verify=False)
        resp.raise_for_status()
        data = resp.json()
        print(json.dumps(data, indent=2))
        return data
    except Exception as e:
        print(f"Failed to fetch {name}: {e}")
        try:
             print(resp.text)
        except:
             pass

def main():
    token = get_token()
    
    # Check Nodes List (Does it have cpu_usage?)
    nodes = check_endpoint("Nodes List", "/nodes/", token)
    
    # Check Storage Summary (Does it have disk_usage for each node?)
    storage = check_endpoint("Storage Summary", "/storage/summary", token)
    
    # Check Metrics Summary (Master node stats?)
    metrics = check_endpoint("Metrics Summary", "/metrics/summary", token)

    # Check Node Detail (ID 1)
    node_detail = check_endpoint("Node Detail (ID 1)", "/nodes/1", token)

if __name__ == "__main__":
    main()
