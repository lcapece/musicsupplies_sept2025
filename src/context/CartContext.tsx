import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, User, Product, PromoCodeValidity, AvailablePromoCode } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { logItemAddedToCart, logItemRemovedFromCart, logCheckoutStarted, logCheckoutCompleted, logCheckoutFailed } from '../utils/eventLogger';
import { activityTracker } from '../services/activityTracker';
import { logCartActivity, getCartSessionId } from '../utils/performantLogger';

interface ShippingAddress {
  shippingDifferent: boolean;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
  shippingPhone?: string;
  shippingContactName?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, isBackorder?: boolean) => void;
  addToBackorder: (product: Product, quantity?: number) => void;
  removeFromCart: (partnumber: string) => void;
  updateQuantity: (partnumber: string, quantity: number) => void;
  updateBackorderQuantity: (partnumber: string, qtyBackordered: number) => void;
  clearCart: () => void;
  emptyEntireCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  placeOrder: (paymentMethod: 'credit' | 'net10', customerEmail: string, customerPhone: string, poReference?: string, specialInstructions?: string, shippingAddress?: ShippingAddress) => Promise<string>;
  // Promo code features
  applyPromoCode: (code: string, isAutoApplied?: boolean) => Promise<PromoCodeValidity>;
  removePromoCode: () => void;
  appliedPromoCode: PromoCodeValidity | null;
  availablePromoCodes: AvailablePromoCode[];
  fetchAvailablePromoCodes: () => Promise<void>;
  isLoadingPromoCodes: boolean;
  isPromoCodeAutoApplied: boolean;
  // NEW: Auto-applied promo functionality
  appliedPromoCodes: PromoCodeValidity[];
  autoAppliedPromoItems: CartItem[];
  qualifyingSubtotal: number;
  // CRITICAL FIX: Add cart readiness state
  isCartReady: boolean;
  // Cart restoration features
  showCartRestorationModal: boolean;
  restoreCartFromDatabase: () => Promise<void>;
  dismissCartRestoration: () => void;
  inventoryIssues: { [partnumber: string]: { available: number; requested: number } };
}

const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => {},
  addToBackorder: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  updateBackorderQuantity: () => {},
  clearCart: () => {},
  emptyEntireCart: async () => {},
  totalItems: 0,
  totalPrice: 0,
  placeOrder: async () => '',
  // Promo code features
  applyPromoCode: async () => ({ is_valid: false, message: '', discount_amount: 0 }),
  removePromoCode: () => {},
  appliedPromoCode: null,
  availablePromoCodes: [],
  fetchAvailablePromoCodes: async () => {},
  isLoadingPromoCodes: false,
  isPromoCodeAutoApplied: false,
  // NEW: Auto-applied promo functionality
  appliedPromoCodes: [],
  autoAppliedPromoItems: [],
  qualifyingSubtotal: 0,
  // CRITICAL FIX: Add default cart readiness state
  isCartReady: false,
  // Cart restoration features
  showCartRestorationModal: false,
  restoreCartFromDatabase: async () => {},
  dismissCartRestoration: () => {},
  inventoryIssues: {}
});

