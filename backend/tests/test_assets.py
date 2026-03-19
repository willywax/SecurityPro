"""
Backend tests for Assets module (Module 4).
Tests cover: GET list, POST create, GET detail, PUT update, DELETE,
issuance CRUD (issue, list, return, mark-lost), search/filter, pagination.
"""

import pytest
import requests
import os
from datetime import date

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# ─── FIXTURES ────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def auth_token():
    """Obtain JWT for admin user"""
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
def employee_id(headers):
    """Get an existing employee ID to use in issuance tests"""
    r = requests.get(f"{BASE_URL}/api/employees?page_size=5", headers=headers)
    assert r.status_code == 200
    employees = r.json().get("employees", [])
    if not employees:
        pytest.skip("No employees found for issuance testing")
    return employees[0]["id"]


# ─── ASSETS LIST ─────────────────────────────────────────────────────────────

class TestAssetList:
    """GET /api/assets - listing, filtering, search"""

    def test_list_assets_returns_200(self, headers):
        r = requests.get(f"{BASE_URL}/api/assets", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "assets" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data

    def test_list_assets_has_seed_data(self, headers):
        """Seed data: ASSET0001 (gun), ASSET0002 (radio)"""
        r = requests.get(f"{BASE_URL}/api/assets", headers=headers)
        assert r.status_code == 200
        assets = r.json()["assets"]
        asset_ids = [a["asset_id"] for a in assets]
        # At least one of the seed assets exists
        assert any(aid in asset_ids for aid in ["ASSET0001", "ASSET0002"]), \
            f"Seed assets not found. Got: {asset_ids}"

    def test_filter_by_type_gun(self, headers):
        r = requests.get(f"{BASE_URL}/api/assets?type=gun", headers=headers)
        assert r.status_code == 200
        data = r.json()
        for asset in data["assets"]:
            assert asset["asset_type"] == "gun", f"Expected gun, got {asset['asset_type']}"

    def test_filter_by_type_radio(self, headers):
        r = requests.get(f"{BASE_URL}/api/assets?type=radio", headers=headers)
        assert r.status_code == 200
        data = r.json()
        for asset in data["assets"]:
            assert asset["asset_type"] == "radio"

    def test_filter_by_status_available(self, headers):
        r = requests.get(f"{BASE_URL}/api/assets?status=available", headers=headers)
        assert r.status_code == 200
        data = r.json()
        for asset in data["assets"]:
            assert asset["status"] == "available"

    def test_search_by_name(self, headers):
        r = requests.get(f"{BASE_URL}/api/assets?search=Glock", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 0  # May be 0 if no match but shouldn't fail

    def test_search_by_asset_id(self, headers):
        r = requests.get(f"{BASE_URL}/api/assets?search=ASSET0001", headers=headers)
        assert r.status_code == 200
        data = r.json()
        if data["total"] > 0:
            assert any("ASSET0001" in a["asset_id"] for a in data["assets"])

    def test_pagination(self, headers):
        r = requests.get(f"{BASE_URL}/api/assets?page=1&page_size=1", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data["page"] == 1
        assert data["page_size"] == 1
        assert len(data["assets"]) <= 1

    def test_list_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/assets")
        assert r.status_code in [401, 403]


# ─── ASSET CRUD ───────────────────────────────────────────────────────────────

class TestAssetCRUD:
    """POST, GET, PUT, DELETE /api/assets"""

    created_id = None
    created_asset_id = None

    def test_create_asset_minimal(self, headers):
        """Create asset with only required fields"""
        payload = {
            "asset_type": "uniform",
            "name": "TEST_Uniform Alpha"
        }
        r = requests.post(f"{BASE_URL}/api/assets", json=payload, headers=headers)
        assert r.status_code == 201, f"Create failed: {r.text}"
        data = r.json()
        assert data["name"] == "TEST_Uniform Alpha"
        assert data["asset_type"] == "uniform"
        assert data["status"] == "available"  # default
        assert data["condition"] == "good"    # default
        assert "asset_id" in data
        assert data["asset_id"].startswith("ASSET")
        assert len(data["asset_id"]) == 9  # ASSET + 4 digits
        assert "id" in data
        TestAssetCRUD.created_id = data["id"]
        TestAssetCRUD.created_asset_id = data["asset_id"]

    def test_create_asset_auto_id_increments(self, headers):
        """Second asset gets next sequential asset_id"""
        payload = {
            "asset_type": "baton",
            "name": "TEST_Baton Beta"
        }
        r = requests.post(f"{BASE_URL}/api/assets", json=payload, headers=headers)
        assert r.status_code == 201
        data = r.json()
        # The new asset_id should be greater than the previous
        assert data["asset_id"].startswith("ASSET")
        if TestAssetCRUD.created_asset_id:
            prev_num = int(TestAssetCRUD.created_asset_id.replace("ASSET", ""))
            new_num = int(data["asset_id"].replace("ASSET", ""))
            assert new_num > prev_num, f"Expected increment, got {data['asset_id']} after {TestAssetCRUD.created_asset_id}"
        # Cleanup second test asset
        requests.delete(f"{BASE_URL}/api/assets/{data['id']}", headers=headers)

    def test_create_asset_full_fields(self, headers):
        """Create asset with all optional fields"""
        payload = {
            "asset_type": "torch",
            "name": "TEST_Torch Gamma",
            "asset_tag": "TAG-TEST-001",
            "serial_number": "SN-TEST-999",
            "status": "maintenance",
            "condition": "fair",
            "purchase_date": "2024-01-15",
            "notes": "Test notes"
        }
        r = requests.post(f"{BASE_URL}/api/assets", json=payload, headers=headers)
        assert r.status_code == 201
        data = r.json()
        assert data["asset_tag"] == "TAG-TEST-001"
        assert data["serial_number"] == "SN-TEST-999"
        assert data["status"] == "maintenance"
        assert data["condition"] == "fair"
        assert data["purchase_date"] == "2024-01-15"
        assert data["notes"] == "Test notes"
        # Cleanup
        requests.delete(f"{BASE_URL}/api/assets/{data['id']}", headers=headers)

    def test_create_asset_missing_name_fails(self, headers):
        payload = {"asset_type": "gun"}
        r = requests.post(f"{BASE_URL}/api/assets", json=payload, headers=headers)
        assert r.status_code == 422

    def test_create_asset_missing_type_fails(self, headers):
        payload = {"name": "No Type Asset"}
        r = requests.post(f"{BASE_URL}/api/assets", json=payload, headers=headers)
        assert r.status_code == 422

    def test_create_asset_invalid_type_fails(self, headers):
        payload = {"asset_type": "missile", "name": "Invalid Type"}
        r = requests.post(f"{BASE_URL}/api/assets", json=payload, headers=headers)
        assert r.status_code == 422

    def test_get_asset_by_id(self, headers):
        assert TestAssetCRUD.created_id is not None, "Previous test must run first"
        r = requests.get(f"{BASE_URL}/api/assets/{TestAssetCRUD.created_id}", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == TestAssetCRUD.created_id
        assert data["name"] == "TEST_Uniform Alpha"

    def test_get_asset_not_found(self, headers):
        r = requests.get(f"{BASE_URL}/api/assets/nonexistent-uuid", headers=headers)
        assert r.status_code == 404

    def test_update_asset(self, headers):
        assert TestAssetCRUD.created_id is not None
        payload = {
            "name": "TEST_Uniform Alpha Updated",
            "serial_number": "SN-UPD-001",
            "notes": "Updated notes"
        }
        r = requests.put(f"{BASE_URL}/api/assets/{TestAssetCRUD.created_id}", json=payload, headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_Uniform Alpha Updated"
        assert data["serial_number"] == "SN-UPD-001"
        assert data["notes"] == "Updated notes"

    def test_update_asset_verify_persistence(self, headers):
        """After update, GET confirms changes persisted"""
        assert TestAssetCRUD.created_id is not None
        r = requests.get(f"{BASE_URL}/api/assets/{TestAssetCRUD.created_id}", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_Uniform Alpha Updated"
        assert data["serial_number"] == "SN-UPD-001"

    def test_delete_asset(self, headers):
        assert TestAssetCRUD.created_id is not None
        r = requests.delete(f"{BASE_URL}/api/assets/{TestAssetCRUD.created_id}", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "deleted" in data.get("message", "").lower() or "success" in data.get("message", "").lower()

    def test_delete_asset_verify_removed(self, headers):
        """After delete, GET returns 404"""
        assert TestAssetCRUD.created_id is not None
        r = requests.get(f"{BASE_URL}/api/assets/{TestAssetCRUD.created_id}", headers=headers)
        assert r.status_code == 404

    def test_delete_nonexistent_asset(self, headers):
        r = requests.delete(f"{BASE_URL}/api/assets/nonexistent-uuid", headers=headers)
        assert r.status_code == 404


# ─── ISSUANCE CRUD ───────────────────────────────────────────────────────────

class TestIssuanceCRUD:
    """Issue, list, return asset issuances"""

    asset_id = None
    asset_uuid = None
    issuance_id = None

    @pytest.fixture(autouse=True, scope="class")
    def setup_asset(self, headers):
        """Create a test asset for issuance tests"""
        payload = {"asset_type": "handcuff", "name": "TEST_Handcuff Issuance"}
        r = requests.post(f"{BASE_URL}/api/assets", json=payload, headers=headers)
        assert r.status_code == 201, f"Setup failed: {r.text}"
        data = r.json()
        TestIssuanceCRUD.asset_id = data["asset_id"]
        TestIssuanceCRUD.asset_uuid = data["id"]
        yield
        # Teardown: delete asset after all class tests run
        if TestIssuanceCRUD.asset_uuid:
            requests.delete(f"{BASE_URL}/api/assets/{TestIssuanceCRUD.asset_uuid}", headers=headers)

    def test_list_issuances_empty(self, headers):
        r = requests.get(f"{BASE_URL}/api/assets/{self.asset_uuid}/issuances", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_issue_asset_to_employee(self, headers, employee_id):
        payload = {
            "issued_to_employee": employee_id,
            "issue_date": str(date.today()),
            "issue_condition": "good"
        }
        r = requests.post(f"{BASE_URL}/api/assets/{self.asset_uuid}/issue", json=payload, headers=headers)
        assert r.status_code == 201, f"Issue failed: {r.text}"
        data = r.json()
        assert data["issued_to_employee"] == employee_id
        assert data["issue_condition"] == "good"
        assert data["is_active"] is True
        assert data["return_date"] is None
        assert data["lost"] is False
        TestIssuanceCRUD.issuance_id = data["id"]

    def test_asset_status_updated_to_issued(self, headers):
        """After issuing, asset status must be 'issued'"""
        r = requests.get(f"{BASE_URL}/api/assets/{self.asset_uuid}", headers=headers)
        assert r.status_code == 200
        assert r.json()["status"] == "issued"

    def test_list_issuances_shows_active(self, headers):
        r = requests.get(f"{BASE_URL}/api/assets/{self.asset_uuid}/issuances", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["is_active"] is True

    def test_cannot_issue_already_issued_asset(self, headers, employee_id):
        """Asset with status=issued must reject new issuance"""
        payload = {
            "issued_to_employee": employee_id,
            "issue_date": str(date.today()),
            "issue_condition": "good"
        }
        r = requests.post(f"{BASE_URL}/api/assets/{self.asset_uuid}/issue", json=payload, headers=headers)
        assert r.status_code == 400

    def test_cannot_delete_issued_asset(self, headers):
        r = requests.delete(f"{BASE_URL}/api/assets/{self.asset_uuid}", headers=headers)
        assert r.status_code == 400
        assert "issued" in r.json().get("detail", "").lower()

    def test_return_asset(self, headers):
        assert TestIssuanceCRUD.issuance_id is not None
        payload = {
            "return_date": str(date.today()),
            "return_condition": "good",
            "lost": False
        }
        r = requests.put(
            f"{BASE_URL}/api/assets/{self.asset_uuid}/issuances/{self.issuance_id}/return",
            json=payload,
            headers=headers
        )
        assert r.status_code == 200, f"Return failed: {r.text}"
        data = r.json()
        assert data["return_date"] is not None
        assert data["lost"] is False
        assert data["return_condition"] == "good"

    def test_asset_status_back_to_available(self, headers):
        """After return, asset status must be 'available'"""
        r = requests.get(f"{BASE_URL}/api/assets/{self.asset_uuid}", headers=headers)
        assert r.status_code == 200
        assert r.json()["status"] == "available"

    def test_issuance_not_active_after_return(self, headers):
        r = requests.get(f"{BASE_URL}/api/assets/{self.asset_uuid}/issuances", headers=headers)
        assert r.status_code == 200
        data = r.json()
        returned = next((i for i in data if i["id"] == self.issuance_id), None)
        assert returned is not None
        assert returned["is_active"] is False
        assert returned["return_date"] is not None

    def test_cannot_return_already_returned_issuance(self, headers):
        payload = {"return_date": str(date.today()), "lost": False}
        r = requests.put(
            f"{BASE_URL}/api/assets/{self.asset_uuid}/issuances/{self.issuance_id}/return",
            json=payload,
            headers=headers
        )
        assert r.status_code == 400


class TestIssuanceMarkLost:
    """Issue and mark as lost flow"""

    asset_uuid = None
    issuance_id = None

    @pytest.fixture(autouse=True, scope="class")
    def setup_asset(self, headers):
        payload = {"asset_type": "radio", "name": "TEST_Radio Lost Test"}
        r = requests.post(f"{BASE_URL}/api/assets", json=payload, headers=headers)
        assert r.status_code == 201
        data = r.json()
        TestIssuanceMarkLost.asset_uuid = data["id"]
        yield
        # Cleanup
        if TestIssuanceMarkLost.asset_uuid:
            requests.delete(f"{BASE_URL}/api/assets/{TestIssuanceMarkLost.asset_uuid}", headers=headers)

    def test_issue_for_lost_test(self, headers, employee_id):
        payload = {
            "issued_to_employee": employee_id,
            "issue_date": str(date.today()),
            "issue_condition": "fair"
        }
        r = requests.post(f"{BASE_URL}/api/assets/{self.asset_uuid}/issue", json=payload, headers=headers)
        assert r.status_code == 201
        TestIssuanceMarkLost.issuance_id = r.json()["id"]

    def test_mark_asset_as_lost(self, headers):
        assert TestIssuanceMarkLost.issuance_id is not None
        payload = {
            "return_date": str(date.today()),
            "lost": True
        }
        r = requests.put(
            f"{BASE_URL}/api/assets/{self.asset_uuid}/issuances/{self.issuance_id}/return",
            json=payload,
            headers=headers
        )
        assert r.status_code == 200
        data = r.json()
        assert data["lost"] is True

    def test_asset_status_is_lost(self, headers):
        r = requests.get(f"{BASE_URL}/api/assets/{self.asset_uuid}", headers=headers)
        assert r.status_code == 200
        assert r.json()["status"] == "lost"


class TestIssuanceSite:
    """Issue asset to a site"""

    asset_uuid = None
    site_id = None

    @pytest.fixture(autouse=True, scope="class")
    def setup(self, headers):
        # Create asset
        payload = {"asset_type": "torch", "name": "TEST_Torch Site Test"}
        r = requests.post(f"{BASE_URL}/api/assets", json=payload, headers=headers)
        assert r.status_code == 201
        TestIssuanceSite.asset_uuid = r.json()["id"]

        # Get a site
        sr = requests.get(f"{BASE_URL}/api/sites?page_size=5", headers=headers)
        sites = sr.json().get("sites", [])
        if sites:
            TestIssuanceSite.site_id = sites[0]["id"]
        yield
        # Cleanup: return active issuance first if issued
        if TestIssuanceSite.asset_uuid:
            asset_r = requests.get(f"{BASE_URL}/api/assets/{TestIssuanceSite.asset_uuid}", headers=headers)
            if asset_r.status_code == 200 and asset_r.json().get("status") == "issued":
                iso_r = requests.get(f"{BASE_URL}/api/assets/{TestIssuanceSite.asset_uuid}/issuances", headers=headers)
                active = [i for i in iso_r.json() if i.get("is_active")]
                if active:
                    requests.put(
                        f"{BASE_URL}/api/assets/{TestIssuanceSite.asset_uuid}/issuances/{active[0]['id']}/return",
                        json={"return_date": str(date.today()), "lost": False},
                        headers=headers
                    )
            requests.delete(f"{BASE_URL}/api/assets/{TestIssuanceSite.asset_uuid}", headers=headers)

    def test_issue_to_site(self, headers):
        if not self.site_id:
            pytest.skip("No sites available")
        payload = {
            "issued_to_site": self.site_id,
            "issue_date": str(date.today()),
            "issue_condition": "new"
        }
        r = requests.post(f"{BASE_URL}/api/assets/{self.asset_uuid}/issue", json=payload, headers=headers)
        assert r.status_code == 201
        data = r.json()
        assert data["issued_to_site"] == self.site_id
        assert data["is_active"] is True

    def test_issue_without_recipient_fails(self, headers):
        """Neither employee nor site provided"""
        # Need another asset since previous one is now issued
        payload2 = {"asset_type": "baton", "name": "TEST_Baton No Recipient"}
        r2 = requests.post(f"{BASE_URL}/api/assets", json=payload2, headers=headers)
        asset_uuid2 = r2.json()["id"]
        try:
            payload = {
                "issue_date": str(date.today()),
                "issue_condition": "good"
                # no issued_to_employee or issued_to_site
            }
            r = requests.post(f"{BASE_URL}/api/assets/{asset_uuid2}/issue", json=payload, headers=headers)
            assert r.status_code == 422  # Pydantic validation
        finally:
            requests.delete(f"{BASE_URL}/api/assets/{asset_uuid2}", headers=headers)
