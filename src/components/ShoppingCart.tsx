import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingCart as CartIcon, X, Minus, Plus, CreditCard } from 'lucide-react';
// Import the MCP tool hook - assuming it's available globally or via a context
// For demonstration, let's assume a hypothetical useMcpTool hook
// import { useMcpTool } from 'path-to-mcp-tool-hook'; 

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({ isOpen, onClose }) => {
  const { items, removeFromCart, updateQuantity, totalItems, totalPrice, clearCart, placeOrder } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'net10'>('credit');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const handleCheckout = () => {
    setIsCheckingOut(true);
  };
  
  const handlePlaceOrder = async () => {
    if (!email || !phone) {
      alert('Please provide both email and phone number');
      return;
    }
    
    try {
      const newOrderNumber = await placeOrder(paymentMethod, email, phone); // Pass email and phone
      setOrderNumber(newOrderNumber);
      setOrderPlaced(true);

      // Prepare email content
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
                <!-- Add more address fields here if available -->
            </div>
            <div class="payment-details">
                <h3>PAYMENT DETAILS</h3>
                <p>Method: ${paymentMethod === 'credit' ? 'Credit Card on File' : 'Net-10 Open Account'}</p>
                <!-- Add Card Type, Transaction ID, Payment Date here if available -->
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
                <!-- Add Discount and Tax rows here if available -->
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

      // Plain text version should also be updated for consistency, though it won't be "high quality HTML"
      const emailText = `
Order Confirmation
Order Number: ${newOrderNumber}

Seller:
${seller.name}
${seller.address}
${seller.cityStateZip}
Phone: ${seller.phone} | Email: ${seller.email}

BILL TO:
Email: ${email}
Phone: ${phone}

PAYMENT DETAILS:
Method: ${paymentMethod === 'credit' ? 'Credit Card on File' : 'Net-10 Open Account'}

ORDER ITEMS:
${items.map(item =>
  `- ${item.partnumber} (${item.description}): ${item.quantity} x $${(item.price || 0).toFixed(2)} = $${((item.price || 0) * item.quantity).toFixed(2)}`
).join('\n')}

SUMMARY:
Subtotal: $${totalPrice.toFixed(2)}
TOTAL: $${totalPrice.toFixed(2)}

Thank you for your order! We will notify you once your order has shipped.
(c) ${new Date().getFullYear()} ${seller.name}
      `;

      // Send email using MCP tool
      // This is a placeholder for how you might call the MCP tool.
      // The actual implementation will depend on how MCP tools are integrated.
      try {
        // const { toolResponse, toolError } = await useMcpTool('github.com/ykhli/mcp-send-email', 'send-email', {
        //   to: email,
        //   from: 'server@capece.org',
        //   subject: 'Lou Capece Music MusicSupplies.com Order',
        //   html: emailHtml,
        //   text: emailText,
        // });
        // if (toolError) {
        //   console.error('Failed to send email:', toolError);
        //   // Optionally alert the user or log more visibly
        // } else {
        //   console.log('Order confirmation email sent:', toolResponse);
        // }
        // For now, we'll just log that we would send an email
        console.log("Attempting to send email to:", email);
        console.log("Email HTML:", emailHtml);
        console.log("Email Text:", emailText);
        // NOTE: The actual MCP tool call will be made in the next step by Cline
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
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 overflow-hidden z-50">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div className="w-screen max-w-md">
            <div className="h-full flex flex-col bg-white shadow-xl">
              <div className="flex-1 py-6 overflow-y-auto px-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Shopping Cart</h2>
                  <button
                    type="button"
                    className="ml-3 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <X size={20} />
                  </button>
                </div>

                {orderPlaced ? (
                  <div className="mt-8">
                    <div className="bg-green-50 p-4 rounded-md">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <CreditCard className="h-5 w-5 text-green-400" />
                        </div>
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
                  <div className="mt-8">
                    <div className="flow-root">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
                      
                      <div className="border-t border-b border-gray-200 py-4 my-4">
                        <dl className="space-y-2">
                          <div className="flex items-center justify-between">
                            <dt className="text-sm text-gray-600">Subtotal</dt>
                            <dd className="text-sm font-medium text-gray-900">${totalPrice.toFixed(2)}</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="text-sm text-gray-600">Shipping</dt>
                            <dd className="text-sm font-medium text-gray-900">(Pending)</dd>
                          </div>
                          <div className="flex items-center justify-between border-t border-gray-200 pt-2 mt-2">
                            <dt className="text-base font-medium text-gray-900">Order total</dt>
                            <dd className="text-base font-medium text-gray-900">${totalPrice.toFixed(2)}</dd>
                          </div>
                        </dl>
                      </div>
                      
                      <div className="mt-6">
                        <h4 className="text-md font-medium text-gray-900 mb-2">Contact Information</h4>
                        <div className="space-y-4 mb-6">
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">Email Address</label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="Enter your email"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">Mobile Phone</label>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="Enter your phone number"
                              required
                            />
                          </div>
                        </div>

                        <h4 className="text-md font-medium text-gray-900 mb-2">Payment Method</h4>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="credit"
                              checked={paymentMethod === 'credit'}
                              onChange={() => setPaymentMethod('credit')}
                              className="h-4 w-4 text-blue-600"
                            />
                            <span className="ml-2 text-sm text-gray-700">Credit Card on File</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="net10"
                              checked={paymentMethod === 'net10'}
                              onChange={() => setPaymentMethod('net10')}
                              className="h-4 w-4 text-blue-600"
                            />
                            <span className="ml-2 text-sm text-gray-700">Net-10 Open Account</span>
                          </label>
                        </div>
                      </div>
                      
                      <div className="mt-6 flex justify-between">
                        <button
                          type="button"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          onClick={() => setIsCheckingOut(false)}
                        >
                          Back to Cart
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                          onClick={handlePlaceOrder}
                        >
                          Place Order
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8">
                    <div className="flow-root">
                      {items.length === 0 ? (
                        <div className="text-center py-12">
                          <CartIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">Your cart is empty</h3>
                          <p className="mt-1 text-sm text-gray-500">Start adding products to your cart</p>
                        </div>
                      ) : (
                        <ul className="-my-6 divide-y divide-gray-200">
                          {items.map((item) => (
                            <li key={item.partnumber} className="py-6">
                              <div className="flex flex-col">
                                <div>
                                <div className="flex justify-between text-base font-medium text-gray-900">
                                  <h3 className="text-sm">{item.partnumber}</h3>
                                  <p className="ml-4">${((item.price || 0) * item.quantity).toFixed(2)}</p> {/* Handle null price */}
                                </div>
                                <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center border rounded-md">
                                    <button
                                      type="button"
                                      className="p-1 rounded-l text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                      onClick={() => updateQuantity(item.partnumber, item.quantity - 1)}
                                    >
                                      <Minus size={16} />
                                    </button>
                                    <span className="px-4 py-1 text-gray-700 text-sm">{item.quantity}</span>
                                    <button
                                      type="button"
                                      className="p-1 rounded-r text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                      onClick={() => updateQuantity(item.partnumber, item.quantity + 1)}
                                    >
                                      <Plus size={16} />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    className="text-sm font-medium text-red-600 hover:text-red-500"
                                    onClick={() => removeFromCart(item.partnumber)}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
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
                  <div className="mt-6">
                    <button
                      onClick={handleCheckout}
                      className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Checkout
                    </button>
                  </div>
                  <div className="mt-6 flex justify-center text-sm text-center text-gray-500">
                    <p>
                      or{' '}
                      <button
                        type="button"
                        className="text-blue-600 font-medium hover:text-blue-500"
                        onClick={onClose}
                      >
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
