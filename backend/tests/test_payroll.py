"""
Backend tests for Payroll module (Module 5).
Tests cover: GET list, POST create (single), POST bulk, GET detail,
PUT update (fields + status transitions), DELETE (draft only), filters.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# ─── FIXTURES ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def auth_token():
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@securityops.com",
        "password": "Admin123!"
    })
    assert response.status_code == 200, f"Auth failed: {response.text}"
    token = response.json().get("access_token")
    assert token, "No access_token in response"
    return token


@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def first_active_employee(headers):
    """Fetch an active employee to use for payroll creation"""
    r = requests.get(f"{BASE_URL}/api/employees?page_size=10&status=active", headers=headers)
    assert r.status_code == 200, f"Employee list failed: {r.text}"
    employees = r.json().get("employees", [])
    assert len(employees) > 0, "No active employees found; cannot run payroll tests"
    return employees[0]


@pytest.fixture(scope="module")
def second_active_employee(headers):
    """Fetch a second active employee"""
    r = requests.get(f"{BASE_URL}/api/employees?page_size=10&status=active", headers=headers)
    assert r.status_code == 200
    employees = r.json().get("employees", [])
    assert len(employees) >= 2, "Need at least 2 active employees for some tests"
    return employees[1]


# ─── TEST CLASS: Payroll CRUD ──────────────────────────────────────────────────

class TestPayrollCRUD:
    """Single-entry CRUD: create, read, update, delete"""

    created_id = None

    def test_list_payrolls_initially(self, headers):
        """GET /api/payroll returns list with proper structure"""
        r = requests.get(f"{BASE_URL}/api/payroll", headers=headers)
        assert r.status_code == 200, f"List failed: {r.text}"
        data = r.json()
        assert "payrolls" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        assert isinstance(data["payrolls"], list)
        print(f"Current payroll count: {data['total']}")

    def test_create_single_payroll(self, headers, first_active_employee):
        """POST /api/payroll creates a draft record and returns full response"""
        emp_id = first_active_employee["id"]
        payload = {
            "employee_id": emp_id,
            "payroll_month": "2026-03",
            "base_salary": 4000.0,
            "allowances": 500.0,
            "overtime": 200.0,
            "deductions": 300.0,
            "status": "draft",
            "notes": "TEST_payroll_single"
        }
        r = requests.post(f"{BASE_URL}/api/payroll", json=payload, headers=headers)
        # Could be 400 if already exists for that month - that's ok
        if r.status_code == 400 and "already exists" in r.text:
            pytest.skip("Payroll already exists for this employee/month combination")
        assert r.status_code == 201, f"Create failed: {r.text}"
        data = r.json()
        assert data["employee_id"] == emp_id
        assert data["payroll_month"] == "2026-03"
        assert data["base_salary"] == 4000.0
        assert data["allowances"] == 500.0
        assert data["overtime"] == 200.0
        assert data["deductions"] == 300.0
        assert data["net_pay"] == 4400.0, f"Expected net_pay=4400.0, got {data['net_pay']}"
        assert data["status"] == "draft"
        assert "id" in data
        assert "payroll_id" in data
        assert data["payroll_id"].startswith("PAY")
        # employee name should be enriched
        assert data.get("employee_name") is not None
        TestPayrollCRUD.created_id = data["id"]
        print(f"Created payroll ID: {data['id']}, PAY ID: {data['payroll_id']}")

    def test_get_payroll_by_id(self, headers):
        """GET /api/payroll/:id returns the correct record"""
        if not TestPayrollCRUD.created_id:
            pytest.skip("No payroll created in previous test")
        r = requests.get(f"{BASE_URL}/api/payroll/{TestPayrollCRUD.created_id}", headers=headers)
        assert r.status_code == 200, f"Get failed: {r.text}"
        data = r.json()
        assert data["id"] == TestPayrollCRUD.created_id
        assert data["payroll_month"] == "2026-03"
        assert data["status"] == "draft"
        assert data["net_pay"] == 4400.0

    def test_update_payroll_base_salary(self, headers):
        """PUT /api/payroll/:id updates base_salary and recalculates net_pay"""
        if not TestPayrollCRUD.created_id:
            pytest.skip("No payroll created")
        r = requests.put(
            f"{BASE_URL}/api/payroll/{TestPayrollCRUD.created_id}",
            json={"base_salary": 4500.0},
            headers=headers
        )
        assert r.status_code == 200, f"Update failed: {r.text}"
        data = r.json()
        assert data["base_salary"] == 4500.0
        # net = 4500 + 500 + 200 - 300 = 4900
        assert data["net_pay"] == 4900.0, f"Expected net_pay=4900.0, got {data['net_pay']}"

    def test_get_updated_payroll_persists(self, headers):
        """GET after update confirms the change persisted"""
        if not TestPayrollCRUD.created_id:
            pytest.skip("No payroll created")
        r = requests.get(f"{BASE_URL}/api/payroll/{TestPayrollCRUD.created_id}", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data["base_salary"] == 4500.0
        assert data["net_pay"] == 4900.0

    def test_approve_payroll(self, headers):
        """PUT status=approved transitions from draft -> approved"""
        if not TestPayrollCRUD.created_id:
            pytest.skip("No payroll created")
        r = requests.put(
            f"{BASE_URL}/api/payroll/{TestPayrollCRUD.created_id}",
            json={"status": "approved"},
            headers=headers
        )
        assert r.status_code == 200, f"Approve failed: {r.text}"
        data = r.json()
        assert data["status"] == "approved"

    def test_mark_as_paid(self, headers):
        """PUT status=paid transitions from approved -> paid"""
        if not TestPayrollCRUD.created_id:
            pytest.skip("No payroll created")
        r = requests.put(
            f"{BASE_URL}/api/payroll/{TestPayrollCRUD.created_id}",
            json={"status": "paid"},
            headers=headers
        )
        assert r.status_code == 200, f"Mark as paid failed: {r.text}"
        data = r.json()
        assert data["status"] == "paid"

    def test_delete_non_draft_payroll_fails(self, headers):
        """DELETE /api/payroll/:id rejects non-draft records"""
        if not TestPayrollCRUD.created_id:
            pytest.skip("No payroll created")
        r = requests.delete(f"{BASE_URL}/api/payroll/{TestPayrollCRUD.created_id}", headers=headers)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        assert "draft" in r.json().get("detail", "").lower()


class TestPayrollFilters:
    """Payroll list filters: month, status, employee"""

    def test_filter_by_month_2026_03(self, headers):
        """GET /api/payroll?month=2026-03 returns only March 2026 records"""
        r = requests.get(f"{BASE_URL}/api/payroll?month=2026-03", headers=headers)
        assert r.status_code == 200
        data = r.json()
        for p in data["payrolls"]:
            assert p["payroll_month"] == "2026-03", f"Got unexpected month: {p['payroll_month']}"
        print(f"March 2026 payrolls: {data['total']}")

    def test_filter_by_status_paid(self, headers):
        """GET /api/payroll?status=paid returns only paid records"""
        r = requests.get(f"{BASE_URL}/api/payroll?status=paid", headers=headers)
        assert r.status_code == 200
        data = r.json()
        for p in data["payrolls"]:
            assert p["status"] == "paid", f"Got unexpected status: {p['status']}"
        print(f"Paid payrolls: {data['total']}")

    def test_filter_by_status_draft(self, headers):
        """GET /api/payroll?status=draft returns only draft records"""
        r = requests.get(f"{BASE_URL}/api/payroll?status=draft", headers=headers)
        assert r.status_code == 200
        data = r.json()
        for p in data["payrolls"]:
            assert p["status"] == "draft"

    def test_filter_by_employee_id(self, headers, first_active_employee):
        """GET /api/payroll?employee_id=X returns only that employee's records"""
        emp_id = first_active_employee["id"]
        r = requests.get(f"{BASE_URL}/api/payroll?employee_id={emp_id}", headers=headers)
        assert r.status_code == 200
        data = r.json()
        for p in data["payrolls"]:
            assert p["employee_id"] == emp_id


