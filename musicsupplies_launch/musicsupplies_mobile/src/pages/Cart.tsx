import React from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';

const Cart: React.FC = () => {
  const { items, updateQuantity, removeFromCart, getTotalPrice, clearCart } = useCart();
  const navigate = useNavigate();

  const handleQuantityChange = (partnumber: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(partnumber);
    } else {
      updateQuantity(partnumber, newQuantity);
    }
  };

  const handleCheckout = () => {
    // For now, just show an alert - in a real app this would integrate with payment processing
    alert('Checkout functionality would be implemented here');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="mobile-header safe-area-top">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-white"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold">Shopping Cart</h1>
          <div className="w-10"></div>
        </header>

        {/* Empty Cart */}
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Add some products to get started</p>
            <button
              onClick={() => navigate('/')}
              className="mobile-button"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="mobile-header safe-area-top">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 text-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold">Shopping Cart ({items.length})</h1>
        <button
          onClick={clearCart}
          className="p-2 -mr-2 text-white text-sm"
        >
          Clear
        </button>
      </header>

      <div className="p-4 pb-32">
        {/* Cart Items */}
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.partnumber} className="mobile-card">
              <div className="flex items-start space-x-4">
                {/* Product Image Placeholder */}
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="h-6 w-6 text-gray-400" />
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {item.partnumber}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                  <p className="text-lg font-semibold text-blue-600 mt-2">
                    ${item.price?.toFixed(2) || 'N/A'}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFromCart(item.partnumber)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleQuantityChange(item.partnumber, item.quantity - 1)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-4 w-4 text-gray-600" />
                  </button>
                  <span className="font-semibold text-gray-900 w-8 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(item.partnumber, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Subtotal</p>
                  <p className="font-semibold text-gray-900">
                    ${((item.price || 0) * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="mobile-card mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">${getTotalPrice().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span className="font-medium">TBD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span className="font-medium">TBD</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-lg font-semibold text-blue-600">
                  ${getTotalPrice().toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Checkout Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom">
        <button
          onClick={handleCheckout}
          className="mobile-button"
        >
          Proceed to Checkout - ${getTotalPrice().toFixed(2)}
        </button>
      </div>
    </div>
  );
};

export default Cart;
