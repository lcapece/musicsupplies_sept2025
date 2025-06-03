python"""
Complete usage examples for FrameShift.
"""

import pandas as pd
from frameshift import RedshiftLoader


def basic_example():
    """Basic usage example."""
    # Create sample DataFrame
    df = pd.DataFrame({
        'id': [1, 2, 3, 4, 5],
        'name': ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'],
        'age': [25, 30, 35, 28, 32],
        'salary': [50000.0, 60000.0, 70000.0, 55000.0, 65000.0],
        'is_active': [True, True, False, True, True]
    })
    
    # Initialize loader (replace with your actual credentials)
    loader = RedshiftLoader(
        host='your-redshift-cluster.amazonaws.com',
        port=5439,
        database='your_database',
        user='your_username', 
        password='your_password'
    )
    
    try:
        # Load DataFrame to Redshift
        result = loader.load_dataframe(
            df=df,
            table_name='employees',
            schema='public',
            if_exists='replace',  # This will drop and recreate the table
            chunk_size_mb=15,
            auto_create=True
        )
        print("✅ DataFrame loaded successfully!")
        print(f"📊 Result: {result}")
        
    except Exception as e:
        print(f"❌ Error loading DataFrame: {e}")
    
    finally:
        loader.close()


def advanced_redshift_example():
    """Advanced example showing all new Redshift-specific features."""
    
    # Create a DataFrame with some reserved words as column names
    df = pd.DataFrame({
        'user_id': [1, 2, 3, 4, 5],
        'name': ['Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince', 'Eve Adams'],
        'group': ['admin', 'user', 'user', 'admin', 'user'],  # 'group' is reserved
        'order': [1, 2, 3, 4, 5],  # 'order' is reserved  
        'created_date': pd.to_datetime(['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05']),
        'region': ['east', 'west', 'east', 'north', 'south'],
        'revenue': [1000.50, 2500.75, 1800.25, 3200.00, 1600.80]
    })
    
    with RedshiftLoader(
        host='your-redshift-cluster.amazonaws.com',
        port=5439,
        database='your_database',
        user='your_username',
        password='your_password'
    ) as loader:
        
        print("🧪 Testing DDL Generation Only...")
        # Test table creation without actually creating it
        test_result = loader.load_dataframe(
            df=df,
            redshift_destination="analytics.user_metrics",
            redshift_define_pk='user_id',
            fix_reserved_words=True,  # Will rename 'group' and 'order' columns
            sortkey=['created_date', 'region'],  # Compound sort key
            diststyle='key',
            distkey='region',  # Distribute by region
            compress_columns={
                'name': 'lzo',
                'group_col': 'zstd',  # Note: will be renamed from 'group'
                'region': 'lzo'
            },
            test_only=True  # Only test the DDL
        )
        print(f"DDL Test Result: {test_result}")
        
        print("\n📊 Estimating Transfer Time...")
        # Estimate how long the transfer will take
        estimate_result = loader.load_dataframe(
            df=df,
            redshift_destination="analytics.user_metrics_estimate",
            chunk_size_mb=15,
            estimate_only=True
        )
        print(f"Transfer Estimate: {estimate_result}")


