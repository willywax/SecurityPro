"""
Backend tests for Module 6: Invoices API
Tests cover: CRUD, status transitions, delete restrictions, filtering, organization bank_details
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

EMAIL = "admin@securityops.com"
PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def auth_token():
    """Obtain auth token once for the whole module"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if resp.status_code != 200:
        pytest.skip(f"Auth failed: {resp.status_code} {resp.text}")
    token = resp.json().get("access_token")
    if not token:
        pytest.skip("No access_token in response")
    return token


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def client_and_site(auth_headers):
    """Fetch a real client_id and site_id from the DB to use in tests"""
    resp = requests.get(f"{BASE_URL}/api/clients?page_size=10", headers=auth_headers)
    assert resp.status_code == 200, f"Clients list failed: {resp.text}"
    clients = resp.json().get("clients", [])
    assert len(clients) > 0, "No clients found for testing"
    client = clients[0]
    client_id = client["id"]
    client_name = client["client_name"]

    # Get a site for this client
    resp2 = requests.get(f"{BASE_URL}/api/sites?client_id={client_id}&page_size=10", headers=auth_headers)
    assert resp2.status_code == 200
    sites = resp2.json().get("sites", [])
    assert len(sites) > 0, f"No sites for client {client_id}"
    site = sites[0]

    return {
        "client_id": client_id,
        "client_name": client_name,
        "site_id": site["id"],
        "site_name": site["site_name"],
    }


# ============ TEST: Organization bank details ============

