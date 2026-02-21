"""Dataset CRUD + preview router."""

import asyncio
import os
import tempfile
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.dataset import DatasetCreate, DatasetUpdate, DatasetResponse, DatasetListResponse, DatasetPreviewResponse
from services import dataset_service
from services.execution_service import get_wb_executor
from execution.spark_manager import get_spark

router = APIRouter(tags=["datasets"])


@router.get("/api/projects/{project_id}/datasets", response_model=DatasetListResponse)
async def list_datasets(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    datasets = await dataset_service.list_datasets(db, project_id)
    return DatasetListResponse(datasets=[DatasetResponse.model_validate(ds) for ds in datasets])


@router.post("/api/projects/{project_id}/datasets", response_model=DatasetResponse, status_code=201)
async def create_dataset(project_id: uuid.UUID, body: DatasetCreate, db: AsyncSession = Depends(get_db)):
    ds = await dataset_service.create_dataset(
        db, project_id,
        name=body.name,
        description=body.description,
        source_type=body.source_type,
        source_config=body.source_config,
        file_path=body.file_path,
        workbook_id=body.workbook_id,
        node_id=body.node_id,
        connection_id=body.connection_id,
    )
    return DatasetResponse.model_validate(ds)


@router.get("/api/projects/{project_id}/datasets/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(project_id: uuid.UUID, dataset_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    ds = await dataset_service.get_dataset(db, dataset_id)
    if not ds or ds.project_id != project_id:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return DatasetResponse.model_validate(ds)


@router.get("/api/projects/{project_id}/datasets/{dataset_id}/preview", response_model=DatasetPreviewResponse)
async def preview_dataset(project_id: uuid.UUID, dataset_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    ds = await dataset_service.get_dataset(db, dataset_id)
    if not ds or ds.project_id != project_id:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if not ds.file_path or not os.path.exists(ds.file_path):
        raise HTTPException(status_code=404, detail="Dataset data not found on disk")

    spark = get_spark()
    loop = asyncio.get_event_loop()

    def read_preview():
        df = spark.read.parquet(ds.file_path)
        total = df.count()
        preview_df = df.limit(100)
        columns = [f.name for f in df.schema.fields]
        types = [f.dataType.simpleString() for f in df.schema.fields]
        rows = [[row[c] for c in columns] for row in preview_df.collect()]
        return DatasetPreviewResponse(
            columns=columns,
            types=types,
            rows=rows,
            total_count=total,
            truncated=total > 100,
        )

    return await loop.run_in_executor(None, read_preview)


@router.get("/api/projects/{project_id}/datasets/{dataset_id}/schema")
async def get_dataset_schema(project_id: uuid.UUID, dataset_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    ds = await dataset_service.get_dataset(db, dataset_id)
    if not ds or ds.project_id != project_id:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"schema": ds.schema_info or []}


@router.delete("/api/projects/{project_id}/datasets/{dataset_id}")
async def delete_dataset(project_id: uuid.UUID, dataset_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    deleted = await dataset_service.delete_dataset(db, dataset_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"status": "ok"}


@router.post("/api/projects/{project_id}/datasets/upload-csv", response_model=DatasetResponse, status_code=201)
async def upload_csv(
    project_id: uuid.UUID,
    file: UploadFile = File(...),
    name: str = Form("uploaded_data"),
    db: AsyncSession = Depends(get_db),
):
    # Save to temp, read with Spark, persist as parquet
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
    content = await file.read()
    tmp.write(content)
    tmp.close()

    dataset_id = uuid.uuid4()
    spark = get_spark()
    loop = asyncio.get_event_loop()

    def process_csv():
        df = spark.read.csv(tmp.name, header=True, inferSchema=True)
        # Cache and count to materialize before deleting temp file
        df.cache()
        df.count()
        os.unlink(tmp.name)
        return df

    df = await loop.run_in_executor(None, process_csv)
    ds = await dataset_service.save_dataframe_as_dataset(
        db, project_id, dataset_id, df,
        name=name,
        source_type="csv_upload",
    )
    return DatasetResponse.model_validate(ds)
