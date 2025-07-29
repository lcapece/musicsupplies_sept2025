import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { PromoCodeValidity, AvailablePromoCode } from '../types';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart as CartIcon, X, Minus, Plus, CreditCard, Trash2, RefreshCw } from 'lucide-react';
import OrderConfirmationModal from './OrderConfirmationModal';
import { OrderConfirmationDetails } from '../types';
import { supabase } from '../lib/supabase';
import { createInvoiceDataFromOrder, generateInvoiceHTML, generateInvoiceText } from '../utils/invoiceGenerator';

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({ isOpen, onClose }) => {
  const { 
    items, 
    removeFromCart, 
    updateQuantity, 
    totalItems, 
    totalPrice, 
    clearCart, 
    placeOrder, 
    applyPromoCode,
    removePromoCode,
    appliedPromoCode,
    availablePromoCodes,
    fetchAvailablePromoCodes,
    isLoadingPromoCodes,
    isPromoCodeAutoApplied
  } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [orderConfirmationDetails, setOrderConfirmationDetails] = useState<OrderConfirmationDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'net10'>('net10');
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || user?.email_address || '');
  const [phone, setPhone] = useState(user?.mobile_phone || '');
  const [validationErrors, setValidationErrors] = useState<{
    phone?: boolean;
    email?: boolean;
  }>({});
  const phoneInputRef = React.useRef<HTMLInputElement>(null);
  const [poReference, setPoReference] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Format phone number as (999) 999-9999
  const formatPhoneNumber = (value: string): string => {
    // Strip all non-numeric characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format the phone number
    if (phoneNumber.length === 0) {
      return '';
    } else if (phoneNumber.length <= 3) {
      return `(${phoneNumber}`;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };
  
  // Promo code states
  const [selectedPromoCode, setSelectedPromoCode] = useState<string>('');
  const [applyingPromo, setApplyingPromo] = useState<boolean>(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [showPromoWarning, setShowPromoWarning] = useState<boolean>(false);
  
  useEffect(() => {
    if (isOpen && user) {
      setEmail(user.email || user.email_address || '');
      setPhone(user.mobile_phone || '');
    }
    if (!isOpen) {
      setIsCheckingOut(false);
      setOrderPlaced(false);
    }
  }, [isOpen, user]);

  // When available promo codes change, pre-select the best available one
  useEffect(() => {
    if (availablePromoCodes.length > 0) {
      // Filter to only available codes (not expired or unusable)
      const availableCodes = availablePromoCodes.filter(promo => 
        !promo.status || promo.status === 'available' || promo.status === 'min_not_met'
      );
      
      if (availableCodes.length > 0) {
        // Find the best available promo code (the one marked as is_best)
        const bestPromo = availableCodes.find(promo => promo.is_best);
        if (bestPromo) {
          setSelectedPromoCode(bestPromo.code);
        } else {
          // If no best code is marked, select the one with the highest discount
          const sortedPromos = [...availableCodes].sort((a, b) => b.discount_amount - a.discount_amount);
          if (sortedPromos.length > 0) {
            setSelectedPromoCode(sortedPromos[0].code);
          }
        }
      } else {
        setSelectedPromoCode('');
      }
    } else {
      setSelectedPromoCode('');
    }
  }, [availablePromoCodes]);

  const handleCheckout = () => {
    // Reset any previous validation errors
    setValidationErrors({});
    
    // First check if the phone number is provided
    if (!phone || phone.trim() === '') {
      setValidationErrors(prev => ({ ...prev, phone: true }));
      
      // Set isCheckingOut to true to show the checkout form with the phone field
      setIsCheckingOut(true);
      
      // After the component re-renders with the input field, focus on it
      setTimeout(() => {
        if (phoneInputRef.current) {
          phoneInputRef.current.focus();
        }
      }, 100);
      
      return;
    }
    
    // Check if there are available promo codes but none is applied
    const hasUnusedPromoCodes = availablePromoCodes.length > 0 && !appliedPromoCode;
    const hasEligiblePromoCodes = availablePromoCodes.some(promo => totalPrice >= promo.min_order_value);
    
    if (hasUnusedPromoCodes && hasEligiblePromoCodes) {
      setShowPromoWarning(true);
      return;
    }
    
    setIsCheckingOut(true);
  };
  
  const handleProceedWithoutPromo = () => {
    setShowPromoWarning(false);
    setIsCheckingOut(true);
  };
  
  const handleApplyBestPromoAndCheckout = async () => {
    setShowPromoWarning(false);
    
    // Find the best eligible promo code
    const bestEligiblePromo = availablePromoCodes.find(promo => 
      promo.is_best && totalPrice >= promo.min_order_value
    ) || availablePromoCodes.find(promo => 
      totalPrice >= promo.min_order_value
    );
    
    if (bestEligiblePromo) {
      try {
        const result = await applyPromoCode(bestEligiblePromo.code);
        if (result.is_valid) {
          console.log('Best promo code applied, proceeding to checkout');
        }
      } catch (error) {
        console.error('Error applying best promo code:', error);
      }
    }
    
    setIsCheckingOut(true);
  };
  
  const handlePlaceOrder = async () => {
    // Reset validation errors
    setValidationErrors({});
    
    // Validate fields
    let hasErrors = false;
    
    if (!phone) {
      setValidationErrors(prev => ({ ...prev, phone: true }));
      // Focus on the phone input field
      if (phoneInputRef.current) {
        phoneInputRef.current.focus();
      }
      hasErrors = true;
    }
    
    if (!email) {
      setValidationErrors(prev => ({ ...prev, email: true }));
      hasErrors = true;
    }
    
    if (hasErrors) {
      return;
    }
    
    try {
      const newOrderNumber = await placeOrder(paymentMethod, email, phone, poReference, specialInstructions);
      
      setOrderConfirmationDetails({
        webOrderNumber: newOrderNumber,
        items: [...items], 
        total: appliedPromoCode && appliedPromoCode.is_valid && appliedPromoCode.discount_amount
          ? totalPrice - appliedPromoCode.discount_amount
          : totalPrice,
      });
      setOrderNumber(newOrderNumber);
      setOrderPlaced(true);

      // Generate professional invoice using the new invoice generator
      try {
        console.log("Generating and sending invoice email to:", email);
        
        // Create invoice data from the order
        const invoiceData = createInvoiceDataFromOrder(
          newOrderNumber,
          items,
          email,
          phone,
          paymentMethod,
          appliedPromoCode && appliedPromoCode.is_valid && appliedPromoCode.discount_amount ? {
            discount_amount: appliedPromoCode.discount_amount,
            message: appliedPromoCode.message,
            code: appliedPromoCode.promo_id
          } : undefined,
          {
            name: user?.acctName || email.split('@')[0],
            accountNumber: user?.accountNumber
          }
        );

        // Generate HTML and text versions of the invoice
        const invoiceHTML = generateInvoiceHTML(invoiceData);
        const invoiceText = generateInvoiceText(invoiceData);

        // Send the invoice email via Mailgun
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-mailgun-email', {
          body: {
            to: email,
            subject: `Invoice ${newOrderNumber} - Lou Capece Music Distributors`,
            html: invoiceHTML,
            text: invoiceText,
            testMode: false
          }
        });

        if (emailError) {
          console.error('Error sending invoice email:', emailError);
          // Don't fail the order if email fails, just log it
        } else {
          console.log('Invoice email sent successfully:', emailResult);
        }

      } catch (emailError) {
        console.error('Error generating or sending invoice email:', emailError);
        // Don't fail the order if email fails, just log it
      }

      // Send customer SMS notification
      if (phone) {
        try {
          console.log("Sending customer SMS notification to:", phone);
          
          const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-customer-sms', {
            body: {
              customerPhone: phone,
              orderNumber: newOrderNumber,
              customerName: user?.acctName || email.split('@')[0]
            }
          });

          if (smsError) {
            console.error('Error sending customer SMS:', smsError);
            // Log the SMS failure to database for admin notification
            try {
              const { error: logError } = await supabase
                .from('sms_notification_failures')
                .insert({
                  order_number: newOrderNumber,
                  customer_phone: phone,
                  customer_name: user?.acctName || email.split('@')[0],
                  customer_account_number: user?.accountNumber,
                  error_message: smsError.message || 'SMS sending failed'
                });
              
              if (logError) {
                console.error('Failed to log SMS error:', logError);
              }
            } catch (logError) {
              console.error('Error logging SMS failure:', logError);
            }
          } else {
            console.log('Customer SMS sent successfully:', smsResult);
          }

        } catch (smsError: any) {
          console.error('Error sending customer SMS notification:', smsError);
          // Log the SMS failure to database for admin notification
          try {
            const { error: logError } = await supabase
              .from('sms_notification_failures')
              .insert({
                order_number: newOrderNumber,
                customer_phone: phone,
                customer_name: user?.acctName || email.split('@')[0],
                customer_account_number: user?.accountNumber,
                error_message: smsError.message || 'SMS sending failed'
              });
            
            if (logError) {
              console.error('Failed to log SMS error:', logError);
            }
          } catch (logError) {
            console.error('Error logging SMS failure:', logError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Failed to place order. Please try again.');
    }
  };
  
  // Handle applying promo code
  const handleApplyPromoCode = async () => {
    if (!selectedPromoCode.trim()) {
      setPromoError('Please select a promo code first');
      return;
    }
    
    setApplyingPromo(true);
    setPromoError(null);
    
    try {
      console.log('Applying promo code:', selectedPromoCode.trim());
      const result = await applyPromoCode(selectedPromoCode.trim());
      
      if (!result.is_valid) {
        setPromoError(result.message || 'Invalid promo code');
        console.error('Promo code application failed:', result.message);
      } else {
        console.log('Promo code applied successfully:', result);
        setSelectedPromoCode(''); // Clear selection after successful application
      }
    } catch (error) {
      console.error('Error applying promo code:', error);
      setPromoError('An error occurred while applying the promo code. Please try again.');
    } finally {
      setApplyingPromo(false);
    }
  };
  
  // Refresh available promo codes
  const handleRefreshPromoCodes = () => {
    fetchAvailablePromoCodes();
  };
  
  if (!isOpen) return null;

  // Calculate the discount amount from the applied promo code
  const discountAmount = appliedPromoCode && appliedPromoCode.is_valid && appliedPromoCode.discount_amount
    ? appliedPromoCode.discount_amount
    : 0;
    
  // Calculate the grand total after discount
  const displayGrandTotal = totalPrice - discountAmount;

  // Get the selected promo code details
  const selectedPromoDetails = availablePromoCodes.find(promo => promo.code === selectedPromoCode);
  
  const handleCloseConfirmationModal = () => {
    setOrderConfirmationDetails(null);
    setIsCheckingOut(false);
    clearCart(); 
    onClose();
  };

  return (
    <>
      {/* Promo Code Warning Modal */}
      {showPromoWarning && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Save Money with Available Promo Codes!
            </h3>
            <p className="text-gray-600 mb-4">
              You have available promo codes that could save you money on this order. Would you like to apply the best discount before checking out?
            </p>
            {availablePromoCodes.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Best Available:</strong> {availablePromoCodes.find(p => p.is_best)?.code || availablePromoCodes[0].code}
                  <br />
                  <span className="text-blue-600">
                    Save ${(availablePromoCodes.find(p => p.is_best)?.discount_amount || availablePromoCodes[0].discount_amount).toFixed(2)}
                  </span>
                </p>
              </div>
            )}
            <div className="flex space-x-3">
              <button
                onClick={handleApplyBestPromoAndCheckout}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Apply & Checkout
              </button>
              <button
                onClick={handleProceedWithoutPromo}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Skip Discount
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 overflow-hidden z-50">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
          <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div className="w-screen max-w-4xl">
            <div className="h-full flex flex-col bg-white shadow-xl">
              <div className="flex-1 py-6 overflow-y-auto px-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-4xl font-bold text-gray-900">Shopping Cart</h2>
                  <button
                    type="button"
                    className="ml-3 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close panel</span>
                    <X size={24} />
                  </button>
                </div>

                {orderPlaced ? (
                  <div className="mt-8 text-center">
                    <h3 className="text-4xl font-semibold text-green-600">Order Placed Successfully!</h3>
                    <p className="mt-2 text-2xl text-gray-700">Your order number is: <strong>{orderNumber}</strong></p>
                    <p className="mt-4 text-xl text-gray-600">
                      {user?.sms_consent_given 
                        ? "You will receive an email and text alert on the status of the order."
                        : "You will receive an email confirmation shortly."
                      }
                    </p>
                    <button
                      onClick={() => {
                        setOrderPlaced(false);
                        setIsCheckingOut(false);
                        clearCart();
                        onClose();
                      }}
                      className="mt-6 inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      OK
                    </button>
                  </div>
                ) : orderConfirmationDetails ? (
                  <OrderConfirmationModal orderDetails={orderConfirmationDetails} onClose={handleCloseConfirmationModal} />
                ) : isCheckingOut ? (
                  <div className="mt-8">
                    <h3 className="text-3xl font-semibold text-gray-900 mb-6">Checkout</h3>
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="email" className="block text-base font-medium text-gray-700">E-mail Address (required)</label>
                        <input
                          type="email"
                          name="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="you@example.com"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className={`block text-base font-medium ${validationErrors.phone ? 'subtle-required-pulse' : 'text-gray-700'}`}>
                          Phone Number (required) - Mobile Preferred
                        </label>
                        <input
                          ref={phoneInputRef}
                          type="tel"
                          name="phone"
                          id="phone"
                          value={phone}
                          onChange={(e) => {
                            setPhone(formatPhoneNumber(e.target.value));
                            if (e.target.value && validationErrors.phone) {
                              setValidationErrors(prev => ({ ...prev, phone: false }));
                            }
                          }}
                          className={`mt-1 block w-full px-3 py-2 border ${validationErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-base`}
                          placeholder="(999) 999-9999"
                          maxLength={14}
                        />
                      </div>
                      <div>
                        <label className="block text-base font-medium text-gray-700">Payment Method</label>
                        <div className="mt-2 flex space-x-4">
                          <button
                            onClick={() => setPaymentMethod('net10')}
                            className={`px-4 py-2 border rounded-md text-base font-medium ${paymentMethod === 'net10' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                          >
                            Net-10 Open Account
                          </button>
                          <button
                            onClick={() => setPaymentMethod('credit')}
                            className={`px-4 py-2 border rounded-md text-base font-medium ${paymentMethod === 'credit' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                          >
                            Credit Card on File
                          </button>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="poReference" className="block text-base font-medium text-gray-700">Your PO Reference (optional)</label>
                        <input
                          type="text"
                          name="poReference"
                          id="poReference"
                          value={poReference}
                          onChange={(e) => setPoReference(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Enter your PO reference number"
                        />
                      </div>
                      <div>
                        <label htmlFor="specialInstructions" className="block text-base font-medium text-gray-700">
                          Special Instructions or Comment (optional)
                          <span className="text-sm text-gray-500 ml-2">
                            {specialInstructions.length}/140 characters
                          </span>
                        </label>
                        <textarea
                          name="specialInstructions"
                          id="specialInstructions"
                          rows={3}
                          value={specialInstructions}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= 140) {
                              setSpecialInstructions(value);
                            }
                          }}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="Enter any special instructions or comments (max 140 characters)"
                          maxLength={140}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8">
                    {items.length === 0 ? (
                      <p className="text-center text-xl text-gray-500">Your cart is empty.</p>
                    ) : (
                      <ul role="list" className="-my-6 divide-y divide-gray-200">
                        {items.map((item) => (
                          <li key={item.partnumber + (item.description || '')} className="flex py-6">
                            {item.image && (
                              <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                                <img
                                  src={item.image}
                                  alt={item.description || item.partnumber}
                                  className="h-full w-full object-cover object-center"
                                />
                              </div>
                            )}
                            <div className={`ml-4 flex flex-1 flex-col ${!item.image && 'ml-0'}`}>
                              <div>
                                <div className="flex justify-between text-2xl font-medium text-gray-900">
                                  <h3>
                                    <a href="#">{item.partnumber}</a>
                                  </h3>
                                </div>
                                <p className="mt-1 text-base text-gray-500">{item.description}</p>
                              </div>
                              <div className="flex flex-1 items-center justify-between text-sm mt-2">
                                {/* Quantity controls */}
                                <div className="flex items-center">
                                  <button
                                    onClick={() => updateQuantity(item.partnumber, Math.max(1, item.quantity - 1))}
                                    className="p-1 text-gray-500 hover:text-indigo-600"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateQuantity(item.partnumber, parseInt(e.target.value) || 1)}
                                    className="w-16 text-center border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-base mx-2"
                                    min="1"
                                  />
                                  <button
                                    onClick={() => updateQuantity(item.partnumber, item.quantity + 1)}
                                    className="p-1 text-gray-500 hover:text-indigo-600"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>

                                {/* Spacer to push prices and remove button to the right */}
                                <div className="flex-grow"></div>

                                {/* Prices and Remove button container */}
                                <div className="flex items-center space-x-4">
                                  <div className="text-right">
                                    <p className="text-sm text-gray-500">${(item.price || 0).toFixed(2)} ea.</p>
                                    <p className="font-medium text-xl text-gray-900">${((item.price || 0) * item.quantity).toFixed(2)}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      console.log('Attempting to remove item:', item.partnumber);
                                      removeFromCart(item.partnumber);
                                    }}
                                    className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-md"
                                    aria-label="Remove item"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {!orderPlaced && (
                <div className="border-t border-gray-200 py-6 px-4 sm:px-6">
                  <div className="flex justify-between text-2xl font-medium text-gray-900">
                    <p>Subtotal</p>
                    <p>${totalPrice.toFixed(2)}</p>
                  </div>

                  {/* Promo Code Dropdown - Moved up to the totals section */}
                  {!isCheckingOut && items.length > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between items-center">
                        <div className="flex-grow">
                          <div className="flex items-center">
                            <select
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              value={selectedPromoCode}
                              onChange={(e) => setSelectedPromoCode(e.target.value)}
                              disabled={isLoadingPromoCodes}
                            >
                              <option value="">
                                {appliedPromoCode ? 'Switch to a different promo code' : 'Select a promo code'}
                              </option>
                              {availablePromoCodes
                                .filter(promo => !promo.status || promo.status === 'available' || promo.status === 'min_not_met')
                                .map((promo) => (
                                <option key={promo.code} value={promo.code}>
                                  {promo.code} - {promo.description} (Save ${promo.discount_amount.toFixed(2)})
                                  {promo.is_best ? ' - Best Value!' : ''}
                                  {appliedPromoCode && appliedPromoCode.promo_id === promo.code ? ' - Currently Applied' : ''}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={handleRefreshPromoCodes}
                              className="inline-flex items-center p-2 border border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100"
                              title="Refresh promo codes"
                              disabled={isLoadingPromoCodes}
                            >
                              <RefreshCw size={16} className={isLoadingPromoCodes ? "animate-spin" : ""} />
                            </button>
                            <button
                              type="button"
                              onClick={appliedPromoCode ? removePromoCode : handleApplyPromoCode}
                              className={`inline-flex items-center px-3 py-2 text-sm leading-4 font-medium rounded-r-md text-white ${
                                appliedPromoCode 
                                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 border border-transparent' 
                                  : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                              } ${
                                // Add critical flashing red border when there are available promo codes and none applied
                                !appliedPromoCode && selectedPromoCode && availablePromoCodes.length > 0 
                                  ? 'promo-button-pulse relative z-10' 
                                  : 'border border-transparent'
                              } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                              title={!appliedPromoCode && selectedPromoCode ? "CLICK TO APPLY PROMO CODE!" : ""}
                              disabled={applyingPromo || (!appliedPromoCode && !selectedPromoCode)}
                            >
                              {applyingPromo ? 'Applying...' : appliedPromoCode ? 'Remove' : 'Apply'}
                            </button>
                          </div>
                          {promoError && (
                            <p className="mt-1 text-sm text-red-600">{promoError}</p>
                          )}
                          {appliedPromoCode && appliedPromoCode.is_valid && (
                            <p className="mt-1 text-sm text-green-600">
                              Promo code applied successfully!
                            </p>
                          )}
                          {!appliedPromoCode && selectedPromoDetails && (
                            <p className="mt-1 text-xs text-blue-600">
                              Potential savings: ${selectedPromoDetails.discount_amount.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Applied discount display */}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm font-medium text-green-600 mt-2">
                      <p>{appliedPromoCode?.message || "Promo Code Discount"}</p>
                      <p>-${discountAmount.toFixed(2)}</p>
                    </div>
                  )}

                  <div className="flex justify-between text-3xl font-bold text-gray-900 mt-2 pt-2 border-t border-dashed">
                    <p>Sub Total</p>
                    <p>${displayGrandTotal.toFixed(2)}</p>
                  </div>
                  <p className="mt-0.5 text-base text-gray-500">Does not inclued shipping charge. You will be emailed the Grand Total when shipped</p>
                  <div className="mt-6">
                    {isCheckingOut && (
                      <p className="text-red-600 text-sm font-medium text-center mb-4">
                        Total does not include shipping. You will be emailed the Grand Total when shipped
                      </p>
                    )}
                    {isCheckingOut ? (
                      <button
                        onClick={handlePlaceOrder}
                        disabled={items.length === 0 || !email || !phone}
                        className="w-full flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        <CreditCard size={20} className="mr-2" /> Place Order
                      </button>
                    ) : (
                      <button
                        onClick={handleCheckout}
                        disabled={items.length === 0}
                        className="w-full flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 disabled:bg-gray-300"
                      >
                        Proceed to Checkout
                      </button>
                    )}
                  </div>
                  <div className="mt-6 flex justify-center text-center text-sm text-gray-500">
                    <p>
                      or{' '}
                      <button
                        type="button"
                        className="font-medium text-indigo-600 hover:text-indigo-500"
                        onClick={() => {
                          if (isCheckingOut) setIsCheckingOut(false);
                          else onClose();
                        }}
                      >
                        {isCheckingOut ? 'Back to Cart' : 'Continue Shopping'}
                        <span aria-hidden="true"> &rarr;</span>
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShoppingCart;
