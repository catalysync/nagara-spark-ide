"""Tests for Project CRUD endpoints (/api/projects)."""

import uuid

import pytest

pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------

class TestCreateProject:

    async def test_create_project_minimal(self, client):
        """POST /api/projects with only a name should succeed."""
        resp = await client.post("/api/projects", json={"name": "My Project"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "My Project"
        assert data["description"] == ""
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data
        assert data["workbook_count"] == 0
        assert data["dataset_count"] == 0
        assert data["connection_count"] == 0

    async def test_create_project_with_description(self, client):
        """POST /api/projects with name + description."""
        resp = await client.post(
            "/api/projects",
            json={"name": "Described Project", "description": "Has a description"},
        )
        assert resp.status_code == 201
        assert resp.json()["description"] == "Has a description"

    async def test_create_project_missing_name_returns_422(self, client):
        """POST /api/projects without name should be rejected."""
        resp = await client.post("/api/projects", json={"description": "no name"})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# LIST
# ---------------------------------------------------------------------------

class TestListProjects:

    async def test_list_projects_empty(self, client):
        """GET /api/projects returns an empty list when none exist."""
        resp = await client.get("/api/projects")
        assert resp.status_code == 200
        data = resp.json()
        assert "projects" in data
        assert isinstance(data["projects"], list)

    async def test_list_projects_contains_created(self, client, test_project):
        """After creating a project it should appear in the list."""
        resp = await client.get("/api/projects")
        assert resp.status_code == 200
        ids = [p["id"] for p in resp.json()["projects"]]
        assert test_project["id"] in ids


# ---------------------------------------------------------------------------
# GET
# ---------------------------------------------------------------------------

class TestGetProject:

    async def test_get_project(self, client, test_project):
        """GET /api/projects/{id} returns the correct project."""
        pid = test_project["id"]
        resp = await client.get(f"/api/projects/{pid}")
        assert resp.status_code == 200
        assert resp.json()["id"] == pid
        assert resp.json()["name"] == test_project["name"]

    async def test_get_project_not_found(self, client):
        """GET /api/projects/{id} with a random UUID returns 404."""
        fake_id = str(uuid.uuid4())
        resp = await client.get(f"/api/projects/{fake_id}")
        assert resp.status_code == 404

    async def test_get_project_invalid_uuid(self, client):
        """GET /api/projects/not-a-uuid should return 422."""
        resp = await client.get("/api/projects/not-a-uuid")
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# UPDATE
# ---------------------------------------------------------------------------

class TestUpdateProject:

    async def test_update_project_name(self, client, test_project):
        """PUT /api/projects/{id} can update the name."""
        pid = test_project["id"]
        resp = await client.put(
            f"/api/projects/{pid}",
            json={"name": "Renamed Project"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed Project"
        # description should remain unchanged
        assert resp.json()["description"] == test_project["description"]

    async def test_update_project_description(self, client, test_project):
        """PUT /api/projects/{id} can update the description only."""
        pid = test_project["id"]
        resp = await client.put(
            f"/api/projects/{pid}",
            json={"description": "Updated description"},
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == "Updated description"
        assert resp.json()["name"] == test_project["name"]

    async def test_update_project_both_fields(self, client, test_project):
        """PUT /api/projects/{id} with both fields."""
        pid = test_project["id"]
        resp = await client.put(
            f"/api/projects/{pid}",
            json={"name": "New Name", "description": "New Desc"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"
        assert resp.json()["description"] == "New Desc"

    async def test_update_project_not_found(self, client):
        """PUT /api/projects/{id} on nonexistent project returns 404."""
        fake_id = str(uuid.uuid4())
        resp = await client.put(
            f"/api/projects/{fake_id}",
            json={"name": "Does Not Exist"},
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE
# ---------------------------------------------------------------------------

class TestDeleteProject:

    async def test_delete_project(self, client, test_project):
        """DELETE /api/projects/{id} removes the project."""
        pid = test_project["id"]
        resp = await client.delete(f"/api/projects/{pid}")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        # Confirm it is gone
        get_resp = await client.get(f"/api/projects/{pid}")
        assert get_resp.status_code == 404

    async def test_delete_project_not_found(self, client):
        """DELETE /api/projects/{id} on nonexistent project returns 404."""
        fake_id = str(uuid.uuid4())
        resp = await client.delete(f"/api/projects/{fake_id}")
        assert resp.status_code == 404

    async def test_delete_project_idempotent(self, client, test_project):
        """Deleting the same project twice: second attempt returns 404."""
        pid = test_project["id"]
        resp1 = await client.delete(f"/api/projects/{pid}")
        assert resp1.status_code == 200
        resp2 = await client.delete(f"/api/projects/{pid}")
        assert resp2.status_code == 404


# ---------------------------------------------------------------------------
# Counts integration
# ---------------------------------------------------------------------------

class TestProjectCounts:

    async def test_workbook_count_increments(self, client, test_project):
        """Creating a workbook should bump workbook_count on the project."""
        pid = test_project["id"]

        # Before
        resp = await client.get(f"/api/projects/{pid}")
        assert resp.json()["workbook_count"] == 0

        # Create a workbook
        await client.post(
            f"/api/projects/{pid}/workbooks",
            json={"name": "WB1"},
        )

        # After
        resp = await client.get(f"/api/projects/{pid}")
        assert resp.json()["workbook_count"] == 1

    async def test_dataset_count_increments(self, client, test_project):
        """Creating a dataset should bump dataset_count."""
        pid = test_project["id"]

        await client.post(
            f"/api/projects/{pid}/datasets",
            json={"name": "DS1", "source_type": "file"},
        )

        resp = await client.get(f"/api/projects/{pid}")
        assert resp.json()["dataset_count"] == 1

    async def test_connection_count_increments(self, client, test_project):
        """Creating a connection should bump connection_count."""
        pid = test_project["id"]

        await client.post(
            f"/api/projects/{pid}/connections",
            json={
                "name": "Conn1",
                "connector_type": "postgresql",
                "config": {"host": "localhost"},
            },
        )

        resp = await client.get(f"/api/projects/{pid}")
        assert resp.json()["connection_count"] == 1
