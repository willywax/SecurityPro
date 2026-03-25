"""Test regions API endpoint"""
import requests
import json

# Login first
login_url = "http://localhost:8000/api/auth/login"
login_data = {
    "email": "admin@securityops.com",
    "password": "Admin123!"
}

print("Logging in...")
response = requests.post(login_url, json=login_data)
if response.status_code != 200:
    print(f"Login failed: {response.status_code} - {response.text}")
    exit(1)

login_result = response.json()
access_token = login_result.get("access_token")
if not access_token:
    print(f"Login response missing access_token: {login_result}")
    exit(1)

print("Login successful, got access token")

# Test regions endpoint
regions_url = "http://localhost:8000/api/regions?status_filter=active"
headers = {
    "Authorization": f"Bearer {access_token}"
}

print("Testing regions endpoint...")
response = requests.get(regions_url, headers=headers)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code == 200:
    regions = response.json()
    print(f"Found {len(regions)} regions")
    for region in regions[:3]:  # Show first 3
        print(f"  - {region.get('region_name')} ({region.get('zone_name')})")
else:
    print("Regions endpoint failed!")
