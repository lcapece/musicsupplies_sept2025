python"""
Custom exceptions for FrameShift operations.
"""


class FrameShiftError(Exception):
    """Base exception for FrameShift operations."""
    pass


class ConnectionError(FrameShiftError):
    """Raised when database connection fails."""
    pass


class DataTypeError(FrameShiftError):
    """Raised when DataFrame or data type issues occur."""
    pass


class TableError(FrameShiftError):
    """Raised when table operations fail."""
    pass


class ChunkingError(FrameShiftError):
    """Raised when DataFrame chunking fails."""
    pass