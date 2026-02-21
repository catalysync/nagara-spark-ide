"""Code execution engine with output capture and DataFrame detection."""

import io
import sys
import traceback
import json
from contextlib import redirect_stdout, redirect_stderr
from pyspark.sql import DataFrame, SparkSession


class CodeExecutor:
    """Executes Python/PySpark code with persistent namespace and output capture."""

    def __init__(self, spark: SparkSession):
        self.spark = spark
        self.namespace: dict = {
            "spark": spark,
            "sc": spark.sparkContext,
            "SparkSession": SparkSession,
        }
        # Add common imports to namespace
        exec(
            "from pyspark.sql import functions as F, types as T, Window\n"
            "from pyspark.sql.types import *\n"
            "import pandas as pd\n",
            self.namespace,
        )

    def execute(self, code: str) -> dict:
        """Execute code and return results.

        Returns dict with:
            - stdout: captured print output
            - stderr: captured error output
            - result: string repr of last expression (if any)
            - dataframe: {columns: [...], rows: [...]} if result is a DataFrame
            - error: error message if execution failed
            - status: 'success' or 'error'
        """
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
                # Try to evaluate as expression first (for things like df.show())
                try:
                    # Check if the last line is an expression
                    lines = code.strip().split("\n")
                    if len(lines) > 1:
                        # Execute all but last line as statements
                        exec_code = "\n".join(lines[:-1])
                        exec(compile(exec_code, "<cell>", "exec"), self.namespace)

                    # Try last line as expression
                    last_line = lines[-1].strip()
                    if last_line:
                        try:
                            val = eval(compile(last_line, "<cell>", "eval"), self.namespace)
                            if val is not None:
                                self.namespace["_"] = val
                                if isinstance(val, DataFrame):
                                    result["dataframe"] = self._df_to_dict(val)
                                    result["result"] = f"DataFrame[{', '.join(f'{f.name}: {f.dataType.simpleString()}' for f in val.schema.fields)}]"
                                else:
                                    result["result"] = repr(val)
                        except SyntaxError:
                            # Last line is a statement, not expression
                            exec(compile(last_line, "<cell>", "exec"), self.namespace)
                except SyntaxError:
                    # Whole block is statements
                    exec(compile(code, "<cell>", "exec"), self.namespace)

        except Exception:
            result["error"] = traceback.format_exc()
            result["status"] = "error"

        result["stdout"] = stdout_buf.getvalue()
        result["stderr"] = stderr_buf.getvalue()
        return result

    def _df_to_dict(self, df: DataFrame, limit: int = 100) -> dict:
        """Convert DataFrame to a dict for JSON serialization."""
        rows = df.limit(limit).collect()
        columns = [f.name for f in df.schema.fields]
        types = [f.dataType.simpleString() for f in df.schema.fields]
        return {
            "columns": columns,
            "types": types,
            "rows": [[self._serialize_value(row[col]) for col in columns] for row in rows],
            "total_count": df.count() if len(rows) == limit else len(rows),
            "truncated": len(rows) == limit,
        }

    def _serialize_value(self, val):
        """Serialize a value for JSON."""
        if val is None:
            return None
        if isinstance(val, (int, float, bool, str)):
            return val
        return str(val)

    def get_completions(self, prefix: str) -> list[str]:
        """Get completions for a prefix from the namespace."""
        completions = []
        if "." in prefix:
            parts = prefix.rsplit(".", 1)
            obj_name, attr_prefix = parts[0], parts[1]
            try:
                obj = eval(obj_name, self.namespace)
                for attr in dir(obj):
                    if not attr.startswith("_") and attr.lower().startswith(attr_prefix.lower()):
                        completions.append(f"{obj_name}.{attr}")
            except Exception:
                pass
        else:
            for name in self.namespace:
                if not name.startswith("_") and name.lower().startswith(prefix.lower()):
                    completions.append(name)
        return completions[:50]
