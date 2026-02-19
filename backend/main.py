"""Nagara Code Workbooks - FastAPI Backend."""

import asyncio
import json
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from spark_manager import get_spark, stop_spark
from executor import CodeExecutor
from workbook_executor import WorkbookExecutor
from models import Workbook, WorkbookNode, WorkbookEdge, NodeType, Language, Position, ExecuteNodeRequest, ConsoleExecuteRequest

wb_executor: WorkbookExecutor | None = None
console_executor: CodeExecutor | None = None
workbook: Workbook = Workbook()

WORKBOOK_FILE = os.path.join(os.path.dirname(__file__), "workbook.json")


def load_workbook_from_disk():
    global workbook
    if os.path.exists(WORKBOOK_FILE):
        with open(WORKBOOK_FILE) as f:
            workbook = Workbook.model_validate_json(f.read())


def save_workbook_to_disk():
    with open(WORKBOOK_FILE, "w") as f:
        f.write(workbook.model_dump_json(indent=2))


@asynccontextmanager
async def lifespan(app: FastAPI):
    global wb_executor, console_executor
    print("Initializing SparkSession...")
    spark = get_spark()
    wb_executor = WorkbookExecutor(spark)
    console_executor = CodeExecutor(spark)
    load_workbook_from_disk()
    print("SparkSession ready!")
    yield
    print("Stopping SparkSession...")
    stop_spark()


app = FastAPI(title="Nagara Code Workbooks", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "spark": wb_executor is not None}


# ─── Workbook CRUD ────────────────────────────────────────────────────────────

@app.get("/api/workbook")
async def get_workbook():
    return workbook.model_dump()


@app.put("/api/workbook")
async def update_workbook(body: dict):
    global workbook
    workbook = Workbook.model_validate(body)
    save_workbook_to_disk()
    return {"status": "ok"}


# ─── Node Execution ───────────────────────────────────────────────────────────

@app.post("/api/workbook/nodes/{node_id}/execute")
async def execute_node(node_id: str, body: ExecuteNodeRequest = None):
    if body is None:
        body = ExecuteNodeRequest()
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, wb_executor.execute_node, workbook, node_id, body.preview
    )
    return result


@app.post("/api/workbook/nodes/{node_id}/preview")
async def preview_node(node_id: str):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, wb_executor.execute_node, workbook, node_id, True
    )
    return result


@app.get("/api/workbook/nodes/{node_id}/schema")
async def get_node_schema(node_id: str):
    schema = wb_executor.get_node_schema(node_id)
    if schema is None:
        return {"schema": None, "message": "Node not yet executed"}
    return {"schema": schema}


# ─── Console ──────────────────────────────────────────────────────────────────

@app.post("/api/console/execute")
async def execute_console(body: ConsoleExecuteRequest):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, wb_executor.execute_console, body.code)
    return result


# ─── Legacy endpoints (backward compat) ──────────────────────────────────────

@app.post("/api/execute")
async def execute_code(body: dict):
    code = body.get("code", "")
    if not code.strip():
        return {"status": "success", "stdout": "", "result": None}
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, console_executor.execute, code)
    return result


@app.post("/api/completions")
async def get_completions(body: dict):
    prefix = body.get("prefix", "")
    if not prefix:
        return {"completions": []}
    completions = console_executor.get_completions(prefix)
    return {"completions": completions}


# ─── CSV Upload ───────────────────────────────────────────────────────────────

@app.post("/api/workbook/upload-csv")
async def upload_csv(file: UploadFile = File(...), name: str = Form("uploaded_data")):
    import tempfile
    # Save to temp file, load with Spark
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".csv")
    content = await file.read()
    tmp.write(content)
    tmp.close()

    loop = asyncio.get_event_loop()

    def load_csv():
        df = get_spark().read.csv(tmp.name, header=True, inferSchema=True)
        node_id = f"dataset_{len(workbook.nodes) + 1}"
        wb_executor.node_cache[node_id] = df
        safe_name = name.replace(" ", "_").replace("-", "_")
        wb_executor.console_namespace[safe_name] = df
        os.unlink(tmp.name)
        return {
            "node_id": node_id,
            "name": name,
            "rows": df.count(),
            "columns": [f.name for f in df.schema.fields],
            "schema": [{"name": f.name, "type": f.dataType.simpleString(), "nullable": f.nullable} for f in df.schema.fields],
        }

    result = await loop.run_in_executor(None, load_csv)
    return result


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
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    None, wb_executor.execute_node, workbook, node_id, preview
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
