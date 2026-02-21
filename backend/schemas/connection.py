"""Connection Pydantic schemas."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from typing import Optional


class ConnectionCreate(BaseModel):
    name: str
    connector_type: str  # postgresql, kafka, csv_file, jdbc
    config: dict


class ConnectionUpdate(BaseModel):
    name: str | None = None
    config: dict | None = None


class ConnectionResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    connector_type: str
    config: dict
    status: str
    last_tested_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConnectionListResponse(BaseModel):
    connections: list[ConnectionResponse]


class ConnectionTestResponse(BaseModel):
    status: str  # connected, error
    message: str = ""
    details: dict = {}


class ImportRequest(BaseModel):
    resource_name: str  # table name, topic, file path
    dataset_name: str
    description: str = ""
