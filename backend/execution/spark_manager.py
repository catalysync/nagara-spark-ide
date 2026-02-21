"""SparkSession lifecycle management."""

from pyspark.sql import SparkSession

_spark: SparkSession | None = None


def get_spark() -> SparkSession:
    """Get or create the global SparkSession."""
    global _spark
    if _spark is None or _spark._jsc.sc().isStopped():
        _spark = (
            SparkSession.builder
            .master("local[*]")
            .appName("Nagara Spark IDE")
            .config("spark.driver.memory", "2g")
            .config("spark.sql.repl.eagerEval.enabled", "true")
            .config("spark.sql.session.timeZone", "UTC")
            .config("spark.ui.enabled", "true")
            .config("spark.ui.port", "4040")
            .getOrCreate()
        )
        _spark.sparkContext.setLogLevel("WARN")
    return _spark


def stop_spark():
    """Stop the SparkSession."""
    global _spark
    if _spark is not None:
        _spark.stop()
        _spark = None
