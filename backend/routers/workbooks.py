"""Workbook CRUD + execution router."""

import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.workbook import (
    WorkbookCreate, WorkbookUpdate, WorkbookResponse, WorkbookListResponse,
    ExecuteNodeRequest, ConsoleExecuteRequest,
)
from services import workbook_service
from services.execution_service import get_wb_executor

router = APIRouter(tags=["workbooks"])


# ─── CRUD ────────────────────────────────────────────────────────────────────

@router.get("/api/projects/{project_id}/workbooks", response_model=WorkbookListResponse)
async def list_workbooks(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    workbooks = await workbook_service.list_workbooks(db, project_id)
    return WorkbookListResponse(workbooks=[WorkbookResponse.model_validate(wb) for wb in workbooks])


@router.post("/api/projects/{project_id}/workbooks", response_model=WorkbookResponse, status_code=201)
async def create_workbook(project_id: uuid.UUID, body: WorkbookCreate, db: AsyncSession = Depends(get_db)):
    wb = await workbook_service.create_workbook(db, project_id, name=body.name, description=body.description)
    return WorkbookResponse.model_validate(wb)


@router.get("/api/projects/{project_id}/workbooks/{workbook_id}", response_model=WorkbookResponse)
async def get_workbook(project_id: uuid.UUID, workbook_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    wb = await workbook_service.get_workbook(db, workbook_id)
    if not wb or wb.project_id != project_id:
        raise HTTPException(status_code=404, detail="Workbook not found")
    return WorkbookResponse.model_validate(wb)


@router.put("/api/projects/{project_id}/workbooks/{workbook_id}", response_model=WorkbookResponse)
async def update_workbook(
    project_id: uuid.UUID,
    workbook_id: uuid.UUID,
    body: WorkbookUpdate,
    db: AsyncSession = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    # Convert Pydantic models to dicts for JSONB storage
    if "nodes" in updates:
        updates["nodes"] = [n.model_dump() if hasattr(n, "model_dump") else n for n in updates["nodes"]]
    if "edges" in updates:
        updates["edges"] = [e.model_dump() if hasattr(e, "model_dump") else e for e in updates["edges"]]
    wb = await workbook_service.update_workbook(db, workbook_id, **updates)
    if not wb:
        raise HTTPException(status_code=404, detail="Workbook not found")
    return WorkbookResponse.model_validate(wb)


@router.delete("/api/projects/{project_id}/workbooks/{workbook_id}")
async def delete_workbook(project_id: uuid.UUID, workbook_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    deleted = await workbook_service.delete_workbook(db, workbook_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Workbook not found")
    return {"status": "ok"}


# ─── Execution ───────────────────────────────────────────────────────────────

def _build_workbook_obj(wb):
    """Convert DB workbook to the format WorkbookExecutor expects."""
    from schemas.workbook import NodeType, Language

    class _Pos:
        def __init__(self, d):
            self.x = d.get("x", 0)
            self.y = d.get("y", 0)

    class _Node:
        def __init__(self, d):
            self.id = d["id"]
            self.type = NodeType(d["type"])
            self.name = d["name"]
            self.language = Language(d.get("language", "python"))
            self.code = d.get("code", "")
            self.save_as_dataset = d.get("save_as_dataset", False)
            self.position = _Pos(d.get("position", {}))

    class _Edge:
        def __init__(self, d):
            self.id = d["id"]
            self.source = d["source"]
            self.target = d["target"]
            self.sourceHandle = d.get("sourceHandle")
            self.targetHandle = d.get("targetHandle")

    class _Workbook:
        def __init__(self, wb):
            self.id = str(wb.id)
            self.name = wb.name
            self.nodes = [_Node(n) for n in (wb.nodes or [])]
            self.edges = [_Edge(e) for e in (wb.edges or [])]
            self.global_code = wb.global_code or ""

    return _Workbook(wb)


@router.post("/api/workbooks/{workbook_id}/nodes/{node_id}/execute")
async def execute_node(
    workbook_id: uuid.UUID,
    node_id: str,
    body: ExecuteNodeRequest = None,
    db: AsyncSession = Depends(get_db),
):
    if body is None:
        body = ExecuteNodeRequest()
    wb = await workbook_service.get_workbook(db, workbook_id)
    if not wb:
        raise HTTPException(status_code=404, detail="Workbook not found")
    wb_obj = _build_workbook_obj(wb)
    executor = get_wb_executor()
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, executor.execute_node, wb_obj, node_id, body.preview)
    return result


@router.post("/api/workbooks/{workbook_id}/nodes/{node_id}/preview")
async def preview_node(workbook_id: uuid.UUID, node_id: str, db: AsyncSession = Depends(get_db)):
    wb = await workbook_service.get_workbook(db, workbook_id)
    if not wb:
        raise HTTPException(status_code=404, detail="Workbook not found")
    wb_obj = _build_workbook_obj(wb)
    executor = get_wb_executor()
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, executor.execute_node, wb_obj, node_id, True)
    return result


@router.get("/api/workbooks/{workbook_id}/nodes/{node_id}/schema")
async def get_node_schema(workbook_id: uuid.UUID, node_id: str):
    executor = get_wb_executor()
    schema = executor.get_node_schema(node_id)
    if schema is None:
        return {"schema": None, "message": "Node not yet executed"}
    return {"schema": schema}


@router.post("/api/workbooks/{workbook_id}/console/execute")
async def execute_console(workbook_id: uuid.UUID, body: ConsoleExecuteRequest):
    executor = get_wb_executor()
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, executor.execute_console, body.code)
    return result
