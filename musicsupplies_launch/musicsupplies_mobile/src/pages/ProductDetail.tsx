import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { ArrowLeft, ShoppingCart, Plus, Minus } from 'lucide-react';

const ProductDetail: React.FC = () => {
  const { partnumber } = useParams<{ partnumber: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (partnumber) {
      fetchProduct(decodeURIComponent(partnumber));
    }
  }, [partnumber]);

  const fetchProduct = async (partNumber: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_supabase')
        .select('*')
        .eq('partnumber', partNumber)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        return;
      }

      setProduct(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    setAddingToCart(true);
    try {
      addToCart(product, quantity);
      // Show success feedback
      setTimeout(() => {
        setAddingToCart(false);
      }, 1000);
    } catch (error) {
      console.error('Error adding to cart:', error);
      setAddingToCart(false);
    }
  };

  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => {
    setQuantity(prev => Math.max(1, prev - 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="mobile-spinner"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Product not found</p>
          <button
            onClick={() => navigate('/')}
            className="mobile-button-secondary"
          >
            Back to Products
          </button>
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
        <h1 className="text-lg font-semibold truncate">Product Details</h1>
        <div className="w-10"></div> {/* Spacer for centering */}
      </header>

      <div className="p-4 pb-24">
        {/* Product Image Placeholder */}
        <div className="bg-white rounded-lg shadow-sm mb-4 p-6">
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-4">
            <div className="text-gray-400 text-center">
              <ShoppingCart className="h-16 w-16 mx-auto mb-2" />
              <p className="text-sm">Product Image</p>
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="mobile-card">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {product.partnumber}
          </h1>
          <p className="text-gray-600 mb-4">
            {product.description}
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Price</p>
              <p className="text-2xl font-bold text-blue-600">
                ${product.price?.toFixed(2) || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Stock</p>
              <p className="text-lg font-semibold text-gray-900">
                {product.inventory || 0} units
              </p>
            </div>
          </div>

          {product.brand && (
            <div className="mb-4">
              <p className="text-sm text-gray-500">Brand</p>
              <p className="font-medium text-gray-900">{product.brand}</p>
            </div>
          )}

          {product.webmsrp && (
            <div className="mb-4">
              <p className="text-sm text-gray-500">MSRP</p>
              <p className="font-medium text-gray-900">${product.webmsrp.toFixed(2)}</p>
            </div>
          )}
        </div>

        {/* Quantity Selector */}
        <div className="mobile-card">
          <h3 className="font-semibold text-gray-900 mb-3">Quantity</h3>
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={decrementQuantity}
              className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"
              disabled={quantity <= 1}
            >
              <Minus className="h-5 w-5 text-gray-600" />
            </button>
            <span className="text-2xl font-semibold text-gray-900 w-12 text-center">
              {quantity}
            </span>
            <button
              onClick={incrementQuantity}
              className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <Plus className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Long Description */}
        {product.longdescription && (
          <div className="mobile-card">
            <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
            <div 
              className="text-gray-600 text-sm"
              dangerouslySetInnerHTML={{ __html: product.longdescription }}
            />
          </div>
        )}
      </div>

      {/* Fixed Add to Cart Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom">
        <button
          onClick={handleAddToCart}
          disabled={addingToCart || !product.inventory}
          className={`mobile-button ${
            addingToCart
              ? 'bg-green-600'
              : !product.inventory
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {addingToCart ? (
            <div className="flex items-center justify-center">
              <div className="mobile-spinner mr-2"></div>
              Added to Cart!
            </div>
          ) : !product.inventory ? (
            'Out of Stock'
          ) : (
            <div className="flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Add {quantity} to Cart - ${((product.price || 0) * quantity).toFixed(2)}
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductDetail;
