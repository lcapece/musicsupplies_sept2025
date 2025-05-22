import React, { useState, useEffect, useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart as CartIcon, X, Minus, Plus, CreditCard } from 'lucide-react';

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({ isOpen, onClose }) => {
  const { items, removeFromCart, updateQuantity, totalItems, totalPrice, clearCart, placeOrder } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'net10'>('net10');
  const { user, activeDiscount } = useAuth();
  const [email, setEmail] = useState(user?.email || user?.email_address || '');
  const [phone, setPhone] = useState(user?.mobile_phone || '');

  console.log('[ShoppingCart] Active Discount:', activeDiscount); 
  
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

  const handleCheckout = () => {
    setIsCheckingOut(true);
  };
  
  const handlePlaceOrder = async () => {
    if (!email || !phone) {
      alert('Please provide both email and phone number');
      return;
    }
    
    try {
      const newOrderNumber = await placeOrder(paymentMethod, email, phone);
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
                <tr class="total">
                    <td>TOTAL:</td>
                    <td class="numeric">$${totalPrice.toFixed(2)}</td>
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
Order Confirmation...`; // Truncated for brevity, full content assumed

      try {
        console.log("Attempting to send email to:", email);
      } catch (emailError) {
        console.error('Error preparing to send email:', emailError);
      }
      
      setTimeout(() => {
        setOrderPlaced(false);
        setIsCheckingOut(false);
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Failed to place order. Please try again.');
    }
  };
  
  const sortedCartItems = useMemo(() => {
    return [...items].sort((a, b) => a.partnumber.localeCompare(b.partnumber));
  }, [items]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 overflow-hidden z-50">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div className="w-screen max-w-4xl"> {/* Width already max-w-4xl from previous step */}
            <div className="h-full flex flex-col bg-white shadow-xl">
              <div className="flex-1 py-6 overflow-y-auto px-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Shopping Cart</h2>
                  <button type="button" className="ml-3 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-500" onClick={onClose}>
                    <X size={20} />
                  </button>
                </div>

                {orderPlaced ? (
                  <div className="mt-8"> {/* Order Placed View */}
                    <div className="bg-green-50 p-4 rounded-md">
                      <div className="flex">
                        <div className="flex-shrink-0"><CreditCard className="h-5 w-5 text-green-400" /></div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-green-800">Order Placed Successfully</h3>
                          <div className="mt-2">
                            <p className="text-[20pt] font-bold text-green-700 mb-2">{orderNumber}</p>
                            <p className="text-sm text-green-700">Your order has been placed and will be processed shortly.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : isCheckingOut ? (
                  <div className="mt-8"> {/* Checkout View (Order Summary) */}
                    <div className="flow-root">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
                      <div className="border-t border-b border-gray-200 py-4 my-4">
                        <dl className="space-y-2 divide-y divide-gray-200">
                          <div className="flex items-center justify-between pt-2">
                            <dt className="text-sm text-gray-600">Subtotal</dt>
                            <dd className="text-sm font-medium text-gray-900">${totalPrice.toFixed(2)}</dd>
                          </div>
                          <div className="flex items-center justify-between pt-2">
                            <dt className="text-sm text-gray-600">Shipping</dt>
                            <dd className="text-sm font-medium text-gray-900">(Pending)</dd>
                          </div>
                          {activeDiscount && activeDiscount.percentage !== null && activeDiscount.percentage > 0 && (
                            <div className="flex items-center justify-between pt-2">
                              <dt className="text-sm text-gray-600">Discount ({activeDiscount.percentage}%)</dt>
                              <dd className="text-sm font-medium text-red-600">
                                -${(totalPrice * (activeDiscount.percentage / 100)).toFixed(2)}
                              </dd>
                            </div>
                          )}
                          <div className="flex items-center justify-between border-t-2 border-gray-300 pt-3 mt-3">
                            <dt className="text-base font-medium text-gray-900">
                              Grand Total {activeDiscount && activeDiscount.percentage ? `(after ${activeDiscount.percentage}% discount)` : ''}
                            </dt>
                            <dd className="text-base font-medium text-gray-900">
                              ${activeDiscount && activeDiscount.percentage !== null && activeDiscount.percentage > 0
                                ? (totalPrice - (totalPrice * (activeDiscount.percentage / 100))).toFixed(2)
                                : totalPrice.toFixed(2)}
                            </dd>
                          </div>
                        </dl>
                        {activeDiscount && activeDiscount.percentage !== null && activeDiscount.percentage > 0 && (
                           <p className="mt-2 text-xs text-gray-500">
                             Note: {activeDiscount.percentage}% discount does not apply to shipping fees.
                           </p>
                         )}
                      </div>
                      <div className="mt-6"> {/* Contact Info, Payment, Place Order Button */}
                        <h4 className="text-md font-medium text-gray-900 mb-2">Contact Information</h4>
                        {/* ... email and phone inputs ... */}
                        <div className="space-y-4 mb-6">
                          <div>
                            <label htmlFor="checkout-email" className="block text-sm text-gray-700 mb-1">Email Address</label>
                            <input id="checkout-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${!email.trim() ? 'placeholder-gray-500' : ''}`} placeholder={!email.trim() ? "(Required)" : "Enter your email"} required />
                          </div>
                          <div>
                            <label htmlFor="checkout-phone" className="block text-sm text-gray-700 mb-1">Mobile Phone</label>
                            <input id="checkout-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Enter your phone number" required />
                          </div>
                        </div>
                        <h4 className="text-md font-medium text-gray-900 mb-2">Payment Method</h4>
                        {/* ... payment method radio buttons ... */}
                        <div className="space-y-2">
                          <label className="flex items-center"><input type="radio" value="credit" checked={paymentMethod === 'credit'} onChange={() => setPaymentMethod('credit')} className="h-4 w-4 text-blue-600" /><span className="ml-2 text-sm text-gray-700">Credit Card on File</span></label>
                          <label className="flex items-center"><input type="radio" value="net10" checked={paymentMethod === 'net10'} onChange={() => setPaymentMethod('net10')} className="h-4 w-4 text-blue-600" /><span className="ml-2 text-sm text-gray-700">Net-10 Open Account</span></label>
                        </div>
                      </div>
                      <div className="mt-6 flex justify-between">
                        <button type="button" className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50" onClick={() => setIsCheckingOut(false)}>Back to Cart</button>
                        <button type="button" className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${!email.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`} onClick={handlePlaceOrder} disabled={!email.trim()} title={!email.trim() ? "Update Email" : "Place your order"}>Place Order</button>
                      </div>
                    </div>
                  </div>
                ) : ( /* Initial Cart View */
                  <div className="mt-8">
                    <div className="flow-root">
                      {items.length === 0 ? (
                        <div className="text-center py-12">
                          <CartIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">Your cart is empty</h3>
                          <p className="mt-1 text-sm text-gray-500">Start adding products to your cart</p>
                        </div>
                      ) : (
                        <div className="border border-gray-300 rounded-md">
                          <table className="min-w-full border-collapse border border-gray-300">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Item</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Description</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Qty</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Price</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Total</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {sortedCartItems.map((item) => ( // Use sortedCartItems
                                <tr key={item.partnumber}>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">{item.partnumber}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500 min-w-[200px] border border-gray-300">{item.description}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500 text-center border border-gray-300">
                                    <div className="flex items-center justify-center border rounded-md w-24 mx-auto">
                                      <button type="button" className="p-1 rounded-l text-gray-600 hover:text-gray-700 hover:bg-gray-100" onClick={() => updateQuantity(item.partnumber, item.quantity - 1)}><Minus size={14} /></button>
                                      <span className="px-3 py-0.5 text-gray-700 text-sm">{item.quantity}</span>
                                      <button type="button" className="p-1 rounded-r text-gray-600 hover:text-gray-700 hover:bg-gray-100" onClick={() => updateQuantity(item.partnumber, item.quantity + 1)}><Plus size={14} /></button>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500 border border-gray-300">${(item.price || 0).toFixed(2)}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 border border-gray-300">${((item.price || 0) * item.quantity).toFixed(2)}</td>
                                  <td className="px-4 py-3 text-center border border-gray-300">
                                    <button type="button" className="text-xs font-medium text-red-600 hover:text-red-500" onClick={() => removeFromCart(item.partnumber)}>Remove</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!orderPlaced && items.length > 0 && !isCheckingOut && (
                <div className="border-t border-gray-200 py-6 px-4 sm:px-6">
                  <div className="flex justify-between text-base font-medium text-gray-900">
                    <p>Subtotal</p>
                    <p>${totalPrice.toFixed(2)}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">Shipping calculated at checkout.</p>
                  {activeDiscount && activeDiscount.percentage !== null && activeDiscount.percentage > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                        Discount of {activeDiscount.percentage}% will be applied to subtotal. Does not apply to shipping.
                    </div>
                  )}
                  <div className="mt-6">
                    <button onClick={handleCheckout} className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700">
                      Checkout
                    </button>
                  </div>
                  <div className="mt-6 flex justify-center text-sm text-center text-gray-500">
                    <p>
                      or{' '}
                      <button type="button" className="text-blue-600 font-medium hover:text-blue-500" onClick={onClose}>
                        Continue Shopping<span aria-hidden="true"> &rarr;</span>
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
  );
};

export default ShoppingCart;
