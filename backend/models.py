"""Workbook data models."""

from pydantic import BaseModel
from typing import Optional
from enum import Enum


class NodeType(str, Enum):
    DATASET = "dataset"
    TRANSFORM = "transform"


class Language(str, Enum):
    PYTHON = "python"
    SQL = "sql"


class Position(BaseModel):
    x: float = 0
    y: float = 0


class WorkbookNode(BaseModel):
    id: str
    type: NodeType
    name: str
    language: Language = Language.PYTHON
    code: str = ""
    save_as_dataset: bool = False
    position: Position = Position()


class WorkbookEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None


class Workbook(BaseModel):
    id: str = "default"
    name: str = "Untitled Workbook"
    nodes: list[WorkbookNode] = []
    edges: list[WorkbookEdge] = []
    global_code: str = "from pyspark.sql import functions as F, types as T, Window\nimport pandas as pd\n"


class ExecuteNodeRequest(BaseModel):
    preview: bool = False


class ConsoleExecuteRequest(BaseModel):
    code: str
