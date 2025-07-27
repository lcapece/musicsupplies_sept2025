import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { Search, ShoppingCart, User, Menu, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { getTotalItems } = useCart();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [searchQuery]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('products_supabase')
        .select('*')
        .limit(50); // Limit for mobile performance

      if (searchQuery) {
        query = query.or(`partnumber.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product: Product) => {
    navigate(`/product/${encodeURIComponent(product.partnumber)}`);
  };

  const handleLogout = () => {
    logout();
    setShowMenu(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="mobile-header safe-area-top">
        <div className="flex items-center">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 -ml-2 text-white"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="ml-2 text-lg font-semibold">Music Supplies</h1>
        </div>
        
        <button
          onClick={() => navigate('/cart')}
          className="relative p-2 -mr-2 text-white"
        >
          <ShoppingCart className="h-6 w-6" />
          {getTotalItems() > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {getTotalItems()}
            </span>
          )}
        </button>
      </header>

      {/* Side Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setShowMenu(false)}>
          <div className="bg-white w-64 h-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center">
                <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-900">{user?.acctName}</p>
                  <p className="text-sm text-gray-500">Account #{user?.accountNumber}</p>
                </div>
              </div>
            </div>
            
            <nav className="p-4">
              <button
                onClick={() => {
                  navigate('/account');
                  setShowMenu(false);
                }}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center"
              >
                <User className="h-5 w-5 mr-3 text-gray-400" />
                Account Settings
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-100 flex items-center text-red-600"
              >
                <Package className="h-5 w-5 mr-3" />
                Sign Out
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mobile-search-bar pl-10"
            placeholder="Search products..."
          />
        </div>
      </div>

      {/* Products List */}
      <div className="px-4 pb-20">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="mobile-spinner"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'No products found' : 'No products available'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.partnumber}
                onClick={() => handleProductClick(product)}
                className="mobile-product-card cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {product.partnumber}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-semibold text-blue-600">
                        ${product.price?.toFixed(2) || 'N/A'}
                      </span>
                      <span className="text-sm text-gray-500">
                        Stock: {product.inventory || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="mobile-bottom-nav safe-area-bottom">
        <button
          onClick={() => navigate('/')}
          className="mobile-nav-item active"
        >
          <Search className="h-6 w-6" />
        </button>
        <button
          onClick={() => navigate('/cart')}
          className="mobile-nav-item relative"
        >
          <ShoppingCart className="h-6 w-6" />
          {getTotalItems() > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {getTotalItems()}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate('/account')}
          className="mobile-nav-item"
        >
          <User className="h-6 w-6" />
        </button>
      </nav>
    </div>
  );
};

export default Dashboard;
