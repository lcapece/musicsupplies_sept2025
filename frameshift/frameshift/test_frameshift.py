python"""
Basic tests for FrameShift functionality.
"""

import pytest
import sys
from unittest.mock import Mock, patch
import pandas as pd

# Add the parent directory to the path to import frameshift
sys.path.insert(0, '..')

from frameshift import RedshiftLoader
from frameshift.exceptions import FrameShiftError, ConnectionError, DataTypeError


class TestRedshiftLoader:
    """Test cases for RedshiftLoader class."""
    
    def test_init(self):
        """Test RedshiftLoader initialization."""
        loader = RedshiftLoader(
            host="test-host",
            port=5439,
            database="test-db",
            user="test-user",
            password="test-pass"
        )
        
        assert loader.host == "test-host"
        assert loader.port == 5439
        assert loader.database == "test-db"
        assert loader.user == "test-user"
        assert loader.password == "test-pass"
    
    def test_connection_error_no_drivers(self):
        """Test error when no database drivers available."""
        with patch('frameshift.core.HAS_PSYCOPG2', False), \
             patch('frameshift.core.HAS_REDSHIFT_CONNECTOR', False):
            
            with pytest.raises(ConnectionError):
                RedshiftLoader(
                    host="test", port=5439, database="test",
                    user="test", password="test"
                )
    
    def test_clean_identifier(self):
        """Test identifier cleaning functionality."""
        loader = RedshiftLoader(
            host="test", port=5439, database="test",
            user="test", password="test"
        )
        
        # Test space replacement
        assert loader._clean_identifier("test name") == "test_name"
        
        # Test lowercase conversion
        assert loader._clean_identifier("TestName") == "testname"
        
        # Test invalid character replacement
        assert loader._clean_identifier("test-name!") == "test_name_"


class TestMockDataGenerator:
    """Test cases for MockDataGenerator class."""
    
    def test_mock_data_import_error(self):
        """Test error when required dependencies not available."""
        with patch('frameshift.mock_data.HAS_FAKER', False):
            from frameshift.mock_data import MockDataGenerator
            
            with pytest.raises(FrameShiftError):
                MockDataGenerator()


if __name__ == "__main__":
    pytest.main([__file__])