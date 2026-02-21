"""Tests for Connection CRUD endpoints (scoped under /api/projects/{pid}/connections)."""

import uuid

import pytest

pytestmark = pytest.mark.asyncio


SAMPLE_PG_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "nagara",
    "user": "nagara",
    "password": "nagara",
}


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------

class TestCreateConnection:

    async def test_create_connection(self, client, test_project):
        """POST .../connections creates a new connection."""
        pid = test_project["id"]
        resp = await client.post(
            f"/api/projects/{pid}/connections",
            json={
                "name": "PG Conn",
                "connector_type": "postgresql",
                "config": SAMPLE_PG_CONFIG,
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "PG Conn"
        assert data["connector_type"] == "postgresql"
        assert data["project_id"] == pid
        assert data["status"] == "untested"
        assert data["last_tested_at"] is None
        assert "created_at" in data
        assert "updated_at" in data

    async def test_create_connection_masks_password(self, client, test_project):
        """The response should mask the password field."""
        pid = test_project["id"]
        resp = await client.post(
            f"/api/projects/{pid}/connections",
            json={
                "name": "PG Masked",
                "connector_type": "postgresql",
                "config": SAMPLE_PG_CONFIG,
            },
        )
        assert resp.status_code == 201
        config = resp.json()["config"]
        assert config["password"] == "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
        # Non-sensitive fields should be unmasked
        assert config["host"] == "localhost"
        assert config["user"] == "nagara"

    async def test_create_connection_missing_fields_422(self, client, test_project):
        """POST .../connections without required fields returns 422."""
        pid = test_project["id"]
        resp = await client.post(
            f"/api/projects/{pid}/connections",
            json={"name": "Incomplete"},
        )
        assert resp.status_code == 422

    async def test_create_connection_kafka(self, client, test_project):
        """POST .../connections for a kafka connector."""
        pid = test_project["id"]
        resp = await client.post(
            f"/api/projects/{pid}/connections",
            json={
                "name": "Kafka Conn",
                "connector_type": "kafka",
                "config": {"bootstrap_servers": "localhost:9092", "topic": "events"},
            },
        )
        assert resp.status_code == 201
        assert resp.json()["connector_type"] == "kafka"


# ---------------------------------------------------------------------------
# LIST
# ---------------------------------------------------------------------------

class TestListConnections:

    async def test_list_connections_empty(self, client, test_project):
        """GET .../connections returns empty list when none exist."""
        pid = test_project["id"]
        resp = await client.get(f"/api/projects/{pid}/connections")
        assert resp.status_code == 200
        assert resp.json()["connections"] == []

    async def test_list_connections_contains_created(self, client, test_project, test_connection):
        """After creation, connection appears in list."""
        pid = test_project["id"]
        resp = await client.get(f"/api/projects/{pid}/connections")
        assert resp.status_code == 200
        ids = [c["id"] for c in resp.json()["connections"]]
        assert test_connection["id"] in ids

    async def test_list_connections_masks_sensitive(self, client, test_project, test_connection):
        """List endpoint should mask sensitive config fields."""
        pid = test_project["id"]
        resp = await client.get(f"/api/projects/{pid}/connections")
        for conn in resp.json()["connections"]:
            if "password" in conn["config"]:
                assert conn["config"]["password"] == "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"

    async def test_list_connections_scoped_to_project(self, client):
        """Connections in one project do not appear in another."""
        r1 = await client.post("/api/projects", json={"name": "P1"})
        r2 = await client.post("/api/projects", json={"name": "P2"})
        pid1, pid2 = r1.json()["id"], r2.json()["id"]

        await client.post(
            f"/api/projects/{pid1}/connections",
            json={
                "name": "Conn-P1",
                "connector_type": "postgresql",
                "config": {"host": "localhost"},
            },
        )

        resp = await client.get(f"/api/projects/{pid2}/connections")
        assert resp.json()["connections"] == []


# ---------------------------------------------------------------------------
# GET
# ---------------------------------------------------------------------------

class TestGetConnection:

    async def test_get_connection(self, client, test_project, test_connection):
        """GET .../connections/{cid} returns the correct connection."""
        pid = test_project["id"]
        cid = test_connection["id"]
        resp = await client.get(f"/api/projects/{pid}/connections/{cid}")
        assert resp.status_code == 200
        assert resp.json()["id"] == cid
        assert resp.json()["name"] == test_connection["name"]

    async def test_get_connection_masks_password(self, client, test_project, test_connection):
        """GET single connection also masks sensitive fields."""
        pid = test_project["id"]
        cid = test_connection["id"]
        resp = await client.get(f"/api/projects/{pid}/connections/{cid}")
        assert resp.json()["config"]["password"] == "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"

    async def test_get_connection_wrong_project(self, client, test_connection):
        """GET with wrong project_id returns 404."""
        fake_pid = str(uuid.uuid4())
        cid = test_connection["id"]
        resp = await client.get(f"/api/projects/{fake_pid}/connections/{cid}")
        assert resp.status_code == 404

    async def test_get_connection_not_found(self, client, test_project):
        """GET with nonexistent connection id returns 404."""
        pid = test_project["id"]
        fake_cid = str(uuid.uuid4())
        resp = await client.get(f"/api/projects/{pid}/connections/{fake_cid}")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# UPDATE
# ---------------------------------------------------------------------------

class TestUpdateConnection:

    async def test_update_connection_name(self, client, test_project, test_connection):
        """PUT .../connections/{cid} can rename."""
        pid = test_project["id"]
        cid = test_connection["id"]
        resp = await client.put(
            f"/api/projects/{pid}/connections/{cid}",
            json={"name": "Renamed Conn"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed Conn"

    async def test_update_connection_config(self, client, test_project, test_connection):
        """PUT .../connections/{cid} can update config."""
        pid = test_project["id"]
        cid = test_connection["id"]
        new_config = {"host": "db.example.com", "port": 5433, "database": "prod"}
        resp = await client.put(
            f"/api/projects/{pid}/connections/{cid}",
            json={"config": new_config},
        )
        assert resp.status_code == 200
        assert resp.json()["config"]["host"] == "db.example.com"

    async def test_update_connection_not_found(self, client, test_project):
        """PUT on nonexistent connection returns 404."""
        pid = test_project["id"]
        fake_cid = str(uuid.uuid4())
        resp = await client.put(
            f"/api/projects/{pid}/connections/{fake_cid}",
            json={"name": "Nope"},
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE
# ---------------------------------------------------------------------------

class TestDeleteConnection:

    async def test_delete_connection(self, client, test_project, test_connection):
        """DELETE .../connections/{cid} removes the connection."""
        pid = test_project["id"]
        cid = test_connection["id"]
        resp = await client.delete(f"/api/projects/{pid}/connections/{cid}")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        # Confirm deletion
        get_resp = await client.get(f"/api/projects/{pid}/connections/{cid}")
        assert get_resp.status_code == 404

    async def test_delete_connection_not_found(self, client, test_project):
        """DELETE nonexistent connection returns 404."""
        pid = test_project["id"]
        fake_cid = str(uuid.uuid4())
        resp = await client.delete(f"/api/projects/{pid}/connections/{fake_cid}")
        assert resp.status_code == 404

    async def test_delete_connection_idempotent(self, client, test_project, test_connection):
        """Deleting twice: second attempt returns 404."""
        pid = test_project["id"]
        cid = test_connection["id"]
        r1 = await client.delete(f"/api/projects/{pid}/connections/{cid}")
        assert r1.status_code == 200
        r2 = await client.delete(f"/api/projects/{pid}/connections/{cid}")
        assert r2.status_code == 404


# ---------------------------------------------------------------------------
# TEST CONNECTION (requires Spark connector, so test the 404 path)
# ---------------------------------------------------------------------------

class TestTestConnection:

    async def test_test_connection_not_found(self, client, test_project):
        """POST .../connections/{cid}/test for nonexistent connection returns 404."""
        pid = test_project["id"]
        fake_cid = str(uuid.uuid4())
        resp = await client.post(f"/api/projects/{pid}/connections/{fake_cid}/test")
        assert resp.status_code == 404

    async def test_test_connection_wrong_project(self, client, test_connection):
        """POST .../connections/{cid}/test with wrong project returns 404."""
        fake_pid = str(uuid.uuid4())
        cid = test_connection["id"]
        resp = await client.post(f"/api/projects/{fake_pid}/connections/{cid}/test")
        assert resp.status_code == 404
