import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, User, Product, PromoCodeValidity, AvailablePromoCode } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (partnumber: string) => void;
  updateQuantity: (partnumber: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  placeOrder: (paymentMethod: 'credit' | 'net10', customerEmail: string, customerPhone: string) => Promise<string>;
  // Promo code features
  applyPromoCode: (code: string) => Promise<PromoCodeValidity>;
  removePromoCode: () => void;
  appliedPromoCode: PromoCodeValidity | null;
  availablePromoCodes: AvailablePromoCode[];
  fetchAvailablePromoCodes: () => Promise<void>;
  isLoadingPromoCodes: boolean;
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
  // Promo code features
  applyPromoCode: async () => ({ is_valid: false, message: '', discount_amount: 0 }),
  removePromoCode: () => {},
  appliedPromoCode: null,
  availablePromoCodes: [],
  fetchAvailablePromoCodes: async () => {},
  isLoadingPromoCodes: false
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

  const { user } = useAuth();
  const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCodeValidity | null>(null);
  const [availablePromoCodes, setAvailablePromoCodes] = useState<AvailablePromoCode[]>([]);
  const [isLoadingPromoCodes, setIsLoadingPromoCodes] = useState<boolean>(false);

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

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce((total, item) => total + ((item.price || 0) * item.quantity), 0);

  // Fetch available promo codes
  const fetchAvailablePromoCodes = async () => {
    if (!user || !user.accountNumber) {
      setAvailablePromoCodes([]);
      return;
    }
    
    setIsLoadingPromoCodes(true);
    try {
      // Try to use get_best_promo_code function instead of get_available_promo_codes
      const { data, error } = await supabase.rpc('get_best_promo_code', {
        p_account_number: user.accountNumber
      });
      
      if (error) {
        console.warn('Error fetching best promo code, falling back to empty list:', error);
        setAvailablePromoCodes([]);
        return;
      }
      
      // Convert the single best promo code to the expected format
      if (data) {
        const promoCode: AvailablePromoCode = {
          code: data.code,
          name: data.name,
          description: data.description,
          type: data.type || 'percent_off', // Default to percent_off if not provided
          value: data.value || 0,
          min_order_value: data.min_order_value || 0,
          discount_amount: calculateDiscountAmount(data.type, data.value, totalPrice),
          is_best: true,
          uses_remaining_for_account: null // Optional field
        };
        setAvailablePromoCodes([promoCode]);
      } else {
        setAvailablePromoCodes([]);
      }
    } catch (err) {
      console.error('Error fetching available promo codes:', err);
      setAvailablePromoCodes([]);
    } finally {
      setIsLoadingPromoCodes(false);
    }
  };
  
  // Helper function to calculate discount amount
  const calculateDiscountAmount = (type: string, value: number, orderValue: number): number => {
    if (type === 'percent_off') {
      return orderValue * (value / 100);
    } else { // dollars_off
      return Math.min(value, orderValue);
    }
  };
  
  // Fetch promo codes when user changes or cart total changes
  useEffect(() => {
    fetchAvailablePromoCodes();
  }, [user, totalPrice]);

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
    let promoCodeUsedInThisOrder = false;

    // Apply Promo Code discount if available
    if (appliedPromoCode && appliedPromoCode.is_valid && appliedPromoCode.discount_amount && items.length > 0) {
      finalDiscountAmount = appliedPromoCode.discount_amount;
      discountPartNumber = `PROMO-${appliedPromoCode.promo_id?.slice(0, 8)}`;
      discountDescription = `Promo Code Discount: ${appliedPromoCode.message}`;
      orderComments += ` | ${discountDescription} ($${finalDiscountAmount.toFixed(2)})`;
      promoCodeUsedInThisOrder = true;
    }

    const orderItems = items.map(item => ({ 
      partnumber: item.partnumber, description: item.description, quantity: item.quantity, 
      price: item.price || 0, extended_price: (item.price || 0) * item.quantity
    }));

    // Only add discount item if it's from a promo code
    if (promoCodeUsedInThisOrder && discountPartNumber && finalDiscountAmount > 0) {
      orderItems.push({
        partnumber: discountPartNumber, description: discountDescription || 'Promo Code Discount',
        quantity: 1, price: -finalDiscountAmount, extended_price: -finalDiscountAmount
      });
    }

    const grandTotal = totalPrice - finalDiscountAmount;
    const orderPayload = {
      order_number: orderNumberForDb, account_number: accountNumberInt, order_comments: orderComments,
      order_items: orderItems, subtotal: totalPrice, 
      discount_percentage: 0, // No percentage discounts, only fixed amount promo codes
      discount_amount: finalDiscountAmount, grand_total: grandTotal, status: 'Pending Confirmation'
    };

    try {
      const { data: insertedOrder, error: insertError } = await supabase.from('web_orders').insert(orderPayload).select('id').single();
      if (insertError || !insertedOrder) throw insertError || new Error('Failed to save order.');
      
      console.log('Order saved successfully:', insertedOrder);

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
      
      clearCart();
      return orderNumberGenerated;
    } catch (error: any) {
      console.error('Order placement error:', error);
      throw new Error(error.message || 'An unexpected error occurred while placing the order.');
    }
  };


  return (
    <CartContext.Provider value={{
      items, addToCart, removeFromCart, updateQuantity, clearCart,
      totalItems, totalPrice, placeOrder,
      applyPromoCode, removePromoCode, appliedPromoCode,
      availablePromoCodes, fetchAvailablePromoCodes, isLoadingPromoCodes
    }}>
      {children}
    </CartContext.Provider>
  );
};
