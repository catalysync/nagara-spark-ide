"""Nagara Spark IDE — FastAPI Backend."""

import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from services.execution_service import init_execution, shutdown_execution, get_wb_executor
from routers import health, projects, workbooks, datasets, connections


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing database...")
    await init_db()
    print("Initializing SparkSession...")
    init_execution()
    print("Nagara Spark IDE ready!")
    yield
    print("Shutting down...")
    shutdown_execution()


app = FastAPI(title="Nagara Spark IDE", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(health.router)
app.include_router(projects.router)
app.include_router(workbooks.router)
app.include_router(datasets.router)
app.include_router(connections.router)


# ─── WebSocket ────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "execute_node":
                node_id = msg.get("nodeId")
                preview = msg.get("preview", False)
                # For WebSocket, we need workbook data in the message
                wb_data = msg.get("workbook")
                if wb_data:
                    from routers.workbooks import _build_workbook_obj
                    import asyncio

                    class _WbShim:
                        def __init__(self, d):
                            self.id = d.get("id", "ws")
                            self.name = d.get("name", "")
                            self.nodes = d.get("nodes", [])
                            self.edges = d.get("edges", [])
                            self.global_code = d.get("global_code", "")

                    wb_obj = _build_workbook_obj(_WbShim(wb_data))
                    executor = get_wb_executor()
                    loop = asyncio.get_event_loop()
                    result = await loop.run_in_executor(
                        None, executor.execute_node, wb_obj, node_id, preview
                    )
                    await websocket.send_text(json.dumps({
                        "type": "node_result",
                        "nodeId": node_id,
                        **result,
                    }))
    except WebSocketDisconnect:
        pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
