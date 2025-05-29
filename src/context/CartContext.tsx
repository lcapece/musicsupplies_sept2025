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

let nextOrderNumber = 750000; // This will be updated by useEffect

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
  const { user, maxDiscountRate } = useAuth(); // Changed from activeDiscount to maxDiscountRate

  useEffect(() => {
    // This useEffect is now only for initializing the order number
    const initializeOrderNumber = async () => {
      try {
        const { data, error } = await supabase
          .from('web_orders')
          .select('order_number')
          .order('order_number', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching max order number:', error);
          return; // Keep default nextOrderNumber value
        }

        // Check if we got any data back
        if (data && data.length > 0) {
          nextOrderNumber = data[0].order_number + 1;
        }
        // If no data, keep the default nextOrderNumber value (750000)
        
      } catch (e) {
        console.error('Exception fetching max order number:', e);
        // Fallback in case of any other error - keep default value
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

    
    let calculatedDiscountAmount = 0;
    let calculatedGrandTotal = totalPrice;
    let calculatedDiscountPercentage = 0;
    let orderComments = `Payment Method: ${paymentMethod}. Customer Email: ${customerEmail}, Phone: ${customerPhone}`;

    if (maxDiscountRate && maxDiscountRate > 0 && items.length > 0) {
      calculatedDiscountAmount = totalPrice * maxDiscountRate;
      calculatedGrandTotal = totalPrice - calculatedDiscountAmount;
      calculatedDiscountPercentage = maxDiscountRate * 100;
      orderComments += ` | Customer Discount Applied: ${calculatedDiscountPercentage.toFixed(2)}% ($${calculatedDiscountAmount.toFixed(2)})`;
    }

    const orderPayload = {
      order_number: orderNumberForDb,
      account_number: accountNumberInt,
      order_comments: orderComments,
      order_items: items.map(item => ({ 
        partnumber: item.partnumber, 
        description: item.description,
        quantity: item.quantity, 
        price: item.price || 0, 
        extended_price: (item.price || 0) * item.quantity
      })),
      subtotal: totalPrice,
      discount_percentage: calculatedDiscountPercentage,
      discount_amount: calculatedDiscountAmount,
      grand_total: calculatedGrandTotal,
      status: 'Pending Confirmation'
    };
    console.log('Placing order with payload:', orderPayload);

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
    // Email sending logic will be added later, once build is stable
    console.log(`Order ${orderNumberGenerated} placed. Email to ${customerEmail} and CC pcapece@aol.com would be sent here.`);

    clearCart();
    return orderNumberGenerated;
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