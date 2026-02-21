"""Tests for the /api/health endpoint."""

import pytest
from unittest.mock import patch


pytestmark = pytest.mark.asyncio


async def test_health_returns_ok(client):
    """GET /api/health should always return status ok."""
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    # Spark won't be initialised in tests, so spark should be False
    assert "spark" in data


async def test_health_spark_false_when_no_executor(client):
    """Without a running SparkSession the health endpoint reports spark=False."""
    with patch(
        "routers.health.get_wb_executor",
        side_effect=RuntimeError("no spark"),
    ):
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["spark"] is False