def mock_data_performance_test():
    """Comprehensive example using mock data to test FrameShift performance."""
    try:
        from frameshift import MockDataGenerator
    except ImportError:
        print("❌ MockDataGenerator not available. Install with: pip install FrameShift[mock]")
        return
    
    # Create reproducible mock data
    mock = MockDataGenerator(seed=42)
    
    print("🏭 Generating Large Business Dataset...")
    df_business = mock.generate_business_dataframe(
        rows=100000,      # 100K records
        columns=50,       # 50 columns wide  
        include_reserved_words=True,
        include_nulls=True,
        null_percentage=0.05
    )
    
    print("🛒 Generating E-commerce Dataset...")
    df_ecommerce = mock.generate_ecommerce_dataframe(rows=25000)
    
    print("👥 Generating Customer Dataset...")
    df_customers = mock.generate_customer_dataframe(rows=5000)
    
    with RedshiftLoader(
        host='your-redshift-cluster.amazonaws.com',
        port=5439,
        database='your_database',
        user='your_username',
        password='your_password'
    ) as loader:
        
        print("\n📊 Testing Large Business Dataset...")
        
        # First, estimate the transfer time
        estimate = loader.load_dataframe(
            df=df_business,
            redshift_destination="analytics.business_data_100k",
            redshift_define_pk='customer_id',
            fix_reserved_words=True,  # Handle reserved column names
            sortkey=['created_at', 'region'],
            diststyle='key',
            distkey='region',
            compress_columns={
                'full_name': 'lzo',
                'address': 'lzo', 
                'company': 'zstd',
                'product_category': 'zstd',
                'department': 'zstd'
            },
            estimate_only=True
        )
        
        print(f"⏱️ Estimated transfer time: {estimate['estimated_total_time']:.1f}s for {estimate['total_chunks']} chunks")
        print(f"📦 First chunk: {estimate['first_chunk_rows']:,} rows in {estimate['first_chunk_time']:.2f}s")


def primary_key_examples():
    """Examples showing different primary key options."""
    
    # Example 1: Explicit single primary key
    df1 = pd.DataFrame({
        'user_id': [1, 2, 3, 4],
        'username': ['alice', 'bob', 'charlie', 'diana'],
        'email': ['alice@example.com', 'bob@example.com', 'charlie@example.com', 'diana@example.com'],
        'created_at': pd.to_datetime(['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04'])
    })
    
    with RedshiftLoader(
        host='your-redshift-cluster.amazonaws.com',
        port=5439,
        database='your_database',
        user='your_username',
        password='your_password'
    ) as loader:
        
        # Single column primary key
        result1 = loader.load_dataframe(
            df=df1,
            table_name='users',
            schema='public',
            redshift_define_pk='user_id',  # Single PK
            if_exists='replace'
        )
        print("✅ Users table created with single primary key!")
        
        # Example 2: Composite primary key
        df2 = pd.DataFrame({
            'user_id': [1, 1, 2, 2, 3],
            'product_id': [101, 102, 101, 103, 101],
            'purchase_date': pd.to_datetime(['2023-01-01', '2023-01-02', '2023-01-01', '2023-01-03', '2023-01-02']),
            'quantity': [2, 1, 3, 1, 2],
            'price': [19.99, 29.99, 19.99, 39.99, 19.99]
        })
        
        # Composite primary key
        result2 = loader.load_dataframe(
            df=df2,
            table_name='purchases',
            schema='public', 
            redshift_define_pk=['user_id', 'product_id', 'purchase_date'],  # Composite PK
            if_exists='replace'
        )
        print("✅ Purchases table created with composite primary key!")


if __name__ == "__main__":
    print("FrameShift Usage Examples")
    print("=" * 50)
    
    print("\n1. Basic Example:")
    # basic_example()  # Uncomment and add real credentials to run
    
    print("\n2. Advanced Redshift Features:")
    # advanced_redshift_example()  # Uncomment and add real credentials to run
    
    print("\n3. Primary Key Examples:")
    # primary_key_examples()  # Uncomment and add real credentials to run
    
    print("\n4. Mock Data Performance Test:")
    # mock_data_performance_test()  # Uncomment and add real credentials to run
    
    print("\n🔧 Update the connection parameters with your actual Redshift credentials to run these examples.")
    print("\n🚀 Features Available:")
    print("  • Reserved word handling with auto-renaming")
    print("  • Redshift-specific DDL (SORTKEY, DISTSTYLE, DISTKEY)")
    print("  • Column compression options")
    print("  • DDL testing with temporary tables")
    print("  • Transfer time estimation")
    print("  • Auto primary key detection")
    print("  • UTF-8 encoding validation")
    print("  • Automatic backup creation")
    print("  • Mock data generation for testing")