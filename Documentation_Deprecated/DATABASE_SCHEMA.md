# Database Schema Documentation

## Overview
The application uses Supabase (PostgreSQL) with a comprehensive schema for e-commerce operations. The database includes tables for accounts, products, orders, discounts, and system management.

## Core Tables

### accounts_lcmd
Customer account information
```sql
- account_no (text) - Primary key, account number
- name (text) - Company/account name  
- address (text) - Street address
- city (text) - City
- state (text) - State code
- zip (text) - ZIP code
- id (uuid) - Unique identifier
- email_address (text) - Contact email
- mobile_phone (text) - Contact phone
- password (text) - Hashed password
- requires_password_change (boolean) - Password change flag
- sms_consent_given (boolean) - SMS opt-in status
- sms_consent_date (timestamp) - When SMS consent was given
- user_id (uuid) - Links to Supabase auth.users
- is_dirty (boolean) - Data sync flag
- is_special_admin (boolean) - Special admin flag (account 99)
```

### products_supabase
Main product catalog
```sql
- partnumber (text) - Primary key, SKU
- description (text) - Product name/description
- price (numeric) - Selling price
- inventory (integer) - Stock quantity
- prdmaincat (text) - Main category
- prdsubcat (text) - Sub category
- webmsrp (numeric) - List price
- longdescription (text) - Detailed description
- brand (text) - Manufacturer/brand
- map (numeric) - Minimum advertised price
- upc (text) - Universal product code
```

### pre_products_supabase
Staging table for product imports (same structure as products_supabase)

### web_orders
Order records
```sql
- order_no (serial) - Primary key, order number
- account_no (text) - Customer account number
- order_date (timestamp) - When order was placed
- order_total (numeric) - Total order value
- order_status (text) - Order status
- items (jsonb) - Order line items
- promo_code_used (text) - Applied promo code
- discount_amount (numeric) - Discount applied
- shipping_address (jsonb) - Shipping details
```

### promo_codes
Promotional code definitions
```sql
- id (uuid) - Primary key
- code (text) - Promo code string
- name (text) - Display name
- type (text) - 'percent_off' or 'dollars_off'
- value (numeric) - Discount value
- min_order_value (numeric) - Minimum order requirement
- max_uses (integer) - Total usage limit
- uses_remaining (integer) - Remaining uses
- start_date (timestamp) - Valid from date
- end_date (timestamp) - Expiration date
- is_active (boolean) - Active status
- max_uses_per_account (integer) - Per-account limit
- uses_per_account_tracking (boolean) - Track per-account usage
- created_at (timestamp) - Creation timestamp
- updated_at (timestamp) - Last update timestamp
```

### promo_code_usage
Tracks promo code redemptions
```sql
- id (uuid) - Primary key
- promo_code_id (uuid) - References promo_codes
- account_number (text) - Customer account
- order_id (integer) - References web_orders
- used_at (timestamp) - When code was used
- order_value (numeric) - Order total
- discount_amount (numeric) - Discount applied
```

### login_activity_log
Authentication audit trail
```sql
- id (serial) - Primary key
- account_no (text) - Account number used
- identifier_used (text) - Login identifier (account/email)
- login_time (timestamp) - Login timestamp
- login_successful (boolean) - Success status
- ip_address (inet) - Client IP
- user_agent (text) - Browser info
```

### treeview_datasource
Category hierarchy for navigation
```sql
- id (serial) - Primary key
- parent_id (integer) - Parent category
- name (text) - Category name
- level (integer) - Hierarchy level
- icon (text) - Icon identifier
- product_count (integer) - Products in category
```

### unresolved_issues
System issue tracking
```sql
- id (serial) - Primary key
- issue_type (text) - Type of issue
- description (text) - Issue description
- data (jsonb) - Related data
- created_at (timestamp) - When reported
- resolved (boolean) - Resolution status
- resolved_at (timestamp) - When resolved
```

### sms_verification
SMS verification codes
```sql
- id (serial) - Primary key
- phone_number (text) - Phone number
- verification_code (text) - 6-digit code
- created_at (timestamp) - Code creation time
- verified (boolean) - Verification status
- attempts (integer) - Verification attempts
```

### stg_update_skus
Staging table for SKU updates
```sql
- partnumber (text) - Product SKU
- description (text) - Product description
- price (numeric) - Price
- inventory (integer) - Stock level
- brand (text) - Brand name
- map (numeric) - MAP price
```

## Views

### products_view
Combined view of product data with extended information
- Joins products_supabase with rt_extended for additional details

### treeview_view
Formatted category tree for UI display
- Provides hierarchical category structure with product counts

## Database Functions

### Authentication
- `authenticate(identifier, password)` - Unified login function
- `authenticate_user(account_or_email, password)` - Legacy auth function

### Promo Codes
- `get_all_promo_codes()` - List all active promos
- `get_best_promo_code(account, order_value)` - Find optimal promo
- `validate_promo_code(code, account, order_value)` - Validate promo
- `record_promo_usage(promo_id, account, order_value, discount)` - Track usage

### Utilities
- `exec_sql(statement)` - Execute SQL (admin only)
- `truncate_stg_update_skus()` - Clear SKU staging table

## Row Level Security (RLS)

### Public Access
- products_supabase - Read only
- pre_products_supabase - Read only
- treeview_datasource - Read only
- promo_codes - Read only (active codes)

### Authenticated Access
- accounts_lcmd - Own account only
- web_orders - Own orders only
- promo_code_usage - Own usage only
- login_activity_log - Insert only

### Admin Access (account 999)
- All tables - Full access
- Special functions enabled

### Special Admin (account 99)
- stg_update_skus - Full access
- Product import capabilities

## Indexes
Key indexes for performance:
- accounts_lcmd(account_no)
- products_supabase(partnumber)
- products_supabase(prdmaincat, prdsubcat)
- web_orders(account_no, order_date)
- promo_codes(code)
- promo_code_usage(account_number, promo_code_id)

## Migration History
The database schema has evolved through 80+ migrations covering:
1. Initial schema setup (May 2025)
2. Authentication system implementation
3. Product catalog restructuring
4. Discount system implementation
5. SMS/Email integration
6. Admin features
7. Performance optimizations
8. Security enhancements

## Data Integrity
- Foreign key constraints maintain referential integrity
- Check constraints validate data formats
- Triggers update timestamps and track changes
- RLS policies enforce access control