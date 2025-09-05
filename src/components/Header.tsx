import React, { useState, useEffect } from 'react';
import { Settings, LogOut, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ShoppingCartComponent from './ShoppingCart';
import AccountSettingsModal from './AccountSettingsModal';
import { useAutoVersionCheck } from '../hooks/useAutoVersionCheck';
import packageJson from '../../package.json';

interface HeaderProps {
  onViewChange: (view: 'products' | 'orders' | 'weborders') => void;
  activeView: 'products' | 'orders' | 'weborders';
}

const Header: React.FC<HeaderProps> = ({ onViewChange, activeView }) => {
  const { user, logout, isDemoMode } = useAuth();
  const { totalItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Silent automatic version checking
  useAutoVersionCheck();

  // Check for cart auto-open URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('openCart') === 'true') {
      console.log('🔄 Header: Auto-opening cart from URL parameter');
      setIsCartOpen(true);
      
      // Clean up the URL parameter without causing a page reload
      urlParams.delete('openCart');
      const newSearch = urlParams.toString();
      const newUrl = location.pathname + (newSearch ? `?${newSearch}` : '');
      navigate(newUrl, { replace: true });
    }
  }, [location.search, navigate]);
  
  const handleLogout = () => {
    logout();
  };

  const openCart = () => {
    setIsCartOpen(true);
  };

  const closeCart = () => {
    setIsCartOpen(false);
  };

  const openAccountSettings = () => {
    setIsAccountSettingsOpen(true);
  };

  const closeAccountSettings = () => {
    setIsAccountSettingsOpen(false);
  };
  
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-full mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Logo and Phone */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center">
              <div className="font-bold fixed-header-size" style={{ fontSize: '54px' }}>
                <span className="text-blue-600">Music</span>
                <span className="text-red-600">Supplies</span>
                <span className="text-black">.com</span>
              </div>
            </Link>
            <div className="font-bold text-gray-700 fixed-header-size" style={{ fontSize: '36px' }}>
              (800) 321-5584
            </div>
          </div>
          
          {/* Center Section - Navigation */}
          <div className="flex items-center space-x-6">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="radio"
                className="form-radio text-blue-600 h-4 w-4"
                name="view"
                value="products"
                checked={activeView === 'products'}
                onChange={() => onViewChange('products')}
              />
              <span className="ml-2 text-gray-700 font-medium" style={{ fontSize: '12px' }}>SHOPPING</span>
            </label>
            
            {!isDemoMode && (
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  className="form-radio text-blue-600 h-4 w-4"
                  name="view"
                  value="orders"
                  checked={activeView === 'orders'}
                  onChange={() => onViewChange('orders')}
                />
                <span className="ml-2 text-gray-700 font-medium" style={{ fontSize: '12px' }}>Order History</span>
              </label>
            )}
          </div>
          
          {/* Right Section - Shopping Cart, Account Settings, Logout, and User Info */}
          <div className="flex items-center space-x-3">
            {/* Shopping Cart Button - Disabled in demo mode */}
            {!isDemoMode ? (
              <button
                onClick={openCart}
                className="relative inline-flex items-center px-6 py-2 border border-green-500 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-w-[120px]"
                style={{ fontSize: '13.5px' }}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
            ) : (
              <div className="inline-flex items-center px-6 py-2 border border-gray-300 font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed min-w-[120px]" style={{ fontSize: '13.5px' }}>
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart Disabled
              </div>
            )}
            
            {/* Account Settings - Hidden in demo mode */}
            {!isDemoMode && (
              <button
                onClick={openAccountSettings}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Settings className="h-4 w-4 mr-2" />
                Account Settings
              </button>
            )}
            
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
            
            {/* User Info Box */}
            {isDemoMode ? (
              <div className="bg-yellow-50 border border-yellow-300 rounded px-3 py-2 min-w-[200px]">
                <div className="text-sm font-bold text-yellow-800">
                  DEMO ACCOUNT
                </div>
                <div className="text-xs text-yellow-700 leading-tight">
                  View-Only Mode<br />
                  No Checkout Available<br />
                  Limited Functionality
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded px-3 py-2 min-w-[200px]">
                <div className="text-sm font-bold text-red-700">
                  {user?.acctName} ({user?.accountNumber})
                </div>
                <div className="text-xs text-red-600 leading-tight">
                  {user?.address}<br />
                  {user?.city}, {user?.state} {user?.zip}<br />
                  {user?.mobile_phone || 'N/A'} | {user?.email}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Shopping Cart Modal */}
      <ShoppingCartComponent isOpen={isCartOpen} onClose={closeCart} />
      
      {/* Account Settings Modal */}
      <AccountSettingsModal isOpen={isAccountSettingsOpen} onClose={closeAccountSettings} />
    </header>
  );
};

export default Header;
