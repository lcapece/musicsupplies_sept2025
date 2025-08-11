# Promo Code Discount Display Fix

## Issue
The promo code discount amount was displaying incorrectly in the shopping cart. When applying a 10% discount on an order of $1.04, the UI was showing $0.01 instead of the correct $0.10.

## Root Cause
The database was correctly calculating the discount (10% of $1.04 = $0.104), but there was a number precision/parsing issue when the discount_amount was being retrieved from the database response and displayed in the frontend.

## Solution
Updated the `applyPromoCode` function in `src/context/CartContext.tsx` to ensure the discount_amount is properly parsed as a number:

```typescript
// Ensure discount_amount is properly parsed as a number
discount_amount: result.discount_amount ? parseFloat(result.discount_amount.toString()) : 0
```

This ensures that the discount amount from the database (which may come as a string or decimal with many precision points) is properly converted to a JavaScript number that displays correctly in the UI.

## Testing
To test the fix:
1. Add items to cart totaling $1.04
2. Apply the SAVE10 promo code (10% off)
3. The discount should now correctly show as $0.10 instead of $0.01
4. The subtotal should be $0.94

## Files Modified
- `src/context/CartContext.tsx` - Added proper number parsing for discount_amount in the applyPromoCode function
