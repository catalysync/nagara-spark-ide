"""Shared test fixtures for Nagara Spark IDE backend tests.

Uses the real PostgreSQL database. Each request gets its own session
(matching production behavior). Tables are truncated after each test.

We use NullPool to avoid asyncpg connection-pool issues with
pytest-asyncio's per-function event loops.
"""

import sys
import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

# Ensure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from database import Base, get_db
from config import DATABASE_URL


# ---------------------------------------------------------------------------
# Create tables once at module import time using a throw-away engine
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def _create_tables():
    """Ensure all tables exist before the test suite runs."""
    engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()


# ---------------------------------------------------------------------------
# FastAPI test client
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture()
async def client(_create_tables):
    """httpx AsyncClient wired to the FastAPI app.

    A brand-new engine (NullPool) is created per test so that every
    asyncpg connection belongs to the current event loop.  All data is
    truncated after the test completes.
    """
    # Per-test engine to avoid cross-loop connection issues
    engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    from fastapi import FastAPI
    from routers import health, projects, workbooks, datasets, connections

    test_app = FastAPI()
    test_app.include_router(health.router)
    test_app.include_router(projects.router)
    test_app.include_router(workbooks.router)
    test_app.include_router(datasets.router)
    test_app.include_router(connections.router)

    async def _test_get_db():
        async with session_factory() as session:
            try:
                yield session
            finally:
                await session.close()

    test_app.dependency_overrides[get_db] = _test_get_db

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    # Cleanup: delete all data (DELETE avoids AccessExclusiveLock deadlocks
    # that TRUNCATE can cause when other connections hold locks).
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM connections"))
        await conn.execute(text("DELETE FROM datasets"))
        await conn.execute(text("DELETE FROM workbooks"))
        await conn.execute(text("DELETE FROM projects"))
    await engine.dispose()


# ---------------------------------------------------------------------------
# Convenience fixtures: pre-created entities
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture()
async def test_project(client: AsyncClient) -> dict:
    """Create a project via the API and return the response body."""
    resp = await client.post(
        "/api/projects",
        json={"name": "Test Project", "description": "Created by conftest fixture"},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture()
async def test_workbook(client: AsyncClient, test_project: dict) -> dict:
    """Create a workbook inside test_project and return the response body."""
    pid = test_project["id"]
    resp = await client.post(
        f"/api/projects/{pid}/workbooks",
        json={"name": "Test Workbook", "description": "Created by conftest fixture"},
    )
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture()
async def test_dataset(client: AsyncClient, test_project: dict) -> dict:
    """Create a dataset inside test_project and return the response body."""
    pid = test_project["id"]
    resp = await client.post(
        f"/api/projects/{pid}/datasets",
        json={
            "name": "Test Dataset",
            "description": "Created by conftest fixture",
            "source_type": "file",
            "source_config": {"path": "/tmp/test.parquet"},
        },
    )
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture()
async def test_connection(client: AsyncClient, test_project: dict) -> dict:
    """Create a connection inside test_project and return the response body."""
    pid = test_project["id"]
    resp = await client.post(
        f"/api/projects/{pid}/connections",
        json={
            "name": "Test PG Connection",
            "connector_type": "postgresql",
            "config": {
                "host": "localhost",
                "port": 5432,
                "database": "nagara",
                "user": "nagara",
                "password": "nagara",
            },
        },
    )
    assert resp.status_code == 201
    return resp.json()
