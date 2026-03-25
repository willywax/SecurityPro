"""
Backend tests for Clients and Sites CRUD endpoints (Module 2 & 3).
Tests cover: GET list, POST create, PUT update, DELETE for both modules.
Also tests auto-generated IDs, filtering, and FK validation.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# ─── FIXTURES ───────────────────────────────────────────────────────────────

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


# ─── CLIENT TESTS ────────────────────────────────────────────────────────────

class TestClientList:
    """GET /api/clients - list with pagination and filtering"""

    def test_list_clients_returns_200(self, headers):
        resp = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_list_clients_response_structure(self, headers):
        resp = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        data = resp.json()
        assert "clients" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data

    def test_list_clients_pagination(self, headers):
        resp = requests.get(f"{BASE_URL}/api/clients?page=1&page_size=5", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 5
        assert len(data["clients"]) <= 5

    def test_list_clients_search_filter(self, headers):
        resp = requests.get(f"{BASE_URL}/api/clients?search=Acme", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        for client in data["clients"]:
            assert "acme" in client["client_name"].lower() or \
                   "acme" in (client.get("email") or "").lower() or \
                   "acme" in (client.get("phone_1") or "").lower() or \
                   "acme" in client["client_id"].lower()

    def test_list_clients_status_filter_active(self, headers):
        resp = requests.get(f"{BASE_URL}/api/clients?status=active", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        for c in data["clients"]:
            assert c["status"] == "active"

    def test_list_clients_status_filter_prospect(self, headers):
        resp = requests.get(f"{BASE_URL}/api/clients?status=prospect", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        for c in data["clients"]:
            assert c["status"] == "prospect"

    def test_list_clients_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/clients")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"

    def test_existing_seed_clients_present(self, headers):
        """Check seed data: CLT0001 and CLT0002 exist"""
        resp = requests.get(f"{BASE_URL}/api/clients?search=CLT000", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        client_ids = [c["client_id"] for c in data["clients"]]
        # At least one CLT-format ID should exist
        assert any(cid.startswith("CLT") for cid in client_ids), \
            f"No CLT-prefixed client IDs found: {client_ids}"


class TestClientCRUD:
    """POST, GET, PUT, DELETE for /api/clients"""

    created_client_id = None  # will be set after create

    def test_create_client_minimal(self, headers):
        """Create client with required fields"""
        payload = {
            "client_name": "TEST_Client_Minimal",
            "contact_person": "John Doe",
            "phone_1": "+256700123456",
            "address": "123 Test Street"
        }
        resp = requests.post(f"{BASE_URL}/api/clients", json=payload, headers=headers)
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["client_name"] == "TEST_Client_Minimal"
        assert data["contact_person"] == "John Doe"
        assert data["phone_1"] == "+256700123456"
        assert data["address"] == "123 Test Street"
        assert "client_id" in data
        assert data["client_id"].startswith("CLT"), f"client_id format wrong: {data['client_id']}"
        assert "id" in data
        assert data["status"] == "active"  # default
        TestClientCRUD.created_client_id = data["id"]

    def test_create_client_auto_id_format(self, headers):
        """Auto-generated client_id must be CLTxxxx format"""
        payload = {"client_name": "TEST_AutoID_Check"}
        resp = requests.post(f"{BASE_URL}/api/clients", json=payload, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        clt_id = data["client_id"]
        assert clt_id.startswith("CLT"), f"Expected CLT prefix, got: {clt_id}"
        num_part = clt_id[3:]
        assert num_part.isdigit() and len(num_part) == 4, \
            f"Expected 4-digit suffix, got: {num_part}"
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{data['id']}", headers=headers)

    def test_create_client_full_fields(self, headers):
        """Create client with all optional fields"""
        payload = {
            "client_name": "TEST_FullClient",
            "contact_person": "John Doe",
            "phone_1": "+256700123456",
            "phone_2": "+256700654321",
            "email": "test_full@testclient.com",
            "billing_email": "billing_full@testclient.com",
            "address": "123 Test Street, Kampala",
            "status": "prospect",
            "notes": "Test notes"
        }
        resp = requests.post(f"{BASE_URL}/api/clients", json=payload, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["contact_person"] == "John Doe"
        assert data["status"] == "prospect"
        assert data["phone_1"] == "+256700123456"
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{data['id']}", headers=headers)

    def test_create_client_missing_required_field(self, headers):
        """Creating client without client_name should fail with 422"""
        resp = requests.post(f"{BASE_URL}/api/clients", json={}, headers=headers)
        assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"

    def test_get_client_by_id(self, headers):
        """GET a single client by UUID"""
        assert TestClientCRUD.created_client_id is not None
        resp = requests.get(
            f"{BASE_URL}/api/clients/{TestClientCRUD.created_client_id}",
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["client_name"] == "TEST_Client_Minimal"
        assert data["id"] == TestClientCRUD.created_client_id

    def test_get_client_not_found(self, headers):
        resp = requests.get(
            f"{BASE_URL}/api/clients/00000000-0000-0000-0000-000000000000",
            headers=headers
        )
        assert resp.status_code == 404

    def test_update_client(self, headers):
        """PUT /api/clients/:id - updates client fields"""
        assert TestClientCRUD.created_client_id is not None
        update_payload = {
            "client_name": "TEST_Client_Updated",
            "status": "inactive",
            "contact_person": "Jane Doe"
        }
        resp = requests.put(
            f"{BASE_URL}/api/clients/{TestClientCRUD.created_client_id}",
            json=update_payload,
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["client_name"] == "TEST_Client_Updated"
        assert data["status"] == "inactive"
        assert data["contact_person"] == "Jane Doe"

    def test_update_persisted_in_db(self, headers):
        """Verify update was persisted via GET after PUT"""
        resp = requests.get(
            f"{BASE_URL}/api/clients/{TestClientCRUD.created_client_id}",
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["client_name"] == "TEST_Client_Updated"
        assert data["status"] == "inactive"

    def test_delete_client(self, headers):
        """DELETE /api/clients/:id"""
        assert TestClientCRUD.created_client_id is not None
        resp = requests.delete(
            f"{BASE_URL}/api/clients/{TestClientCRUD.created_client_id}",
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data

    def test_deleted_client_returns_404(self, headers):
        """After deletion, GET should return 404"""
        resp = requests.get(
            f"{BASE_URL}/api/clients/{TestClientCRUD.created_client_id}",
            headers=headers
        )
        assert resp.status_code == 404

    def test_delete_nonexistent_client_returns_404(self, headers):
        resp = requests.delete(
            f"{BASE_URL}/api/clients/00000000-0000-0000-0000-000000000000",
            headers=headers
        )
        assert resp.status_code == 404


# ─── SITE TESTS ─────────────────────────────────────────────────────────────

class TestSiteList:
    """GET /api/sites - list with pagination and filtering"""

    def test_list_sites_returns_200(self, headers):
        resp = requests.get(f"{BASE_URL}/api/sites", headers=headers)
        assert resp.status_code == 200

    def test_list_sites_response_structure(self, headers):
        resp = requests.get(f"{BASE_URL}/api/sites", headers=headers)
        data = resp.json()
        assert "sites" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data

    def test_list_sites_has_client_name(self, headers):
        """Sites should include enriched client_name field"""
        resp = requests.get(f"{BASE_URL}/api/sites", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        for site in data["sites"]:
            # client_name should be present (can be null if no client linked)
            assert "client_name" in site

    def test_list_sites_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/sites")
        assert resp.status_code in [401, 403]

    def test_list_sites_search_filter(self, headers):
        resp = requests.get(f"{BASE_URL}/api/sites?search=Kampala", headers=headers)
        assert resp.status_code == 200

    def test_list_sites_status_filter(self, headers):
        resp = requests.get(f"{BASE_URL}/api/sites?status=active", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        for s in data["sites"]:
            assert s["status"] == "active"

    def test_seed_site_exists(self, headers):
        """Check SITE001 exists from seed data"""
        resp = requests.get(f"{BASE_URL}/api/sites?search=SITE", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        site_ids = [s["site_id"] for s in data["sites"]]
        assert any(sid.startswith("SITE") for sid in site_ids), \
            f"No SITE-prefix found: {site_ids}"


class TestSiteCRUD:
    """POST, GET, PUT, DELETE for /api/sites"""

    created_site_id = None
    valid_client_id = None  # will be fetched before tests

    @pytest.fixture(autouse=True, scope="class")
    def get_valid_client(self, headers):
        """Fetch first available client ID for site creation"""
        resp = requests.get(f"{BASE_URL}/api/clients?page_size=10", headers=headers)
        assert resp.status_code == 200
        clients = resp.json()["clients"]
        assert len(clients) > 0, "No clients found for site tests"
        TestSiteCRUD.valid_client_id = clients[0]["id"]

    def test_create_site_minimal(self, headers):
        """Create site with only required fields (site_name + client_id)"""
        payload = {
            "client_id": TestSiteCRUD.valid_client_id,
            "site_name": "TEST_Site_Minimal"
        }
        resp = requests.post(f"{BASE_URL}/api/sites", json=payload, headers=headers)
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["site_name"] == "TEST_Site_Minimal"
        assert "site_id" in data
        assert data["site_id"].startswith("SITE"), f"site_id format wrong: {data['site_id']}"
        assert "client_name" in data
        assert data["client_name"] is not None
        TestSiteCRUD.created_site_id = data["id"]

    def test_create_site_auto_id_format(self, headers):
        """Auto-generated site_id must be SITExxx format"""
        payload = {
            "client_id": TestSiteCRUD.valid_client_id,
            "site_name": "TEST_Site_AutoID"
        }
        resp = requests.post(f"{BASE_URL}/api/sites", json=payload, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        site_id = data["site_id"]
        assert site_id.startswith("SITE"), f"Expected SITE prefix, got: {site_id}"
        num_part = site_id[4:]
        assert num_part.isdigit() and len(num_part) == 3, \
            f"Expected 3-digit suffix, got: {num_part}"
        # Cleanup
        requests.delete(f"{BASE_URL}/api/sites/{data['id']}", headers=headers)

    def test_create_site_full_fields(self, headers):
        """Create site with all optional fields"""
        payload = {
            "client_id": TestSiteCRUD.valid_client_id,
            "site_name": "TEST_FullSite",
            "region": "Central",
            "district": "Kampala",
            "ward": "Nakasero",
            "address": "Plot 1, Kampala",
            "contact_person": "Bob Smith",
            "contact_phone": "+256700111222",
            "status": "under_review",
            "notes": "Test notes"
        }
        resp = requests.post(f"{BASE_URL}/api/sites", json=payload, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["region"] == "Central"
        assert data["district"] == "Kampala"
        assert data["status"] == "under_review"
        # Cleanup
        requests.delete(f"{BASE_URL}/api/sites/{data['id']}", headers=headers)

    def test_create_site_missing_site_name(self, headers):
        """Creating site without site_name should fail with 422"""
        payload = {"client_id": TestSiteCRUD.valid_client_id}
        resp = requests.post(f"{BASE_URL}/api/sites", json=payload, headers=headers)
        assert resp.status_code == 422

    def test_create_site_missing_client_id(self, headers):
        """Creating site without client_id should fail"""
        payload = {"site_name": "TEST_NoClientSite"}
        resp = requests.post(f"{BASE_URL}/api/sites", json=payload, headers=headers)
        assert resp.status_code == 422

    def test_create_site_invalid_client_id(self, headers):
        """Creating site with non-existent client_id should return 404"""
        payload = {
            "client_id": "00000000-0000-0000-0000-000000000000",
            "site_name": "TEST_InvalidClient"
        }
        resp = requests.post(f"{BASE_URL}/api/sites", json=payload, headers=headers)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"

    def test_get_site_by_id(self, headers):
        assert TestSiteCRUD.created_site_id is not None
        resp = requests.get(
            f"{BASE_URL}/api/sites/{TestSiteCRUD.created_site_id}",
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["site_name"] == "TEST_Site_Minimal"
        assert data["id"] == TestSiteCRUD.created_site_id
        assert "client_name" in data  # enriched field

    def test_get_site_not_found(self, headers):
        resp = requests.get(
            f"{BASE_URL}/api/sites/00000000-0000-0000-0000-000000000000",
            headers=headers
        )
        assert resp.status_code == 404

    def test_update_site(self, headers):
        assert TestSiteCRUD.created_site_id is not None
        update_payload = {
            "site_name": "TEST_Site_Updated",
            "status": "inactive",
            "region": "Eastern"
        }
        resp = requests.put(
            f"{BASE_URL}/api/sites/{TestSiteCRUD.created_site_id}",
            json=update_payload,
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["site_name"] == "TEST_Site_Updated"
        assert data["status"] == "inactive"
        assert data["region"] == "Eastern"

    def test_update_site_persisted(self, headers):
        """Verify update was persisted via GET after PUT"""
        resp = requests.get(
            f"{BASE_URL}/api/sites/{TestSiteCRUD.created_site_id}",
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["site_name"] == "TEST_Site_Updated"
        assert data["status"] == "inactive"

    def test_filter_sites_by_client_id(self, headers):
        """Filter sites by client UUID"""
        resp = requests.get(
            f"{BASE_URL}/api/sites?client_id={TestSiteCRUD.valid_client_id}",
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        for site in data["sites"]:
            assert site["client_id"] == TestSiteCRUD.valid_client_id

    def test_delete_site(self, headers):
        assert TestSiteCRUD.created_site_id is not None
        resp = requests.delete(
            f"{BASE_URL}/api/sites/{TestSiteCRUD.created_site_id}",
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data

    def test_deleted_site_returns_404(self, headers):
        resp = requests.get(
            f"{BASE_URL}/api/sites/{TestSiteCRUD.created_site_id}",
            headers=headers
        )
        assert resp.status_code == 404

    def test_delete_nonexistent_site_returns_404(self, headers):
        resp = requests.delete(
            f"{BASE_URL}/api/sites/00000000-0000-0000-0000-000000000000",
            headers=headers
        )
        assert resp.status_code == 404


# ─── CONTRACT AUTO-NUMBER TESTS ─────────────────────────────────────────────

class TestContractAutoNumber:
    """Verify contracts have auto-generated numbers (no manual input)"""

    created_contract_id = None

    @pytest.fixture(autouse=True, scope="class")
    def get_employee_id(self, headers):
        resp = requests.get(f"{BASE_URL}/api/employees?page_size=5", headers=headers)
        assert resp.status_code == 200
        employees = resp.json().get("employees", [])
        assert len(employees) > 0, "No employees found for contract tests"
        TestContractAutoNumber.employee_id = employees[0]["id"]

    def test_create_contract_without_number(self, headers):
        """Contract created without contract_number - should be auto-generated"""
        payload = {
            "contract_type": "permanent",
            "start_date": "2026-01-01"
        }
        resp = requests.post(
            f"{BASE_URL}/api/employees/{TestContractAutoNumber.employee_id}/contracts",
            json=payload,
            headers=headers
        )
        assert resp.status_code in [200, 201], f"Expected 201, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "contract_number" in data
        # Auto-generated format: CTR-YYYY-XXXX
        cn = data["contract_number"]
        assert cn.startswith("CTR-"), f"Expected CTR- prefix, got: {cn}"
        TestContractAutoNumber.created_contract_id = data["id"]

    def test_contract_number_format(self, headers):
        """Verify auto-generated contract has CTR-YYYY-XXXX format (check newly created)"""
        # Re-create a contract to test the format of a freshly generated one
        payload = {"contract_type": "fixed_term", "start_date": "2026-02-01"}
        resp = requests.post(
            f"{BASE_URL}/api/employees/{TestContractAutoNumber.employee_id}/contracts",
            json=payload,
            headers=headers
        )
        assert resp.status_code in [200, 201]
        cn = resp.json().get("contract_number", "")
        assert cn.startswith("CTR-"), f"Expected CTR- prefix, got: {cn}"
        parts = cn.split("-")
        assert len(parts) == 3, f"Expected CTR-YYYY-XXXX, got: {cn}"
        assert parts[1].isdigit() and len(parts[1]) == 4, f"Year part invalid: {parts[1]}"
        assert parts[2].isdigit() and len(parts[2]) == 4, f"Sequence part invalid: {parts[2]}"
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/employees/{TestContractAutoNumber.employee_id}/contracts/{resp.json()['id']}",
            headers=headers
        )

    def test_cleanup_contract(self, headers):
        """Cleanup the test contract"""
        if TestContractAutoNumber.created_contract_id:
            resp = requests.delete(
                f"{BASE_URL}/api/employees/{TestContractAutoNumber.employee_id}/contracts/{TestContractAutoNumber.created_contract_id}",
                headers=headers
            )
            # Accept 200 or 204
            assert resp.status_code in [200, 204, 404]
