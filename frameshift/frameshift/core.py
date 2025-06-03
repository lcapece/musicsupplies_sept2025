"""
Core functionality for FrameShift DataFrame to Redshift transfers.
"""

import sys
import time
from typing import Dict, Any, Optional, Union, List

from .exceptions import FrameShiftError, ConnectionError, DataTypeError
from .utils import (
    infer_redshift_types,
    chunk_dataframe,
    generate_create_table_sql,
    generate_insert_sql,
    REDSHIFT_RESERVED_WORDS,
    REDSHIFT_SYSTEM_COLUMNS
)

# Optional imports with graceful fallback
try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    pd = None
    HAS_PANDAS = False

try:
    import polars as pl
    HAS_POLARS = True
except ImportError:
    pl = None
    HAS_POLARS = False

try:
    import psycopg2
    from psycopg2.extras import execute_batch
    HAS_PSYCOPG2 = True
except ImportError:
    psycopg2 = None
    HAS_PSYCOPG2 = False

try:
    import redshift_connector
    HAS_REDSHIFT_CONNECTOR = True
except ImportError:
    redshift_connector = None
    HAS_REDSHIFT_CONNECTOR = False


class RedshiftLoader:
    """
    Main class for loading DataFrames into AWS Redshift.
    
    Supports both Pandas and Polars DataFrames with automatic
    chunking and DDL generation.
    """
    
    def __init__(
        self,
        host: str,
        port: int,
        database: str,
        user: str,
        password: str,
        connector: str = "auto"
    ):
        """
        Initialize RedshiftLoader with connection parameters.
        
        Args:
            host: Redshift cluster endpoint
            port: Port number (typically 5439)
            database: Database name
            user: Username
            password: Password
            connector: 'psycopg2', 'redshift_connector', or 'auto'
        """
        self.host = host
        self.port = port
        self.database = database
        self.user = user
        self.password = password
        self.connector = self._determine_connector(connector)
        self.connection = None
        
    def _determine_connector(self, connector: str) -> str:
        """Determine which database connector to use."""
        if connector == "auto":
            if HAS_PSYCOPG2:
                return "psycopg2"
            elif HAS_REDSHIFT_CONNECTOR:
                return "redshift_connector"
            else:
                raise ConnectionError(
                    "No supported database connector found. "
                    "Install psycopg2-binary or redshift-connector."
                )
        elif connector == "psycopg2" and not HAS_PSYCOPG2:
            raise ConnectionError("psycopg2 not installed")
        elif connector == "redshift_connector" and not HAS_REDSHIFT_CONNECTOR:
            raise ConnectionError("redshift-connector not installed")
        
        return connector
    
    def connect(self):
        """Establish connection to Redshift."""
        try:
            if self.connector == "psycopg2":
                self.connection = psycopg2.connect(
                    host=self.host,
                    port=self.port,
                    database=self.database,
                    user=self.user,
                    password=self.password
                )
            else:  # redshift_connector
                self.connection = redshift_connector.connect(
                    host=self.host,
                    port=self.port,
                    database=self.database,
                    user=self.user,
                    password=self.password
                )
        except Exception as e:
            raise ConnectionError(f"Failed to connect to Redshift: {str(e)}")
    
    def load_dataframe(
        self,
        df: Union["pd.DataFrame", "pl.DataFrame"],
        table_name: Optional[str] = None,
        schema: str = "public",
        if_exists: str = "fail",
        chunk_size_mb: int = 15,
        auto_create: bool = True,
        column_types: Optional[Dict[str, str]] = None,
        redshift_define_pk: Optional[Union[str, List[str], bool]] = None,
        fix_reserved_words: bool = True,
        redshift_destination: Optional[str] = None,
        sortkey: Optional[Union[str, List[str]]] = None,
        diststyle: Optional[str] = None,
        distkey: Optional[str] = None,
        test_only: bool = False,
        estimate_only: bool = False,
        validate_encoding: bool = True,
        compress_columns: Optional[Dict[str, str]] = None,
        backup: bool = True
    ):
        """
        Load DataFrame into Redshift table with comprehensive options.
        
        Args:
            df: Pandas or Polars DataFrame
            table_name: Target table name (optional if redshift_destination specified)
            schema: Schema name (default: 'public', ignored if redshift_destination used)
            if_exists: 'fail', 'replace', or 'append'
            chunk_size_mb: Chunk size in MB for inserts (default: 15MB for optimal performance)
            auto_create: Automatically create table if it doesn't exist
            column_types: Optional column type mapping
            redshift_define_pk: Primary key specification:
                - String: single column PK
                - List: composite PK 
                - True/"auto": validate index uniqueness and use as PK
                - None/False: no primary key
            fix_reserved_words: If True, append "_col" suffix to reserved words; if False, halt on reserved words
            redshift_destination: Full destination as "schema.table" (overrides schema/table_name)
            sortkey: Column(s) for SORTKEY - string for single, list for compound
            diststyle: Distribution style - 'even', 'all', 'auto', or None
            distkey: Column name for distribution key (requires diststyle='key')
            test_only: Create temporary table to test DDL, then drop (returns success/failure)
            estimate_only: Estimate transfer time using first chunk timing
            validate_encoding: Validate UTF-8 encoding compliance
            compress_columns: Dict of column name -> compression type ('lzo', 'zstd', 'delta', etc.)
            backup: Create backup table before replace operations
        """
        # Validate DataFrame type
        if not (HAS_PANDAS and isinstance(df, pd.DataFrame)) and \
           not (HAS_POLARS and isinstance(df, pl.DataFrame)):
            raise DataTypeError(
                "DataFrame must be pandas.DataFrame or polars.DataFrame"
            )
        
        # Connect if not already connected
        if not self.connection:
            self.connect()
        
        try:
            # Convert Polars to Pandas if needed (for simplicity)
            if HAS_POLARS and isinstance(df, pl.DataFrame):
                df = df.to_pandas()
            
            # Determine destination table
            if redshift_destination:
                if '.' in redshift_destination:
                    schema, table_name = redshift_destination.split('.', 1)
                else:
                    table_name = redshift_destination
            elif not table_name:
                # Use DataFrame name or default
                if hasattr(df, 'name') and df.name:
                    table_name = df.name
                else:
                    table_name = "dataframe_table"
            
            # Clean table name per Redshift rules
            table_name = self._clean_identifier(table_name)
            full_table_name = f"{schema}.{table_name}"
            
            # Validate encoding if requested
            if validate_encoding:
                self._validate_utf8_encoding(df)
            
            # Handle reserved words in column names
            df_cleaned, column_mapping = self._handle_reserved_words(df, fix_reserved_words)
            
            # Handle primary key definition
            pk_columns = self._process_primary_key(df_cleaned, redshift_define_pk)
            
            # Infer column types if not provided
            if not column_types:
                column_types = infer_redshift_types(df_cleaned)
            
            # Validate distribution and sort keys
            self._validate_keys(df_cleaned.columns, sortkey, distkey)
            
            # Test only mode
            if test_only:
                return self._test_table_ddl(
                    full_table_name, df_cleaned.columns, column_types, 
                    pk_columns, sortkey, diststyle, distkey, compress_columns
                )
            
            # Estimate only mode  
            if estimate_only:
                return self._estimate_transfer_time(df_cleaned, chunk_size_mb, full_table_name)
            
            # Handle table existence and backup
            if backup and if_exists == "replace":
                self._create_backup_table(full_table_name)
            
            if auto_create or if_exists == "replace":
                self._create_or_replace_table(
                    full_table_name, df_cleaned.columns, column_types, if_exists, 
                    pk_columns, sortkey, diststyle, distkey, compress_columns
                )
            
            # Insert data in chunks
            result = self._insert_dataframe_chunked(df_cleaned, full_table_name, chunk_size_mb)
            
            # Return summary info
            return {
                'status': 'success',
                'table': full_table_name,
                'rows_inserted': len(df_cleaned),
                'column_mapping': column_mapping,
                'chunks_processed': result['chunks'],
                'total_time': result['total_time']
            }
            
        except Exception as e:
            if self.connection:
                self.connection.rollback()
            raise FrameShiftError(f"Failed to load DataFrame: {str(e)}")
    
    def _clean_identifier(self, name: str) -> str:
        """Clean identifier according to Redshift naming rules."""
        import re
        
        # Replace spaces with underscores
        name = name.replace(' ', '_')
        
        # Remove or replace invalid characters, keep only UTF-8 printable
        # For simplicity, keep alphanumeric, underscore, dollar sign
        name = re.sub(r'[^\w$]', '_', name)
        
        # Ensure it starts with letter or underscore
        if name and not (name[0].isalpha() or name[0] == '_'):
            name = f"col_{name}"
        
        # Limit to 127 bytes (be conservative with UTF-8)
        if len(name.encode('utf-8')) > 127:
            name = name[:120] + "_trunc"
        
        return name.lower()
    
    def _validate_utf8_encoding(self, df: "pd.DataFrame"):
        """Validate that all string data is valid UTF-8."""
        for col in df.select_dtypes(include=['object']).columns:
            try:
                df[col].astype(str).str.encode('utf-8')
            except UnicodeEncodeError as e:
                raise DataTypeError(f"Invalid UTF-8 encoding in column '{col}': {str(e)}")
    
    def _handle_reserved_words(self, df: "pd.DataFrame", fix_reserved_words: bool):
        """Handle reserved words in column names."""
        column_mapping = {}
        df_cleaned = df.copy()
        
        for col in df.columns:
            if col.upper() in REDSHIFT_RESERVED_WORDS or col.lower() in REDSHIFT_SYSTEM_COLUMNS:
                if not fix_reserved_words:
                    raise DataTypeError(
                        f"Column '{col}' is a Redshift reserved word. "
                        f"Set fix_reserved_words=True to automatically rename."
                    )
                
                new_col = f"{col}_col"
                df_cleaned = df_cleaned.rename(columns={col: new_col})
                column_mapping[col] = new_col
        
        return df_cleaned, column_mapping
    
    def _process_primary_key(self, df: "pd.DataFrame", redshift_define_pk):
        """Process primary key specification."""
        if redshift_define_pk is None or redshift_define_pk is False:
            return None
        
        if redshift_define_pk is True or redshift_define_pk == "auto":
            # Validate index uniqueness and use as PK
            if not df.index.equals(pd.RangeIndex(len(df))):
                # Check if index is truly unique
                if df.index.is_unique:
                    if hasattr(df.index, 'names') and df.index.names[0] is not None:
                        pk_columns = [name for name in df.index.names if name is not None]
                        # Reset index to make it part of regular columns
                        df = df.reset_index()
                        return pk_columns
                    else:
                        # Single unnamed index
                        df = df.reset_index(names=['auto_pk_id'])
                        return ['auto_pk_id']
                else:
                    raise DataTypeError("Index is not unique, cannot use as primary key")
            else:
                raise DataTypeError("No meaningful index found for auto primary key")
        
        elif isinstance(redshift_define_pk, str):
            if redshift_define_pk not in df.columns:
                raise DataTypeError(f"Primary key column '{redshift_define_pk}' not found")
            return [redshift_define_pk]
        
        elif isinstance(redshift_define_pk, list):
            missing_cols = [col for col in redshift_define_pk if col not in df.columns]
            if missing_cols:
                raise DataTypeError(f"Primary key columns not found: {missing_cols}")
            
            # Validate composite key uniqueness
            if not df[redshift_define_pk].drop_duplicates().shape[0] == df.shape[0]:
                raise DataTypeError("Specified primary key columns do not form a unique constraint")
            
            return redshift_define_pk
        
        return None
    
    def _validate_keys(self, columns, sortkey, distkey):
        """Validate sort and distribution keys exist in columns."""
        if sortkey:
            if isinstance(sortkey, str):
                sortkey = [sortkey]
            missing = [col for col in sortkey if col not in columns]
            if missing:
                raise DataTypeError(f"SORTKEY columns not found: {missing}")
        
        if distkey and distkey not in columns:
            raise DataTypeError(f"DISTKEY column '{distkey}' not found")
    
    def _test_table_ddl(self, full_table_name, columns, column_types, 
                       pk_columns, sortkey, diststyle, distkey, compress_columns):
        """Test table creation with temporary table."""
        temp_table = f"temp_{full_table_name.split('.')[-1]}_{int(time.time())}"
        
        try:
            cursor = self.connection.cursor()
            
            create_sql = generate_create_table_sql(
                temp_table, columns, column_types, pk_columns,
                sortkey, diststyle, distkey, compress_columns, temporary=True
            )
            
            cursor.execute(create_sql)
            cursor.execute(f"DROP TABLE {temp_table}")
            self.connection.commit()
            cursor.close()
            
            return {'status': 'success', 'message': 'DDL validation passed'}
            
        except Exception as e:
            self.connection.rollback()
            return {'status': 'failed', 'error': str(e)}
    
    def _estimate_transfer_time(self, df, chunk_size_mb, full_table_name):
        """Estimate transfer time using first chunk."""
        chunks = list(chunk_dataframe(df, chunk_size_mb))
        total_chunks = len(chunks)
        
        if total_chunks == 0:
            return {'status': 'empty', 'message': 'DataFrame is empty'}
        
        # Create temporary table for timing test
        temp_table = f"temp_estimate_{int(time.time())}"
        
        try:
            cursor = self.connection.cursor()
            
            # Create temp table
            column_types = infer_redshift_types(chunks[0])
            create_sql = generate_create_table_sql(
                temp_table, chunks[0].columns, column_types, temporary=True
            )
            cursor.execute(create_sql)
            
            # Time first chunk insert
            start_time = time.time()
            insert_sql = generate_insert_sql(temp_table, chunks[0].columns)
            values = [tuple(row) for row in chunks[0].values]
            
            if self.connector == "psycopg2":
                execute_batch(cursor, insert_sql, values)
            else:
                cursor.executemany(insert_sql, values)
            
            chunk_time = time.time() - start_time
            
            # Clean up
            cursor.execute(f"DROP TABLE {temp_table}")
            self.connection.commit()
            cursor.close()
            
            # Calculate estimates
            estimated_total_time = chunk_time * total_chunks
            
            return {
                'status': 'estimated',
                'first_chunk_time': round(chunk_time, 2),
                'total_chunks': total_chunks,
                'estimated_total_time': round(estimated_total_time, 2),
                'chunk_size_mb': chunk_size_mb,
                'total_rows': len(df),
                'first_chunk_rows': len(chunks[0])
            }
            
        except Exception as e:
            self.connection.rollback()
            return {'status': 'failed', 'error': str(e)}
    
    def _create_backup_table(self, full_table_name):
        """Create backup table before replace operation."""
        backup_name = f"{full_table_name}_backup_{int(time.time())}"
        
        try:
            cursor = self.connection.cursor()
            cursor.execute(f"CREATE TABLE {backup_name} AS SELECT * FROM {full_table_name}")
            self.connection.commit()
            cursor.close()
            print(f"📋 Backup created: {backup_name}")
        except Exception:
            # Table might not exist, which is fine
            pass
    
    def _create_or_replace_table(
        self, 
        full_table_name: str, 
        columns: List[str], 
        column_types: Dict[str, str],
        if_exists: str,
        primary_key: Optional[List[str]] = None,
        sortkey: Optional[Union[str, List[str]]] = None,
        diststyle: Optional[str] = None,
        distkey: Optional[str] = None,
        compress_columns: Optional[Dict[str, str]] = None
    ):
        """Create or replace table based on DataFrame schema."""
        cursor = self.connection.cursor()
        
        if if_exists == "replace":
            cursor.execute(f"DROP TABLE IF EXISTS {full_table_name}")
        
        create_sql = generate_create_table_sql(
            full_table_name, columns, column_types, primary_key,
            sortkey, diststyle, distkey, compress_columns
        )
        cursor.execute(create_sql)
        self.connection.commit()
        cursor.close()
    
    def _insert_dataframe_chunked(
        self, 
        df: "pd.DataFrame", 
        full_table_name: str, 
        chunk_size_mb: int
    ):
        """Insert DataFrame data in optimized chunks."""
        chunks = list(chunk_dataframe(df, chunk_size_mb))
        cursor = self.connection.cursor()
        total_start_time = time.time()
        
        for i, chunk in enumerate(chunks):
            chunk_start = time.time()
            insert_sql = generate_insert_sql(full_table_name, chunk.columns)
            values = [tuple(row) for row in chunk.values]
            
            if self.connector == "psycopg2":
                execute_batch(cursor, insert_sql, values)
            else:
                cursor.executemany(insert_sql, values)
            
            chunk_time = time.time() - chunk_start
            print(f"✅ Chunk {i+1}/{len(chunks)} completed ({len(chunk)} rows) in {chunk_time:.2f}s")
        
        total_time = time.time() - total_start_time
        self.connection.commit()
        cursor.close()
        
        return {
            'chunks': len(chunks),
            'total_time': total_time
        }
    
    def close(self):
        """Close the database connection."""
        if self.connection:
            self.connection.close()
            self.connection = None
    
    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()