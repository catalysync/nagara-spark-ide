"""Health check router."""

from fastapi import APIRouter

from services.execution_service import get_wb_executor

router = APIRouter(tags=["health"])


@router.get("/api/health")
async def health():
    try:
        executor = get_wb_executor()
        return {"status": "ok", "spark": executor is not None}
    except Exception:
        return {"status": "ok", "spark": False}
