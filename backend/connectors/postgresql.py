"""PostgreSQL connector."""

from connectors.base import BaseConnector


class PostgreSQLConnector(BaseConnector):
    """Connect to PostgreSQL databases via JDBC."""

    @property
    def jdbc_url(self) -> str:
        host = self.config.get("host", "localhost")
        port = self.config.get("port", 5432)
        database = self.config.get("database", "postgres")
        return f"jdbc:postgresql://{host}:{port}/{database}"

    @property
    def _user(self) -> str:
        return self.config.get("user", self.config.get("username", ""))

    @property
    def _password(self) -> str:
        return self.config.get("password", "")

    @property
    def jdbc_properties(self) -> dict:
        return {
            "user": self._user,
            "password": self._password,
            "driver": "org.postgresql.Driver",
        }

    def test_connection(self) -> dict:
        try:
            import psycopg2
            conn = psycopg2.connect(
                host=self.config.get("host", "localhost"),
                port=self.config.get("port", 5432),
                dbname=self.config.get("database", "postgres"),
                user=self._user,
                password=self._password,
                connect_timeout=10,
            )
            cursor = conn.cursor()
            cursor.execute("SELECT version()")
            version = cursor.fetchone()[0]
            cursor.close()
            conn.close()
            return {"status": "connected", "message": "Connection successful", "details": {"version": version}}
        except Exception as e:
            return {"status": "error", "message": str(e), "details": {}}

    def list_resources(self) -> list[dict]:
        try:
            import psycopg2
            conn = psycopg2.connect(
                host=self.config.get("host", "localhost"),
                port=self.config.get("port", 5432),
                dbname=self.config.get("database", "postgres"),
                user=self._user,
                password=self._password,
                connect_timeout=10,
            )
            cursor = conn.cursor()
            schema = self.config.get("schema", "public")
            cursor.execute("""
                SELECT table_name, table_type
                FROM information_schema.tables
                WHERE table_schema = %s
                ORDER BY table_name
            """, (schema,))
            tables = [{"name": row[0], "type": row[1].lower()} for row in cursor.fetchall()]
            cursor.close()
            conn.close()
            return tables
        except Exception as e:
            return []

    def read_dataframe(self, resource: str, limit: int | None = None):
        schema = self.config.get("schema", "public")
        table = f"{schema}.{resource}"
        if limit:
            query = f"(SELECT * FROM {table} LIMIT {limit}) AS t"
            return self.spark.read.jdbc(self.jdbc_url, query, properties=self.jdbc_properties)
        return self.spark.read.jdbc(self.jdbc_url, table, properties=self.jdbc_properties)
