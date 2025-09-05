import React from 'react';
import { ShoppingCart, Trash2, ArrowRight } from 'lucide-react';

interface CartRestorationModalProps {
  isOpen: boolean;
  onGoToCart: () => void;
  onContinueShopping: () => void;
  onEmptyCart: () => void;
}

const CartRestorationModal: React.FC<CartRestorationModalProps> = ({
  isOpen,
  onGoToCart,
  onContinueShopping,
  onEmptyCart
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center mb-4">
          <ShoppingCart className="h-6 w-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">
            Cart Items Reminder
          </h2>
        </div>
        
        <p className="text-gray-700 mb-6">
          Please note that you have items left in your cart. Please remove them if not needed.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={onGoToCart}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Go to Cart
          </button>
          
          <button
            onClick={onContinueShopping}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Continue Shopping
          </button>
          
          <button
            onClick={onEmptyCart}
            className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Empty out my Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartRestorationModal;
