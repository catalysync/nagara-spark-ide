"""Connection CRUD + test + import router."""

import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.connection import (
    ConnectionCreate, ConnectionUpdate, ConnectionResponse, ConnectionListResponse,
    ConnectionTestResponse, ImportRequest,
)
from schemas.dataset import DatasetResponse
from services import connection_service, dataset_service
from services.execution_service import get_wb_executor
from connectors.registry import get_connector
from execution.spark_manager import get_spark

router = APIRouter(tags=["connections"])


@router.get("/api/projects/{project_id}/connections", response_model=ConnectionListResponse)
async def list_connections(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    connections = await connection_service.list_connections(db, project_id)
    # Mask sensitive fields
    result = []
    for conn in connections:
        resp = ConnectionResponse.model_validate(conn)
        resp.config = connection_service.mask_config(resp.config)
        result.append(resp)
    return ConnectionListResponse(connections=result)


@router.post("/api/projects/{project_id}/connections", response_model=ConnectionResponse, status_code=201)
async def create_connection(project_id: uuid.UUID, body: ConnectionCreate, db: AsyncSession = Depends(get_db)):
    conn = await connection_service.create_connection(
        db, project_id, name=body.name, connector_type=body.connector_type, config=body.config
    )
    resp = ConnectionResponse.model_validate(conn)
    resp.config = connection_service.mask_config(resp.config)
    return resp


@router.get("/api/projects/{project_id}/connections/{connection_id}", response_model=ConnectionResponse)
async def get_connection(project_id: uuid.UUID, connection_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    conn = await connection_service.get_connection(db, connection_id)
    if not conn or conn.project_id != project_id:
        raise HTTPException(status_code=404, detail="Connection not found")
    resp = ConnectionResponse.model_validate(conn)
    resp.config = connection_service.mask_config(resp.config)
    return resp


@router.put("/api/projects/{project_id}/connections/{connection_id}", response_model=ConnectionResponse)
async def update_connection(
    project_id: uuid.UUID,
    connection_id: uuid.UUID,
    body: ConnectionUpdate,
    db: AsyncSession = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    conn = await connection_service.update_connection(db, connection_id, **updates)
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    resp = ConnectionResponse.model_validate(conn)
    resp.config = connection_service.mask_config(resp.config)
    return resp


@router.delete("/api/projects/{project_id}/connections/{connection_id}")
async def delete_connection(project_id: uuid.UUID, connection_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    deleted = await connection_service.delete_connection(db, connection_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Connection not found")
    return {"status": "ok"}


@router.post("/api/projects/{project_id}/connections/{connection_id}/test", response_model=ConnectionTestResponse)
async def test_connection(project_id: uuid.UUID, connection_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    conn = await connection_service.get_connection(db, connection_id)
    if not conn or conn.project_id != project_id:
        raise HTTPException(status_code=404, detail="Connection not found")

    spark = get_spark()
    connector = get_connector(conn.connector_type, conn.config, spark)

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, connector.test_connection)

    await connection_service.update_connection_status(db, connection_id, result["status"])
    return ConnectionTestResponse(**result)


@router.get("/api/projects/{project_id}/connections/{connection_id}/resources")
async def list_resources(project_id: uuid.UUID, connection_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    conn = await connection_service.get_connection(db, connection_id)
    if not conn or conn.project_id != project_id:
        raise HTTPException(status_code=404, detail="Connection not found")

    spark = get_spark()
    connector = get_connector(conn.connector_type, conn.config, spark)

    loop = asyncio.get_event_loop()
    resources = await loop.run_in_executor(None, connector.list_resources)
    return {"resources": resources}


@router.post("/api/projects/{project_id}/connections/{connection_id}/import", response_model=DatasetResponse)
async def import_resource(
    project_id: uuid.UUID,
    connection_id: uuid.UUID,
    body: ImportRequest,
    db: AsyncSession = Depends(get_db),
):
    conn = await connection_service.get_connection(db, connection_id)
    if not conn or conn.project_id != project_id:
        raise HTTPException(status_code=404, detail="Connection not found")

    spark = get_spark()
    connector = get_connector(conn.connector_type, conn.config, spark)

    dataset_id = uuid.uuid4()
    loop = asyncio.get_event_loop()

    def do_import():
        return connector.read_dataframe(body.resource_name)

    df = await loop.run_in_executor(None, do_import)

    ds = await dataset_service.save_dataframe_as_dataset(
        db, project_id, dataset_id, df,
        name=body.dataset_name,
        description=body.description,
        source_type="connection",
        connection_id=connection_id,
        source_config={"resource": body.resource_name, "connector_type": conn.connector_type},
    )
    return DatasetResponse.model_validate(ds)