class TestPayrollDelete:
    """Delete only draft payrolls"""

    created_draft_id = None

    def test_create_draft_for_deletion(self, headers, second_active_employee):
        """Create a draft payroll to be deleted"""
        emp_id = second_active_employee["id"]
        payload = {
            "employee_id": emp_id,
            "payroll_month": "2026-01",
            "base_salary": 3000.0,
            "allowances": 0.0,
            "overtime": 0.0,
            "deductions": 0.0,
            "status": "draft",
            "notes": "TEST_draft_for_deletion"
        }
        r = requests.post(f"{BASE_URL}/api/payroll", json=payload, headers=headers)
        if r.status_code == 400 and "already exists" in r.text:
            # Fetch existing
            r2 = requests.get(
                f"{BASE_URL}/api/payroll?month=2026-01&employee_id={emp_id}",
                headers=headers
            )
            if r2.status_code == 200 and r2.json()["payrolls"]:
                rec = r2.json()["payrolls"][0]
                if rec["status"] == "draft":
                    TestPayrollDelete.created_draft_id = rec["id"]
                    return
            pytest.skip("Payroll already exists and not draft - cannot test delete")
        assert r.status_code == 201, f"Create draft failed: {r.text}"
        TestPayrollDelete.created_draft_id = r.json()["id"]
        print(f"Created draft for deletion: {TestPayrollDelete.created_draft_id}")

    def test_delete_draft_payroll(self, headers):
        """DELETE /api/payroll/:id succeeds for draft records"""
        if not TestPayrollDelete.created_draft_id:
            pytest.skip("No draft payroll created")
        r = requests.delete(
            f"{BASE_URL}/api/payroll/{TestPayrollDelete.created_draft_id}",
            headers=headers
        )
        assert r.status_code == 200, f"Delete failed: {r.text}"
        data = r.json()
        assert "message" in data
        assert "deleted" in data["message"].lower()

    def test_deleted_payroll_returns_404(self, headers):
        """GET after delete returns 404"""
        if not TestPayrollDelete.created_draft_id:
            pytest.skip("No draft payroll created")
        r = requests.get(
            f"{BASE_URL}/api/payroll/{TestPayrollDelete.created_draft_id}",
            headers=headers
        )
        assert r.status_code == 404


