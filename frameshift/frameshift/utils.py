Utility functions for FrameShift operations.
"""

import sys
from typing import Dict, List, Generator, Union, Any, Optional
import math

# Handle optional pandas import
try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    pd = None
    HAS_PANDAS = False


def infer_redshift_types(df: "pd.DataFrame") -> Dict[str, str]:
    """
    Infer Redshift column types from pandas DataFrame.
    
    Args:
        df: Pandas DataFrame
        
    Returns:
        Dictionary mapping column names to Redshift types
    """
    type_mapping = {
        'int64': 'BIGINT',
        'int32': 'INTEGER', 
        'int16': 'SMALLINT',
        'float64': 'DOUBLE PRECISION',
        'float32': 'REAL',
        'bool': 'BOOLEAN',
        'datetime64[ns]': 'TIMESTAMP',
        'object': 'VARCHAR(256)'  # Default for strings
    }
    
    column_types = {}
    for col in df.columns:
        dtype_str = str(df[col].dtype)
        
        if dtype_str.startswith('datetime64'):
            column_types[col] = 'TIMESTAMP'
        elif dtype_str in type_mapping:
            column_types[col] = type_mapping[dtype_str]
        elif dtype_str == 'object':
            # Try to infer better string length
            max_len = df[col].astype(str).str.len().max()
            if pd.isna(max_len):
                max_len = 256
            else:
                max_len = min(max(int(max_len * 1.2), 10), 65535)  # Buffer + limits
            column_types[col] = f'VARCHAR({max_len})'
        else:
            column_types[col] = 'VARCHAR(256)'  # Safe default
    
    return column_types


def chunk_dataframe(df: "pd.DataFrame", chunk_size_mb: int) -> Generator["pd.DataFrame", None, None]:
    """
    Chunk DataFrame into smaller pieces based on memory size.
    
    Args:
        df: Pandas DataFrame to chunk
        chunk_size_mb: Target chunk size in megabytes
        
    Yields:
        DataFrame chunks
    """
    if df.empty:
        return
    
    # Estimate memory usage per row
    memory_usage = df.memory_usage(deep=True).sum()
    avg_row_size = memory_usage / len(df)
    
    # Calculate rows per chunk
    chunk_size_bytes = chunk_size_mb * 1024 * 1024
    rows_per_chunk = max(1, int(chunk_size_bytes / avg_row_size))
    
    # Yield chunks
    for start_idx in range(0, len(df), rows_per_chunk):
        end_idx = min(start_idx + rows_per_chunk, len(df))
        yield df.iloc[start_idx:end_idx].copy()


def generate_create_table_sql(
    table_name: str, 
    columns: List[str], 
    column_types: Dict[str, str],
    primary_key: Optional[List[str]] = None,
    sortkey: Optional[Union[str, List[str]]] = None,
    diststyle: Optional[str] = None,
    distkey: Optional[str] = None,
    compress_columns: Optional[Dict[str, str]] = None,
    temporary: bool = False
) -> str:
    """
    Generate CREATE TABLE SQL statement with Redshift-specific options.
    
    Args:
        table_name: Full table name (schema.table)
        columns: List of column names
        column_types: Mapping of column names to types
        primary_key: List of column names for primary key (None for no PK)
        sortkey: Column name(s) for SORTKEY
        diststyle: Distribution style ('even', 'all', 'auto', 'key')
        distkey: Column name for distribution key
        compress_columns: Dict of column name -> compression type
        temporary: Create as temporary table
        
    Returns:
        CREATE TABLE SQL statement
    """
    column_definitions = []
    for col in columns:
        col_type = column_types.get(col, 'VARCHAR(256)')
        
        # Escape column names that might be reserved words
        escaped_col = f'"{col}"' if col.upper() in REDSHIFT_RESERVED_WORDS else col
        
        # Add compression if specified
        compression = ""
        if compress_columns and col in compress_columns:
            compression = f" ENCODE {compress_columns[col].upper()}"
        
        column_definitions.append(f"{escaped_col} {col_type}{compression}")
    
    columns_sql = ",\n    ".join(column_definitions)
    
    # Add primary key constraint if specified
    if primary_key:
        escaped_pk_cols = []
        for pk_col in primary_key:
            escaped_pk = f'"{pk_col}"' if pk_