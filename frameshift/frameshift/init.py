python"""
FrameShift: Transfer DataFrames to AWS Redshift without S3.

A Python library for efficiently loading Pandas and Polars DataFrames 
directly into AWS Redshift using optimized multi-row inserts.
"""

__version__ = "0.1.0"
__author__ = "Louis Capece"
__email__ = "louis@dataautomation.ai"

from .core import RedshiftLoader
from .exceptions import FrameShiftError, ConnectionError, DataTypeError

# Optional mock data generation
try:
    from .mock_data import MockDataGenerator
    __all__ = [
        "RedshiftLoader",
        "FrameShiftError", 
        "ConnectionError",
        "DataTypeError",
        "MockDataGenerator"
    ]
except ImportError:
    # Faker not installed
    __all__ = [
        "RedshiftLoader",
        "FrameShiftError", 
        "ConnectionError",
        "DataTypeError"
    ]