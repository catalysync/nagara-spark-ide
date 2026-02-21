"""Connector type registry."""

from pyspark.sql import SparkSession

from connectors.base import BaseConnector
from connectors.postgresql import PostgreSQLConnector
from connectors.kafka import KafkaConnector
from connectors.file import FileConnector
from connectors.jdbc import JDBCConnector

CONNECTOR_TYPES: dict[str, type[BaseConnector]] = {
    "postgresql": PostgreSQLConnector,
    "kafka": KafkaConnector,
    "file": FileConnector,
    "csv_file": FileConnector,
    "jdbc": JDBCConnector,
}


def get_connector(connector_type: str, config: dict, spark: SparkSession) -> BaseConnector:
    cls = CONNECTOR_TYPES.get(connector_type)
    if not cls:
        raise ValueError(f"Unknown connector type: {connector_type}. Available: {list(CONNECTOR_TYPES.keys())}")
    return cls(config, spark)
