"""Generic JDBC connector."""

from connectors.base import BaseConnector


class JDBCConnector(BaseConnector):
    """Connect to any JDBC-compatible database."""

    def test_connection(self) -> dict:
        try:
            url = self.config.get("url", "")
            properties = {
                "user": self.config.get("username", ""),
                "password": self.config.get("password", ""),
            }
            driver = self.config.get("driver", "")
            if driver:
                properties["driver"] = driver
            df = self.spark.read.jdbc(url, "(SELECT 1) AS t", properties=properties)
            df.collect()
            return {"status": "connected", "message": "JDBC connection successful", "details": {}}
        except Exception as e:
            return {"status": "error", "message": str(e), "details": {}}

    def list_resources(self) -> list[dict]:
        # Generic JDBC doesn't easily enumerate tables without DB-specific queries
        return []

    def read_dataframe(self, resource: str, limit: int | None = None):
        url = self.config.get("url", "")
        properties = {
            "user": self.config.get("username", ""),
            "password": self.config.get("password", ""),
        }
        driver = self.config.get("driver", "")
        if driver:
            properties["driver"] = driver
        if limit:
            query = f"(SELECT * FROM {resource} LIMIT {limit}) AS t"
            return self.spark.read.jdbc(url, query, properties=properties)
        return self.spark.read.jdbc(url, resource, properties=properties)
