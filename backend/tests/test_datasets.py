"""Tests for Dataset CRUD endpoints (scoped under /api/projects/{pid}/datasets)."""

import uuid

import pytest

pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------

class TestCreateDataset:

    async def test_create_dataset_minimal(self, client, test_project):
        """POST .../datasets with required fields."""
        pid = test_project["id"]
        resp = await client.post(
            f"/api/projects/{pid}/datasets",
            json={"name": "DS1", "source_type": "file"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "DS1"
        assert data["source_type"] == "file"
        assert data["project_id"] == pid
        assert data["description"] == ""
        assert data["source_config"] == {}
        assert data["schema_info"] == []
        assert data["row_count"] is None
        assert data["file_path"] is None
        assert data["workbook_id"] is None
        assert data["node_id"] is None
        assert data["connection_id"] is None
        assert "created_at" in data
        assert "updated_at" in data

    async def test_create_dataset_full(self, client, test_project):
        """POST .../datasets with all optional fields."""
        pid = test_project["id"]
        resp = await client.post(
            f"/api/projects/{pid}/datasets",
            json={
                "name": "Full DS",
                "description": "A full dataset",
                "source_type": "connection",
                "source_config": {"table": "users"},
                "file_path": "/data/users.parquet",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["description"] == "A full dataset"
        assert data["source_config"] == {"table": "users"}
        assert data["file_path"] == "/data/users.parquet"

    async def test_create_dataset_missing_source_type_422(self, client, test_project):
        """POST .../datasets without source_type returns 422."""
        pid = test_project["id"]
        resp = await client.post(
            f"/api/projects/{pid}/datasets",
            json={"name": "Bad DS"},
        )
        assert resp.status_code == 422

    async def test_create_dataset_missing_name_422(self, client, test_project):
        """POST .../datasets without name returns 422."""
        pid = test_project["id"]
        resp = await client.post(
            f"/api/projects/{pid}/datasets",
            json={"source_type": "file"},
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# LIST
# ---------------------------------------------------------------------------

class TestListDatasets:

    async def test_list_datasets_empty(self, client, test_project):
        """GET .../datasets returns empty list when none exist."""
        pid = test_project["id"]
        resp = await client.get(f"/api/projects/{pid}/datasets")
        assert resp.status_code == 200
        assert resp.json()["datasets"] == []

    async def test_list_datasets_contains_created(self, client, test_project, test_dataset):
        """After creation, dataset appears in list."""
        pid = test_project["id"]
        resp = await client.get(f"/api/projects/{pid}/datasets")
        assert resp.status_code == 200
        ids = [d["id"] for d in resp.json()["datasets"]]
        assert test_dataset["id"] in ids

    async def test_list_datasets_scoped_to_project(self, client):
        """Datasets in one project do not appear in another."""
        r1 = await client.post("/api/projects", json={"name": "P1"})
        r2 = await client.post("/api/projects", json={"name": "P2"})
        pid1, pid2 = r1.json()["id"], r2.json()["id"]

        await client.post(
            f"/api/projects/{pid1}/datasets",
            json={"name": "DS-P1", "source_type": "file"},
        )

        resp = await client.get(f"/api/projects/{pid2}/datasets")
        assert resp.json()["datasets"] == []


# ---------------------------------------------------------------------------
# GET
# ---------------------------------------------------------------------------

class TestGetDataset:

    async def test_get_dataset(self, client, test_project, test_dataset):
        """GET .../datasets/{did} returns the correct dataset."""
        pid = test_project["id"]
        did = test_dataset["id"]
        resp = await client.get(f"/api/projects/{pid}/datasets/{did}")
        assert resp.status_code == 200
        assert resp.json()["id"] == did
        assert resp.json()["name"] == test_dataset["name"]

    async def test_get_dataset_wrong_project(self, client, test_dataset):
        """GET with wrong project_id returns 404."""
        fake_pid = str(uuid.uuid4())
        did = test_dataset["id"]
        resp = await client.get(f"/api/projects/{fake_pid}/datasets/{did}")
        assert resp.status_code == 404

    async def test_get_dataset_not_found(self, client, test_project):
        """GET with nonexistent dataset id returns 404."""
        pid = test_project["id"]
        fake_did = str(uuid.uuid4())
        resp = await client.get(f"/api/projects/{pid}/datasets/{fake_did}")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE
# ---------------------------------------------------------------------------

class TestDeleteDataset:

    async def test_delete_dataset(self, client, test_project, test_dataset):
        """DELETE .../datasets/{did} removes the dataset."""
        pid = test_project["id"]
        did = test_dataset["id"]
        resp = await client.delete(f"/api/projects/{pid}/datasets/{did}")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        # Confirm deletion
        get_resp = await client.get(f"/api/projects/{pid}/datasets/{did}")
        assert get_resp.status_code == 404

    async def test_delete_dataset_not_found(self, client, test_project):
        """DELETE nonexistent dataset returns 404."""
        pid = test_project["id"]
        fake_did = str(uuid.uuid4())
        resp = await client.delete(f"/api/projects/{pid}/datasets/{fake_did}")
        assert resp.status_code == 404

    async def test_delete_dataset_idempotent(self, client, test_project, test_dataset):
        """Deleting twice: second attempt returns 404."""
        pid = test_project["id"]
        did = test_dataset["id"]
        r1 = await client.delete(f"/api/projects/{pid}/datasets/{did}")
        assert r1.status_code == 200
        r2 = await client.delete(f"/api/projects/{pid}/datasets/{did}")
        assert r2.status_code == 404


# ---------------------------------------------------------------------------
# PREVIEW (requires Spark, so we test the 404 path only)
# ---------------------------------------------------------------------------

class TestDatasetPreview:

    async def test_preview_dataset_not_found(self, client, test_project):
        """GET .../datasets/{did}/preview for nonexistent dataset returns 404."""
        pid = test_project["id"]
        fake_did = str(uuid.uuid4())
        resp = await client.get(f"/api/projects/{pid}/datasets/{fake_did}/preview")
        assert resp.status_code == 404

    async def test_preview_dataset_no_file(self, client, test_project, test_dataset):
        """GET .../datasets/{did}/preview when no file on disk returns 404."""
        pid = test_project["id"]
        did = test_dataset["id"]
        resp = await client.get(f"/api/projects/{pid}/datasets/{did}/preview")
        # file_path is /tmp/test.parquet which doesn't actually exist
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# SCHEMA
# ---------------------------------------------------------------------------

class TestDatasetSchema:

    async def test_get_dataset_schema(self, client, test_project, test_dataset):
        """GET .../datasets/{did}/schema returns empty schema for new dataset."""
        pid = test_project["id"]
        did = test_dataset["id"]
        resp = await client.get(f"/api/projects/{pid}/datasets/{did}/schema")
        assert resp.status_code == 200
        assert resp.json()["schema"] == []

    async def test_get_dataset_schema_not_found(self, client, test_project):
        """GET .../datasets/{did}/schema for nonexistent dataset returns 404."""
        pid = test_project["id"]
        fake_did = str(uuid.uuid4())
        resp = await client.get(f"/api/projects/{pid}/datasets/{fake_did}/schema")
        assert resp.status_code == 404
