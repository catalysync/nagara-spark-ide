"""Abstract base connector."""

from abc import ABC, abstractmethod
from pyspark.sql import DataFrame, SparkSession


class BaseConnector(ABC):
    """Base class for all data source connectors."""

    def __init__(self, config: dict, spark: SparkSession):
        self.config = config
        self.spark = spark

    @abstractmethod
    def test_connection(self) -> dict:
        """Test if connection is valid. Returns {status, message, details}."""
        pass

    @abstractmethod
    def list_resources(self) -> list[dict]:
        """List available resources (tables, topics, files). Returns [{name, type, ...}]."""
        pass

    @abstractmethod
    def read_dataframe(self, resource: str, limit: int | None = None) -> DataFrame:
        """Read a resource into a Spark DataFrame."""
        pass
