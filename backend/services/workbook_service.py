"""Workbook business logic."""

import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.workbook import Workbook


async def list_workbooks(db: AsyncSession, project_id: uuid.UUID) -> list[Workbook]:
    result = await db.execute(
        select(Workbook).where(Workbook.project_id == project_id).order_by(Workbook.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_workbook(db: AsyncSession, workbook_id: uuid.UUID) -> Workbook | None:
    result = await db.execute(select(Workbook).where(Workbook.id == workbook_id))
    return result.scalar_one_or_none()


async def create_workbook(db: AsyncSession, project_id: uuid.UUID, name: str, description: str = "") -> Workbook:
    workbook = Workbook(project_id=project_id, name=name, description=description, nodes=[], edges=[])
    db.add(workbook)
    await db.commit()
    await db.refresh(workbook)
    return workbook


async def update_workbook(db: AsyncSession, workbook_id: uuid.UUID, **kwargs) -> Workbook | None:
    result = await db.execute(select(Workbook).where(Workbook.id == workbook_id))
    workbook = result.scalar_one_or_none()
    if not workbook:
        return None
    for k, v in kwargs.items():
        if v is not None:
            setattr(workbook, k, v)
    await db.commit()
    await db.refresh(workbook)
    return workbook


async def delete_workbook(db: AsyncSession, workbook_id: uuid.UUID) -> bool:
    result = await db.execute(select(Workbook).where(Workbook.id == workbook_id))
    workbook = result.scalar_one_or_none()
    if not workbook:
        return False
    await db.delete(workbook)
    await db.commit()
    return True
