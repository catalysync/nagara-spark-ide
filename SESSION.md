# Nagara Code Workbooks - Session Log

## Status: V2 COMPLETE & RUNNING (Palantir Code Workbooks Style)

## Codespaces URL
**Frontend**: https://musical-space-parakeet-97qgv466jxq6hpg9r-5173.app.github.dev
**Backend API**: https://musical-space-parakeet-97qgv466jxq6hpg9r-8000.app.github.dev

## What Was Built (v2)
A graph-based data transformation workbench inspired by **Palantir Foundry Code Workbooks**:

- **Graph Canvas** (React Flow) — DAG visualization with dataset + transform nodes connected by edges
- **Dataset Nodes** — blue-tinted, create DataFrames from code or CSV upload
- **Transform Nodes** — Python or SQL, with upstream DAG resolution
- **Node Editor Panel** (bottom) — Monaco editor with Code/Preview/Schema tabs
- **Left Sidebar** — Contents panel listing nodes in topological order
- **Right Sidebar** — Console REPL + Global Code editor
- **Import Dataset Dialog** — "From Code" or "Upload CSV" tabs
- **New Transform Dialog** — name + Python/SQL language selector
- **Auto-Layout** — dagre-based topological arrangement
- **Light/Dark Theme** — toggle with localStorage persistence
- **DAG Execution Engine** — resolves upstream dependencies, caches results
- **Shopify Polaris UI** — consistent component library throughout

## Tech Stack
- **Frontend**: React 18 + Vite + Shopify Polaris + React Flow + Monaco Editor + dagre (port 5173)
- **Backend**: FastAPI + PySpark 3.5.4 + DAG executor (port 8000)
- **Spark**: PySpark local mode, Java 21

## Project Structure
```
nagara-spark-ide/
├── backend/
│   ├── main.py                  # FastAPI app — workbook, execute, console, upload APIs
│   ├── models.py                # Pydantic models: WorkbookNode, WorkbookEdge, Workbook
│   ├── workbook_executor.py     # DAG-aware execution engine with caching
│   ├── spark_manager.py         # SparkSession lifecycle
│   ├── executor.py              # Original code executor (kept for compat)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Polaris AppProvider + providers composition
│   │   ├── main.tsx             # Entry point
│   │   ├── styles/workbook.css  # Custom IDE overrides (dark/light)
│   │   ├── types/workbook.ts    # TypeScript interfaces
│   │   ├── utils/
│   │   │   ├── apiBase.ts       # Codespaces URL detection
│   │   │   ├── autoLayout.ts    # Dagre layout
│   │   │   └── topologicalSort.ts
│   │   ├── api/workbookApi.ts   # All API client functions
│   │   ├── providers/
│   │   │   ├── ThemeProvider.tsx     # Light/dark toggle
│   │   │   └── WorkbookProvider.tsx  # Central state (useReducer) + async actions
│   │   └── components/
│   │       ├── WorkbookFrame.tsx     # Shell layout
│   │       ├── WorkbookTopBar.tsx    # Logo, workbook name, branch, spark status, theme
│   │       ├── ContentsSidebar.tsx   # Left: node list in topo order
│   │       ├── MainContent.tsx       # Graph + editor + right sidebar layout
│   │       ├── graph/
│   │       │   ├── GraphCanvas.tsx   # React Flow wrapper
│   │       │   ├── DatasetNode.tsx   # Custom blue dataset node
│   │       │   ├── TransformNode.tsx # Custom transform node (PY/SQL badge)
│   │       │   └── GraphToolbar.tsx  # + Dataset, + Transform, Layout, Run All
│   │       ├── editor/
│   │       │   ├── NodeEditorPanel.tsx # Bottom panel with tabs
│   │       │   ├── CodeTab.tsx       # Monaco + PySpark completions
│   │       │   ├── PreviewTab.tsx    # DataFrame table
│   │       │   └── SchemaTab.tsx     # Column types table
│   │       ├── sidebar/
│   │       │   ├── RightSidebar.tsx  # Console + Global Code tabs
│   │       │   ├── ConsolePanel.tsx  # REPL
│   │       │   └── GlobalCodePanel.tsx
│   │       ├── dialogs/
│   │       │   ├── ImportDatasetDialog.tsx  # Code or CSV upload
│   │       │   └── NewTransformDialog.tsx   # Name + language
│   │       └── shared/
│   │           └── DataPreviewTable.tsx
│   ├── package.json
│   └── vite.config.ts
├── start.sh                     # One-command startup (sets JAVA_HOME)
├── start_backend.sh
├── e2e_full.mjs                 # Comprehensive E2E test
└── screenshots/                 # Playwright screenshots
```

## How to Start
```bash
bash /workspaces/codespaces-blank/nagara-spark-ide/start.sh
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Spark status |
| GET | /api/workbook | Load workbook |
| PUT | /api/workbook | Save workbook |
| POST | /api/workbook/nodes/{id}/execute | Execute node (resolves DAG) |
| POST | /api/workbook/nodes/{id}/preview | Preview (50 rows) |
| GET | /api/workbook/nodes/{id}/schema | Get cached schema |
| POST | /api/console/execute | Console REPL |
| POST | /api/workbook/upload-csv | Upload CSV as dataset |

## Important Notes
- **Java 21 required** — PySpark 3.5 does NOT work with Java 25. JAVA_HOME: `/home/codespace/java/21.0.9-ms`
- **Codespaces URL**: Frontend auto-detects Codespaces environment for API routing
- **Ports**: 5173 (frontend), 8000 (backend) — set to public
- **Dependencies**: pandas, python-multipart required for backend

## E2E Test Results (verified)
- Backend APIs: health, workbook CRUD, node execution, DAG resolution, SQL transforms, console
- Browser: app loads, Spark Ready, dialogs open, nodes render on graph, node selection opens editor, theme toggle works
- 3-node DAG tested: dataset → Python filter → SQL aggregation (all execute correctly)

## What's Next
- [ ] Drag-to-connect nodes on canvas (currently done via dialog input selection)
- [ ] Undo/redo
- [ ] Export workbook as .json
- [ ] More dataset sources (Parquet, Delta, JDBC)
- [ ] Spark UI integration
- [ ] AI copilot for transform suggestions