class TestBulkPayroll:
    """Bulk payroll creation"""

    bulk_ids = []

    def test_bulk_create_payroll(self, headers, first_active_employee, second_active_employee):
        """POST /api/payroll/bulk creates multiple records"""
        entries = [
            {
                "employee_id": first_active_employee["id"],
                "base_salary": 3500.0,
                "allowances": 200.0,
                "overtime": 100.0,
                "deductions": 150.0
            },
            {
                "employee_id": second_active_employee["id"],
                "base_salary": 4000.0,
                "allowances": 300.0,
                "overtime": 0.0,
                "deductions": 200.0
            }
        ]
        payload = {
            "payroll_month": "2026-04",
            "status": "draft",
            "entries": entries
        }
        r = requests.post(f"{BASE_URL}/api/payroll/bulk", json=payload, headers=headers)
        if r.status_code == 400 and "No records created" in r.text:
            pytest.skip("Bulk payroll already exists for 2026-04")
        assert r.status_code == 201, f"Bulk create failed: {r.text}"
        data = r.json()
        assert "created" in data
        assert "skipped" in data
        assert isinstance(data["created"], list)
        assert len(data["created"]) > 0
        # Net pay checks
        for rec in data["created"]:
            assert rec.get("net_pay") is not None
            assert rec["status"] == "draft"
        TestBulkPayroll.bulk_ids = [rec["id"] for rec in data["created"]]
        print(f"Bulk created: {len(data['created'])}, skipped: {len(data['skipped'])}")

    def test_bulk_payroll_appears_in_list(self, headers):
        """GET /api/payroll?month=2026-04 shows bulk-created records"""
        r = requests.get(f"{BASE_URL}/api/payroll?month=2026-04", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1
        for p in data["payrolls"]:
            assert p["payroll_month"] == "2026-04"

    def test_bulk_cleanup(self, headers):
        """Cleanup: delete bulk-created draft records"""
        for pid in TestBulkPayroll.bulk_ids:
            r = requests.delete(f"{BASE_URL}/api/payroll/{pid}", headers=headers)
            # May already be deleted or not draft - just proceed
            print(f"Cleanup {pid}: {r.status_code}")


class TestPayrollEdgeCases:
    """Edge cases and validation"""

    def test_invalid_payroll_month_format(self, headers, first_active_employee):
        """POST with bad payroll_month format returns 422"""
        r = requests.post(f"{BASE_URL}/api/payroll", json={
            "employee_id": first_active_employee["id"],
            "payroll_month": "03-2026",   # wrong format
            "base_salary": 1000.0
        }, headers=headers)
        assert r.status_code == 422, f"Expected 422, got {r.status_code}"

    def test_get_nonexistent_payroll_returns_404(self, headers):
        """GET /api/payroll/nonexistent returns 404"""
        r = requests.get(f"{BASE_URL}/api/payroll/nonexistent-id-12345", headers=headers)
        assert r.status_code == 404

    def test_delete_nonexistent_payroll_returns_404(self, headers):
        """DELETE /api/payroll/nonexistent returns 404"""
        r = requests.delete(f"{BASE_URL}/api/payroll/nonexistent-id-12345", headers=headers)
        assert r.status_code == 404

    def test_payroll_unauthenticated(self):
        """GET /api/payroll without auth returns 401 or 403"""
        r = requests.get(f"{BASE_URL}/api/payroll")
        assert r.status_code in [401, 403], f"Expected 401/403, got {r.status_code}"

    def test_net_pay_calculation_correct(self, headers, first_active_employee):
        """Verify net_pay = base + allowances + overtime - deductions"""
        # We already have the March record at paid status. Test with an existing record.
        r = requests.get(f"{BASE_URL}/api/payroll?month=2026-03", headers=headers)
        assert r.status_code == 200
        data = r.json()
        for p in data["payrolls"]:
            expected_net = round(
                p["base_salary"] + p["allowances"] + p["overtime"] - p["deductions"], 2
            )
            assert abs(p["net_pay"] - expected_net) < 0.01, (
                f"net_pay mismatch: {p['net_pay']} vs expected {expected_net}"
            )
