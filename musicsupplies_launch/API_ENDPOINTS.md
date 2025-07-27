# API Endpoints & Supabase Functions Documentation

## Supabase Edge Functions

### 1. **assign-introductory-promo-to-account**
- **Purpose**: Assigns introductory promotional codes to customer accounts
- **Method**: POST
- **Authentication**: Required
- **Usage**: Automatically assigns intro promos when accounts are created or activated

### 2. **get-applicable-intro-promo**
- **Purpose**: Retrieves applicable introductory promotions for an account
- **Method**: GET
- **Authentication**: Required
- **Parameters**: 
  - `account_number` - The customer account number
- **Returns**: Applicable promo code details

### 3. **get-promotional-offers-status**
- **Purpose**: Checks the status of promotional offers for an account
- **Method**: GET
- **Authentication**: Required
- **Returns**: Status of available promotional offers

### 4. **record-intro-promo-usage**
- **Purpose**: Records when an introductory promo code is used
- **Method**: POST
- **Authentication**: Required
- **Parameters**:
  - `promo_code_id` - ID of the promo code used
  - `account_number` - Customer account number
  - `order_value` - Total order value
  - `discount_amount` - Discount amount applied

### 5. **send-mailgun-email**
- **Purpose**: Sends emails via Mailgun API
- **Method**: POST
- **Authentication**: Required
- **Parameters**:
  - `to` - Recipient email address
  - `subject` - Email subject
  - `html` - HTML content of the email
  - `from` - Sender email address (optional)

### 6. **send-order-sms**
- **Purpose**: Sends SMS notifications for orders via ClickSend
- **Method**: POST
- **Authentication**: Required
- **Parameters**:
  - `phone_number` - Recipient phone number
  - `message` - SMS message content
  - `order_id` - Associated order ID

## Supabase Database Functions

### Authentication Functions
- **authenticate_user(account_or_email, password)** - Custom authentication function
- **authenticate(identifier, password)** - Unified authentication with account/email support

### Promo Code Functions
- **get_all_promo_codes()** - Retrieves all active promo codes
- **get_best_promo_code(account_number, order_value)** - Finds the best applicable promo code
- **validate_promo_code(code, account_number, order_value)** - Validates a promo code
- **record_promo_usage(promo_id, account_number, order_value, discount_amount)** - Records promo usage

### Utility Functions
- **exec_sql(sql_statement)** - Execute arbitrary SQL (admin only)
- **truncate_stg_update_skus()** - Truncate staging table for SKU updates

## Database Tables & RLS Policies

### Core Tables
1. **accounts_lcmd** - Customer account information
2. **products_supabase** - Product catalog
3. **pre_products_supabase** - Product staging table
4. **web_orders** - Order records
5. **promo_codes** - Promotional code definitions
6. **promo_code_usage** - Promo code usage tracking
7. **login_activity_log** - Authentication audit trail
8. **unresolved_issues** - Issue tracking
9. **treeview_datasource** - Category tree structure

### Row Level Security (RLS)
All tables implement RLS policies for:
- Public read access for product data
- Authenticated access for account-specific data
- Admin-only access for sensitive operations
- Account-specific access restrictions

## API Usage Patterns

### Authentication Flow
```typescript
// Login
const { data, error } = await supabase.rpc('authenticate', {
  identifier: accountNumberOrEmail,
  password: password
});
```

### Promo Code Validation
```typescript
// Validate promo code
const { data, error } = await supabase.rpc('validate_promo_code', {
  code: promoCode,
  account_number: accountNumber,
  order_value: cartTotal
});
```

### Order Processing
```typescript
// Create order
const { data: order, error } = await supabase
  .from('web_orders')
  .insert({
    account_number: accountNumber,
    order_total: total,
    items: cartItems,
    promo_code_used: promoCode
  });

// Send order confirmation
await supabase.functions.invoke('send-order-sms', {
  body: {
    phone_number: customerPhone,
    message: confirmationMessage,
    order_id: order.id
  }
});
```

### Product Queries
```typescript
// Get products with categories
const { data: products } = await supabase
  .from('products_supabase')
  .select('*')
  .eq('prdmaincat', mainCategory)
  .eq('prdsubcat', subCategory)
  .gt('inventory', 0);
```

## Error Handling
All API calls should implement error handling:
```typescript
try {
  const { data, error } = await supabase.rpc('function_name', params);
  if (error) throw error;
  // Process data
} catch (error) {
  console.error('API Error:', error);
  // Handle error appropriately
}
```

## Rate Limiting & Security
- Edge functions have built-in rate limiting
- All functions require authentication except public product queries
- Sensitive operations require admin privileges
- CORS is configured for production domains