"""Connection business logic."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.connection import Connection


async def list_connections(db: AsyncSession, project_id: uuid.UUID) -> list[Connection]:
    result = await db.execute(
        select(Connection).where(Connection.project_id == project_id).order_by(Connection.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_connection(db: AsyncSession, connection_id: uuid.UUID) -> Connection | None:
    result = await db.execute(select(Connection).where(Connection.id == connection_id))
    return result.scalar_one_or_none()


async def create_connection(db: AsyncSession, project_id: uuid.UUID, name: str, connector_type: str, config: dict) -> Connection:
    conn = Connection(project_id=project_id, name=name, connector_type=connector_type, config=config)
    db.add(conn)
    await db.commit()
    await db.refresh(conn)
    return conn


async def update_connection(db: AsyncSession, connection_id: uuid.UUID, **kwargs) -> Connection | None:
    result = await db.execute(select(Connection).where(Connection.id == connection_id))
    conn = result.scalar_one_or_none()
    if not conn:
        return None
    for k, v in kwargs.items():
        if v is not None:
            setattr(conn, k, v)
    await db.commit()
    await db.refresh(conn)
    return conn


async def update_connection_status(db: AsyncSession, connection_id: uuid.UUID, status: str) -> None:
    result = await db.execute(select(Connection).where(Connection.id == connection_id))
    conn = result.scalar_one_or_none()
    if conn:
        conn.status = status
        conn.last_tested_at = datetime.now(timezone.utc)
        await db.commit()


async def delete_connection(db: AsyncSession, connection_id: uuid.UUID) -> bool:
    result = await db.execute(select(Connection).where(Connection.id == connection_id))
    conn = result.scalar_one_or_none()
    if not conn:
        return False
    await db.delete(conn)
    await db.commit()
    return True


def mask_config(config: dict) -> dict:
    """Mask sensitive fields in connection config for API responses."""
    masked = dict(config)
    sensitive_keys = {"password", "secret", "token", "api_key"}
    for key in masked:
        if any(s in key.lower() for s in sensitive_keys):
            if masked[key]:
                masked[key] = "••••••••"
    return masked
