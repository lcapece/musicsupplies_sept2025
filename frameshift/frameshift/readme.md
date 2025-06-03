markdown# FrameShift

Transfer your Dataframes to AWS Redshift without access to S3 for COPY operations. While not nearly as fast as a highly parallel COPY command, Redshift's ability to perform multi-row insert is surprisingly fast.

## Overview

FrameShift is a Python library designed to transfer small to medium sized Pandas or Polars DataFrames to AWS Redshift **WITHOUT** needing S3 or other supported mediums like DynamoDB or EMR. 

While not nearly as fast as a highly parallel COPY command, Redshift's ability to perform multi-row insert is surprisingly fast. This library takes advantage of that capability, chunking your DataFrame into parts up to 15MB per insert. Additionally, FrameShift will automate all the Redshift table DDL and column datatype transposition.

FrameShift fills the gaps for one-off loads into Redshift when write access to an S3 bucket may not be readily available.

## Features

- 🚀 **Direct DataFrame to Redshift** - No S3 intermediate storage required
- 📊 **Multi-DataFrame Support** - Works with both Pandas and Polars
- 🔄 **Automatic DDL Generation** - Creates tables and handles column datatypes automatically  
- ⚡ **Optimized Chunking** - Efficiently chunks data into 15MB inserts for optimal performance
- 🛡️ **Connection Flexibility** - Supports both psycopg2 and redshift-connector
- 🎯 **Perfect for Ad-hoc Loads** - Ideal when S3 access isn't available
- 🔑 **Primary Key Support** - Single, composite, and auto-detected primary keys
- 🏷️ **Reserved Word Handling** - Automatic detection and renaming of Redshift reserved words
- 🎛️ **Redshift Optimization** - SORTKEY, DISTSTYLE, DISTKEY, and column compression
- 🧪 **Testing & Estimation** - DDL validation and transfer time estimation
- 🎭 **Mock Data Generation** - Generate realistic test datasets with 100K+ records

## Installation

```bash
# Basic installation
pip install FrameShift

# With pandas support
pip install FrameShift[pandas]

# With polars support  
pip install FrameShift[polars]

# With redshift connection support
pip install FrameShift[redshift]

# With mock data generation
pip install FrameShift[mock]

# Install everything
pip install FrameShift[all]
Quick Start