export const useCart = () => useContext(CartContext);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // IMPROVED FIX: Simplified cart readiness without arbitrary delays
  const [isCartReady, setIsCartReady] = useState(true);
  const [items, setItems] = useState<CartItem[]>([]);

  const { user } = useAuth();
  // Ensure a stable cart identifier for event correlation
  const getCartId = (): string => {
    let id = sessionStorage.getItem('cartId');
    if (!id) {
      id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem('cartId', id);
    }
    return id;
  };
  const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCodeValidity | null>(null);
  const [availablePromoCodes, setAvailablePromoCodes] = useState<AvailablePromoCode[]>([]);
  const [isLoadingPromoCodes, setIsLoadingPromoCodes] = useState<boolean>(false);
  const [isPromoCodeAutoApplied, setIsPromoCodeAutoApplied] = useState<boolean>(false);
  
  // Cart restoration state
  const [showCartRestorationModal, setShowCartRestorationModal] = useState(false);
  const [inventoryIssues, setInventoryIssues] = useState<{ [partnumber: string]: { available: number; requested: number } }>({});
  
  // Save cart to database whenever items change
  useEffect(() => {
    const saveCartToDatabase = async () => {
      if (user && user.accountNumber && items.length >= 0) { // Save even empty carts
        try {
          await supabase.rpc('save_user_cart', {
            p_account_number: parseInt(user.accountNumber, 10),
            p_cart_data: JSON.stringify(items)
          });
          console.log('Cart saved to database for account:', user.accountNumber);
        } catch (error) {
          console.error('Error saving cart to database:', error);
        }
      }
    };

    // Debounce cart saves to avoid too many database calls
    const saveTimeout = setTimeout(saveCartToDatabase, 500);
    return () => clearTimeout(saveTimeout);
  }, [items, user]);

  // Load cart from database when user logs in
  useEffect(() => {
    const loadCartFromDatabase = async () => {
      if (user && user.accountNumber) {
        try {
          const { data: cartData } = await supabase.rpc('get_user_cart', {
            p_account_number: parseInt(user.accountNumber, 10)
          });

          if (cartData && Array.isArray(cartData) && cartData.length > 0) {
            // Check if current cart is empty but database has items
            if (items.length === 0) {
              console.log('Found saved cart in database, showing restoration modal');
              setItems(cartData);
              setShowCartRestorationModal(true);
            } else if (items.length > 0) {
              // User has items in current cart and database cart - merge or ask
              console.log('User has items in both current cart and database');
              // For now, we'll keep current cart and not show modal
              // In future, could implement merge functionality
            }
          }
        } catch (error) {
          console.error('Error loading cart from database:', error);
        }
      }
    };

    // Only load once when user first logs in
    if (user && user.accountNumber && !showCartRestorationModal) {
      const loadTimeout = setTimeout(loadCartFromDatabase, 1000);
      return () => clearTimeout(loadTimeout);
    }
  }, [user?.accountNumber]); // Only trigger when account number changes (login/logout)

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce((total, item) => total + ((item.price || 0) * item.quantity), 0);

  // Fetch available promo codes - CRITICAL FIX: Use get_available_promo_codes_only to prevent showing used single-use codes
  const fetchAvailablePromoCodes = async () => {
    if (!user || !user.accountNumber) {
      setAvailablePromoCodes([]);
      return;
    }
    
    setIsLoadingPromoCodes(true);
    try {
      // CRITICAL FIX: Use the new get_available_promo_codes_only function that excludes already-used single-use codes
      const { data: availablePromos, error: queryError } = await supabase.rpc('get_available_promo_codes_only', {
        p_account_number: user.accountNumber,
        p_order_value: totalPrice
      });
      
      if (!queryError && availablePromos && availablePromos.length > 0) {
        // Convert to expected format - these are already filtered and available
        const promoCodes: AvailablePromoCode[] = availablePromos.map((promo: any) => ({
          code: promo.code,
          name: promo.name,
          description: promo.description,
          type: promo.type,
          value: promo.value,
          min_order_value: promo.min_order_value || 0,
          discount_amount: promo.discount_amount, // Already calculated by the function
          is_best: promo.is_best,
          uses_remaining_for_account: null, // Not needed for available codes
          status: 'available' // All returned codes are available
        }));
        
        setAvailablePromoCodes(promoCodes);
        console.log(`Fetched ${promoCodes.length} available promo codes for account ${user.accountNumber}`);
        return;
      }
      
      // If no available codes, set empty array
      console.log(`No available promo codes found for account ${user.accountNumber}`);
      setAvailablePromoCodes([]);
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
      // Ensure proper decimal calculation and round to 2 decimal places
      const discount = Math.round((orderValue * value / 100) * 100) / 100;
      console.log(`Calculating ${value}% of $${orderValue} = $${discount}`);
      return discount;
    } else { // dollars_off
      return Math.min(value, orderValue);
    }
  };
  
  // Fetch promo codes when user changes or cart total changes
  useEffect(() => {
    // Add a small delay to ensure user state is fully settled after login
    const timeoutId = setTimeout(() => {
      fetchAvailablePromoCodes();
    }, 200); // Increased delay to ensure auth state is fully settled
    
    return () => clearTimeout(timeoutId);
  }, [user, totalPrice]);

  // Additional effect to ensure cart is properly initialized after login
  useEffect(() => {
    if (user && user.accountNumber) {
      console.log('CartContext: User logged in, ensuring cart is properly initialized');
      // Force a re-render to ensure all cart functions are properly bound
      const timeoutId = setTimeout(() => {
        console.log('CartContext: Cart initialization complete for user:', user.accountNumber);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user]);

  // Clear cart when user logs out
  useEffect(() => {
    // If user becomes null (logout), clear the cart
    if (user === null) {
      console.log('CartContext: User logged out, clearing cart');
      clearCart();
    }
  }, [user]);

  // CRITICAL: Auto-apply ALL qualifying promo codes automatically
  const [appliedPromoCodes, setAppliedPromoCodes] = useState<PromoCodeValidity[]>([]);
  const [autoAppliedPromoItems, setAutoAppliedPromoItems] = useState<CartItem[]>([]);
  
  // Calculate subtotal excluding backorder items (for promo qualification)
  const qualifyingSubtotal = items.reduce((total, item) => total + ((item.price || 0) * item.quantity), 0);
  
  // Auto-apply ALL qualifying promo codes when conditions change
  useEffect(() => {
    const autoApplyAllQualifyingPromoCodes = async () => {
      if (!user || !user.accountNumber || items.length === 0 || availablePromoCodes.length === 0) {
        // Clear applied promos if no items or no available promos
        setAppliedPromoCodes([]);
        setAutoAppliedPromoItems([]);
        return;
      }

      const newAppliedPromoCodes: PromoCodeValidity[] = [];
      const newPromoItems: CartItem[] = [];

      // Process each available promo code
      for (const availablePromo of availablePromoCodes) {
        // Check if this promo qualifies based on qualifying subtotal (excluding backorders)
        if (qualifyingSubtotal >= availablePromo.min_order_value) {
          try {
            console.log('Auto-applying qualifying promo code:', availablePromo.code);
            const result = await applyPromoCode(availablePromo.code, true);
            
            if (result.is_valid) {
              newAppliedPromoCodes.push(result);
              
              // Add promo as a cart line item
              if (result.code && result.discount_amount && result.discount_amount > 0) {
                const promoItem: CartItem = {
                  partnumber: result.code,
                  description: result.product_description || result.message || 'Promo Code Discount',
                  price: -result.discount_amount, // Negative price for discount
                  quantity: 1,
                  inventory: null, // No inventory tracking for promo items
                  image: undefined // No image for promo items
                };
                newPromoItems.push(promoItem);
              }
            }
          } catch (error) {
            console.error('Error auto-applying promo code:', availablePromo.code, error);
          }
        }
      }

      setAppliedPromoCodes(newAppliedPromoCodes);
      setAutoAppliedPromoItems(newPromoItems);
      console.log(`Auto-applied ${newAppliedPromoCodes.length} qualifying promo codes`);
    };

    // Add delay to ensure cart state is stable before applying promos
    const timeoutId = setTimeout(autoApplyAllQualifyingPromoCodes, 1000);
    return () => clearTimeout(timeoutId);
  }, [availablePromoCodes, qualifyingSubtotal, user?.accountNumber, items.length]);

  const addToCart = (product: Product, quantity: number = 1) => {
    console.log('CartContext: Adding to cart:', product.partnumber, 'quantity:', quantity);
    
    // Validate product data before adding
    if (!product.partnumber) {
      console.error('CartContext: Cannot add product without partnumber');
      return;
    }
    
    // Calculate new cart totals for tracking
    const existingItem = items.find(item => item.partnumber === product.partnumber);
    const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;
    const newCartTotal = existingItem 
      ? totalPrice + (product.price ?? 0) * quantity
      : totalPrice + (product.price ?? 0) * quantity;
    const newItemsCount = existingItem ? totalItems + quantity : totalItems + quantity;
    
    // Update items
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.partnumber === product.partnumber);
      let newItems;
      if (existingItem) {
        console.log('CartContext: Updating existing item quantity');
        newItems = prevItems.map(item => 
          item.partnumber === product.partnumber 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      } else {
        console.log('CartContext: Adding new item to cart');
        newItems = [...prevItems, { 
          ...product, 
          inventory: product.inventory ?? null, 
          price: product.price ?? 0, 
          quantity 
        }];
      }
      console.log('CartContext: Cart updated, new item count:', newItems.length);
      return newItems;
    });

    // Log event (fire-and-forget) - Keep existing logging for compatibility
    try {
      const acctNum = user?.accountNumber ? parseInt(user.accountNumber, 10) : NaN;
      const email = (user as any)?.email || null;
      logItemAddedToCart({
        accountNumber: isNaN(acctNum) ? null : acctNum,
        emailAddress: email,
        cartId: getCartId(),
        sku: product.partnumber,
        qty: quantity,
        unitPrice: product.price ?? 0,
        currency: 'USD'
      });
      
      // Track cart activity with new tracking system
      activityTracker.trackCartAction({
        actionType: 'add',
        sku: product.partnumber,
        productName: product.description,
        quantity: quantity,
        unitPrice: product.price ?? 0,
        totalPrice: (product.price ?? 0) * quantity,
        cartTotalAfter: newCartTotal,
        cartItemsCountAfter: newItemsCount,
        sourcePage: window.location.pathname
      });
      
      // NEW: High-performance cart activity logging
      logCartActivity({
        account_number: isNaN(acctNum) ? null : acctNum,
        cart_session_id: getCartSessionId(),
        activity_type: 'add_item',
        item_partnumber: product.partnumber,
        item_description: product.description || undefined,
        quantity_change: quantity,
        quantity_after: newQuantity,
        unit_price: product.price ?? 0,
        cart_total_after: newCartTotal,
        cart_items_count_after: newItemsCount,
        user_email: email
      });
    } catch (_e) {
      // ignore logging errors
    }
  };

  const removeFromCart = (partnumber: string) => {
    const existing = items.find(i => i.partnumber === partnumber);
    
    // Calculate new cart totals for tracking
    const newCartTotal = existing ? totalPrice - ((existing.price ?? 0) * existing.quantity) : totalPrice;
    const newItemsCount = existing ? totalItems - existing.quantity : totalItems;
    
    setItems(prevItems => prevItems.filter(item => item.partnumber !== partnumber));
    // Log event (fire-and-forget)
    if (existing) {
      try {
        const acctNum = user?.accountNumber ? parseInt(user.accountNumber, 10) : NaN;
        const email = (user as any)?.email || null;
        logItemRemovedFromCart({
          accountNumber: isNaN(acctNum) ? null : acctNum,
          emailAddress: email,
          cartId: getCartId(),
          sku: partnumber,
          qty: existing.quantity
        });
        
        // Track cart activity with new tracking system
        activityTracker.trackCartAction({
          actionType: 'remove',
          sku: partnumber,
          productName: existing.description,
          quantity: existing.quantity,
          unitPrice: existing.price ?? 0,
          totalPrice: (existing.price ?? 0) * existing.quantity,
          cartTotalAfter: newCartTotal,
          cartItemsCountAfter: newItemsCount,
          sourcePage: window.location.pathname
        });
        
        // NEW: High-performance cart activity logging
        logCartActivity({
          account_number: isNaN(acctNum) ? null : acctNum,
          cart_session_id: getCartSessionId(),
          activity_type: 'remove_item',
          item_partnumber: partnumber,
          item_description: existing.description || undefined,
          quantity_change: -existing.quantity, // Negative for removal
          quantity_after: 0, // Item is completely removed
          unit_price: existing.price ?? 0,
          cart_total_after: newCartTotal,
          cart_items_count_after: newItemsCount,
          user_email: email
        });
      } catch (_e) {
        // ignore logging errors
      }
    }
  };
  const updateQuantity = (partnumber: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(partnumber); return; }
    const prev = items.find(i => i.partnumber === partnumber);
    
    // Calculate new cart totals for tracking
    const quantityDelta = prev ? quantity - prev.quantity : 0;
    const newCartTotal = prev ? totalPrice + ((prev.price ?? 0) * quantityDelta) : totalPrice;
    const newItemsCount = prev ? totalItems + quantityDelta : totalItems;
    
    setItems(prevItems => prevItems.map(item => item.partnumber === partnumber ? { ...item, quantity } : item));
    if (prev && prev.quantity !== quantity) {
      const delta = quantity - prev.quantity;
      const acctNum = user?.accountNumber ? parseInt(user.accountNumber, 10) : NaN;
      const email = (user as any)?.email || null;
      try {
        if (delta > 0) {
          logItemAddedToCart({
            accountNumber: isNaN(acctNum) ? null : acctNum,
            emailAddress: email,
            cartId: getCartId(),
            sku: partnumber,
            qty: delta,
            unitPrice: prev.price ?? 0,
            currency: 'USD'
          });
        } else {
          logItemRemovedFromCart({
            accountNumber: isNaN(acctNum) ? null : acctNum,
            emailAddress: email,
            cartId: getCartId(),
            sku: partnumber,
            qty: Math.abs(delta)
          });
        }
        
        // Track cart activity with new tracking system
        activityTracker.trackCartAction({
          actionType: 'update_quantity',
          sku: partnumber,
          productName: prev.description,
          quantity: quantity,
          quantityChange: delta,
          unitPrice: prev.price ?? 0,
          totalPrice: (prev.price ?? 0) * quantity,
          cartTotalAfter: newCartTotal,
          cartItemsCountAfter: newItemsCount,
          sourcePage: window.location.pathname
        });
        
        // NEW: High-performance cart activity logging
        logCartActivity({
          account_number: isNaN(acctNum) ? null : acctNum,
          cart_session_id: getCartSessionId(),
          activity_type: 'update_quantity',
          item_partnumber: partnumber,
          item_description: prev.description || undefined,
          quantity_change: delta,
          quantity_after: quantity,
          unit_price: prev.price ?? 0,
          cart_total_after: newCartTotal,
          cart_items_count_after: newItemsCount,
          user_email: email
        });
      } catch (_e) {
        // ignore
      }
    }
  };
  const clearCart = () => { 
    // Track clear action before clearing
    if (items.length > 0) {
      try {
        const acctNum = user?.accountNumber ? parseInt(user.accountNumber, 10) : NaN;
        const email = (user as any)?.email || null;
        
        activityTracker.trackCartAction({
          actionType: 'clear',
          sku: 'ALL',
          productName: 'All Items',
          quantity: totalItems,
          totalPrice: totalPrice,
          cartTotalAfter: 0,
          cartItemsCountAfter: 0,
          sourcePage: window.location.pathname
        });
        
        // NEW: High-performance cart activity logging
        logCartActivity({
          account_number: isNaN(acctNum) ? null : acctNum,
          cart_session_id: getCartSessionId(),
          activity_type: 'clear_cart',
          item_partnumber: 'ALL_ITEMS', // Special identifier for cart clear
          item_description: 'Cart cleared - all items removed',
          quantity_change: -totalItems, // Negative for removal of all items
          quantity_after: 0,
          unit_price: 0, // N/A for clear operation
          cart_total_after: 0,
          cart_items_count_after: 0,
          user_email: email
        });
      } catch (_e) {
        // ignore tracking errors
      }
    }
    
    setItems([]); 
    // Clear from both storages for safety
    sessionStorage.removeItem('cart');
    localStorage.removeItem('cart');
    setAppliedPromoCode(null); // Also clear any applied promo code when clearing the cart
  };
  
  // Apply a promo code to the cart
  const applyPromoCode = async (code: string, isAutoApplied: boolean = false): Promise<PromoCodeValidity> => {
    if (!user || !user.accountNumber) {
      return { 
        is_valid: false, 
        message: 'You must be logged in to apply a promo code' 
      };
    }
    
    try {
      console.log('Applying promo code:', code, 'for account:', user.accountNumber, 'order value:', totalPrice, 'auto-applied:', isAutoApplied);
      
      // PHASE 1: Dual-table validation - Check if promo code exists in both tables
      console.log('Validating promo code exists in products table...');
      const { data: productData, error: productError } = await supabase
        .from('pre_products_supabase')
        .select('partnumber, description, price')
        .eq('partnumber', code)
        .single();
      
      if (productError || !productData) {
        console.error('Promo code not found in products table:', productError);
        return {
          is_valid: false,
          message: `Promo code ${code} not found in product catalog. Please contact support.`
        };
      }
      
      console.log('Promo code found in products table:', productData);
      
      // Call the database function to check if the promo code is valid in promo_codes table
      const { data, error } = await supabase.rpc('check_promo_code_validity', {
        p_code: code,
        p_account_number: user.accountNumber,
        p_order_value: totalPrice
      });
      
      if (error) {
        console.error('Supabase RPC error:', error);
        throw error;
      }
      
      console.log('Raw response from database:', data);
      
      // The database function returns an array with a single object
      const result = Array.isArray(data) ? data[0] : data;
      
      console.log('Processed result:', result);
      
      if (result && result.is_valid) {
        // Customize the message based on whether it was auto-applied
        const customizedResult = {
          ...result,
          code: code, // Store the actual promo code
          product_description: productData.description, // Store product description
          message: isAutoApplied 
            ? `Promo code ${code} has been automatically applied`
            : result.message,
          // Ensure discount_amount is properly parsed as a number
          discount_amount: result.discount_amount ? parseFloat(result.discount_amount.toString()) : 0
        };
        
        setAppliedPromoCode(customizedResult);
        setIsPromoCodeAutoApplied(isAutoApplied);
        console.log('Promo code applied successfully:', customizedResult);
        
        return customizedResult;
      } else {
        setAppliedPromoCode(null);
        setIsPromoCodeAutoApplied(false);
        console.log('Promo code validation failed:', result?.message);
      }
      
      return result || { is_valid: false, message: 'No response from server' };
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

  // Add item to backorder (separate from regular cart)
  const addToBackorder = (product: Product, quantity: number = 1) => {
    console.log('CartContext: Adding to backorder:', product.partnumber, 'quantity:', quantity);
    
    // Validate product data before adding
    if (!product.partnumber) {
      console.error('CartContext: Cannot add product without partnumber');
      return;
    }
    
    // Calculate new cart totals for tracking
    const existingItem = items.find(item => item.partnumber === product.partnumber);
    const newBackorderQuantity = existingItem ? (existingItem.qtyBackordered || 0) + quantity : quantity;
    
    // Update items - add backorder quantity to existing item or create new item with backorder quantity
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.partnumber === product.partnumber);
      let newItems;
      if (existingItem) {
        console.log('CartContext: Updating existing item backorder quantity');
        newItems = prevItems.map(item => 
          item.partnumber === product.partnumber 
            ? { ...item, qtyBackordered: (item.qtyBackordered || 0) + quantity } 
            : item
        );
      } else {
        console.log('CartContext: Adding new item to cart with backorder quantity');
        newItems = [...prevItems, { 
          ...product, 
          inventory: product.inventory ?? null, 
          price: product.price ?? 0, 
          quantity: 0, // No regular quantity for backorder-only items
          qtyBackordered: quantity
        }];
      }
      console.log('CartContext: Cart updated with backorder, new item count:', newItems.length);
      return newItems;
    });

    // Log backorder event (fire-and-forget)
    try {
      const acctNum = user?.accountNumber ? parseInt(user.accountNumber, 10) : NaN;
      const email = (user as any)?.email || null;
      
      // Track backorder activity
      activityTracker.trackCartAction({
        actionType: 'add_backorder',
        sku: product.partnumber,
        productName: product.description,
        quantity: quantity,
        unitPrice: product.price ?? 0,
        totalPrice: (product.price ?? 0) * quantity,
        cartTotalAfter: totalPrice, // Backorder doesn't affect cart total
        cartItemsCountAfter: totalItems, // Backorder doesn't affect regular item count
        sourcePage: window.location.pathname
      });
      
      // NEW: High-performance cart activity logging
      logCartActivity({
        account_number: isNaN(acctNum) ? null : acctNum,
        cart_session_id: getCartSessionId(),
        activity_type: 'add_backorder',
        item_partnumber: product.partnumber,
        item_description: product.description || undefined,
        quantity_change: quantity,
        quantity_after: newBackorderQuantity,
        unit_price: product.price ?? 0,
        cart_total_after: totalPrice, // Backorder doesn't affect pricing
        cart_items_count_after: totalItems,
        user_email: email
      });
    } catch (_e) {
      // ignore logging errors
    }
  };

  // Update backorder quantity for a specific item
  const updateBackorderQuantity = (partnumber: string, qtyBackordered: number) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.partnumber === partnumber 
          ? { ...item, qtyBackordered: Math.max(0, qtyBackordered) }
          : item
      )
    );
  };

  // Empty entire cart and save to database
  const emptyEntireCart = async () => {
    if (user && user.accountNumber) {
      try {
        await supabase.rpc('clear_user_cart', {
          p_account_number: parseInt(user.accountNumber, 10)
        });
      } catch (error) {
        console.error('Error clearing cart in database:', error);
      }
    }
    clearCart();
  };

  // Restore cart from database
  const restoreCartFromDatabase = async () => {
    if (!user || !user.accountNumber) return;
    
    try {
      const { data } = await supabase.rpc('get_user_cart', {
        p_account_number: parseInt(user.accountNumber, 10)
      });
      
      if (data && Array.isArray(data)) {
        setItems(data);
        setShowCartRestorationModal(false);
      }
    } catch (error) {
      console.error('Error restoring cart from database:', error);
    }
  };

  // Dismiss cart restoration modal
  const dismissCartRestoration = () => {
    setShowCartRestorationModal(false);
  };

  const placeOrder = async (paymentMethod: 'credit' | 'net10', customerEmail: string, customerPhone: string, poReference?: string, specialInstructions?: string, shippingAddress?: ShippingAddress): Promise<string> => {
    // Get session ID for order pre-allocation
    const sessionId = sessionStorage.getItem('sessionId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (!sessionStorage.getItem('sessionId')) {
      sessionStorage.setItem('sessionId', sessionId);
    }
    
    if (!user || !user.accountNumber) {
      console.error('Place Order: User or account number is not available.');
      throw new Error('User not authenticated or account number missing.');
    }
    
    // Log user details for debugging
    console.log('Place Order: User validation - accountNumber:', user.accountNumber, 'id:', user.id, 'typeof id:', typeof user.id);
    
    const accountNumberInt = parseInt(user.accountNumber, 10);
    if (isNaN(accountNumberInt)) { throw new Error('Invalid user account number format.'); }

    // Reserve or get existing order number for this session
    console.log('Reserving order number for session:', sessionId);
    const { data: orderReservation, error: reserveError } = await supabase.rpc('reserve_order_number', {
      p_session_id: sessionId,
      p_account_number: user.accountNumber
    });
    
    if (reserveError || !orderReservation || orderReservation.length === 0) {
      console.error('Failed to reserve order number:', reserveError);
      throw new Error('Unable to reserve order number. Please try again.');
    }
    
    const orderNumberForDb = orderReservation[0].order_number;
    const orderId = orderReservation[0].order_id;
    const orderNumberGenerated = `WB${orderNumberForDb}`;
    console.log('Reserved order number:', orderNumberGenerated, 'Order ID:', orderId);
    
    // Log checkout started (fire-and-forget) - Keep existing logging for compatibility
    try {
      const email = (user as any)?.email || null;
      await logCheckoutStarted({
        accountNumber: accountNumberInt,
        emailAddress: email,
        cartId: getCartId(),
        paymentMethod,
        step: 'submit'
      });
      
      // NEW: High-performance cart activity logging
      logCartActivity({
        account_number: accountNumberInt,
        cart_session_id: getCartSessionId(),
        activity_type: 'checkout_started',
        item_partnumber: 'CHECKOUT', // Special identifier for checkout
        item_description: `Checkout started - ${paymentMethod} payment`,
        quantity_change: 0, // No quantity change
        quantity_after: totalItems,
        unit_price: 0, // N/A for checkout operations
        cart_total_after: totalPrice,
        cart_items_count_after: totalItems,
        user_email: email
      });
    } catch (_e) {
      // ignore
    }

    // Calculate total discount from all auto-applied promo codes
    let finalDiscountAmount = appliedPromoCodes.reduce((total, promo) => total + (promo.discount_amount || 0), 0);
    let orderComments = `Payment Method: ${paymentMethod}. Customer Email: ${customerEmail}, Phone: ${customerPhone}`;
    let promoCodesUsedInThisOrder = appliedPromoCodes.length > 0;

    // Add comments for all applied promo codes
    if (promoCodesUsedInThisOrder) {
      const promoComments = appliedPromoCodes.map(promo => 
        `${promo.message || promo.code} ($${(promo.discount_amount || 0).toFixed(2)})`
      ).join(', ');
      orderComments += ` | PROMOS APPLIED: ${promoComments}`;
    }

    const orderItems = items.map(item => ({ 
      partnumber: item.partnumber, description: item.description, quantity: item.quantity, 
      price: item.price || 0, extended_price: (item.price || 0) * item.quantity
    }));

    // CRITICAL: Add ALL auto-applied promo codes as line items
    appliedPromoCodes.forEach(promo => {
      if (promo.is_valid && promo.discount_amount && promo.discount_amount > 0) {
        orderItems.push({
          partnumber: promo.code || 'PROMO',
          description: promo.product_description || promo.message || 'Promo Code Discount',
          quantity: 1, 
          price: -promo.discount_amount, // Negative price for discount
          extended_price: -promo.discount_amount
        });
      }
    });

    // Add special line items at the end (per requirements)
    // Add PO Reference if provided
    if (poReference && poReference.trim()) {
      orderItems.push({
        partnumber: 'PO',
        description: `Customer PO: ${poReference.trim()}`,
        quantity: 1,
        price: 0,
        extended_price: 0
      });
    }

    // Add Special Instructions if provided
    if (specialInstructions && specialInstructions.trim()) {
      orderItems.push({
        partnumber: 'COMMENT',
        description: specialInstructions.trim(),
        quantity: 1,
        price: 0,
        extended_price: 0
      });
    }

    const grandTotal = totalPrice - finalDiscountAmount;
    
    // Prepare shipping info for the complete_order function
    const shippingInfo = shippingAddress?.shippingDifferent ? {
      first_name: '', // You might want to parse from shippingContactName
      last_name: '',
      company: '',
      address: shippingAddress.shippingAddress,
      city: shippingAddress.shippingCity,
      state: shippingAddress.shippingState,
      zip_code: shippingAddress.shippingZip,
      phone: shippingAddress.shippingPhone
    } : null;

    try {
      // Complete the pre-allocated order
      const { data: completionResult, error: completeError } = await supabase.rpc('complete_order', {
        p_session_id: sessionId,
        p_order_items: orderItems,
        p_order_comments: orderComments,
        p_subtotal: totalPrice,
        p_discount_percentage: 0,
        p_discount_amount: finalDiscountAmount,
        p_grand_total: grandTotal,
        p_shipping_info: shippingInfo
      });
      
      if (completeError || !completionResult || !completionResult[0].success) {
        throw completeError || new Error(completionResult?.[0]?.message || 'Failed to complete order.');
      }
      
      const insertedOrder = { id: completionResult[0].order_id };
      
      console.log('Order saved successfully:', insertedOrder);
      // Log checkout completed (fire-and-forget) - Keep existing logging for compatibility
      try {
        const email = (user as any)?.email || null;
        await logCheckoutCompleted({
          accountNumber: accountNumberInt,
          emailAddress: email,
          cartId: getCartId(),
          orderId: insertedOrder.id,
          total: grandTotal,
          currency: 'USD'
        });
        
        // NEW: High-performance cart activity logging
        logCartActivity({
          account_number: accountNumberInt,
          cart_session_id: getCartSessionId(),
          activity_type: 'checkout_completed',
          item_partnumber: 'ORDER_COMPLETE', // Special identifier for completion
          item_description: `Order ${orderNumberGenerated} completed successfully`,
          quantity_change: 0, // No quantity change
          quantity_after: 0, // Cart is now empty
          unit_price: grandTotal, // Store final order total
          cart_total_after: 0, // Cart cleared after order
          cart_items_count_after: 0,
          user_email: email
        });
      } catch (_e) {
        // ignore
      }

      // Record usage for ALL applied promo codes
      if (promoCodesUsedInThisOrder && appliedPromoCodes.length > 0) {
        for (const promo of appliedPromoCodes) {
          if (promo.promo_id) {
            try {
              console.log(`Recording promo code usage for ${promo.code}, account: ${accountNumberInt}, order ID: ${insertedOrder.id}`);
              await supabase.rpc('record_promo_code_usage', {
                p_promo_id: promo.promo_id,
                p_account_number: user.accountNumber,
                p_order_id: insertedOrder.id,
                p_order_value: totalPrice,
                p_discount_amount: promo.discount_amount || 0
              });
              console.log(`Promo code usage recorded for ${promo.code}.`);
            } catch (promoCodeUsageError) {
              console.error(`Error recording promo code usage for ${promo.code}:`, promoCodeUsageError);
            }
          }
        }
        // Clear all applied promo codes after successful order
        setAppliedPromoCodes([]);
        setAutoAppliedPromoItems([]);
        setAppliedPromoCode(null);
      }
      
      clearCart();
      return orderNumberGenerated;
    } catch (error: any) {
      console.error('Order placement error:', error);
      // Log checkout failed (fire-and-forget) - Keep existing logging for compatibility
      try {
        const email = (user as any)?.email || null;
        await logCheckoutFailed({
          accountNumber: accountNumberInt,
          emailAddress: email,
          cartId: getCartId(),
          reason: error?.message || 'unknown'
        });
        
        // NEW: High-performance cart activity logging
        logCartActivity({
          account_number: accountNumberInt,
          cart_session_id: getCartSessionId(),
          activity_type: 'checkout_failed',
          item_partnumber: 'CHECKOUT_FAILED', // Special identifier for failure
          item_description: `Checkout failed: ${error?.message || 'Unknown error'}`,
          quantity_change: 0, // No quantity change
          quantity_after: totalItems, // Cart remains unchanged
          unit_price: totalPrice, // Store attempted order total
          cart_total_after: totalPrice, // Cart total unchanged
          cart_items_count_after: totalItems,
          user_email: email
        });
      } catch (_e) {
        // ignore
      }
      throw new Error(error.message || 'An unexpected error occurred while placing the order.');
    }
  };


  return (
    <CartContext.Provider value={{
      items, addToCart, addToBackorder, removeFromCart, updateQuantity, updateBackorderQuantity, clearCart, emptyEntireCart,
      totalItems, totalPrice, placeOrder,
      applyPromoCode, removePromoCode, appliedPromoCode,
      availablePromoCodes, fetchAvailablePromoCodes, isLoadingPromoCodes,
      isPromoCodeAutoApplied, 
      // NEW: Auto-applied promo functionality
      appliedPromoCodes, autoAppliedPromoItems, qualifyingSubtotal,
      isCartReady,
      showCartRestorationModal, restoreCartFromDatabase, dismissCartRestoration, inventoryIssues
    }}>
      {children}
    </CartContext.Provider>
  );
};
