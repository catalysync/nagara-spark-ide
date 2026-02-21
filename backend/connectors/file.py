"""File-based connector (CSV, Parquet, JSON)."""

import os
from connectors.base import BaseConnector


class FileConnector(BaseConnector):
    """Read from local files (CSV, Parquet, JSON)."""

    def test_connection(self) -> dict:
        path = self.config.get("path", "")
        if not path:
            return {"status": "error", "message": "No path provided", "details": {}}
        if not os.path.exists(path):
            return {"status": "error", "message": f"Path not found: {path}", "details": {}}
        return {"status": "connected", "message": f"Path exists: {path}", "details": {"path": path}}

    def list_resources(self) -> list[dict]:
        path = self.config.get("path", "")
        if not path or not os.path.exists(path):
            return []
        if os.path.isfile(path):
            return [{"name": os.path.basename(path), "type": self._detect_format(path)}]
        resources = []
        for f in sorted(os.listdir(path)):
            full = os.path.join(path, f)
            if os.path.isfile(full):
                resources.append({"name": f, "type": self._detect_format(f)})
            elif os.path.isdir(full):
                # Could be a parquet directory
                resources.append({"name": f, "type": "directory"})
        return resources

    def read_dataframe(self, resource: str, limit: int | None = None):
        path = self.config.get("path", "")
        full_path = os.path.join(path, resource) if not os.path.isfile(path) else path
        fmt = self.config.get("format") or self._detect_format(full_path)
        header = self.config.get("header", True)
        infer_schema = self.config.get("infer_schema", True)

        if fmt == "csv":
            df = self.spark.read.csv(full_path, header=header, inferSchema=infer_schema)
        elif fmt == "parquet":
            df = self.spark.read.parquet(full_path)
        elif fmt == "json":
            df = self.spark.read.json(full_path)
        else:
            df = self.spark.read.csv(full_path, header=header, inferSchema=infer_schema)

        if limit:
            df = df.limit(limit)
        return df

    @staticmethod
    def _detect_format(path: str) -> str:
        ext = os.path.splitext(path)[1].lower()
        return {".csv": "csv", ".parquet": "parquet", ".json": "json", ".jsonl": "json"}.get(ext, "csv")
