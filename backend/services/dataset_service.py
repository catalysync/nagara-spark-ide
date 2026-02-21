"""Dataset business logic."""

import os
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.dataset import Dataset
from config import DATA_DIR


def get_dataset_dir(project_id: uuid.UUID, dataset_id: uuid.UUID) -> str:
    path = os.path.join(DATA_DIR, "projects", str(project_id), "datasets", str(dataset_id))
    os.makedirs(path, exist_ok=True)
    return path


async def list_datasets(db: AsyncSession, project_id: uuid.UUID) -> list[Dataset]:
    result = await db.execute(
        select(Dataset).where(Dataset.project_id == project_id).order_by(Dataset.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_dataset(db: AsyncSession, dataset_id: uuid.UUID) -> Dataset | None:
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    return result.scalar_one_or_none()


async def create_dataset(db: AsyncSession, project_id: uuid.UUID, **kwargs) -> Dataset:
    dataset = Dataset(project_id=project_id, **kwargs)
    db.add(dataset)
    await db.commit()
    await db.refresh(dataset)
    return dataset


async def update_dataset(db: AsyncSession, dataset_id: uuid.UUID, **kwargs) -> Dataset | None:
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        return None
    for k, v in kwargs.items():
        if v is not None:
            setattr(dataset, k, v)
    await db.commit()
    await db.refresh(dataset)
    return dataset


async def delete_dataset(db: AsyncSession, dataset_id: uuid.UUID) -> bool:
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        return False
    # Clean up data files
    if dataset.file_path and os.path.exists(dataset.file_path):
        import shutil
        parent = os.path.dirname(dataset.file_path)
        if os.path.isdir(parent):
            shutil.rmtree(parent, ignore_errors=True)
    await db.delete(dataset)
    await db.commit()
    return True


async def save_dataframe_as_dataset(db: AsyncSession, project_id: uuid.UUID, dataset_id: uuid.UUID, df, name: str, description: str = "", source_type: str = "workbook_output", **extra):
    """Save a PySpark DataFrame as a Parquet-backed dataset."""
    ds_dir = get_dataset_dir(project_id, dataset_id)
    parquet_path = os.path.join(ds_dir, "data.parquet")

    # Write parquet
    df.write.mode("overwrite").parquet(parquet_path)

    # Get schema + count
    schema_info = [{"name": f.name, "type": f.dataType.simpleString(), "nullable": f.nullable} for f in df.schema.fields]
    row_count = df.count()

    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()

    if dataset:
        dataset.schema_info = schema_info
        dataset.row_count = row_count
        dataset.file_path = parquet_path
        dataset.last_built_at = datetime.now(timezone.utc)
    else:
        dataset = Dataset(
            id=dataset_id,
            project_id=project_id,
            name=name,
            description=description,
            source_type=source_type,
            schema_info=schema_info,
            row_count=row_count,
            file_path=parquet_path,
            last_built_at=datetime.now(timezone.utc),
            **extra,
        )
        db.add(dataset)

    await db.commit()
    await db.refresh(dataset)
    return dataset
