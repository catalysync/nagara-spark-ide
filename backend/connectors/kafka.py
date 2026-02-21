"""Kafka / Redpanda connector."""

from connectors.base import BaseConnector


class KafkaConnector(BaseConnector):
    """Connect to Kafka or Redpanda clusters."""

    def test_connection(self) -> dict:
        try:
            from kafka import KafkaConsumer
            bootstrap = self.config.get("bootstrap_servers", "localhost:9092")
            consumer = KafkaConsumer(
                bootstrap_servers=bootstrap,
                consumer_timeout_ms=5000,
            )
            topics = list(consumer.topics())
            consumer.close()
            return {
                "status": "connected",
                "message": f"Connected. {len(topics)} topics found.",
                "details": {"topics": topics},
            }
        except Exception as e:
            return {"status": "error", "message": str(e), "details": {}}

    def list_resources(self) -> list[dict]:
        try:
            from kafka import KafkaConsumer
            bootstrap = self.config.get("bootstrap_servers", "localhost:9092")
            consumer = KafkaConsumer(
                bootstrap_servers=bootstrap,
                consumer_timeout_ms=5000,
            )
            topics = sorted(consumer.topics())
            consumer.close()
            return [{"name": t, "type": "topic"} for t in topics]
        except Exception:
            return []

    def read_dataframe(self, resource: str, limit: int | None = None):
        bootstrap = self.config.get("bootstrap_servers", "localhost:9092")
        df = (
            self.spark.read
            .format("kafka")
            .option("kafka.bootstrap.servers", bootstrap)
            .option("subscribe", resource)
            .option("startingOffsets", "earliest")
            .load()
        )
        # Kafka returns key/value as binary — cast to string
        from pyspark.sql import functions as F
        df = df.select(
            F.col("key").cast("string").alias("key"),
            F.col("value").cast("string").alias("value"),
            F.col("topic"),
            F.col("partition"),
            F.col("offset"),
            F.col("timestamp"),
        )
        if limit:
            df = df.limit(limit)
        return df
