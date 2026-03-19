"""
Backend tests for Employment History and Contracts CRUD endpoints.
Tests cover: GET, POST, PUT, DELETE for both features.
Also tests profile photo/avatar endpoint.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Known employee ID from previous test runs
KNOWN_EMPLOYEE_ID = "7d55a9ae-624f-48bd-9e71-9ab34e34ac11"


@pytest.fixture(scope="module")
def auth_token():
    """Get JWT token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@securityops.com",
        "password": "Admin123!"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Authorization headers for authenticated requests"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="module")
def employee_id(auth_headers):
    """Get an existing employee ID or use known one"""
    # Try known employee first
    response = requests.get(
        f"{BASE_URL}/api/employees/{KNOWN_EMPLOYEE_ID}",
        headers=auth_headers
    )
    if response.status_code == 200:
        return KNOWN_EMPLOYEE_ID

    # Fallback: list employees and get first
    response = requests.get(f"{BASE_URL}/api/employees", headers=auth_headers)
    if response.status_code == 200:
        data = response.json()
        employees = data.get("employees", data if isinstance(data, list) else [])
        if employees:
            return employees[0]["id"]
    pytest.skip("No employees available for testing")


# ============ EMPLOYMENT HISTORY TESTS ============

class TestEmploymentHistoryAPI:
    """Tests for Employment History CRUD endpoints"""

    created_history_id = None

    def test_list_employment_history_returns_200(self, auth_headers, employee_id):
        """GET /employees/{id}/employment-history returns 200 with list"""
        response = requests.get(
            f"{BASE_URL}/api/employees/{employee_id}/employment-history",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"Employment history list returned {len(data)} entries")

    def test_create_employment_history_entry(self, auth_headers, employee_id):
        """POST /employees/{id}/employment-history creates new entry"""
        payload = {
            "employer_name": "TEST_SecureTech Corp",
            "job_title": "TEST_Security Officer",
            "start_date": "2020-01-01",
            "end_date": "2022-12-31",
            "reason_for_leaving": "Career growth",
            "reference_contact": "John Doe, +256700000000",
            "notes": "Test employment history entry"
        }
        response = requests.post(
            f"{BASE_URL}/api/employees/{employee_id}/employment-history",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["employer_name"] == payload["employer_name"]
        assert data["job_title"] == payload["job_title"]
        assert "id" in data
        assert isinstance(data["id"], str)
        TestEmploymentHistoryAPI.created_history_id = data["id"]
        print(f"Created employment history entry: {data['id']}")

    def test_create_employment_history_validates_required_fields(self, auth_headers, employee_id):
        """POST without required fields returns 422"""
        payload = {"notes": "Missing required fields"}
        response = requests.post(
            f"{BASE_URL}/api/employees/{employee_id}/employment-history",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"

    def test_get_employment_history_by_id(self, auth_headers, employee_id):
        """GET /employees/{id}/employment-history/{hid} returns single entry"""
        if not TestEmploymentHistoryAPI.created_history_id:
            pytest.skip("No created history entry")
        response = requests.get(
            f"{BASE_URL}/api/employees/{employee_id}/employment-history/{TestEmploymentHistoryAPI.created_history_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["id"] == TestEmploymentHistoryAPI.created_history_id
        assert data["employer_name"] == "TEST_SecureTech Corp"

    def test_update_employment_history_entry(self, auth_headers, employee_id):
        """PUT /employees/{id}/employment-history/{hid} updates entry"""
        if not TestEmploymentHistoryAPI.created_history_id:
            pytest.skip("No created history entry")
        payload = {
            "job_title": "TEST_Senior Security Officer",
            "reason_for_leaving": "Better opportunity"
        }
        response = requests.put(
            f"{BASE_URL}/api/employees/{employee_id}/employment-history/{TestEmploymentHistoryAPI.created_history_id}",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["job_title"] == "TEST_Senior Security Officer"
        assert data["reason_for_leaving"] == "Better opportunity"

    def test_update_employment_history_persists(self, auth_headers, employee_id):
        """GET after update verifies update persisted in database"""
        if not TestEmploymentHistoryAPI.created_history_id:
            pytest.skip("No created history entry")
        response = requests.get(
            f"{BASE_URL}/api/employees/{employee_id}/employment-history/{TestEmploymentHistoryAPI.created_history_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["job_title"] == "TEST_Senior Security Officer"

    def test_list_employment_history_includes_created_entry(self, auth_headers, employee_id):
        """GET list after create should include the new entry"""
        if not TestEmploymentHistoryAPI.created_history_id:
            pytest.skip("No created history entry")
        response = requests.get(
            f"{BASE_URL}/api/employees/{employee_id}/employment-history",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        ids = [h["id"] for h in data]
        assert TestEmploymentHistoryAPI.created_history_id in ids, \
            f"Created entry not found in list. IDs: {ids}"

    def test_delete_employment_history_entry(self, auth_headers, employee_id):
        """DELETE /employees/{id}/employment-history/{hid} deletes entry"""
        if not TestEmploymentHistoryAPI.created_history_id:
            pytest.skip("No created history entry")
        response = requests.delete(
            f"{BASE_URL}/api/employees/{employee_id}/employment-history/{TestEmploymentHistoryAPI.created_history_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data

    def test_delete_employment_history_entry_verifies_removal(self, auth_headers, employee_id):
        """GET after delete returns 404"""
        if not TestEmploymentHistoryAPI.created_history_id:
            pytest.skip("No created history entry")
        response = requests.get(
            f"{BASE_URL}/api/employees/{employee_id}/employment-history/{TestEmploymentHistoryAPI.created_history_id}",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 after delete, got {response.status_code}"

    def test_employment_history_nonexistent_employee_returns_404(self, auth_headers):
        """GET employment history for non-existent employee returns 404"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(
            f"{BASE_URL}/api/employees/{fake_id}/employment-history",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

    def test_employment_history_unauthenticated_returns_401(self, employee_id):
        """Unauthenticated request returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/employees/{employee_id}/employment-history"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============ CONTRACTS TESTS ============

class TestContractsAPI:
    """Tests for Contracts CRUD endpoints"""

    created_contract_id = None

    def test_list_contracts_returns_200(self, auth_headers, employee_id):
        """GET /employees/{id}/contracts returns 200 with list"""
        response = requests.get(
            f"{BASE_URL}/api/employees/{employee_id}/contracts",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"Contracts list returned {len(data)} entries")

    def test_create_contract(self, auth_headers, employee_id):
        """POST /employees/{id}/contracts creates new contract"""
        import uuid as uuid_lib
        unique_num = str(uuid_lib.uuid4())[:8]
        payload = {
            "contract_number": f"TEST-CTR-{unique_num}",
            "contract_type": "permanent",
            "start_date": "2024-01-01",
            "end_date": "2025-12-31",
            "duration_months": 24,
            "probation_months": 3,
            "salary_amount": 800000,
            "job_title_on_contract": "Security Guard",
            "workstation_site": "Main Office",
            "status": "active",
            "employee_signed": True,
            "employer_signed": True
        }
        response = requests.post(
            f"{BASE_URL}/api/employees/{employee_id}/contracts",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["contract_number"] == payload["contract_number"]
        assert data["contract_type"] == "permanent"
        assert data["status"] == "active"
        assert "id" in data
        assert isinstance(data["id"], str)
        TestContractsAPI.created_contract_id = data["id"]
        print(f"Created contract: {data['id']} with number {data['contract_number']}")

    def test_create_contract_validates_required_fields(self, auth_headers, employee_id):
        """POST without required fields returns 422"""
        payload = {"salary_amount": 500000}
        response = requests.post(
            f"{BASE_URL}/api/employees/{employee_id}/contracts",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"

    def test_create_contract_duplicate_number_returns_400(self, auth_headers, employee_id):
        """POST with duplicate contract number returns 400"""
        if not TestContractsAPI.created_contract_id:
            pytest.skip("No created contract")
        # Get the created contract number
        response = requests.get(
            f"{BASE_URL}/api/employees/{employee_id}/contracts/{TestContractsAPI.created_contract_id}",
            headers=auth_headers
        )
        if response.status_code != 200:
            pytest.skip("Cannot get created contract")
        contract_number = response.json()["contract_number"]
        
        payload = {
            "contract_number": contract_number,
            "contract_type": "casual",
            "start_date": "2024-01-01"
        }
        dup_response = requests.post(
            f"{BASE_URL}/api/employees/{employee_id}/contracts",
            json=payload,
            headers=auth_headers
        )
        assert dup_response.status_code == 400, f"Expected 400 for duplicate contract number, got {dup_response.status_code}"

    def test_get_contract_by_id(self, auth_headers, employee_id):
        """GET /employees/{id}/contracts/{cid} returns single contract"""
        if not TestContractsAPI.created_contract_id:
            pytest.skip("No created contract")
        response = requests.get(
            f"{BASE_URL}/api/employees/{employee_id}/contracts/{TestContractsAPI.created_contract_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["id"] == TestContractsAPI.created_contract_id

    def test_update_contract(self, auth_headers, employee_id):
        """PUT /employees/{id}/contracts/{cid} updates contract"""
        if not TestContractsAPI.created_contract_id:
            pytest.skip("No created contract")
        payload = {
            "job_title_on_contract": "Senior Security Guard",
            "workstation_site": "Branch Office",
            "status": "active"
        }
        response = requests.put(
            f"{BASE_URL}/api/employees/{employee_id}/contracts/{TestContractsAPI.created_contract_id}",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["job_title_on_contract"] == "Senior Security Guard"
        assert data["workstation_site"] == "Branch Office"

    def test_update_contract_persists(self, auth_headers, employee_id):
        """GET after update verifies changes persisted"""
        if not TestContractsAPI.created_contract_id:
            pytest.skip("No created contract")
        response = requests.get(
            f"{BASE_URL}/api/employees/{employee_id}/contracts/{TestContractsAPI.created_contract_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["job_title_on_contract"] == "Senior Security Guard"
        assert data["workstation_site"] == "Branch Office"

    def test_contract_status_badge_fields_present(self, auth_headers, employee_id):
        """Contract response has status and contract_type fields for badge display"""
        if not TestContractsAPI.created_contract_id:
            pytest.skip("No created contract")
        response = requests.get(
            f"{BASE_URL}/api/employees/{employee_id}/contracts/{TestContractsAPI.created_contract_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "contract_type" in data
        assert data["status"] in ["draft", "active", "expired", "terminated"]
        assert data["contract_type"] in ["permanent", "fixed_term", "casual", "probation", "part_time"]

    def test_list_contracts_includes_created_contract(self, auth_headers, employee_id):
        """GET list after create should include the new contract"""
        if not TestContractsAPI.created_contract_id:
            pytest.skip("No created contract")
        response = requests.get(
            f"{BASE_URL}/api/employees/{employee_id}/contracts",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        ids = [c["id"] for c in data]
        assert TestContractsAPI.created_contract_id in ids, \
            f"Created contract not found in list. IDs: {ids}"

    def test_delete_contract(self, auth_headers, employee_id):
        """DELETE /employees/{id}/contracts/{cid} deletes contract"""
        if not TestContractsAPI.created_contract_id:
            pytest.skip("No created contract")
        response = requests.delete(
            f"{BASE_URL}/api/employees/{employee_id}/contracts/{TestContractsAPI.created_contract_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data

    def test_delete_contract_verifies_removal(self, auth_headers, employee_id):
        """GET after delete returns 404"""
        if not TestContractsAPI.created_contract_id:
            pytest.skip("No created contract")
        response = requests.get(
            f"{BASE_URL}/api/employees/{employee_id}/contracts/{TestContractsAPI.created_contract_id}",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 after delete, got {response.status_code}"

    def test_contracts_unauthenticated_returns_401(self, employee_id):
        """Unauthenticated request returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/employees/{employee_id}/contracts"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


# ============ EMPLOYEE LIST / AVATAR TESTS ============

class TestEmployeeListWithAvatar:
    """Tests for employee list that includes profile_photo field for avatar display"""

    def test_employee_list_includes_photo_field(self, auth_headers):
        """GET /employees list returns profile_photo field per employee"""
        response = requests.get(
            f"{BASE_URL}/api/employees",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        employees = data.get("employees", data if isinstance(data, list) else [])
        assert len(employees) > 0, "No employees in list"
        
        first_emp = employees[0]
        # profile_photo field must exist (can be None if no photo uploaded)
        assert "profile_photo" in first_emp, "profile_photo field missing from employee list response"
        assert "first_name" in first_emp, "first_name field missing"
        assert "last_name" in first_emp, "last_name field missing"
        print(f"Employee list returns profile_photo field: {first_emp.get('profile_photo')}")

    def test_employee_detail_includes_photo_field(self, auth_headers, employee_id):
        """GET /employees/{id} returns profile_photo field"""
        response = requests.get(
            f"{BASE_URL}/api/employees/{employee_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "profile_photo" in data, "profile_photo field missing from employee detail"
        assert "first_name" in data
        assert "last_name" in data
