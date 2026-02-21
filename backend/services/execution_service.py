"""Execution service — wraps WorkbookExecutor for DB-backed workbooks."""

from execution.spark_manager import get_spark, stop_spark
from execution.workbook_executor import WorkbookExecutor
from execution.executor import CodeExecutor


# Singleton instances
_wb_executor: WorkbookExecutor | None = None
_console_executor: CodeExecutor | None = None


def get_wb_executor() -> WorkbookExecutor:
    global _wb_executor
    if _wb_executor is None:
        spark = get_spark()
        _wb_executor = WorkbookExecutor(spark)
    return _wb_executor


def get_console_executor() -> CodeExecutor:
    global _console_executor
    if _console_executor is None:
        spark = get_spark()
        _console_executor = CodeExecutor(spark)
    return _console_executor


def init_execution():
    """Initialize Spark + executors at startup."""
    get_wb_executor()
    get_console_executor()


def shutdown_execution():
    """Clean up Spark at shutdown."""
    stop_spark()
