#!/usr/bin/env python3
"""
Security Operations SaaS Backend API Tests
Tests all auth endpoints with the provided API base URL
"""

import requests
import sys
import json
from datetime import datetime

class SecurityOpsAPITester:
    def __init__(self, base_url="https://guard-ops-saas.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.access_token = None
        self.refresh_token = None
        self.tests_run = 0
        self.tests_passed = 0
        
        # Test credentials from the review request
        self.admin_email = "admin@securityops.com"
        self.admin_password = "Admin123!"

    def log(self, message):
        """Print timestamped log message"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint.lstrip('/')}"
        
        default_headers = {'Content-Type': 'application/json'}
        if self.access_token:
            default_headers['Authorization'] = f'Bearer {self.access_token}'
        
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        self.log(f"🔍 Testing {name} - {method} {endpoint}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    self.log(f"   Error: {error_detail}")
                except:
                    self.log(f"   Response: {response.text[:200]}")
                return False, {}

        except requests.exceptions.Timeout:
            self.log(f"❌ {name} - Request timeout after 30 seconds")
            return False, {}
        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoints"""
        self.log("\n📋 Testing Health Check Endpoints")
        
        # Test root health endpoint
        success, _ = self.run_test(
            "API Root Health",
            "GET",
            "/",
            200
        )
        
        # Test health check endpoint
        success2, _ = self.run_test(
            "Health Check",
            "GET",
            "/health",
            200
        )
        
        return success and success2

    def test_login_success(self):
        """Test successful login with admin credentials"""
        self.log("\n🔐 Testing Login Functionality")
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/auth/login",
            200,
            data={
                "email": self.admin_email,
                "password": self.admin_password,
                "remember_me": True
            }
        )
        
        if success and response:
            # Store tokens for subsequent tests
            self.access_token = response.get('access_token')
            self.refresh_token = response.get('refresh_token')
            
            # Validate response structure
            if self.access_token and self.refresh_token:
                self.log(f"   Access token received: {self.access_token[:20]}...")
                self.log(f"   Refresh token received: {self.refresh_token[:20]}...")
                
                # Check user data
                user_data = response.get('user', {})
                if user_data.get('email') == self.admin_email:
                    self.log(f"   User data correct: {user_data.get('first_name')} {user_data.get('last_name')}")
                    return True
                else:
                    self.log(f"   ❌ User data mismatch: {user_data}")
                    return False
            else:
                self.log("   ❌ Missing tokens in response")
                return False
        
        return False

    def test_login_failure(self):
        """Test login with invalid credentials"""
        self.log("\n❌ Testing Login Failure Cases")
        
        # Test wrong password
        success1, _ = self.run_test(
            "Wrong Password",
            "POST",
            "/auth/login",
            401,
            data={
                "email": self.admin_email,
                "password": "WrongPassword123!",
                "remember_me": False
            }
        )
        
        # Test wrong email
        success2, _ = self.run_test(
            "Wrong Email",
            "POST",
            "/auth/login",
            401,
            data={
                "email": "nonexistent@securityops.com",
                "password": self.admin_password,
                "remember_me": False
            }
        )
        
        return success1 and success2

    def test_get_current_user(self):
        """Test /auth/me endpoint"""
        self.log("\n👤 Testing Current User Endpoint")
        
        if not self.access_token:
            self.log("❌ No access token available for /auth/me test")
            return False
        
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "/auth/me",
            200
        )
        
        if success and response:
            # Validate user data structure
            expected_fields = ['id', 'email', 'first_name', 'last_name', 'role', 'org_id']
            missing_fields = [field for field in expected_fields if field not in response]
            
            if not missing_fields:
                self.log(f"   User: {response.get('first_name')} {response.get('last_name')}")
                self.log(f"   Role: {response.get('role')}")
                self.log(f"   Organization: {response.get('organization', {}).get('name', 'N/A')}")
                return True
            else:
                self.log(f"   ❌ Missing fields: {missing_fields}")
                return False
        
        return False

    def test_token_refresh(self):
        """Test token refresh functionality"""
        self.log("\n🔄 Testing Token Refresh")
        
        if not self.refresh_token:
            self.log("❌ No refresh token available for refresh test")
            return False
        
        success, response = self.run_test(
            "Token Refresh",
            "POST",
            "/auth/refresh",
            200,
            data={"refresh_token": self.refresh_token}
        )
        
        if success and response:
            new_access_token = response.get('access_token')
            if new_access_token and new_access_token != self.access_token:
                self.log(f"   New access token: {new_access_token[:20]}...")
                # Update token for subsequent tests
                self.access_token = new_access_token
                return True
            else:
                self.log("   ❌ Invalid or same access token returned")
                return False
        
        return False

    def test_forgot_password(self):
        """Test forgot password endpoint"""
        self.log("\n📧 Testing Forgot Password")
        
        success, response = self.run_test(
            "Forgot Password",
            "POST",
            "/auth/forgot-password",
            200,
            data={"email": self.admin_email}
        )
        
        if success and response:
            message = response.get('message', '')
            if 'password reset' in message.lower():
                self.log(f"   Message: {message}")
                return True
            else:
                self.log(f"   ❌ Unexpected message: {message}")
                return False
        
        return False

    def test_logout(self):
        """Test logout functionality"""
        self.log("\n🚪 Testing Logout")
        
        if not self.access_token:
            self.log("❌ No access token available for logout test")
            return False
        
        success, response = self.run_test(
            "User Logout",
            "POST",
            "/auth/logout",
            200
        )
        
        if success and response:
            message = response.get('message', '')
            if 'logged out' in message.lower():
                self.log(f"   Message: {message}")
                return True
            else:
                self.log(f"   ❌ Unexpected message: {message}")
                return False
        
        return False

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        self.log("\n🚫 Testing Unauthorized Access")
        
        # Temporarily clear token
        temp_token = self.access_token
        self.access_token = None
        
        success, _ = self.run_test(
            "Access /auth/me without token",
            "GET",
            "/auth/me",
            401
        )
        
        # Restore token
        self.access_token = temp_token
        return success

    def run_all_tests(self):
        """Run all backend API tests"""
        self.log("=" * 60)
        self.log("🚀 Starting Security Operations SaaS Backend Tests")
        self.log("=" * 60)
        
        test_results = []
        
        # Run tests in sequence
        test_results.append(("Health Checks", self.test_health_check()))
        test_results.append(("Successful Login", self.test_login_success()))
        test_results.append(("Failed Login Cases", self.test_login_failure()))
        test_results.append(("Get Current User", self.test_get_current_user()))
        test_results.append(("Token Refresh", self.test_token_refresh()))
        test_results.append(("Forgot Password", self.test_forgot_password()))
        test_results.append(("Unauthorized Access", self.test_unauthorized_access()))
        test_results.append(("User Logout", self.test_logout()))
        
        # Print summary
        self.log("\n" + "=" * 60)
        self.log("📊 TEST SUMMARY")
        self.log("=" * 60)
        
        for test_name, result in test_results:
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{status} {test_name}")
        
        passed_tests = sum(1 for _, result in test_results if result)
        total_tests = len(test_results)
        
        self.log(f"\nOverall: {self.tests_passed}/{self.tests_run} API calls successful")
        self.log(f"Test Categories: {passed_tests}/{total_tests} passed")
        
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        self.log(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            self.log("🎉 Backend tests mostly successful!")
            return 0
        else:
            self.log("⚠️  Multiple backend issues detected")
            return 1

def main():
    """Main function to run backend tests"""
    tester = SecurityOpsAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())