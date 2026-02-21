"""Dataset Pydantic schemas."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from typing import Optional


class DatasetCreate(BaseModel):
    name: str
    description: str = ""
    source_type: str  # workbook_output, csv_upload, connection, file
    source_config: dict = {}
    file_path: str | None = None
    workbook_id: UUID | None = None
    node_id: str | None = None
    connection_id: UUID | None = None


class DatasetUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class DatasetResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    description: str
    source_type: str
    source_config: dict
    schema_info: list[dict]
    row_count: int | None
    file_path: str | None
    workbook_id: UUID | None
    node_id: str | None
    connection_id: UUID | None
    created_at: datetime
    updated_at: datetime
    last_built_at: datetime | None

    model_config = {"from_attributes": True}


class DatasetListResponse(BaseModel):
    datasets: list[DatasetResponse]


class DatasetPreviewResponse(BaseModel):
    columns: list[str]
    types: list[str]
    rows: list[list]
    total_count: int
    truncated: bool
