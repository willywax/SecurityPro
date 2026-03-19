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
    def __init__(self, base_url="https://payroll-track-11.preview.emergentagent.com"):
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

    def test_employees_crud(self):
        """Test Employee CRUD operations with auto-generated IDs"""
        self.log("\n👥 Testing Employee CRUD Operations")
        
        if not self.access_token:
            self.log("❌ No access token available for employee tests")
            return False
        
        # Test data for employee creation - NO employee_id as it's auto-generated
        test_employee_data = {
            "first_name": "Test",
            "last_name": "Employee", 
            "email": "test.employee@securityops.com",
            "phone_1": "+256700123456",
            "job_title": "Security Guard",
            "employment_status": "active",
            "gender": "male",
            "nationality": "Ugandan"
        }
        
        created_employee_id = None
        all_tests_passed = True
        
        # Test 1: Create Employee
        success, response = self.run_test(
            "Create Employee",
            "POST", 
            "/employees",
            201,
            data=test_employee_data
        )
        
        if success and response:
            created_employee_id = response.get('id')
            auto_employee_id = response.get('employee_id')
            auto_guard_no = response.get('guard_no')
            
            if created_employee_id and auto_employee_id and auto_guard_no:
                self.log(f"   Created UUID: {created_employee_id}")
                self.log(f"   Auto-generated Employee ID: {auto_employee_id}")
                self.log(f"   Auto-generated Guard No: {auto_guard_no}")
                
                # Verify ID formats
                if auto_employee_id.startswith('EMP') and auto_guard_no.startswith('G'):
                    self.log("   ✅ Auto-generated IDs have correct format")
                else:
                    self.log("   ❌ Auto-generated IDs have incorrect format")
                    all_tests_passed = False
            else:
                self.log("   ❌ Missing IDs in response")
                all_tests_passed = False
        else:
            all_tests_passed = False
        
        # Test 2: Get Employee List 
        success2, response2 = self.run_test(
            "List Employees",
            "GET",
            "/employees?page=1&page_size=10", 
            200
        )
        
        if success2 and response2:
            employees = response2.get('employees', [])
            total = response2.get('total', 0)
            self.log(f"   Found {len(employees)} employees (total: {total})")
            
            # Check if our created employee is in the list
            if created_employee_id:
                found = any(emp.get('id') == created_employee_id for emp in employees)
                if found:
                    self.log("   ✅ Created employee found in list")
                else:
                    self.log("   ⚠️  Created employee not found in list (might be pagination)")
        else:
            all_tests_passed = False
        
        # Test 3: Get Single Employee
        if created_employee_id:
            success3, response3 = self.run_test(
                "Get Single Employee",
                "GET",
                f"/employees/{created_employee_id}",
                200
            )
            
            if success3 and response3:
                emp_name = response3.get('full_name', 'Unknown')
                emp_status = response3.get('employment_status', 'Unknown')
                self.log(f"   Employee: {emp_name} ({emp_status})")
            else:
                all_tests_passed = False
        
        # Test 4: Update Employee  
        if created_employee_id:
            update_data = {
                "job_title": "Senior Security Guard",
                "employment_status": "active",
                "notes": "Updated via API test"
            }
            
            success4, response4 = self.run_test(
                "Update Employee",
                "PUT",
                f"/employees/{created_employee_id}",
                200,
                data=update_data
            )
            
            if success4 and response4:
                updated_title = response4.get('job_title', '')
                if updated_title == "Senior Security Guard":
                    self.log("   ✅ Employee updated successfully") 
                else:
                    self.log(f"   ❌ Update failed - title: {updated_title}")
                    all_tests_passed = False
            else:
                all_tests_passed = False
        
        # Test 5: Search Employees
        success5, response5 = self.run_test(
            "Search Employees",
            "GET",
            "/employees?search=Test&page=1&page_size=10",
            200
        )
        
        if success5 and response5:
            search_results = response5.get('employees', [])
            self.log(f"   Search results: {len(search_results)} employees found")
            
            # Check if our test employee is in search results
            if created_employee_id:
                found = any(emp.get('id') == created_employee_id for emp in search_results)
                if found:
                    self.log("   ✅ Search working correctly")
                else:
                    self.log("   ⚠️  Created employee not found in search results")
        else:
            all_tests_passed = False
        
        # Test 6: Filter by Status
        success6, response6 = self.run_test(
            "Filter by Status", 
            "GET",
            "/employees?status=active&page=1&page_size=10",
            200
        )
        
        if success6 and response6:
            filtered_results = response6.get('employees', [])
            self.log(f"   Filtered results: {len(filtered_results)} active employees")
            
            # Check all results are active
            all_active = all(emp.get('employment_status') == 'active' for emp in filtered_results)
            if all_active:
                self.log("   ✅ Status filter working correctly")
            else:
                self.log("   ❌ Status filter not working - found non-active employees")
                all_tests_passed = False
        else:
            all_tests_passed = False
        
        # Test 7: Delete Employee (cleanup)
        if created_employee_id:
            success7, response7 = self.run_test(
                "Delete Employee",
                "DELETE", 
                f"/employees/{created_employee_id}",
                200
            )
            
            if success7 and response7:
                message = response7.get('message', '')
                if 'deleted' in message.lower():
                    self.log("   ✅ Employee deleted successfully")
                else:
                    self.log(f"   ❌ Unexpected delete message: {message}")
                    all_tests_passed = False
            else:
                all_tests_passed = False
                
            # Verify deletion
            success8, _ = self.run_test(
                "Verify Deletion",
                "GET",
                f"/employees/{created_employee_id}",
                404
            )
            
            if success8:
                self.log("   ✅ Employee deletion verified")
            else:
                self.log("   ❌ Employee still exists after deletion")
                all_tests_passed = False
        
        return all_tests_passed

    def test_bank_details_crud(self):
        """Test Bank Details CRUD operations"""
        self.log("\n💳 Testing Bank Details CRUD")
        
        if not self.access_token:
            self.log("❌ No access token available")
            return False
        
        # First create a test employee
        employee_data = {
            "first_name": "Bank", "last_name": "Test",
            "employment_status": "active"
        }
        
        success, emp_response = self.run_test(
            "Create Employee for Bank Test",
            "POST", "/employees", 201, data=employee_data
        )
        
        if not success or not emp_response.get('id'):
            return False
        
        employee_id = emp_response['id']
        all_tests_passed = True
        
        try:
            # Test 1: Get bank details (should be None initially)
            success1, response1 = self.run_test(
                "Get Bank Details - Empty",
                "GET", f"/employees/{employee_id}/bank-account", 200
            )
            
            # Test 2: Create bank details
            bank_data = {
                "bank_name": "Test Bank",
                "bank_branch": "Main Branch", 
                "account_name": "Bank Test",
                "account_number": "123456789"
            }
            
            success2, response2 = self.run_test(
                "Create Bank Details",
                "POST", f"/employees/{employee_id}/bank-account", 201,
                data=bank_data
            )
            
            if success2 and response2:
                bank_id = response2.get('id')
                if response2.get('bank_name') == "Test Bank":
                    self.log("   ✅ Bank details created successfully")
                else:
                    all_tests_passed = False
            else:
                all_tests_passed = False
            
            # Test 3: Update bank details
            update_data = {"bank_name": "Updated Bank"}
            success3, response3 = self.run_test(
                "Update Bank Details",
                "PUT", f"/employees/{employee_id}/bank-account", 200,
                data=update_data
            )
            
            if success3 and response3.get('bank_name') == "Updated Bank":
                self.log("   ✅ Bank details updated successfully")
            else:
                all_tests_passed = False
            
            # Test 4: Delete bank details
            success4, response4 = self.run_test(
                "Delete Bank Details",
                "DELETE", f"/employees/{employee_id}/bank-account", 200
            )
            
            if success4 and 'deleted' in response4.get('message', '').lower():
                self.log("   ✅ Bank details deleted successfully")
            else:
                all_tests_passed = False
                
        finally:
            # Cleanup - delete test employee
            self.run_test(
                "Cleanup Bank Test Employee", 
                "DELETE", f"/employees/{employee_id}", 200
            )
        
        return all_tests_passed

    def test_referees_crud(self):
        """Test Referees CRUD operations"""
        self.log("\n👥 Testing Referees CRUD")
        
        if not self.access_token:
            self.log("❌ No access token available")
            return False
        
        # Create test employee
        employee_data = {
            "first_name": "Referee", "last_name": "Test",
            "employment_status": "active"
        }
        
        success, emp_response = self.run_test(
            "Create Employee for Referee Test",
            "POST", "/employees", 201, data=employee_data
        )
        
        if not success or not emp_response.get('id'):
            return False
        
        employee_id = emp_response['id']
        all_tests_passed = True
        
        try:
            # Test 1: List referees (should be empty)
            success1, response1 = self.run_test(
                "List Referees - Empty",
                "GET", f"/employees/{employee_id}/referees", 200
            )
            
            if success1 and len(response1) == 0:
                self.log("   ✅ Empty referees list correct")
            else:
                all_tests_passed = False
            
            # Test 2: Create referee
            referee_data = {
                "full_name": "John Referee",
                "relationship": "Former Employer",
                "phone_number": "+256700123456",
                "alternate_phone": "+256700654321",
                "id_type": "national_id",
                "id_number": "CM12345678ABCD",
                "address": "Kampala, Uganda",
                "occupation": "Manager"
            }
            
            success2, response2 = self.run_test(
                "Create Referee",
                "POST", f"/employees/{employee_id}/referees", 201,
                data=referee_data
            )
            
            referee_id = None
            if success2 and response2:
                referee_id = response2.get('id')
                if response2.get('full_name') == "John Referee":
                    self.log("   ✅ Referee created successfully")
                else:
                    all_tests_passed = False
            else:
                all_tests_passed = False
            
            # Test 3: Get single referee
            if referee_id:
                success3, response3 = self.run_test(
                    "Get Single Referee",
                    "GET", f"/employees/{employee_id}/referees/{referee_id}", 200
                )
                
                if success3 and response3.get('full_name') == "John Referee":
                    self.log("   ✅ Get referee working")
                else:
                    all_tests_passed = False
            
            # Test 4: Update referee
            if referee_id:
                update_data = {"occupation": "Senior Manager"}
                success4, response4 = self.run_test(
                    "Update Referee",
                    "PUT", f"/employees/{employee_id}/referees/{referee_id}", 200,
                    data=update_data
                )
                
                if success4 and response4.get('occupation') == "Senior Manager":
                    self.log("   ✅ Referee updated successfully")
                else:
                    all_tests_passed = False
            
            # Test 5: List referees (should have 1)
            success5, response5 = self.run_test(
                "List Referees - With Data",
                "GET", f"/employees/{employee_id}/referees", 200
            )
            
            if success5 and len(response5) == 1:
                self.log("   ✅ Referees list correct")
            else:
                all_tests_passed = False
            
            # Test 6: Delete referee
            if referee_id:
                success6, response6 = self.run_test(
                    "Delete Referee",
                    "DELETE", f"/employees/{employee_id}/referees/{referee_id}", 200
                )
                
                if success6 and 'deleted' in response6.get('message', '').lower():
                    self.log("   ✅ Referee deleted successfully")
                else:
                    all_tests_passed = False
                    
        finally:
            # Cleanup
            self.run_test(
                "Cleanup Referee Test Employee",
                "DELETE", f"/employees/{employee_id}", 200
            )
        
        return all_tests_passed

    def test_next_of_kin_crud(self):
        """Test Next of Kin CRUD operations"""
        self.log("\n❤️  Testing Next of Kin CRUD")
        
        if not self.access_token:
            self.log("❌ No access token available")
            return False
        
        # Create test employee
        employee_data = {
            "first_name": "NextOfKin", "last_name": "Test",
            "employment_status": "active"
        }
        
        success, emp_response = self.run_test(
            "Create Employee for NOK Test",
            "POST", "/employees", 201, data=employee_data
        )
        
        if not success or not emp_response.get('id'):
            return False
        
        employee_id = emp_response['id']
        all_tests_passed = True
        
        try:
            # Test 1: Get next of kin (should be None)
            success1, response1 = self.run_test(
                "Get Next of Kin - Empty",
                "GET", f"/employees/{employee_id}/next-of-kin", 200
            )
            
            # Test 2: Create next of kin
            nok_data = {
                "full_name": "Jane Spouse",
                "relationship": "Spouse",
                "phone_1": "+256700111111",
                "phone_2": "+256700222222",
                "address": "Home Address, Kampala",
                "id_type": "national_id",
                "id_number": "CM87654321EFGH",
                "notes": "Emergency contact"
            }
            
            success2, response2 = self.run_test(
                "Create Next of Kin",
                "POST", f"/employees/{employee_id}/next-of-kin", 201,
                data=nok_data
            )
            
            if success2 and response2:
                nok_id = response2.get('id')
                if response2.get('full_name') == "Jane Spouse":
                    self.log("   ✅ Next of kin created successfully")
                else:
                    all_tests_passed = False
            else:
                all_tests_passed = False
            
            # Test 3: Update next of kin
            update_data = {"relationship": "Wife"}
            success3, response3 = self.run_test(
                "Update Next of Kin",
                "PUT", f"/employees/{employee_id}/next-of-kin", 200,
                data=update_data
            )
            
            if success3 and response3.get('relationship') == "Wife":
                self.log("   ✅ Next of kin updated successfully")
            else:
                all_tests_passed = False
            
            # Test 4: Delete next of kin
            success4, response4 = self.run_test(
                "Delete Next of Kin",
                "DELETE", f"/employees/{employee_id}/next-of-kin", 200
            )
            
            if success4 and 'deleted' in response4.get('message', '').lower():
                self.log("   ✅ Next of kin deleted successfully")
            else:
                all_tests_passed = False
                
        finally:
            # Cleanup
            self.run_test(
                "Cleanup NOK Test Employee",
                "DELETE", f"/employees/{employee_id}", 200
            )
        
        return all_tests_passed
    def test_employee_validation(self):
        """Test employee creation validation"""
        self.log("\n🔍 Testing Employee Validation")
        
        if not self.access_token:
            self.log("❌ No access token available for validation tests")
            return False
        
        all_tests_passed = True
        
        # Test 1: Missing required fields
        success1, _ = self.run_test(
            "Create Employee - Missing Required Fields",
            "POST",
            "/employees",
            422,  # Validation error
            data={"email": "invalid@test.com"}
        )
        
        if success1:
            self.log("   ✅ Validation correctly rejects missing fields")
        else:
            all_tests_passed = False
            
        # Test 2: Invalid email format
        success2, _ = self.run_test(
            "Create Employee - Invalid Email",
            "POST",
            "/employees", 
            422,
            data={
                "first_name": "Test",
                "last_name": "Employee",
                "email": "invalid-email-format"
            }
        )
        
        if success2:
            self.log("   ✅ Validation correctly rejects invalid email")
        else:
            all_tests_passed = False
        
        # Test 3: Invalid employee creation (missing required field)
        test_employee = {
            "first_name": "First",
            "last_name": "Employee",
            "employment_status": "active"
        }
        
        success3, response3 = self.run_test(
            "Create Employee - Valid for Duplicate Test",
            "POST",
            "/employees",
            201,
            data=test_employee
        )
        
        if success3:
            created_id = response3.get('id')
            created_employee_id = response3.get('employee_id') 
            
            self.log(f"   First employee created: {created_employee_id}")
            
            # Try to create another with same data to test auto-increment
            success4, response4 = self.run_test(
                "Create Employee - Second (should get different auto-ID)",
                "POST",
                "/employees",
                201,
                data=test_employee
            )
            
            if success4:
                second_employee_id = response4.get('employee_id')
                second_created_id = response4.get('id')
                
                self.log(f"   Second employee created: {second_employee_id}")
                
                if created_employee_id != second_employee_id:
                    self.log("   ✅ Auto-increment working correctly")
                else:
                    self.log("   ❌ Auto-increment failed - duplicate IDs generated")
                    all_tests_passed = False
                    
                # Cleanup second employee
                if second_created_id:
                    self.run_test(
                        "Cleanup Second Test Employee",
                        "DELETE",
                        f"/employees/{second_created_id}",
                        200
                    )
            else:
                all_tests_passed = False
            
            # Cleanup - delete the test employee
            if created_id:
                self.run_test(
                    "Cleanup First Test Employee",
                    "DELETE",
                    f"/employees/{created_id}",
                    200
                )
        else:
            all_tests_passed = False
        
        return all_tests_passed

    def run_all_tests(self):
        """Run all backend API tests"""
        self.log("=" * 60)
        self.log("🚀 Starting Security Operations SaaS Backend Tests - HR Records Module")
        self.log("=" * 60)
        
        test_results = []
        
        # Run auth tests first
        test_results.append(("Health Checks", self.test_health_check()))
        test_results.append(("Successful Login", self.test_login_success()))
        test_results.append(("Failed Login Cases", self.test_login_failure()))
        test_results.append(("Get Current User", self.test_get_current_user()))
        test_results.append(("Token Refresh", self.test_token_refresh()))
        test_results.append(("Forgot Password", self.test_forgot_password()))
        test_results.append(("Unauthorized Access", self.test_unauthorized_access()))
        
        # Run employee tests
        test_results.append(("Employee CRUD Operations", self.test_employees_crud()))
        test_results.append(("Employee Validation", self.test_employee_validation()))
        test_results.append(("Bank Details CRUD", self.test_bank_details_crud()))
        test_results.append(("Referees CRUD", self.test_referees_crud()))
        test_results.append(("Next of Kin CRUD", self.test_next_of_kin_crud()))
        
        # Logout last
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