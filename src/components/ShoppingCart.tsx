import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { PromoCodeValidity, AvailablePromoCode } from '../types';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart as CartIcon, X, Minus, Plus, CreditCard, Trash2, RefreshCw } from 'lucide-react';
import OrderConfirmationModal from './OrderConfirmationModal';
import { OrderConfirmationDetails } from '../types';

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
    isLoadingPromoCodes
  } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [orderConfirmationDetails, setOrderConfirmationDetails] = useState<OrderConfirmationDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'net10'>('net10');
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || user?.email_address || '');
  const [phone, setPhone] = useState(user?.mobile_phone || '');
  
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

  // When available promo codes change, pre-select the best one
  useEffect(() => {
    if (availablePromoCodes.length > 0) {
      // Find the best promo code (the one marked as is_best)
      const bestPromo = availablePromoCodes.find(promo => promo.is_best);
      if (bestPromo) {
        setSelectedPromoCode(bestPromo.code);
      } else {
        // If no best code is marked, select the one with the highest discount
        const sortedPromos = [...availablePromoCodes].sort((a, b) => b.discount_amount - a.discount_amount);
        if (sortedPromos.length > 0) {
          setSelectedPromoCode(sortedPromos[0].code);
        }
      }
    } else {
      setSelectedPromoCode('');
    }
  }, [availablePromoCodes]);

  const handleCheckout = () => {
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
    if (!email || !phone) {
      alert('Please provide both email and phone number');
      return;
    }
    
    try {
      const newOrderNumber = await placeOrder(paymentMethod, email, phone);
      
      setOrderConfirmationDetails({
        webOrderNumber: newOrderNumber,
        items: [...items], 
        total: appliedPromoCode && appliedPromoCode.is_valid && appliedPromoCode.discount_amount
          ? totalPrice - appliedPromoCode.discount_amount
          : totalPrice,
      });
      setOrderNumber(newOrderNumber);
      setOrderPlaced(true);

      const seller = {
        name: "Lou Capece Music Distributors",
        address: "2555 North Jerusalem Road",
        cityStateZip: "East Meadow, NY 11554",
        phone: "1(800)321-5584",
        email: "info@loucapecemusic.com"
      };

      const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation - ${newOrderNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333; }
        .container { max-width: 800px; margin: 20px auto; background-color: #fff; padding: 20px; border: 1px solid #ddd; }
        .header { text-align: center; margin-bottom: 20px; padding-bottom:10px; border-bottom: 1px solid #eee; }
        .header h1 { color: #0056b3; margin:0; }
        .seller-info { text-align: center; margin-bottom: 20px; font-size: 0.9em; color: #555;}
        .seller-info p { margin: 2px 0; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; padding-bottom:20px; border-bottom: 1px solid #eee; }
        .details-grid h3 { margin-top: 0; color: #0056b3; font-size: 1.1em; border-bottom: 1px solid #eee; padding-bottom: 5px;}
        .bill-to p, .payment-details p { margin: 5px 0; font-size: 0.95em; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .items-table th { background-color: #0056b3; color: #fff; font-weight: bold; }
        .items-table td.numeric, .items-table th.numeric { text-align: right; }
        .summary { margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee;}
        .summary table { width: 50%; margin-left: auto; }
        .summary td { padding: 5px 0; }
        .summary .total td { font-weight: bold; font-size: 1.2em; color: #0056b3; border-top: 2px solid #0056b3; padding-top:10px;}
        .footer { text-align: center; margin-top: 30px; font-size: 0.9em; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Confirmation</h1>
            <p>Order Number: <strong>${newOrderNumber}</strong></p>
        </div>

        <div class="seller-info">
            <p><strong>${seller.name}</strong></p>
            <p>${seller.address}</p>
            <p>${seller.cityStateZip}</p>
            <p>Phone: ${seller.phone} | Email: ${seller.email}</p>
        </div>

        <div class="details-grid">
            <div class="bill-to">
                <h3>BILL TO</h3>
                <p>Email: ${email}</p>
                <p>Phone: ${phone}</p>
            </div>
            <div class="payment-details">
                <h3>PAYMENT DETAILS</h3>
                <p>Method: ${paymentMethod === 'credit' ? 'Credit Card on File' : 'Net-10 Open Account'}</p>
            </div>
        </div>

        <h3>Order Items</h3>
        <table class="items-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Description</th>
                    <th class="numeric">Quantity</th>
                    <th class="numeric">Unit Price</th>
                    <th class="numeric">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                <tr>
                    <td>${item.partnumber}</td>
                    <td>${item.description}</td>
                    <td class="numeric">${item.quantity}</td>
                    <td class="numeric">$${(item.price || 0).toFixed(2)}</td>
                    <td class="numeric">$${((item.price || 0) * item.quantity).toFixed(2)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="summary">
            <table>
                <tr>
                    <td>Subtotal:</td>
                    <td class="numeric">$${totalPrice.toFixed(2)}</td>
                </tr>
                ${appliedPromoCode && appliedPromoCode.is_valid && appliedPromoCode.discount_amount ? `
                <tr>
                    <td>Promo Code Discount:</td>
                    <td class="numeric">-$${appliedPromoCode.discount_amount.toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr class="total">
                    <td>TOTAL:</td>
                    <td class="numeric">$${appliedPromoCode && appliedPromoCode.is_valid && appliedPromoCode.discount_amount 
                      ? (totalPrice - appliedPromoCode.discount_amount).toFixed(2) 
                      : totalPrice.toFixed(2)}</td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <p>Thank you for your order! We will notify you once your order has shipped.</p>
            <p>&copy; ${new Date().getFullYear()} ${seller.name}</p>
        </div>
    </div>
</body>
</html>
      `;
      const emailText = `
Order Confirmation...`; // Truncated

      try {
        console.log("Attempting to send email to:", email);
      } catch (emailError) {
        console.error('Error preparing to send email:', emailError);
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
                  <h2 className="text-2xl font-bold text-gray-900">Shopping Cart</h2>
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
                    <h3 className="text-2xl font-semibold text-green-600">Order Placed Successfully!</h3>
                    <p className="mt-2 text-lg text-gray-700">Your order number is: <strong>{orderNumber}</strong></p>
                    <p className="mt-4 text-gray-600">You will receive an email confirmation shortly.</p>
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
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">Checkout</h3>
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
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
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone number</label>
                        <input
                          type="tel"
                          name="phone"
                          id="phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="123-456-7890"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                        <div className="mt-2 flex space-x-4">
                          <button
                            onClick={() => setPaymentMethod('net10')}
                            className={`px-4 py-2 border rounded-md text-sm font-medium ${paymentMethod === 'net10' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                          >
                            Net-10 Open Account
                          </button>
                          <button
                            onClick={() => setPaymentMethod('credit')}
                            className={`px-4 py-2 border rounded-md text-sm font-medium ${paymentMethod === 'credit' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                          >
                            Credit Card on File
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8">
                    {items.length === 0 ? (
                      <p className="text-center text-gray-500">Your cart is empty.</p>
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
                                <div className="flex justify-between text-base font-medium text-gray-900">
                                  <h3>
                                    <a href="#">{item.partnumber}</a>
                                  </h3>
                                </div>
                                <p className="mt-1 text-sm text-gray-500">{item.description}</p>
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
                                    className="w-12 text-center border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm mx-2"
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
                                    <p className="text-xs text-gray-500">${(item.price || 0).toFixed(2)} ea.</p>
                                    <p className="font-medium text-gray-900">${((item.price || 0) * item.quantity).toFixed(2)}</p>
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
                  <div className="flex justify-between text-base font-medium text-gray-900">
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
                              disabled={appliedPromoCode !== null || isLoadingPromoCodes}
                            >
                              <option value="">Select a promo code</option>
                              {availablePromoCodes.map((promo) => (
                                <option key={promo.code} value={promo.code}>
                                  {promo.code} - {promo.description} (Save ${promo.discount_amount.toFixed(2)})
                                  {promo.is_best ? ' - Best Value!' : ''}
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
                              className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-r-md text-white ${
                                appliedPromoCode 
                                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                                  : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                              } focus:outline-none focus:ring-2 focus:ring-offset-2`}
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

                  <div className="flex justify-between text-lg font-bold text-gray-900 mt-2 pt-2 border-t border-dashed">
                    <p>Grand Total</p>
                    <p>${displayGrandTotal.toFixed(2)}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">Shipping and taxes calculated at checkout (if applicable).</p>
                  <div className="mt-6">
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
