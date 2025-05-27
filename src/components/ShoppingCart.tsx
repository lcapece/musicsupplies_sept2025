import React, { useState, useEffect, useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart as CartIcon, X, Minus, Plus, CreditCard } from 'lucide-react';
// import OrderConfirmationModal from './OrderConfirmationModal'; // Reverted
// import { OrderConfirmationDetails } from '../types'; // Reverted

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({ isOpen, onClose }) => {
  const { items, removeFromCart, updateQuantity, totalItems, totalPrice, clearCart, placeOrder } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false); // Restored
  const [orderNumber, setOrderNumber] = useState<string>(''); // Restored
  // const [orderConfirmationDetails, setOrderConfirmationDetails] = useState<OrderConfirmationDetails | null>(null); // Reverted
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'net10'>('net10');
  const { user, maxDiscountRate } = useAuth(); // Use maxDiscountRate
  const [email, setEmail] = useState(user?.email || user?.email_address || '');
  const [phone, setPhone] = useState(user?.mobile_phone || '');

  // console.log('[ShoppingCart] maxDiscountRate:', maxDiscountRate); 
  
  useEffect(() => {
    if (isOpen && user) {
      setEmail(user.email || user.email_address || '');
      setPhone(user.mobile_phone || '');
    }
    if (!isOpen) {
      setIsCheckingOut(false);
      setOrderPlaced(false); // Restored
      // setOrderConfirmationDetails(null); // Reverted
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
      
      // const currentTotal = maxDiscountRate && maxDiscountRate > 0 && items.length > 0 
      //   ? totalPrice * (1 - maxDiscountRate) 
      //   : totalPrice;

      // setOrderConfirmationDetails({ // Reverted
      //   webOrderNumber: newOrderNumber,
      //   items: [...items], 
      //   total: currentTotal, 
      // });
      setOrderNumber(newOrderNumber); // Restored
      setOrderPlaced(true); // Restored

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
                ${maxDiscountRate && maxDiscountRate > 0 && items.length > 0 ? `
                <tr>
                    <td>Customer Discount (${(maxDiscountRate * 100).toFixed(0)}%):</td>
                    <td class="numeric">-$${(totalPrice * maxDiscountRate).toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr class="total">
                    <td>TOTAL:</td>
                    <td class="numeric">$${maxDiscountRate && maxDiscountRate > 0 && items.length > 0 ? (totalPrice * (1 - maxDiscountRate)).toFixed(2) : totalPrice.toFixed(2)}</td>
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
      // setTimeout(() => { // Removed timeout logic
      //   setOrderPlaced(false);
      //   setIsCheckingOut(false);
      //   clearCart(); // Clear cart after order
      //   onClose(); 
      // }, 3000); 
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Failed to place order. Please try again.');
    }
  };
  
  
  console.log('[ShoppingCart] items from useCart():', items); 

  // const sortedCartItems = useMemo(() => { // Removing sorting as per user request for debugging
  //   try {
  //     // console.log('[ShoppingCart] Attempting to sort items inside useMemo. Items length:', items.length);
  //     if (!Array.isArray(items) || items.length === 0) {
  //       // console.log('[ShoppingCart] Items is not an array or is empty, returning empty array for sortedCartItems.');
  //       return [];
  //     }
  //     const sorted = [...items].sort((a, b) => {
  //       const partA = String(a.partnumber || ''); 
  //       const partB = String(b.partnumber || ''); 
  //       return partA.localeCompare(partB);
  //     });
  //     // console.log('[ShoppingCart] sortedCartItems successfully created:', sorted);
  //     return sorted;
  //   } catch (error) {
  //     // console.error('[ShoppingCart] Error during sorting in useMemo:', error);
  //     return [...items]; 
  //   }
  // }, [items]);

  if (!isOpen) return null;

  // Calculate discount based on maxDiscountRate
  const displayDiscountAmount = (maxDiscountRate && maxDiscountRate > 0 && items.length > 0) ? totalPrice * maxDiscountRate : 0;
  const displayGrandTotal = totalPrice - displayDiscountAmount;
  const displayDiscountPercentage = maxDiscountRate ? maxDiscountRate * 100 : 0;

  // const handleCloseConfirmationModal = () => { // Reverted
  //   setOrderConfirmationDetails(null);
  //   setIsCheckingOut(false);
  //   // clearCart(); 
  //   onClose();
  // };

  if (!isOpen) return null; // Keep this guard

  return (
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
                    {/* <p className="mt-1 text-sm text-gray-500">This window will close automatically.</p> */}
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
                // ) : orderConfirmationDetails ? ( // Reverted
                //   <OrderConfirmationModal details={orderConfirmationDetails} onClose={handleCloseConfirmationModal} />
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
                                  <p className="ml-4">${((item.price || 0) * item.quantity).toFixed(2)}</p>
                                </div>
                                <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                              </div>
                              <div className="flex flex-1 items-end justify-between text-sm">
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
                                <div className="flex">
                                  <button
                                    type="button"
                                    onClick={() => removeFromCart(item.partnumber)}
                                    className="font-medium text-indigo-600 hover:text-indigo-500"
                                  >
                                    Remove
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
                  {displayDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm font-medium text-green-600">
                      <p>Discount ({displayDiscountPercentage.toFixed(0)}%)</p>
                      <p>-${displayDiscountAmount.toFixed(2)}</p>
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
  );
};

export default ShoppingCart;
