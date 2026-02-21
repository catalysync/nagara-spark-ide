# Nagara Spark IDE — Enhancement Plan

> **Goal**: Evolve from a single-workbook prototype into a multi-project, multi-workbook platform with data connections, dataset management, and a Foundry-inspired UI — while keeping it minimal and focused.

---

## Table of Contents

1. [Current State](#1-current-state)
2. [Target Architecture](#2-target-architecture)
3. [Data Model (PostgreSQL)](#3-data-model-postgresql)
4. [Feature Breakdown](#4-feature-breakdown)
   - 4.1 Projects
   - 4.2 Workbooks
   - 4.3 Datasets
   - 4.4 Data Connections
   - 4.5 Pipeline Builder (Phase 2)
5. [UI Redesign — Foundry-Inspired](#5-ui-redesign--foundry-inspired)
6. [Backend Architecture](#6-backend-architecture)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Implementation Phases](#8-implementation-phases)
9. [Open Questions (Self-Answered)](#9-open-questions-self-answered)
10. [RockTheJVM Use Case Validation](#10-rockthejvm-use-case-validation)

---

## 1. Current State

### What We Have
- **Backend**: FastAPI (Python) + PySpark 3.5.4 + single `workbook.json` file persistence
- **Frontend**: React 18 + Vite + Shopify Polaris + React Flow + Monaco Editor
- **Execution**: DAG-aware WorkbookExecutor with topological sort, caching, Python `exec()`/`eval()`, Spark SQL
- **Scope**: Single workbook, no projects, no persistence beyond a JSON file, no data connections

### What's Missing
- No concept of **Projects** (container for workbooks, datasets, connections)
- No **multi-workbook** support (only one workbook at a time)
- No **Dataset registry** (datasets exist only in workbook node cache)
- No **Data Connections** (no way to configure Kafka, PostgreSQL, S3, etc.)
- No **persistent storage** (just `workbook.json` on disk)
- UI feels like a prototype — needs Foundry-level polish
- No **navigation** between different resources
- Those new cell-based components (`Editor.tsx`, `DataTable.tsx`, `ResultsPanel.tsx`, `Toolbar.tsx`) aren't integrated yet

---

## 2. Target Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                             │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ Project Home │  │  Workbook    │  │  Datasets  │  │ Connections│ │
│  │  (list view) │  │  (DAG + code)│  │  (browse)  │  │ (config)   │ │
│  └─────────────┘  └──────────────┘  └────────────┘  └────────────┘ │
│                                                                      │
│  Global Sidebar (persistent) + React Router                          │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ REST API
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI + PostgreSQL)                     │
│                                                                      │
│  Routers:                                                            │
│    /api/projects/*         → Project CRUD                            │
│    /api/workbooks/*        → Workbook CRUD + execution               │
│    /api/datasets/*         → Dataset registry + preview              │
│    /api/connections/*      → Data connection config + test            │
│    /api/health             → Spark + DB health                       │
│    /ws                     → WebSocket (execution streams)           │
│                                                                      │
│  Services:                                                           │
│    ProjectService, WorkbookService, DatasetService,                  │
│    ConnectionService, ExecutionService                               │
│                                                                      │
│  Persistence: PostgreSQL (asyncpg + SQLAlchemy async)                │
│  Execution: PySpark (local) — same exec()/eval() engine              │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model (PostgreSQL)

### Why PostgreSQL?
- Structured data (projects, workbooks, connections) fits relational model perfectly
- JSON columns for flexible schema (node code, workbook graph, connection config)
- Can later be queried by the IDE itself (dogfooding — query your own metadata)

### Schema

```sql
-- Projects: top-level container
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workbooks: belong to a project, contain graph DAG
CREATE TABLE workbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    global_code TEXT DEFAULT 'from pyspark.sql import functions as F, types as T, Window\nimport pandas as pd\n',
    nodes JSONB DEFAULT '[]',       -- WorkbookNode[]
    edges JSONB DEFAULT '[]',       -- WorkbookEdge[]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Datasets: registered data assets (from workbooks or imports)
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    source_type VARCHAR(50) NOT NULL,  -- 'workbook_output', 'csv_upload', 'connection', 'file'
    source_config JSONB DEFAULT '{}',  -- source-specific config
    schema_info JSONB DEFAULT '[]',    -- [{name, type, nullable}]
    row_count BIGINT,
    file_path TEXT,                     -- for file-backed datasets
    workbook_id UUID REFERENCES workbooks(id) ON DELETE SET NULL,
    node_id VARCHAR(100),               -- which workbook node produced this
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_built_at TIMESTAMPTZ
);

-- Data Connections: configured external sources
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    connector_type VARCHAR(50) NOT NULL,  -- 'postgresql', 'kafka', 'csv_file', 's3', 'jdbc'
    config JSONB NOT NULL DEFAULT '{}',   -- connection-specific config (host, port, db, etc.)
    status VARCHAR(20) DEFAULT 'untested', -- 'untested', 'connected', 'error'
    last_tested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connection config examples (stored in JSONB):
-- PostgreSQL: {host, port, database, username, password, schema, ssl}
-- Kafka: {bootstrap_servers, topic, group_id, security_protocol, sasl_mechanism}
-- S3/File: {path, format, header, infer_schema}
-- JDBC: {url, driver, username, password}
```

### Indexes

```sql
CREATE INDEX idx_workbooks_project ON workbooks(project_id);
CREATE INDEX idx_datasets_project ON datasets(project_id);
CREATE INDEX idx_connections_project ON connections(project_id);
CREATE INDEX idx_datasets_source_type ON datasets(source_type);
```

---

## 4. Feature Breakdown

### 4.1 Projects

**What**: A project is the top-level container that groups workbooks, datasets, and connections. Like a Foundry project but simpler — no deep folder hierarchy, just a flat container.

**Use case**: The RockTheJVM NYC Taxi capstone would be a project containing:
- A data connection to the taxi CSV/Parquet files
- Datasets: `yellow_taxi_trips`, `taxi_zones`
- Workbooks: `exploration.workbook`, `analysis.workbook`, `economic_impact.workbook`

**UI — Project List Page** (`/projects`):
- Table with columns: Name, Workbooks count, Datasets count, Last Modified
- "+ New project" button (top right)
- Click to enter project → Project Home

**UI — Project Home** (`/projects/:id`):
- Tabs: **Workbooks** | **Datasets** | **Connections**
- Each tab shows a list table with "+" button to create new
- Project name + description at top (editable inline)

**API**:
```
GET    /api/projects              → list all projects
POST   /api/projects              → create project
GET    /api/projects/:id          → get project with counts
PUT    /api/projects/:id          → update project
DELETE /api/projects/:id          → delete project + cascade
```

### 4.2 Workbooks (Enhanced)

**What**: Same DAG-based workbook we have now, but scoped to a project and stored in PostgreSQL instead of `workbook.json`.

**Changes from current**:
- Workbook belongs to a project (FK)
- Stored in PostgreSQL (nodes/edges as JSONB)
- Can reference project-level datasets as input nodes
- Can save a node's output as a project dataset ("Save as Dataset" already exists in the model)
- Multiple workbooks per project

**UI** (`/projects/:id/workbooks/:wbId`):
- Same graph view we have now
- Import Dataset dialog enhanced: can browse project datasets + project connections
- "Save as Dataset" on any node → registers in project dataset registry

**API** (workbook-scoped under project):
```
GET    /api/projects/:pid/workbooks           → list workbooks
POST   /api/projects/:pid/workbooks           → create workbook
GET    /api/projects/:pid/workbooks/:wid      → get workbook
PUT    /api/projects/:pid/workbooks/:wid      → update workbook
DELETE /api/projects/:pid/workbooks/:wid      → delete workbook
POST   /api/workbooks/:wid/nodes/:nid/execute → execute node (same as now)
POST   /api/workbooks/:wid/console/execute    → console (same as now)
```

### 4.3 Datasets

**What**: A registry of data assets within a project. A dataset can come from:
1. **Workbook output** — a node marked "Save as Dataset"
2. **CSV/Parquet upload** — file uploaded to the server
3. **Connection import** — data read from a configured connection (PostgreSQL table, Kafka topic, etc.)
4. **Code** — a PySpark snippet that produces a DataFrame

**UI — Dataset List** (`/projects/:id/datasets`):
- Table: Name, Source Type (badge), Columns count, Row count, Last Built
- Click to open dataset detail

**UI — Dataset Detail** (`/projects/:id/datasets/:did`):
- Tabs: **Preview** | **Schema** | **Lineage** | **Details**
  - **Preview**: DataPreviewTable (first 100 rows) — same component we already have
  - **Schema**: Column name, type, nullable, sample values — already built in SchemaTab
  - **Lineage**: Simple text for now (which workbook/node produced it, or which connection)
  - **Details**: Source info, row count, created/updated timestamps, description

**API**:
```
GET    /api/projects/:pid/datasets           → list datasets
POST   /api/projects/:pid/datasets           → create/register dataset
GET    /api/projects/:pid/datasets/:did      → get dataset metadata
GET    /api/projects/:pid/datasets/:did/preview → preview data (100 rows)
GET    /api/projects/:pid/datasets/:did/schema  → get schema
DELETE /api/projects/:pid/datasets/:did      → delete dataset
POST   /api/projects/:pid/datasets/:did/build   → rebuild from source
```

### 4.4 Data Connections

**What**: Configurable connections to external data sources. The user sets up a connection (e.g., PostgreSQL credentials), tests it, then uses it to import data into datasets or directly into workbook nodes.

**Supported Connectors (MVP)**:

| Connector | Config Fields | Read Method |
|-----------|--------------|-------------|
| **PostgreSQL** | host, port, database, username, password, schema | `spark.read.jdbc(url, table, properties)` |
| **CSV/Parquet File** | file path or upload, format, header, inferSchema | `spark.read.csv()` / `.parquet()` |
| **Kafka** | bootstrap_servers, topic, group_id | `spark.read.format("kafka")` (batch) or Structured Streaming |
| **JDBC (generic)** | url, driver class, username, password | `spark.read.jdbc()` |
| **S3 / Local Files** | path, format, options | `spark.read.format(fmt).load(path)` |

**UI — Connection List** (`/projects/:id/connections`):
- Table: Name, Type (icon + label), Status badge (Connected/Error/Untested), Last Tested
- "+ New connection" button

**UI — New/Edit Connection Dialog**:
- Step 1: Select connector type (cards with icons: PostgreSQL, Kafka, CSV, JDBC, S3)
- Step 2: Fill connection config (dynamic form based on type)
- Step 3: "Test Connection" button → backend tries to connect, returns success/error
- Step 4: Save

**UI — Connection Detail** (`/projects/:id/connections/:cid`):
- Connection info (type, config — passwords masked)
- "Test Connection" button
- "Import Data" button → opens dialog to select table/topic → creates a dataset
- List of datasets imported from this connection

**API**:
```
GET    /api/projects/:pid/connections           → list connections
POST   /api/projects/:pid/connections           → create connection
GET    /api/projects/:pid/connections/:cid      → get connection
PUT    /api/projects/:pid/connections/:cid      → update connection
DELETE /api/projects/:pid/connections/:cid      → delete connection
POST   /api/projects/:pid/connections/:cid/test → test connection
GET    /api/projects/:pid/connections/:cid/tables → list available tables/topics
POST   /api/projects/:pid/connections/:cid/import → import table/topic as dataset
```

**Backend — Connection Testing**:
```python
# PostgreSQL test
def test_postgresql(config):
    import psycopg2
    conn = psycopg2.connect(
        host=config['host'], port=config['port'],
        dbname=config['database'], user=config['username'],
        password=config['password']
    )
    conn.close()
    return {"status": "connected"}

# Kafka test
def test_kafka(config):
    from kafka import KafkaConsumer
    consumer = KafkaConsumer(
        bootstrap_servers=config['bootstrap_servers'],
        consumer_timeout_ms=5000
    )
    topics = consumer.topics()
    consumer.close()
    return {"status": "connected", "topics": list(topics)}

# JDBC test
def test_jdbc(config):
    spark = get_spark()
    df = spark.read.jdbc(config['url'], "(SELECT 1) t", properties={
        "user": config['username'], "password": config['password'],
        "driver": config.get('driver', '')
    })
    return {"status": "connected"}
```


## 5. UI Redesign — Foundry-Inspired

### Design System Mapping

We keep **Shopify Polaris** as the component library but adopt **Palantir Blueprint's color palette and spacing** for the overall aesthetic.

### Color Palette

```css
:root {
  /* Foundry-inspired grays (Blueprint) */
  --n-black: #111418;
  --n-dark-1: #1C2127;
  --n-dark-2: #252A31;
  --n-dark-3: #2F343C;
  --n-dark-4: #383E47;
  --n-dark-5: #404854;
  --n-gray-1: #5F6B7C;
  --n-gray-2: #738091;
  --n-gray-3: #8F99A8;
  --n-gray-4: #ABB3BF;
  --n-gray-5: #C5CBD3;
  --n-light-1: #D3D8DE;
  --n-light-2: #DCE0E5;
  --n-light-3: #E5E8EB;
  --n-light-4: #EDEFF2;
  --n-light-5: #F6F7F9;
  --n-white: #FFFFFF;

  /* Primary blue (Blueprint) */
  --n-blue-1: #184A90;
  --n-blue-2: #215DB0;
  --n-blue-3: #2D72D2;  /* Primary action color */
  --n-blue-4: #4C90F0;
  --n-blue-5: #8ABBFF;

  /* Status colors */
  --n-green-3: #238551;
  --n-red-3: #CD4246;
  --n-orange-3: #C87619;

  /* Foundry teal accent (from screenshots) */
  --n-teal: #14B8A6;
}
```

### Dark Mode (Primary — matches Foundry)

```css
[data-theme="dark"] {
  --bg-app: #111418;           /* App background */
  --bg-surface: #1C2127;       /* Cards, panels */
  --bg-surface-alt: #252A31;   /* Alternate surface (sidebar) */
  --bg-surface-hover: #2F343C; /* Hover state */
  --bg-surface-active: #383E47;/* Active/selected state */
  --border-default: #383E47;   /* Default borders */
  --border-muted: #2F343C;     /* Subtle borders */
  --text-primary: #F6F7F9;     /* Primary text */
  --text-secondary: #ABB3BF;   /* Secondary text */
  --text-muted: #738091;       /* Muted/disabled text */
  --text-link: #4C90F0;        /* Links */
  --accent: #2D72D2;           /* Buttons, active states */
}
```

### Light Mode

```css
[data-theme="light"] {
  --bg-app: #F6F7F9;
  --bg-surface: #FFFFFF;
  --bg-surface-alt: #EDEFF2;
  --bg-surface-hover: #E5E8EB;
  --bg-surface-active: #DCE0E5;
  --border-default: #D3D8DE;
  --border-muted: #E5E8EB;
  --text-primary: #111418;
  --text-secondary: #5F6B7C;
  --text-muted: #8F99A8;
  --text-link: #2D72D2;
  --accent: #2D72D2;
}
```

### Layout — Global Navigation

Foundry uses a persistent left sidebar. We adopt the same:

```
┌──────────────────────────────────────────────────────────────────┐
│ ┌────┐                                                          │
│ │ N  │  Nagara Spark IDE            [Search]    [?] [Settings]  │
│ └────┘                                                          │
├────────┬─────────────────────────────────────────────────────────┤
│        │                                                         │
│  Home  │  [Content area — changes based on route]                │
│        │                                                         │
│  Proj  │  /projects → Project list table                         │
│        │  /projects/:id → Project home (tabbed)                  │
│  Data  │  /projects/:id/workbooks/:wid → Workbook editor         │
│        │  /projects/:id/datasets → Dataset list                  │
│  Conn  │  /projects/:id/datasets/:did → Dataset detail           │
│        │  /projects/:id/connections → Connection list             │
│  ──    │                                                         │
│        │                                                         │
│  Gear  │                                                         │
│        │                                                         │
└────────┴─────────────────────────────────────────────────────────┘
```

**Sidebar** (48px wide collapsed, 220px expanded):
- **Logo**: "N" badge (teal gradient, like current) + "Nagara" text when expanded
- **Nav items** (icon + label when expanded):
  - Home (house icon) — `/projects`
  - Current Project section (dynamic, shows when inside a project):
    - Workbooks (notebook icon)
    - Datasets (table icon)
    - Connections (plug icon)
  - Separator
  - Settings (gear icon)
- **Collapse/expand** toggle at bottom

### Typography

| Element | Size | Weight | Font |
|---------|------|--------|------|
| Page title (H1) | 20px | 600 | System sans-serif |
| Section header (H2) | 16px | 600 | System sans-serif |
| Table header | 12px | 500 | System sans-serif, uppercase, letter-spacing: 0.5px |
| Body text | 14px | 400 | System sans-serif |
| Code | 13px | 400 | JetBrains Mono |
| Small/caption | 12px | 400 | System sans-serif |

### Spacing Scale

Following Blueprint's 8px grid: `4, 8, 12, 16, 20, 24, 32, 40, 48`

### Component Patterns

**Tables** (for lists — projects, workbooks, datasets, connections):
- Header row: uppercase, 12px, `--text-muted`, bottom border
- Body rows: 14px, `--text-primary`, subtle bottom border, hover highlight
- Action column on right (Open, Edit, Delete)
- No heavy alternating row colors — just hover state

**Cards** (not used much — tables are the Foundry way for lists)

**Badges/Pills**:
- Source type: small rounded pill with icon + text
  - PostgreSQL: blue pill
  - Kafka: orange pill
  - CSV: gray pill
  - Workbook: teal pill

**Buttons**:
- Primary: `--n-blue-3` background, white text, 6px border-radius
- Secondary: transparent, `--border-default` border, `--text-primary` text
- Danger: `--n-red-3` background

**Node styles** (in workbook graph):
- Dataset nodes: Blue-tinted (`--n-blue-1` bg in dark, light blue in light)
- Transform nodes: Surface color (`--bg-surface`)
- Selected: Blue border + subtle glow
- Executing: Orange border + pulse animation
- Success: Green border (brief flash)
- Error: Red border

---

## 6. Backend Architecture

### File Structure

```
backend/
├── main.py                    # FastAPI app, lifespan, middleware
├── config.py                  # Settings (DB URL, Spark config)
├── database.py                # SQLAlchemy async engine + session
├── models/
│   ├── __init__.py
│   ├── project.py             # Project SQLAlchemy model
│   ├── workbook.py            # Workbook SQLAlchemy model
│   ├── dataset.py             # Dataset SQLAlchemy model
│   └── connection.py          # Connection SQLAlchemy model
├── schemas/
│   ├── __init__.py
│   ├── project.py             # Pydantic schemas (create/update/response)
│   ├── workbook.py            # Pydantic schemas
│   ├── dataset.py             # Pydantic schemas
│   └── connection.py          # Pydantic schemas
├── routers/
│   ├── __init__.py
│   ├── projects.py            # /api/projects/* endpoints
│   ├── workbooks.py           # /api/projects/:pid/workbooks/* endpoints
│   ├── datasets.py            # /api/projects/:pid/datasets/* endpoints
│   ├── connections.py         # /api/projects/:pid/connections/* endpoints
│   ├── execution.py           # /api/workbooks/:wid/nodes/:nid/execute
│   └── health.py              # /api/health
├── services/
│   ├── __init__.py
│   ├── project_service.py     # Project business logic
│   ├── workbook_service.py    # Workbook CRUD + persistence
│   ├── dataset_service.py     # Dataset registry + preview
│   ├── connection_service.py  # Connection CRUD + testing + import
│   └── execution_service.py   # WorkbookExecutor wrapper
├── connectors/
│   ├── __init__.py
│   ├── base.py                # Abstract connector interface
│   ├── postgresql.py          # PostgreSQL connector (test, list_tables, read)
│   ├── kafka.py               # Kafka connector (test, list_topics, read)
│   ├── file.py                # File connector (CSV, Parquet, JSON)
│   ├── jdbc.py                # Generic JDBC connector
│   └── registry.py            # Connector type → class mapping
├── execution/
│   ├── __init__.py
│   ├── executor.py            # CodeExecutor (existing, cleaned up)
│   ├── workbook_executor.py   # WorkbookExecutor (existing, cleaned up)
│   └── spark_manager.py       # SparkSession lifecycle (existing)
├── migrations/
│   ├── env.py                 # Alembic config
│   └── versions/
│       └── 001_initial.py     # Initial migration
├── alembic.ini
└── requirements.txt
```

### Key Design Decisions

1. **SQLAlchemy async** with `asyncpg` — async all the way, no blocking the event loop
2. **Alembic** for migrations — proper schema evolution
3. **Pydantic v2** schemas separate from SQLAlchemy models — clean separation
4. **Connector abstraction** — `BaseConnector` with `test()`, `list_resources()`, `read_dataframe()` methods
5. **Execution service** wraps the existing WorkbookExecutor but loads workbook from DB instead of file
6. **SparkSession** remains a singleton — shared across all workbook executions (single-user for now)

### Connector Interface

```python
from abc import ABC, abstractmethod
from pyspark.sql import DataFrame, SparkSession

class BaseConnector(ABC):
    def __init__(self, config: dict, spark: SparkSession):
        self.config = config
        self.spark = spark

    @abstractmethod
    def test_connection(self) -> dict:
        """Test if connection is valid. Returns {status, message}."""
        pass

    @abstractmethod
    def list_resources(self) -> list[dict]:
        """List available resources (tables, topics, files). Returns [{name, type, ...}]."""
        pass

    @abstractmethod
    def read_dataframe(self, resource: str, limit: int | None = None) -> DataFrame:
        """Read a resource into a Spark DataFrame."""
        pass
```

### PostgreSQL Connection Setup

```python
# config.py
DATABASE_URL = "postgresql+asyncpg://nagara:nagara@localhost:5432/nagara"

# database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

engine = create_async_engine(DATABASE_URL)
async_session = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session
```

---

## 7. Frontend Architecture

### File Structure

```
frontend/src/
├── main.tsx
├── App.tsx                           # Router setup
├── api/
│   ├── client.ts                     # Axios/fetch base config
│   ├── projects.ts                   # Project API calls
│   ├── workbooks.ts                  # Workbook API calls
│   ├── datasets.ts                   # Dataset API calls
│   └── connections.ts                # Connection API calls
├── providers/
│   ├── ThemeProvider.tsx             # Light/dark theme (existing)
│   └── WorkbookProvider.tsx          # Workbook state (existing, scoped to workbook page)
├── layouts/
│   ├── AppLayout.tsx                 # Global layout (sidebar + content area)
│   └── Sidebar.tsx                   # Persistent navigation sidebar
├── pages/
│   ├── ProjectListPage.tsx           # /projects
│   ├── ProjectHomePage.tsx           # /projects/:id (tabbed: workbooks, datasets, connections)
│   ├── WorkbookPage.tsx              # /projects/:id/workbooks/:wid (existing workbook editor)
│   ├── DatasetDetailPage.tsx         # /projects/:id/datasets/:did
│   └── ConnectionDetailPage.tsx      # /projects/:id/connections/:cid
├── components/
│   ├── shared/
│   │   ├── DataPreviewTable.tsx      # Existing — reused in dataset preview + workbook preview
│   │   ├── StatusBadge.tsx           # Reusable status pill
│   │   ├── ConnectorIcon.tsx         # Icon for each connector type
│   │   ├── EmptyState.tsx            # Empty state placeholder
│   │   └── PageHeader.tsx            # Page title + description + actions
│   ├── projects/
│   │   ├── ProjectTable.tsx          # Table of projects
│   │   └── NewProjectDialog.tsx      # Create project dialog
│   ├── workbook/                     # Everything from current components/
│   │   ├── WorkbookFrame.tsx
│   │   ├── WorkbookTopBar.tsx
│   │   ├── ContentsSidebar.tsx
│   │   ├── MainContent.tsx
│   │   ├── graph/
│   │   │   ├── GraphCanvas.tsx
│   │   │   ├── DatasetNode.tsx
│   │   │   ├── TransformNode.tsx
│   │   │   └── GraphToolbar.tsx
│   │   ├── editor/
│   │   │   ├── NodeEditorPanel.tsx
│   │   │   ├── CodeTab.tsx
│   │   │   ├── PreviewTab.tsx
│   │   │   └── SchemaTab.tsx
│   │   ├── sidebar/
│   │   │   ├── RightSidebar.tsx
│   │   │   ├── ConsolePanel.tsx
│   │   │   └── GlobalCodePanel.tsx
│   │   └── dialogs/
│   │       ├── ImportDatasetDialog.tsx  # Enhanced: browse project datasets + connections
│   │       └── NewTransformDialog.tsx
│   ├── datasets/
│   │   ├── DatasetTable.tsx           # Table of datasets
│   │   ├── DatasetPreview.tsx         # Preview tab content
│   │   ├── DatasetSchema.tsx          # Schema tab content
│   │   └── NewDatasetDialog.tsx       # Create/import dataset
│   └── connections/
│       ├── ConnectionTable.tsx        # Table of connections
│       ├── ConnectionForm.tsx         # Dynamic form for connection config
│       ├── ConnectorPicker.tsx        # Grid of connector type cards
│       └── NewConnectionDialog.tsx    # Multi-step dialog
├── hooks/
│   ├── useWebSocket.ts               # Existing
│   ├── useProject.ts                 # Fetch + cache current project
│   └── useAutoSave.ts                # Debounced save hook
├── types/
│   ├── workbook.ts                   # Existing types
│   ├── project.ts                    # Project types
│   ├── dataset.ts                    # Dataset types
│   └── connection.ts                 # Connection types
├── utils/
│   ├── apiBase.ts                    # Existing (Codespaces URL detection)
│   ├── autoLayout.ts                 # Existing (dagre layout)
│   └── topologicalSort.ts            # Existing
└── styles/
    ├── global.css                    # Base styles, CSS variables, reset
    └── workbook.css                  # Workbook-specific (existing, renamed)
```

### Routing

```tsx
// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import ProjectListPage from './pages/ProjectListPage'
import ProjectHomePage from './pages/ProjectHomePage'
import WorkbookPage from './pages/WorkbookPage'
import DatasetDetailPage from './pages/DatasetDetailPage'
import ConnectionDetailPage from './pages/ConnectionDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/projects" />} />
          <Route path="/projects" element={<ProjectListPage />} />
          <Route path="/projects/:projectId" element={<ProjectHomePage />} />
          <Route path="/projects/:projectId/workbooks/:workbookId" element={<WorkbookPage />} />
          <Route path="/projects/:projectId/datasets/:datasetId" element={<DatasetDetailPage />} />
          <Route path="/projects/:projectId/connections/:connectionId" element={<ConnectionDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

### New Dependencies

```json
{
  "react-router-dom": "^6.x",
  "@tanstack/react-query": "^5.x"  // Optional: for API state management
}
```

We can start without react-query and add it later if needed. Simple `useEffect` + `useState` patterns work fine for now.

---

## 8. Implementation Phases

### Phase 1: Foundation (PostgreSQL + Projects + Routing)

**Backend**:
1. Set up PostgreSQL (docker-compose or local install)
2. Create `database.py`, `config.py`
3. Create SQLAlchemy models (`projects`, `workbooks`, `datasets`, `connections`)
4. Set up Alembic, run initial migration
5. Create project router + service (CRUD)
6. Migrate workbook from file-based to DB-based
7. Update `main.py` — mount routers, update lifespan

**Frontend**:
1. Install `react-router-dom`
2. Create `AppLayout.tsx` with persistent sidebar
3. Create `ProjectListPage.tsx` with table
4. Create `ProjectHomePage.tsx` with tabs
5. Wrap existing workbook in `WorkbookPage.tsx` under route
6. Apply new CSS variables (Foundry palette)
7. Update all colors across existing components

**Deliverable**: Can create projects, navigate between them, open workbooks — data persisted in PostgreSQL.

### Phase 2: Datasets + Connections

**Backend**:
1. Dataset router + service (CRUD + preview + schema)
2. Connection router + service (CRUD + test)
3. Connector implementations (PostgreSQL, File, Kafka, JDBC)
4. Import endpoint (connection → dataset)
5. "Save as Dataset" endpoint (workbook node → dataset)

**Frontend**:
1. Dataset list + detail pages
2. Connection list + new connection dialog (multi-step)
3. Enhanced Import Dataset dialog in workbook (browse project datasets + connections)
4. Connection test UI (real-time feedback)

**Deliverable**: Can configure a PostgreSQL connection, test it, import a table as a dataset, use that dataset in a workbook.

### Phase 3: Polish + Integration

1. Breadcrumb navigation (Projects > My Project > Workbook Name)
2. Search (quick search across projects, workbooks, datasets)
3. Keyboard shortcuts
4. Empty states with helpful CTAs
5. Loading states and error handling
6. Auto-save indicator in workbook
7. CSV upload enhanced (via connection or direct)
8. Dataset lineage view (simple: which workbook/node produced it)

### Phase 4 (Future): Pipelines + Streaming

1. Pipeline model (subset of workbook graph, scheduled)
2. Job runner (cron-based or simple scheduler)
3. Structured Streaming support (Kafka source → transform → sink)
4. CDC support (PostgreSQL logical replication via Debezium/Spark)
5. Job monitoring UI

---

## 9. Open Questions (Self-Answered)

### Q: Should we use an ORM (SQLAlchemy) or raw SQL?
**A**: SQLAlchemy async. It gives us:
- Model validation + relationship loading
- Migration support via Alembic
- Type safety
- Less boilerplate than raw `asyncpg`
- We're already using Pydantic, and SQLAlchemy + Pydantic v2 integrate well

### Q: Should we use react-query or plain fetch?
**A**: Start with plain fetch + `useState`/`useEffect`. The app has modest data fetching needs. If we find ourselves writing the same loading/error/refetch patterns too many times, we can add react-query later. Avoid premature complexity.

### Q: How do we handle the workbook executor now that workbooks come from DB?
**A**: The execution endpoint loads the workbook from PostgreSQL, passes it to the existing `WorkbookExecutor.execute_node()`. The executor doesn't care where the workbook came from — it just needs a `Workbook` object. The SparkSession and executor instances remain singletons.

### Q: How do we handle multiple workbook execution concurrently?
**A**: For now, we don't. Single SparkSession, single user, one execution at a time. This matches the current design. When we go multi-tenant, we'd isolate SparkSessions per user/project.

### Q: Should datasets store actual data or just references?
**A**: References. A dataset row in PostgreSQL stores metadata (schema, row count, source info) and a `file_path` pointing to the actual data (Parquet file on disk). When previewing, we read the Parquet file with Spark. For workbook outputs, we write the DataFrame to a Parquet file when "Save as Dataset" is clicked. This keeps PostgreSQL lean and data files manageable.

### Q: How do we store dataset data files?
**A**: In a `data/` directory under the backend:
```
backend/data/
  projects/<project_id>/
    datasets/<dataset_id>/
      data.parquet
```
When a dataset is created (imported from connection or saved from workbook), the DataFrame is written to this path as Parquet. Preview reads from this path.

### Q: Where do connection passwords/secrets go?
**A**: For MVP, store them in the `config` JSONB column in PostgreSQL (encrypted at rest if the DB supports it). For production, use a secrets manager. We should never return raw passwords in API responses — mask them.

### Q: Should we support light mode?
**A**: Yes, both light and dark. Foundry supports both. Dark mode is default (matches our current UI), light mode for users who prefer it. The CSS variable system makes this easy.

### Q: Docker compose for PostgreSQL?
**A**: Yes. Add a `docker-compose.yml` with PostgreSQL + the backend. The frontend stays as `npm run dev`.

### Q: What about those new components (Editor.tsx, DataTable.tsx, etc.)?
**A**: These are cell-based components for a notebook-style UI. They complement the workbook DAG view — we can integrate them later as an alternative view mode (like Foundry's "Paths" view vs. "Graph" view). For now, they stay as-is. The DataTable component is similar to our existing DataPreviewTable but with a different style — we may consolidate them.

---

## 10. RockTheJVM Use Case Validation

The RockTheJVM Spark Essentials capstone (NYC Yellow Taxi analysis) should be fully manageable in our enhanced IDE. Here's how:

### Course repos:
- [spark-essentials](https://github.com/rockthejvm/spark-essentials) — DataFrames, SQL, RDDs
- [spark-streaming](https://github.com/rockthejvm/spark-streaming) — Structured Streaming, Kafka, DStreams
- [spark-optimization](https://github.com/rockthejvm/spark-optimization) — Query plans, broadcast joins
- [spark-performance-tuning](https://github.com/rockthejvm/spark-performance-tuning) — Catalyst, Tungsten, caching

### Capstone workflow in Nagara:

**Project**: "NYC Taxi Analysis"

**Connections**:
- File connection → `data/yellow_taxi_jan_25_2018/` (CSV)
- File connection → `data/taxi_zones.csv`

**Datasets**:
- `yellow_taxi_trips` (imported from file connection)
- `taxi_zones` (imported from file connection)

**Workbook 1: "Exploration"**:
- Dataset node: `yellow_taxi_trips`
- Dataset node: `taxi_zones`
- Transform (SQL): `SELECT Borough, COUNT(*) FROM taxi_zones GROUP BY Borough`
- Transform (Python): Zone pickup/dropoff analysis with joins

**Workbook 2: "Analysis"**:
- All 9 analytical questions from `TaxiApplication.scala`:
  1. Geographic distribution (pickups/dropoffs by zone)
  2. Borough analysis
  3. Peak hours
  4. Trip length distribution
  5. Peak hours by trip type
  6. Popular routes (pickup→dropoff pairs)
  7. Payment methods
  8. Payment evolution over time
  9. Ride-sharing potential (5-minute window grouping)

**Workbook 3: "Economic Impact"**:
- Ride-sharing economic model from `TaxiEconomicImpact.scala`
- 5-minute interval grouping
- Acceptance rate modeling
- Cost reduction calculations

Each of these maps cleanly to our DAG-based workbook with Dataset + Transform nodes, Python and SQL support, and project-level dataset sharing.

### Streaming use case (Phase 4):
The spark-streaming course covers Kafka → Structured Streaming → sinks. This maps to our Phase 4 pipeline builder with Kafka connections and streaming execution mode.

---

## Summary

| What | How | Priority |
|------|-----|----------|
| PostgreSQL persistence | SQLAlchemy async + Alembic migrations | Phase 1 |
| Projects | CRUD + list page + home page | Phase 1 |
| Multi-workbook | Workbooks scoped to projects, DB-backed | Phase 1 |
| Foundry UI | Blueprint palette, persistent sidebar, table-based lists | Phase 1 |
| React Router | Page-based navigation | Phase 1 |
| Datasets | Registry + preview + schema + import | Phase 2 |
| Data Connections | PostgreSQL, Kafka, File, JDBC connectors | Phase 2 |
| Polish | Breadcrumbs, search, loading states, error handling | Phase 3 |
| Pipelines | Scheduled workbook subgraphs | Phase 4 |
| Streaming | Structured Streaming + Kafka | Phase 4 |
