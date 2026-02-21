"""Tests for Workbook CRUD endpoints (scoped under /api/projects/{pid}/workbooks)."""

import uuid

import pytest

pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------

class TestCreateWorkbook:

    async def test_create_workbook_minimal(self, client, test_project):
        """POST .../workbooks with only a name."""
        pid = test_project["id"]
        resp = await client.post(
            f"/api/projects/{pid}/workbooks",
            json={"name": "My Workbook"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "My Workbook"
        assert data["description"] == ""
        assert data["project_id"] == pid
        assert isinstance(data["nodes"], list)
        assert isinstance(data["edges"], list)
        assert len(data["nodes"]) == 0
        assert len(data["edges"]) == 0
        assert "global_code" in data
        assert "created_at" in data

    async def test_create_workbook_with_description(self, client, test_project):
        """POST .../workbooks with name + description."""
        pid = test_project["id"]
        resp = await client.post(
            f"/api/projects/{pid}/workbooks",
            json={"name": "WB", "description": "A workbook"},
        )
        assert resp.status_code == 201
        assert resp.json()["description"] == "A workbook"

    async def test_create_workbook_missing_name_422(self, client, test_project):
        """POST .../workbooks without a name returns 422."""
        pid = test_project["id"]
        resp = await client.post(f"/api/projects/{pid}/workbooks", json={})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# LIST
# ---------------------------------------------------------------------------

class TestListWorkbooks:

    async def test_list_workbooks_empty(self, client, test_project):
        """GET .../workbooks returns empty list when none exist."""
        pid = test_project["id"]
        resp = await client.get(f"/api/projects/{pid}/workbooks")
        assert resp.status_code == 200
        assert resp.json()["workbooks"] == []

    async def test_list_workbooks_contains_created(self, client, test_project, test_workbook):
        """After creating a workbook it appears in the list."""
        pid = test_project["id"]
        resp = await client.get(f"/api/projects/{pid}/workbooks")
        assert resp.status_code == 200
        ids = [w["id"] for w in resp.json()["workbooks"]]
        assert test_workbook["id"] in ids

    async def test_list_workbooks_scoped_to_project(self, client):
        """Workbooks in one project should not appear in another's list."""
        # Create two projects
        r1 = await client.post("/api/projects", json={"name": "P1"})
        r2 = await client.post("/api/projects", json={"name": "P2"})
        pid1, pid2 = r1.json()["id"], r2.json()["id"]

        # Create workbook in P1
        await client.post(f"/api/projects/{pid1}/workbooks", json={"name": "WB-P1"})

        # P2 should still have no workbooks
        resp = await client.get(f"/api/projects/{pid2}/workbooks")
        assert resp.json()["workbooks"] == []


# ---------------------------------------------------------------------------
# GET
# ---------------------------------------------------------------------------

class TestGetWorkbook:

    async def test_get_workbook(self, client, test_project, test_workbook):
        """GET .../workbooks/{wid} returns the correct workbook."""
        pid = test_project["id"]
        wid = test_workbook["id"]
        resp = await client.get(f"/api/projects/{pid}/workbooks/{wid}")
        assert resp.status_code == 200
        assert resp.json()["id"] == wid
        assert resp.json()["project_id"] == pid

    async def test_get_workbook_wrong_project(self, client, test_workbook):
        """GET with wrong project_id should return 404."""
        fake_pid = str(uuid.uuid4())
        wid = test_workbook["id"]
        resp = await client.get(f"/api/projects/{fake_pid}/workbooks/{wid}")
        assert resp.status_code == 404

    async def test_get_workbook_not_found(self, client, test_project):
        """GET with nonexistent workbook id returns 404."""
        pid = test_project["id"]
        fake_wid = str(uuid.uuid4())
        resp = await client.get(f"/api/projects/{pid}/workbooks/{fake_wid}")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# UPDATE
# ---------------------------------------------------------------------------

class TestUpdateWorkbook:

    async def test_update_workbook_name(self, client, test_project, test_workbook):
        """PUT .../workbooks/{wid} can rename the workbook."""
        pid = test_project["id"]
        wid = test_workbook["id"]
        resp = await client.put(
            f"/api/projects/{pid}/workbooks/{wid}",
            json={"name": "Renamed WB"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed WB"

    async def test_update_workbook_nodes_and_edges(self, client, test_project, test_workbook):
        """PUT .../workbooks/{wid} can set nodes and edges."""
        pid = test_project["id"]
        wid = test_workbook["id"]
        nodes = [
            {
                "id": "n1",
                "type": "transform",
                "name": "Node 1",
                "language": "python",
                "code": "df = spark.range(10)",
                "save_as_dataset": False,
                "position": {"x": 100, "y": 200},
            }
        ]
        edges = [
            {"id": "e1", "source": "n0", "target": "n1"},
        ]
        resp = await client.put(
            f"/api/projects/{pid}/workbooks/{wid}",
            json={"nodes": nodes, "edges": edges},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["nodes"]) == 1
        assert data["nodes"][0]["id"] == "n1"
        assert len(data["edges"]) == 1
        assert data["edges"][0]["source"] == "n0"

    async def test_update_workbook_global_code(self, client, test_project, test_workbook):
        """PUT .../workbooks/{wid} can update global_code."""
        pid = test_project["id"]
        wid = test_workbook["id"]
        resp = await client.put(
            f"/api/projects/{pid}/workbooks/{wid}",
            json={"global_code": "import os"},
        )
        assert resp.status_code == 200
        assert resp.json()["global_code"] == "import os"

    async def test_update_workbook_not_found(self, client, test_project):
        """PUT on nonexistent workbook returns 404."""
        pid = test_project["id"]
        fake_wid = str(uuid.uuid4())
        resp = await client.put(
            f"/api/projects/{pid}/workbooks/{fake_wid}",
            json={"name": "Nope"},
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE
# ---------------------------------------------------------------------------

class TestDeleteWorkbook:

    async def test_delete_workbook(self, client, test_project, test_workbook):
        """DELETE .../workbooks/{wid} removes the workbook."""
        pid = test_project["id"]
        wid = test_workbook["id"]
        resp = await client.delete(f"/api/projects/{pid}/workbooks/{wid}")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        # Confirm it is gone
        get_resp = await client.get(f"/api/projects/{pid}/workbooks/{wid}")
        assert get_resp.status_code == 404

    async def test_delete_workbook_not_found(self, client, test_project):
        """DELETE nonexistent workbook returns 404."""
        pid = test_project["id"]
        fake_wid = str(uuid.uuid4())
        resp = await client.delete(f"/api/projects/{pid}/workbooks/{fake_wid}")
        assert resp.status_code == 404

    async def test_delete_workbook_idempotent(self, client, test_project, test_workbook):
        """Deleting twice: second attempt returns 404."""
        pid = test_project["id"]
        wid = test_workbook["id"]
        r1 = await client.delete(f"/api/projects/{pid}/workbooks/{wid}")
        assert r1.status_code == 200
        r2 = await client.delete(f"/api/projects/{pid}/workbooks/{wid}")
        assert r2.status_code == 404
