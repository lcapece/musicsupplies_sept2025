import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, MapPin, Phone, LogOut } from 'lucide-react';

const Account: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

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
        <h1 className="text-lg font-semibold">Account</h1>
        <div className="w-10"></div>
      </header>

      <div className="p-4">
        {/* Profile Section */}
        <div className="mobile-card">
          <div className="flex items-center mb-4">
            <div className="bg-blue-600 rounded-full w-16 h-16 flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-semibold text-gray-900">{user?.acctName}</h2>
              <p className="text-gray-500">Account #{user?.accountNumber}</p>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="mobile-card">
          <h3 className="font-semibold text-gray-900 mb-4">Account Information</h3>
          
          <div className="space-y-4">
            {user?.email && (
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{user.email}</p>
                </div>
              </div>
            )}

            {user?.mobile_phone && (
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{user.mobile_phone}</p>
                </div>
              </div>
            )}

            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <div className="font-medium text-gray-900">
                  <p>{user?.address}</p>
                  <p>{user?.city}, {user?.state} {user?.zip}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="mobile-card">
          <h3 className="font-semibold text-gray-900 mb-4">Account Actions</h3>
          
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-between">
              <span className="font-medium text-gray-900">Order History</span>
              <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
            </button>
            
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-between">
              <span className="font-medium text-gray-900">Payment Methods</span>
              <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
            </button>
            
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-between">
              <span className="font-medium text-gray-900">Shipping Addresses</span>
              <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
            </button>
            
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-between">
              <span className="font-medium text-gray-900">Notifications</span>
              <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
            </button>
          </div>
        </div>

        {/* Support */}
        <div className="mobile-card">
          <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
          
          <div className="space-y-3">
            <a 
              href="tel:1-800-321-5584"
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">Customer Service</p>
                <p className="text-sm text-gray-500">1-800-321-5584</p>
              </div>
              <Phone className="h-5 w-5 text-gray-400" />
            </a>
            
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-between">
              <span className="font-medium text-gray-900">Help Center</span>
              <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
            </button>
            
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-between">
              <span className="font-medium text-gray-900">Terms & Conditions</span>
              <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
            </button>
            
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-between">
              <span className="font-medium text-gray-900">Privacy Policy</span>
              <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
            </button>
          </div>
        </div>

        {/* Sign Out */}
        <div className="mobile-card">
          <button
            onClick={handleLogout}
            className="w-full p-3 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 flex items-center justify-center text-red-600 font-medium"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </button>
        </div>

        {/* App Info */}
        <div className="text-center mt-6 pb-6">
          <p className="text-xs text-gray-500">
            Music Supplies Mobile v1.0.0
          </p>
          <p className="text-xs text-gray-500 mt-1">
            © 2025 Lou Capece Music Distributors
          </p>
        </div>
      </div>
    </div>
  );
};

export default Account;
