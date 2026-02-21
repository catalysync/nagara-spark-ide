"""Project business logic."""

import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.project import Project
from models.workbook import Workbook
from models.dataset import Dataset
from models.connection import Connection


async def list_projects(db: AsyncSession) -> list[dict]:
    result = await db.execute(select(Project).order_by(Project.updated_at.desc()))
    projects = result.scalars().all()
    out = []
    for p in projects:
        wb_count = (await db.execute(select(func.count()).where(Workbook.project_id == p.id))).scalar() or 0
        ds_count = (await db.execute(select(func.count()).where(Dataset.project_id == p.id))).scalar() or 0
        cn_count = (await db.execute(select(func.count()).where(Connection.project_id == p.id))).scalar() or 0
        out.append({
            **{c.name: getattr(p, c.name) for c in Project.__table__.columns},
            "workbook_count": wb_count,
            "dataset_count": ds_count,
            "connection_count": cn_count,
        })
    return out


async def get_project(db: AsyncSession, project_id: uuid.UUID) -> dict | None:
    result = await db.execute(select(Project).where(Project.id == project_id))
    p = result.scalar_one_or_none()
    if not p:
        return None
    wb_count = (await db.execute(select(func.count()).where(Workbook.project_id == p.id))).scalar() or 0
    ds_count = (await db.execute(select(func.count()).where(Dataset.project_id == p.id))).scalar() or 0
    cn_count = (await db.execute(select(func.count()).where(Connection.project_id == p.id))).scalar() or 0
    return {
        **{c.name: getattr(p, c.name) for c in Project.__table__.columns},
        "workbook_count": wb_count,
        "dataset_count": ds_count,
        "connection_count": cn_count,
    }


async def create_project(db: AsyncSession, name: str, description: str = "") -> Project:
    project = Project(name=name, description=description)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def update_project(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> Project | None:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        return None
    for k, v in kwargs.items():
        if v is not None:
            setattr(project, k, v)
    await db.commit()
    await db.refresh(project)
    return project


async def delete_project(db: AsyncSession, project_id: uuid.UUID) -> bool:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        return False
    await db.delete(project)
    await db.commit()
    return True