class TestOrganizationBankDetails:
    """Verify /api/organization returns bank_details"""

    def test_get_organization(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/organization", headers=auth_headers)
        assert resp.status_code == 200, f"Org endpoint failed: {resp.text}"
        data = resp.json()
        assert "bank_details" in data, "No bank_details in org response"

    def test_bank_details_has_crdb(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/organization", headers=auth_headers)
        assert resp.status_code == 200
        bd = resp.json().get("bank_details", {})
        assert bd.get("bank_name"), "bank_name is empty"
        # Should contain CRDB Bank Tanzania as per spec
        assert "CRDB" in bd.get("bank_name", ""), f"Expected CRDB Bank Tanzania, got: {bd.get('bank_name')}"

    def test_bank_details_has_account_fields(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/organization", headers=auth_headers)
        bd = resp.json().get("bank_details", {})
        assert bd.get("account_name"), "account_name missing"
        assert bd.get("account_number"), "account_number missing"


# ============ TEST: List invoices ============

class TestListInvoices:
    """GET /api/invoices"""

    def test_list_invoices_returns_200(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        assert resp.status_code == 200, f"List invoices failed: {resp.text}"

    def test_list_invoices_structure(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        data = resp.json()
        assert "invoices" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data

    def test_inv0001_exists(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        invoices = resp.json()["invoices"]
        ids = [inv["invoice_id"] for inv in invoices]
        assert "INV0001" in ids, f"INV0001 not found in list. Found: {ids}"

    def test_list_unauthenticated_returns_401(self):
        resp = requests.get(f"{BASE_URL}/api/invoices")
        assert resp.status_code in (401, 403), f"Expected 401/403, got {resp.status_code}"


# ============ TEST: Create invoice ============

class TestCreateInvoice:
    """POST /api/invoices"""

    created_invoice_id = None  # store for later tests

    def test_create_invoice_success(self, auth_headers, client_and_site):
        payload = {
            "client_id": client_and_site["client_id"],
            "issue_date": "2026-03-01",
            "due_date": "2026-03-31",
            "status": "draft",
            "notes": "TEST_invoice_notes",
            "sites": [
                {
                    "site_id": client_and_site["site_id"],
                    "site_name": client_and_site["site_name"],
                    "items": [
                        {"item_type": "guard", "description": "Security Guards", "quantity": 10, "rate": 150000},
                        {"item_type": "asset", "description": "Radios", "quantity": 5, "rate": 30000},
                    ]
                }
            ]
        }
        resp = requests.post(f"{BASE_URL}/api/invoices", json=payload, headers=auth_headers)
        assert resp.status_code == 201, f"Create invoice failed: {resp.text}"
        data = resp.json()
        TestCreateInvoice.created_invoice_id = data["id"]
        return data

    def test_create_invoice_response_fields(self, auth_headers, client_and_site):
        payload = {
            "client_id": client_and_site["client_id"],
            "issue_date": "2026-03-01",
            "due_date": "2026-03-31",
            "sites": [
                {
                    "site_id": client_and_site["site_id"],
                    "site_name": client_and_site["site_name"],
                    "items": [
                        {"item_type": "guard", "description": "Security Guards", "quantity": 10, "rate": 150000},
                        {"item_type": "asset", "description": "Radios", "quantity": 5, "rate": 30000},
                    ]
                }
            ]
        }
        resp = requests.post(f"{BASE_URL}/api/invoices", json=payload, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert "invoice_id" in data
        assert data["invoice_id"].startswith("INV")
        assert "id" in data
        assert data["client_name"] == client_and_site["client_name"]
        assert data["status"] == "draft"
        assert data["issue_date"] == "2026-03-01"
        assert data["due_date"] == "2026-03-31"
        assert "sites" in data
        assert len(data["sites"]) == 1

    def test_create_invoice_grand_total(self, auth_headers, client_and_site):
        """Verify: 10*150000 + 5*30000 = 1,650,000"""
        payload = {
            "client_id": client_and_site["client_id"],
            "issue_date": "2026-03-01",
            "due_date": "2026-03-31",
            "sites": [
                {
                    "site_id": client_and_site["site_id"],
                    "site_name": client_and_site["site_name"],
                    "items": [
                        {"item_type": "guard", "description": "Security Guards", "quantity": 10, "rate": 150000},
                        {"item_type": "asset", "description": "Radios", "quantity": 5, "rate": 30000},
                    ]
                }
            ]
        }
        resp = requests.post(f"{BASE_URL}/api/invoices", json=payload, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        expected_total = 10 * 150000 + 5 * 30000  # 1,650,000
        assert data["grand_total"] == expected_total, f"Expected {expected_total}, got {data['grand_total']}"

    def test_create_invoice_invalid_client(self, auth_headers):
        payload = {
            "client_id": "non-existent-client-id",
            "issue_date": "2026-03-01",
            "due_date": "2026-03-31",
            "sites": []
        }
        resp = requests.post(f"{BASE_URL}/api/invoices", json=payload, headers=auth_headers)
        assert resp.status_code == 404, f"Expected 404 for invalid client, got {resp.status_code}"

    def test_create_invoice_invalid_date_format(self, auth_headers, client_and_site):
        payload = {
            "client_id": client_and_site["client_id"],
            "issue_date": "01-03-2026",  # wrong format
            "due_date": "2026-03-31",
            "sites": []
        }
        resp = requests.post(f"{BASE_URL}/api/invoices", json=payload, headers=auth_headers)
        assert resp.status_code == 422, f"Expected 422 for invalid date, got {resp.status_code}"


# ============ TEST: Get invoice by ID ============

class TestGetInvoice:
    """GET /api/invoices/:id"""

    def test_get_invoice_by_id(self, auth_headers, client_and_site):
        # First create one
        payload = {
            "client_id": client_and_site["client_id"],
            "issue_date": "2026-03-01",
            "due_date": "2026-03-31",
            "sites": [
                {
                    "site_id": client_and_site["site_id"],
                    "site_name": client_and_site["site_name"],
                    "items": [
                        {"item_type": "guard", "description": "Security Guards", "quantity": 5, "rate": 200000},
                    ]
                }
            ]
        }
        create_resp = requests.post(f"{BASE_URL}/api/invoices", json=payload, headers=auth_headers)
        assert create_resp.status_code == 201
        inv_id = create_resp.json()["id"]

        get_resp = requests.get(f"{BASE_URL}/api/invoices/{inv_id}", headers=auth_headers)
        assert get_resp.status_code == 200, f"GET failed: {get_resp.text}"
        data = get_resp.json()
        assert data["id"] == inv_id
        assert data["sites"] is not None
        assert len(data["sites"]) == 1
        assert data["sites"][0]["items"] is not None

    def test_get_invoice_not_found(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/invoices/non-existent-uuid", headers=auth_headers)
        assert resp.status_code == 404


# ============ TEST: Update invoice ============

class TestUpdateInvoice:
    """PUT /api/invoices/:id"""

    def test_update_invoice_items(self, auth_headers, client_and_site):
        # Create invoice
        payload = {
            "client_id": client_and_site["client_id"],
            "issue_date": "2026-03-01",
            "due_date": "2026-03-31",
            "sites": [
                {
                    "site_id": client_and_site["site_id"],
                    "site_name": client_and_site["site_name"],
                    "items": [
                        {"item_type": "guard", "description": "Security Guards", "quantity": 5, "rate": 200000},
                    ]
                }
            ]
        }
        create_resp = requests.post(f"{BASE_URL}/api/invoices", json=payload, headers=auth_headers)
        assert create_resp.status_code == 201
        inv = create_resp.json()
        inv_id = inv["id"]

        # Update: change rate to 250000 for guards
        update_payload = {
            "sites": [
                {
                    "site_id": client_and_site["site_id"],
                    "site_name": client_and_site["site_name"],
                    "items": [
                        {"item_type": "guard", "description": "Security Guards", "quantity": 5, "rate": 250000},
                    ]
                }
            ]
        }
        update_resp = requests.put(f"{BASE_URL}/api/invoices/{inv_id}", json=update_payload, headers=auth_headers)
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        updated = update_resp.json()
        expected = 5 * 250000  # 1,250,000
        assert updated["grand_total"] == expected, f"Expected {expected}, got {updated['grand_total']}"

    def test_update_invoice_status_via_status_endpoint(self, auth_headers, client_and_site):
        """PUT /api/invoices/:id/status"""
        # Create draft
        payload = {
            "client_id": client_and_site["client_id"],
            "issue_date": "2026-03-01",
            "due_date": "2026-03-31",
            "sites": [
                {
                    "site_id": client_and_site["site_id"],
                    "site_name": client_and_site["site_name"],
                    "items": [
                        {"item_type": "guard", "description": "Security Guards", "quantity": 3, "rate": 200000},
                    ]
                }
            ]
        }
        create_resp = requests.post(f"{BASE_URL}/api/invoices", json=payload, headers=auth_headers)
        assert create_resp.status_code == 201
        inv_id = create_resp.json()["id"]

        # Mark sent
        sent_resp = requests.put(f"{BASE_URL}/api/invoices/{inv_id}/status", json={"status": "sent"}, headers=auth_headers)
        assert sent_resp.status_code == 200
        assert sent_resp.json()["status"] == "sent"

        # Mark paid
        paid_resp = requests.put(f"{BASE_URL}/api/invoices/{inv_id}/status", json={"status": "paid"}, headers=auth_headers)
        assert paid_resp.status_code == 200
        assert paid_resp.json()["status"] == "paid"


# ============ TEST: Delete invoice ============

class TestDeleteInvoice:
    """DELETE /api/invoices/:id"""

    def test_delete_draft_invoice(self, auth_headers, client_and_site):
        # Create draft
        payload = {
            "client_id": client_and_site["client_id"],
            "issue_date": "2026-03-01",
            "due_date": "2026-03-31",
            "sites": [
                {
                    "site_id": client_and_site["site_id"],
                    "site_name": client_and_site["site_name"],
                    "items": [
                        {"item_type": "guard", "description": "Security Guards", "quantity": 2, "rate": 100000},
                    ]
                }
            ]
        }
        create_resp = requests.post(f"{BASE_URL}/api/invoices", json=payload, headers=auth_headers)
        assert create_resp.status_code == 201
        inv_id = create_resp.json()["id"]

        # Delete
        del_resp = requests.delete(f"{BASE_URL}/api/invoices/{inv_id}", headers=auth_headers)
        assert del_resp.status_code == 200, f"Delete failed: {del_resp.text}"
        assert "deleted" in del_resp.json().get("message", "").lower()

        # Verify gone
        get_resp = requests.get(f"{BASE_URL}/api/invoices/{inv_id}", headers=auth_headers)
        assert get_resp.status_code == 404

    def test_delete_sent_invoice_returns_400(self, auth_headers, client_and_site):
        """Cannot delete non-draft invoices"""
        payload = {
            "client_id": client_and_site["client_id"],
            "issue_date": "2026-03-01",
            "due_date": "2026-03-31",
            "sites": [
                {
                    "site_id": client_and_site["site_id"],
                    "site_name": client_and_site["site_name"],
                    "items": [
                        {"item_type": "guard", "description": "Security Guards", "quantity": 2, "rate": 100000},
                    ]
                }
            ]
        }
        create_resp = requests.post(f"{BASE_URL}/api/invoices", json=payload, headers=auth_headers)
        assert create_resp.status_code == 201
        inv_id = create_resp.json()["id"]

        # Mark sent
        sent_resp = requests.put(f"{BASE_URL}/api/invoices/{inv_id}/status", json={"status": "sent"}, headers=auth_headers)
        assert sent_resp.status_code == 200

        # Try to delete - should fail
        del_resp = requests.delete(f"{BASE_URL}/api/invoices/{inv_id}", headers=auth_headers)
        assert del_resp.status_code == 400, f"Expected 400 for deleting sent invoice, got {del_resp.status_code}"
        assert "draft" in del_resp.json().get("detail", "").lower()

    def test_delete_paid_invoice_returns_400(self, auth_headers, client_and_site):
        """Cannot delete paid invoices"""
        payload = {
            "client_id": client_and_site["client_id"],
            "issue_date": "2026-03-01",
            "due_date": "2026-03-31",
            "sites": [
                {
                    "site_id": client_and_site["site_id"],
                    "site_name": client_and_site["site_name"],
                    "items": [
                        {"item_type": "guard", "description": "Security Guards", "quantity": 2, "rate": 100000},
                    ]
                }
            ]
        }
        create_resp = requests.post(f"{BASE_URL}/api/invoices", json=payload, headers=auth_headers)
        assert create_resp.status_code == 201
        inv_id = create_resp.json()["id"]

        # Mark paid directly via status
        requests.put(f"{BASE_URL}/api/invoices/{inv_id}/status", json={"status": "sent"}, headers=auth_headers)
        requests.put(f"{BASE_URL}/api/invoices/{inv_id}/status", json={"status": "paid"}, headers=auth_headers)

        del_resp = requests.delete(f"{BASE_URL}/api/invoices/{inv_id}", headers=auth_headers)
        assert del_resp.status_code == 400, f"Expected 400 for deleting paid invoice, got {del_resp.status_code}"


# ============ TEST: Filters ============

class TestInvoiceFilters:
    """Filter by client, status, month"""

    def test_filter_by_status_draft(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/invoices?status=draft", headers=auth_headers)
        assert resp.status_code == 200
        invoices = resp.json()["invoices"]
        for inv in invoices:
            assert inv["status"] == "draft", f"Non-draft invoice in draft filter: {inv}"

    def test_filter_by_status_paid(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/invoices?status=paid", headers=auth_headers)
        assert resp.status_code == 200
        invoices = resp.json()["invoices"]
        for inv in invoices:
            assert inv["status"] == "paid"

    def test_filter_by_client_id(self, auth_headers, client_and_site):
        client_id = client_and_site["client_id"]
        resp = requests.get(f"{BASE_URL}/api/invoices?client_id={client_id}", headers=auth_headers)
        assert resp.status_code == 200
        invoices = resp.json()["invoices"]
        for inv in invoices:
            assert inv["client_id"] == client_id, f"Invoice with wrong client: {inv}"

    def test_filter_by_month(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/invoices?month=2026-03", headers=auth_headers)
        assert resp.status_code == 200
        invoices = resp.json()["invoices"]
        for inv in invoices:
            assert inv["issue_date"].startswith("2026-03"), f"Invoice with wrong month: {inv['issue_date']}"
