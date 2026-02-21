"""Workbook Pydantic schemas."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from typing import Optional
from enum import Enum


class NodeType(str, Enum):
    DATASET = "dataset"
    TRANSFORM = "transform"


class Language(str, Enum):
    PYTHON = "python"
    SQL = "sql"


class PositionSchema(BaseModel):
    x: float = 0
    y: float = 0


class WorkbookNodeSchema(BaseModel):
    id: str
    type: NodeType
    name: str
    language: Language = Language.PYTHON
    code: str = ""
    save_as_dataset: bool = False
    position: PositionSchema = PositionSchema()


class WorkbookEdgeSchema(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None


class WorkbookCreate(BaseModel):
    name: str
    description: str = ""


class WorkbookUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    global_code: str | None = None
    nodes: list[WorkbookNodeSchema] | None = None
    edges: list[WorkbookEdgeSchema] | None = None


class WorkbookResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    description: str
    global_code: str
    nodes: list[dict]
    edges: list[dict]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkbookListResponse(BaseModel):
    workbooks: list[WorkbookResponse]


class ExecuteNodeRequest(BaseModel):
    preview: bool = False


class ConsoleExecuteRequest(BaseModel):
    code: str
