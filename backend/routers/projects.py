"""Project CRUD router."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse
from services import project_service

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=ProjectListResponse)
async def list_projects(db: AsyncSession = Depends(get_db)):
    projects = await project_service.list_projects(db)
    return ProjectListResponse(projects=[ProjectResponse(**p) for p in projects])


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(body: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = await project_service.create_project(db, name=body.name, description=body.description)
    data = await project_service.get_project(db, project.id)
    return ProjectResponse(**data)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    data = await project_service.get_project(db, project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse(**data)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: uuid.UUID, body: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    updates = body.model_dump(exclude_none=True)
    project = await project_service.update_project(db, project_id, **updates)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    data = await project_service.get_project(db, project.id)
    return ProjectResponse(**data)


@router.delete("/{project_id}")
async def delete_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    deleted = await project_service.delete_project(db, project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "ok"}
