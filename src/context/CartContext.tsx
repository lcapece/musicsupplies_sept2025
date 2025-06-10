import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, User, Product } from '../types'; // Ensure Product is imported
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void; // Use Product type
  removeFromCart: (partnumber: string) => void;
  updateQuantity: (partnumber: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  placeOrder: (paymentMethod: 'credit' | 'net10', customerEmail: string, customerPhone: string) => Promise<string>;
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
});

export const useCart = () => useContext(CartContext);

let nextOrderNumber = 750000; // This will be updated by useEffect if connection is successful

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedItems = JSON.parse(savedCart);
        // Ensure that what we parsed is actually an array before returning it.
        if (Array.isArray(parsedItems)) {
          // Further check if items in array are valid CartItems (simplified check here)
          if (parsedItems.every(item => typeof item.partnumber === 'string' && typeof item.quantity === 'number')) {
            return parsedItems;
          }
        }
        // If not an array or items are not valid, treat as corrupted/invalid.
        localStorage.removeItem('cart');
        return [];
      } catch (e) {
        // If JSON.parse fails
        localStorage.removeItem('cart');
        return [];
      }
    }
    // If no savedCart
    return [];
  });
  const { user, maxDiscountRate, currentDiscountInfo } = useAuth(); // Changed from activeDiscount to maxDiscountRate

  useEffect(() => {
    // This useEffect is now only for initializing the order number
    const initializeOrderNumber = async () => {
      try {
        // Add a timeout to the fetch operation to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const { data, error } = await supabase
          .from('web_orders')
          .select('order_number')
          .order('order_number', { ascending: false })
          .limit(1)
          .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        if (error) {
          console.warn('Warning: Could not fetch max order number from database:', error.message);
          console.log('Using default order number starting point:', nextOrderNumber);
          return; // Keep default nextOrderNumber value
        }

        // Check if we got any data back
        if (data && data.length > 0) {
          nextOrderNumber = data[0].order_number + 1;
          console.log('Successfully initialized order number from database:', nextOrderNumber);
        } else {
          console.log('No existing orders found, using default order number:', nextOrderNumber);
        }
        
      } catch (e) {
        // Enhanced error handling with more specific error types
        if (e instanceof Error) {
          if (e.name === 'AbortError') {
            console.warn('Warning: Database connection timed out while fetching order number. Using default value:', nextOrderNumber);
          } else if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
            console.warn('Warning: Network error connecting to database. Please check your internet connection. Using default order number:', nextOrderNumber);
          } else {
            console.warn('Warning: Unexpected error fetching order number:', e.message, 'Using default value:', nextOrderNumber);
          }
        } else {
          console.warn('Warning: Unknown error fetching order number. Using default value:', nextOrderNumber);
        }
        // Application continues to work with default order number
      }
    };

    initializeOrderNumber();
    // Initial loading of cart from localStorage is moved to useState initializer
  }, []);
  
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity: number = 1) => {
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.partnumber === product.partnumber);
      if (existingItem) {
        return prevItems.map(item => 
          item.partnumber === product.partnumber 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      } else {
        const newItem: CartItem = {
          ...product,
          inventory: product.inventory ?? null, 
          price: product.price ?? 0, 
          quantity
        };
        return [...prevItems, newItem];
      }
    });
  };

  const removeFromCart = (partnumber: string) => {
    setItems(prevItems => prevItems.filter(item => item.partnumber !== partnumber));
  };

  const updateQuantity = (partnumber: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(partnumber);
      return;
    }
    setItems(prevItems => 
      prevItems.map(item => 
        item.partnumber === partnumber ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem('cart');
  };

  const placeOrder = async (paymentMethod: 'credit' | 'net10', customerEmail: string, customerPhone: string): Promise<string> => {
    const orderNumberGenerated = `WB${nextOrderNumber++}`;
    const orderNumberForDb = parseInt(orderNumberGenerated.slice(2));
    
    if (!user || !user.accountNumber) {
      console.error('Place Order: User or account number is not available.');
      throw new Error('User not authenticated or account number missing.');
    }
    
    const accountNumberInt = parseInt(user.accountNumber, 10);
    if (isNaN(accountNumberInt)) {
      console.error('Place Order: Invalid account number format in user object:', user.accountNumber);
      throw new Error('Invalid user account number format.');
    }

    // Determine discount part number and amount based on currentDiscountInfo
    let discountPartNumber = null;
    let discountDescription = null;
    let discountAmount = 0;
    let orderComments = `Payment Method: ${paymentMethod}. Customer Email: ${customerEmail}, Phone: ${customerPhone}`;

    if (currentDiscountInfo && maxDiscountRate && maxDiscountRate > 0 && items.length > 0) {
      discountAmount = totalPrice * maxDiscountRate;
      
      if (currentDiscountInfo.type === 'order_based') {
        // Extract order number from the source string (e.g., "Order-based discount (1/3)")
        const orderMatch = currentDiscountInfo.source.match(/\((\d+)\/\d+\)/);
        const orderNumber = orderMatch ? orderMatch[1] : '1';
        
        switch (orderNumber) {
          case '1':
            discountPartNumber = 'WEB-DISCOUNT-5-ORDER1';
            discountDescription = '5% Discount for 1st Order with MusicSupplies.com';
            break;
          case '2':
            discountPartNumber = 'WEB-DISCOUNT-5-ORDER2';
            discountDescription = '5% Discount for 2nd Order with MusicSupplies.com';
            break;
          case '3':
            discountPartNumber = 'WEB-DISCOUNT-5-ORDER3';
            discountDescription = '5% Discount for 3rd Order with MusicSupplies.com';
            break;
          default:
            discountPartNumber = 'WEB-DISCOUNT-5-ORDER1';
            discountDescription = '5% Discount for 1st Order with MusicSupplies.com';
        }
      } else if (currentDiscountInfo.type === 'date_based') {
        // Map discount rate to appropriate part number
        const discountPercentage = Math.round(maxDiscountRate * 100);
        
        switch (discountPercentage) {
          case 1:
            discountPartNumber = 'WEB-DISCOUNT-1';
            discountDescription = '1% Discount for MusicSupplies.com (Limited Time)';
            break;
          case 2:
            discountPartNumber = 'WEB-DISCOUNT-2';
            discountDescription = '2% Discount for MusicSupplies.com (Limited Time)';
            break;
          case 3:
            discountPartNumber = 'WEB-DISCOUNT-3';
            discountDescription = '3% Discount for MusicSupplies.com (Limited Time)';
            break;
          case 4:
            discountPartNumber = 'WEB-DISCOUNT-4';
            discountDescription = '4% Discount for MusicSupplies.com (Limited Time)';
            break;
          case 5:
            discountPartNumber = 'WEB-DISCOUNT-5';
            discountDescription = '4% Discount for MusicSupplies.com (Limited Time)'; // Note: WEB-DISCOUNT-5 is 4% per your table
            break;
          default:
            // For any other percentage, use the closest match
            if (discountPercentage >= 5) {
              discountPartNumber = 'WEB-DISCOUNT-5';
              discountDescription = '4% Discount for MusicSupplies.com (Limited Time)';
            } else if (discountPercentage >= 4) {
              discountPartNumber = 'WEB-DISCOUNT-4';
              discountDescription = '4% Discount for MusicSupplies.com (Limited Time)';
            } else if (discountPercentage >= 3) {
              discountPartNumber = 'WEB-DISCOUNT-3';
              discountDescription = '3% Discount for MusicSupplies.com (Limited Time)';
            } else if (discountPercentage >= 2) {
              discountPartNumber = 'WEB-DISCOUNT-2';
              discountDescription = '2% Discount for MusicSupplies.com (Limited Time)';
            } else {
              discountPartNumber = 'WEB-DISCOUNT-1';
              discountDescription = '1% Discount for MusicSupplies.com (Limited Time)';
            }
        }
      }
      
      orderComments += ` | Discount Applied: ${discountPartNumber} ($${discountAmount.toFixed(2)})`;
    }

    // Create order items array with discount as the last item (if applicable)
    const orderItems = items.map(item => ({ 
      partnumber: item.partnumber, 
      description: item.description,
      quantity: item.quantity, 
      price: item.price || 0, 
      extended_price: (item.price || 0) * item.quantity
    }));

    // CRITICAL: Add discount as a line item with negative amount
    // This MUST appear last on the invoice for legacy system compatibility
    if (discountPartNumber && discountAmount > 0) {
      orderItems.push({
        partnumber: discountPartNumber,
        description: discountDescription || 'Discount Applied',
        quantity: 1,
        price: -discountAmount, // Negative price for discount
        extended_price: -discountAmount
      });
    }

    const grandTotal = totalPrice - discountAmount;

    const orderPayload = {
      order_number: orderNumberForDb,
      account_number: accountNumberInt,
      order_comments: orderComments,
      order_items: orderItems,
      subtotal: totalPrice,
      discount_percentage: discountAmount > 0 ? (discountAmount / totalPrice) * 100 : 0,
      discount_amount: discountAmount,
      grand_total: grandTotal,
      status: 'Pending Confirmation'
    };
    console.log('Placing order with payload:', orderPayload);

    try {
      const { data: insertedOrder, error: insertError } = await supabase
        .from('web_orders')
        .insert(orderPayload)
        .select() 
        .single(); 

      if (insertError || !insertedOrder) {
        console.error('Supabase insert error:', insertError);
        throw new Error(insertError?.message || 'Failed to save order to database.');
      }

      console.log('Order saved successfully:', insertedOrder);

      // If an order-based discount was applied, update the usage tracking
      if (currentDiscountInfo && currentDiscountInfo.type === 'order_based' && maxDiscountRate && maxDiscountRate > 0) {
        try {
          // Find the discount tier ID from the discount rate
          const { data: discountTiers, error: tierError } = await supabase
            .from('discount_tiers')
            .select('id')
            .eq('discount_type', 'order_based')
            .eq('discount', maxDiscountRate)
            .limit(1);

          if (tierError) {
            console.error('Error finding discount tier for usage tracking:', tierError);
          } else if (discountTiers && discountTiers.length > 0) {
            const discountTierId = discountTiers[0].id;
            
            // First, get current usage or create new record
            const { data: existingUsage, error: usageError } = await supabase
              .from('account_order_discounts')
              .select('orders_used')
              .eq('account_number', user.accountNumber)
              .eq('discount_tier_id', discountTierId)
              .single();

            const currentUsage = existingUsage?.orders_used || 0;
            
            // Update or insert the usage record
            const { error: upsertError } = await supabase
              .from('account_order_discounts')
              .upsert({
                account_number: user.accountNumber,
                discount_tier_id: discountTierId,
                orders_used: currentUsage + 1
              }, {
                onConflict: 'account_number,discount_tier_id'
              });

            if (upsertError) {
              console.error('Error updating order discount usage:', upsertError);
            } else {
              console.log('Order-based discount usage updated successfully');
            }
          }
        } catch (err) {
          console.error('Exception updating order discount usage:', err);
        }
      }
      // Email sending logic will be added later, once build is stable
      console.log(`Order ${orderNumberGenerated} placed. Email to ${customerEmail} and CC pcapece@aol.com would be sent here.`);

      clearCart();
      return orderNumberGenerated;
    } catch (error) {
      // Enhanced error handling for order placement
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error('Network error: Unable to connect to the database. Please check your internet connection and try again.');
        } else {
          throw error;
        }
      } else {
        throw new Error('An unexpected error occurred while placing the order.');
      }
    }
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce((total, item) => total + ((item.price || 0) * item.quantity), 0);

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
      placeOrder
    }}>
      {children}
    </CartContext.Provider>
  );
};