import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, User, Product, PromoCodeValidity } from '../types'; // Ensure Product is imported
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// Define a type for the introductory promo details we expect from the function
interface IntroductoryPromo {
  id: number;
  name?: string;
  description?: string;
  discount_type: string;
  value: number; // Percentage value, e.g., 5 for 5%
  max_orders?: number;
  is_active?: boolean;
  uses_remaining?: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (partnumber: string) => void;
  updateQuantity: (partnumber: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  placeOrder: (paymentMethod: 'credit' | 'net10', customerEmail: string, customerPhone: string) => Promise<string>;
  applicableIntroPromo: IntroductoryPromo | null;
  // Promo code features
  applyPromoCode: (code: string) => Promise<PromoCodeValidity>;
  removePromoCode: () => void;
  appliedPromoCode: PromoCodeValidity | null;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalItems: 0,
  totalPrice: 0,
  placeOrder: async () => '',
  applicableIntroPromo: null,
  // Promo code features
  applyPromoCode: async () => ({ is_valid: false, message: '', discount_amount: 0 }),
  removePromoCode: () => {},
  appliedPromoCode: null,
});

export const useCart = () => useContext(CartContext);

let nextOrderNumber = 750000; 

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedItems = JSON.parse(savedCart);
        if (Array.isArray(parsedItems) && parsedItems.every(item => typeof item.partnumber === 'string' && typeof item.quantity === 'number')) {
          return parsedItems;
        }
        localStorage.removeItem('cart');
        return [];
      } catch (e) {
        localStorage.removeItem('cart');
        return [];
      }
    }
    return [];
  });

  const { user, maxDiscountRate, currentDiscountInfo } = useAuth();
  const [applicableIntroPromo, setApplicableIntroPromo] = useState<IntroductoryPromo | null>(null);
  const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCodeValidity | null>(null);

  useEffect(() => {
    const fetchIntroPromo = async () => {
      // TEMPORARILY DISABLED due to CORS errors
      // Will be fixed when Edge Functions are properly deployed
      console.log('Introductory promo functionality temporarily disabled');
      setApplicableIntroPromo(null);
      
      // ORIGINAL CODE (commented out until Edge Functions are deployed)
      /*
      if (user && typeof user.id === 'number') { 
        try {
          console.log(`Fetching intro promo for account ID: ${user.id}`);
          const { data, error } = await supabase.functions.invoke('get-applicable-intro-promo', {
            body: { account_id: user.id }, 
          });

          if (error) throw error;
          
          if (data && data.applicable_promo) {
            setApplicableIntroPromo(data.applicable_promo);
            console.log('Applicable intro promo found:', data.applicable_promo);
          } else {
            setApplicableIntroPromo(null);
            console.log('No applicable intro promo or uses exhausted for account ID:', user.id, data?.message);
          }
        } catch (err) {
          console.error('Error fetching introductory promo for account ID:', user.id, err);
          setApplicableIntroPromo(null);
        }
      } else {
        setApplicableIntroPromo(null); 
      }
      */
    };

    fetchIntroPromo();
  }, [user]);

  useEffect(() => {
    const initializeOrderNumber = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const { data, error } = await supabase.from('web_orders').select('order_number').order('order_number', { ascending: false }).limit(1).abortSignal(controller.signal);
        clearTimeout(timeoutId);
        if (error) { console.warn('Warning: Could not fetch max order number:', error.message); return; }
        if (data && data.length > 0 && data[0].order_number) { nextOrderNumber = data[0].order_number + 1; }
      } catch (e: any) { console.warn('Warning: Error fetching order number:', e.message); }
    };
    initializeOrderNumber();
  }, []);
  
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity: number = 1) => {
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.partnumber === product.partnumber);
      if (existingItem) {
        return prevItems.map(item => item.partnumber === product.partnumber ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prevItems, { ...product, inventory: product.inventory ?? null, price: product.price ?? 0, quantity }];
    });
  };

  const removeFromCart = (partnumber: string) => setItems(prevItems => prevItems.filter(item => item.partnumber !== partnumber));
  const updateQuantity = (partnumber: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(partnumber); return; }
    setItems(prevItems => prevItems.map(item => item.partnumber === partnumber ? { ...item, quantity } : item));
  };
  const clearCart = () => { 
    setItems([]); 
    localStorage.removeItem('cart');
    setAppliedPromoCode(null); // Also clear any applied promo code when clearing the cart
  };
  
  // Apply a promo code to the cart
  const applyPromoCode = async (code: string): Promise<PromoCodeValidity> => {
    if (!user || !user.accountNumber) {
      return { 
        is_valid: false, 
        message: 'You must be logged in to apply a promo code' 
      };
    }
    
    try {
      // Call the database function to check if the promo code is valid
      const { data, error } = await supabase.rpc('check_promo_code_validity', {
        p_code: code,
        p_account_number: user.accountNumber,
        p_order_value: totalPrice
      });
      
      if (error) throw error;
      
      if (data && data.is_valid) {
        setAppliedPromoCode(data);
      } else {
        setAppliedPromoCode(null);
      }
      
      return data;
    } catch (err: any) {
      console.error('Error applying promo code:', err);
      return { 
        is_valid: false, 
        message: 'An error occurred while applying the promo code' 
      };
    }
  };
  
  // Remove the applied promo code
  const removePromoCode = () => {
    setAppliedPromoCode(null);
  };

  const placeOrder = async (paymentMethod: 'credit' | 'net10', customerEmail: string, customerPhone: string): Promise<string> => {
    const orderNumberGenerated = `WB${nextOrderNumber++}`;
    const orderNumberForDb = parseInt(orderNumberGenerated.slice(2));
    
    if (!user || !user.accountNumber || typeof user.id !== 'number') {
      console.error('Place Order: User, account number, or valid user ID (for accounts.id) is not available.');
      throw new Error('User not authenticated, account number or valid user ID missing.');
    }
    
    const accountNumberInt = parseInt(user.accountNumber, 10);
    if (isNaN(accountNumberInt)) { throw new Error('Invalid user account number format.'); }

    let discountPartNumber: string | null = null;
    let discountDescription: string | null = null;
    let finalDiscountAmount = 0;
    let appliedDiscountRate = 0; // This will be a fraction, e.g., 0.05 for 5%
    let orderComments = `Payment Method: ${paymentMethod}. Customer Email: ${customerEmail}, Phone: ${customerPhone}`;
    let introPromoUsedInThisOrder = false;
    let promoCodeUsedInThisOrder = false;

    // Priority 1: Promo Code (highest priority)
    if (appliedPromoCode && appliedPromoCode.is_valid && appliedPromoCode.discount_amount && items.length > 0) {
      finalDiscountAmount = appliedPromoCode.discount_amount;
      discountPartNumber = `PROMO-${appliedPromoCode.promo_id?.slice(0, 8)}`;
      discountDescription = `Promo Code Discount: ${appliedPromoCode.message}`;
      orderComments += ` | ${discountDescription} ($${finalDiscountAmount.toFixed(2)})`;
      promoCodeUsedInThisOrder = true;
    }
    // Priority 2: Introductory Promo
    else if (applicableIntroPromo && applicableIntroPromo.is_active && applicableIntroPromo.uses_remaining && applicableIntroPromo.uses_remaining > 0 && items.length > 0) {
      appliedDiscountRate = applicableIntroPromo.value / 100.0; 
      finalDiscountAmount = totalPrice * appliedDiscountRate;
      discountPartNumber = applicableIntroPromo.name || `INTRO-${applicableIntroPromo.value}P`; // Use a generic part number if name is missing
      discountDescription = applicableIntroPromo.description || `Introductory ${applicableIntroPromo.value}% Discount`;
      orderComments += ` | Introductory Discount: ${discountDescription} (${applicableIntroPromo.value}%) ($${finalDiscountAmount.toFixed(2)})`;
      introPromoUsedInThisOrder = true;
    } 
    // Priority 3: Other active discounts (if intro promo and promo code were not applied)
    else if (currentDiscountInfo && maxDiscountRate !== null && maxDiscountRate > 0 && items.length > 0) {
      appliedDiscountRate = maxDiscountRate;
      finalDiscountAmount = totalPrice * appliedDiscountRate;
      
      if (currentDiscountInfo.type === 'order_based') {
        const orderMatch = currentDiscountInfo.source.match(/\((\d+)\/\d+\)/);
        const orderNumText = orderMatch ? orderMatch[1] : '1';
        const orderSuffix = orderNumText === '1' ? 'st' : orderNumText === '2' ? 'nd' : orderNumText === '3' ? 'rd' : 'th';
        discountPartNumber = `WEB-DISCOUNT-5-ORDER${orderNumText}`; // This seems specific to a "5% off Nth order"
        discountDescription = `${Math.round(appliedDiscountRate * 100)}% Discount for ${orderNumText}${orderSuffix} Order`;
      } else if (currentDiscountInfo.type === 'date_based') {
        const perc = Math.round(appliedDiscountRate * 100);
        // This mapping needs to be robust or data-driven from lcmd_discount
        if (perc === 1) { discountPartNumber = 'WEB-DISCOUNT-1'; discountDescription = '1% Discount (Limited Time)'; }
        else if (perc === 2) { discountPartNumber = 'WEB-DISCOUNT-2'; discountDescription = '2% Discount (Limited Time)'; }
        else if (perc === 3) { discountPartNumber = 'WEB-DISCOUNT-3'; discountDescription = '3% Discount (Limited Time)'; }
        else if (perc === 4) { discountPartNumber = 'WEB-DISCOUNT-4'; discountDescription = '4% Discount (Limited Time)'; }
        // Assuming WEB-DISCOUNT-5 is for a 5% discount, not 4% as previously commented
        else if (perc === 5) { discountPartNumber = 'WEB-DISCOUNT-5'; discountDescription = '5% Discount (Limited Time)'; }
        else { discountPartNumber = `WEB-DISCOUNT-${perc}`; discountDescription = `${perc}% Discount (Limited Time)`;}
      }
      if (discountPartNumber) {
        orderComments += ` | Discount Applied: ${discountPartNumber} ($${finalDiscountAmount.toFixed(2)})`;
      }
    }

    const orderItems = items.map(item => ({ 
      partnumber: item.partnumber, description: item.description, quantity: item.quantity, 
      price: item.price || 0, extended_price: (item.price || 0) * item.quantity
    }));

    if (discountPartNumber && finalDiscountAmount > 0) {
      orderItems.push({
        partnumber: discountPartNumber, description: discountDescription || 'Discount Applied',
        quantity: 1, price: -finalDiscountAmount, extended_price: -finalDiscountAmount
      });
    }

    const grandTotal = totalPrice - finalDiscountAmount;
    const orderPayload = {
      order_number: orderNumberForDb, account_number: accountNumberInt, order_comments: orderComments,
      order_items: orderItems, subtotal: totalPrice, 
      discount_percentage: appliedDiscountRate * 100, // Store as percentage
      discount_amount: finalDiscountAmount, grand_total: grandTotal, status: 'Pending Confirmation'
    };

    try {
      const { data: insertedOrder, error: insertError } = await supabase.from('web_orders').insert(orderPayload).select('id').single();
      if (insertError || !insertedOrder) throw insertError || new Error('Failed to save order.');
      
      console.log('Order saved successfully:', insertedOrder);

      if (introPromoUsedInThisOrder && user && typeof user.id === 'number') {
      // Record promo code usage if applicable
      if (promoCodeUsedInThisOrder && appliedPromoCode && appliedPromoCode.promo_id) {
        try {
          console.log(`Recording promo code usage for account: ${accountNumberInt}, order ID: ${insertedOrder.id}`);
          await supabase.rpc('record_promo_code_usage', {
            p_promo_id: appliedPromoCode.promo_id,
            p_account_number: user.accountNumber,
            p_order_id: insertedOrder.id,
            p_order_value: totalPrice,
            p_discount_amount: appliedPromoCode.discount_amount || 0
          });
          console.log('Promo code usage recorded.');
          // Clear the applied promo code after successful order
          setAppliedPromoCode(null);
        } catch (promoCodeUsageError) {
          console.error('Error recording promo code usage:', promoCodeUsageError);
        }
      }
      
      // TEMPORARILY DISABLED due to CORS errors
      console.log('Introductory promo recording temporarily disabled');
        
        // ORIGINAL CODE (commented out until Edge Functions are deployed)
        /*
        try {
          console.log(`Recording intro promo usage for account ID: ${user.id}, order ID: ${insertedOrder.id}`);
          await supabase.functions.invoke('record-intro-promo-usage', {
            body: { account_id: user.id, order_id: insertedOrder.id }
          });
          console.log('Introductory promo usage recorded.');
          // Refresh intro promo state to reflect usage
          const { data: refreshedPromo, error: refreshError } = await supabase.functions.invoke('get-applicable-intro-promo', {
            body: { account_id: user.id }
          });
          if (refreshError) console.error("Error refreshing intro promo state after usage:", refreshError);
          else setApplicableIntroPromo(refreshedPromo?.applicable_promo || null);
        } catch (promoUsageError) {
          console.error('Error in record-intro-promo-usage call or state refresh:', promoUsageError);
        }
        */
      } else if (currentDiscountInfo && currentDiscountInfo.type === 'order_based' && maxDiscountRate !== null && maxDiscountRate > 0) {
        // Existing logic for other order_based discounts (non-introductory)
        try {
          const { data: discountTiers, error: tierError } = await supabase
            .from('discount_tiers')
            .select('id')
            .eq('discount_type', 'order_based') // Ensure this targets only non-intro order_based
            .eq('value', maxDiscountRate * 100) // Assuming 'value' in discount_tiers is percentage, maxDiscountRate is fraction
            .limit(1)
            .single();

          if (tierError) throw tierError;
          if (discountTiers) {
            const discountTierId = discountTiers.id;
            const { data: existingUsage, error: usageError } = await supabase
              .from('account_order_discounts')
              .select('orders_used')
              .eq('account_number', user.accountNumber) // Uses string account_number
              .eq('discount_tier_id', discountTierId)
              .single();
            if (usageError && usageError.code !== 'PGRST116') throw usageError; // PGRST116: single row not found
            
            const currentUsage = existingUsage?.orders_used || 0;
            const { error: upsertError } = await supabase
              .from('account_order_discounts')
              .upsert({ account_number: user.accountNumber, discount_tier_id: discountTierId, orders_used: currentUsage + 1 }, 
                      { onConflict: 'account_number,discount_tier_id' });
            if (upsertError) throw upsertError;
            console.log('Standard order-based discount usage updated.');
          }
        } catch (err) {
          console.error('Exception updating standard order discount usage:', err);
        }
      }
      
      clearCart();
      return orderNumberGenerated;
    } catch (error: any) {
      console.error('Order placement error:', error);
      throw new Error(error.message || 'An unexpected error occurred while placing the order.');
    }
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce((total, item) => total + ((item.price || 0) * item.quantity), 0);

  return (
    <CartContext.Provider value={{
      items, addToCart, removeFromCart, updateQuantity, clearCart,
      totalItems, totalPrice, placeOrder, applicableIntroPromo,
      applyPromoCode, removePromoCode, appliedPromoCode
    }}>
      {children}
    </CartContext.Provider>
  );
};
