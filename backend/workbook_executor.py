"""DAG-aware workbook execution engine."""

import io
import traceback
from collections import defaultdict
from contextlib import redirect_stdout, redirect_stderr

from pyspark.sql import DataFrame, SparkSession
from models import Workbook, NodeType, Language


class WorkbookExecutor:
    """Executes workbook nodes with DAG dependency resolution."""

    def __init__(self, spark: SparkSession):
        self.spark = spark
        self.node_cache: dict[str, DataFrame] = {}
        self.node_code_hash: dict[str, str] = {}
        self.console_namespace: dict = {
            "spark": spark,
            "sc": spark.sparkContext,
            "SparkSession": SparkSession,
        }
        # Pre-import common libraries into console
        exec(
            "from pyspark.sql import functions as F, types as T, Window\n"
            "from pyspark.sql.types import *\n"
            "import pandas as pd\n",
            self.console_namespace,
        )

    def execute_node(self, workbook: Workbook, node_id: str, preview: bool = False) -> dict:
        """Execute a node, resolving upstream dependencies first."""
        node = self._find_node(workbook, node_id)
        if not node:
            return {"status": "error", "error": f"Node '{node_id}' not found"}

        # Get execution order (topological sort of upstream)
        try:
            exec_order = self._get_execution_order(workbook, node_id)
        except ValueError as e:
            return {"status": "error", "error": str(e)}

        # Execute each node in order
        last_result = None
        for nid in exec_order:
            n = self._find_node(workbook, nid)
            if not n:
                continue

            # Check cache (skip if code hasn't changed)
            code_hash = f"{n.code}:{workbook.global_code}"
            if nid in self.node_cache and self.node_code_hash.get(nid) == code_hash and nid != node_id:
                continue

            # Gather upstream DataFrames
            upstream_dfs = self._get_upstream_dfs(workbook, nid)

            # Execute
            result = self._execute_single_node(n, upstream_dfs, workbook.global_code, preview=(preview and nid == node_id))

            if result["status"] == "error":
                if nid == node_id:
                    return result
                return {"status": "error", "error": f"Upstream node '{n.name}' failed:\n{result.get('error', '')}"}

            # Cache the DataFrame if produced
            if result.get("_dataframe_obj") is not None:
                self.node_cache[nid] = result["_dataframe_obj"]
                self.node_code_hash[nid] = code_hash
                # Make available in console namespace
                safe_name = n.name.replace(" ", "_").replace("-", "_")
                self.console_namespace[safe_name] = result["_dataframe_obj"]

            if nid == node_id:
                last_result = result

        if last_result is None:
            return {"status": "success", "stdout": "", "result": None}

        # Remove internal _dataframe_obj before returning
        last_result.pop("_dataframe_obj", None)
        return last_result

    def _execute_single_node(self, node, upstream_dfs: dict[str, DataFrame], global_code: str, preview: bool = False) -> dict:
        """Execute a single node's code."""
        stdout_buf = io.StringIO()
        stderr_buf = io.StringIO()
        result = {
            "stdout": "",
            "stderr": "",
            "result": None,
            "dataframe": None,
            "_dataframe_obj": None,
            "error": None,
            "status": "success",
        }

        try:
            if node.type == NodeType.DATASET:
                # Dataset nodes: execute code that produces a DataFrame
                namespace = {
                    "spark": self.spark,
                    "sc": self.spark.sparkContext,
                    **upstream_dfs,
                }
                with redirect_stdout(stdout_buf), redirect_stderr(stderr_buf):
                    exec(compile(global_code, "<global>", "exec"), namespace)
                    if node.code.strip():
                        exec(compile(node.code, f"<{node.name}>", "exec"), namespace)
                # Look for a DataFrame in namespace
                df = self._find_dataframe_result(namespace, node.code)
                if df is not None:
                    result["_dataframe_obj"] = df
                    result["dataframe"] = self._df_to_dict(df, limit=50 if preview else 100)
                    result["result"] = f"DataFrame[{', '.join(f'{f.name}: {f.dataType.simpleString()}' for f in df.schema.fields)}]"

            elif node.language == Language.SQL:
                # Register upstream DFs as temp views
                for name, df in upstream_dfs.items():
                    df.createOrReplaceTempView(name)
                with redirect_stdout(stdout_buf), redirect_stderr(stderr_buf):
                    df = self.spark.sql(node.code)
                result["_dataframe_obj"] = df
                result["dataframe"] = self._df_to_dict(df, limit=50 if preview else 100)
                result["result"] = f"DataFrame[{', '.join(f'{f.name}: {f.dataType.simpleString()}' for f in df.schema.fields)}]"

            else:  # Python transform
                namespace = {
                    "spark": self.spark,
                    "sc": self.spark.sparkContext,
                    **upstream_dfs,
                }
                with redirect_stdout(stdout_buf), redirect_stderr(stderr_buf):
                    exec(compile(global_code, "<global>", "exec"), namespace)
                    # Try expression eval on last line
                    lines = node.code.strip().split("\n")
                    if len(lines) > 1:
                        exec(compile("\n".join(lines[:-1]), f"<{node.name}>", "exec"), namespace)
                    last_line = lines[-1].strip() if lines else ""
                    val = None
                    if last_line:
                        try:
                            val = eval(compile(last_line, f"<{node.name}>", "eval"), namespace)
                        except SyntaxError:
                            exec(compile(last_line, f"<{node.name}>", "exec"), namespace)
                            val = self._find_dataframe_result(namespace, node.code)

                    if val is None:
                        val = self._find_dataframe_result(namespace, node.code)

                    if isinstance(val, DataFrame):
                        result["_dataframe_obj"] = val
                        result["dataframe"] = self._df_to_dict(val, limit=50 if preview else 100)
                        result["result"] = f"DataFrame[{', '.join(f'{f.name}: {f.dataType.simpleString()}' for f in val.schema.fields)}]"
                    elif val is not None:
                        result["result"] = repr(val)

        except Exception:
            result["error"] = traceback.format_exc()
            result["status"] = "error"

        result["stdout"] = stdout_buf.getvalue()
        result["stderr"] = stderr_buf.getvalue()
        return result

    def _find_dataframe_result(self, namespace: dict, code: str) -> DataFrame | None:
        """Try to find a DataFrame result from the namespace."""
        # Check _ (last expression)
        if "_" in namespace and isinstance(namespace["_"], DataFrame):
            return namespace["_"]
        # Check last assigned variable
        import ast
        try:
            tree = ast.parse(code)
            for node in reversed(tree.body):
                if isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name) and target.id in namespace:
                            if isinstance(namespace[target.id], DataFrame):
                                return namespace[target.id]
        except SyntaxError:
            pass
        return None

    def execute_console(self, code: str) -> dict:
        """Execute code in the console REPL."""
        stdout_buf = io.StringIO()
        stderr_buf = io.StringIO()
        result = {
            "stdout": "",
            "stderr": "",
            "result": None,
            "dataframe": None,
            "error": None,
            "status": "success",
        }

        try:
            with redirect_stdout(stdout_buf), redirect_stderr(stderr_buf):
                lines = code.strip().split("\n")
                if len(lines) > 1:
                    exec(compile("\n".join(lines[:-1]), "<console>", "exec"), self.console_namespace)
                last_line = lines[-1].strip() if lines else ""
                if last_line:
                    try:
                        val = eval(compile(last_line, "<console>", "eval"), self.console_namespace)
                        if val is not None:
                            self.console_namespace["_"] = val
                            if isinstance(val, DataFrame):
                                result["dataframe"] = self._df_to_dict(val)
                                result["result"] = f"DataFrame[{', '.join(f'{f.name}: {f.dataType.simpleString()}' for f in val.schema.fields)}]"
                            else:
                                result["result"] = repr(val)
                    except SyntaxError:
                        exec(compile(last_line, "<console>", "exec"), self.console_namespace)
        except Exception:
            result["error"] = traceback.format_exc()
            result["status"] = "error"

        result["stdout"] = stdout_buf.getvalue()
        result["stderr"] = stderr_buf.getvalue()
        return result

    def get_node_schema(self, node_id: str) -> list[dict] | None:
        """Get cached schema for a node."""
        df = self.node_cache.get(node_id)
        if df is None:
            return None
        return [
            {"name": f.name, "type": f.dataType.simpleString(), "nullable": f.nullable}
            for f in df.schema.fields
        ]

    def invalidate_node(self, node_id: str, workbook: Workbook):
        """Invalidate cache for a node and all downstream."""
        to_invalidate = {node_id}
        # BFS downstream
        adj = defaultdict(list)
        for edge in workbook.edges:
            adj[edge.source].append(edge.target)
        queue = [node_id]
        while queue:
            current = queue.pop(0)
            for child in adj[current]:
                if child not in to_invalidate:
                    to_invalidate.add(child)
                    queue.append(child)
        for nid in to_invalidate:
            self.node_cache.pop(nid, None)
            self.node_code_hash.pop(nid, None)

    def _get_execution_order(self, workbook: Workbook, target_id: str) -> list[str]:
        """Get topological execution order for all upstream nodes of target."""
        # Build adjacency (target -> sources)
        reverse_adj = defaultdict(list)
        for edge in workbook.edges:
            reverse_adj[edge.target].append(edge.source)

        # Collect all upstream nodes
        upstream = set()
        stack = [target_id]
        while stack:
            nid = stack.pop()
            if nid in upstream:
                continue
            upstream.add(nid)
            for src in reverse_adj[nid]:
                stack.append(src)

        # Topological sort (Kahn's algorithm)
        in_degree = defaultdict(int)
        adj = defaultdict(list)
        for edge in workbook.edges:
            if edge.source in upstream and edge.target in upstream:
                adj[edge.source].append(edge.target)
                in_degree[edge.target] += 1

        queue = [n for n in upstream if in_degree[n] == 0]
        order = []
        while queue:
            queue.sort()  # deterministic
            nid = queue.pop(0)
            order.append(nid)
            for child in adj[nid]:
                in_degree[child] -= 1
                if in_degree[child] == 0:
                    queue.append(child)

        if len(order) != len(upstream):
            raise ValueError("Cycle detected in workbook graph")

        return order

    def _get_upstream_dfs(self, workbook: Workbook, node_id: str) -> dict[str, DataFrame]:
        """Get cached DataFrames for all direct upstream nodes."""
        dfs = {}
        for edge in workbook.edges:
            if edge.target == node_id:
                src_node = self._find_node(workbook, edge.source)
                if src_node and edge.source in self.node_cache:
                    safe_name = src_node.name.replace(" ", "_").replace("-", "_")
                    dfs[safe_name] = self.node_cache[edge.source]
        return dfs

    def _find_node(self, workbook: Workbook, node_id: str):
        """Find a node by ID."""
        for node in workbook.nodes:
            if node.id == node_id:
                return node
        return None

    def _df_to_dict(self, df: DataFrame, limit: int = 100) -> dict:
        """Convert DataFrame to JSON-serializable dict."""
        rows = df.limit(limit).collect()
        columns = [f.name for f in df.schema.fields]
        types = [f.dataType.simpleString() for f in df.schema.fields]
        return {
            "columns": columns,
            "types": types,
            "rows": [[self._serialize(row[c]) for c in columns] for row in rows],
            "total_count": df.count() if len(rows) == limit else len(rows),
            "truncated": len(rows) == limit,
        }

    def _serialize(self, val):
        if val is None:
            return None
        if isinstance(val, (int, float, bool, str)):
            return val
        return str(val)
