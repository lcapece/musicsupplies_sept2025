import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User as UserIcon, Eye, EyeOff } from 'lucide-react'; // Added Eye and EyeOff icons
import { Link, useNavigate } from 'react-router-dom'; // Import Link and useNavigate
import PasswordChangeModal from './PasswordChangeModal'; // Import the modal
import { supabase } from '../lib/supabase'; // Import supabase client
import { User } from '../types'; // Import User type
import logo from '../images/music_supplies_logo.png'; // Import the logo
import brands from '../images/brands.png'; // Import the brands image
import building from '../images/buildings.png'; // Import the building image

const Login: React.FC = () => {
  const [accountNumber, setAccountNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, error, user, isAuthenticated, showPasswordChangeModal, handlePasswordModalClose } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is authenticated and does NOT require password change, navigate to dashboard
    // This bypasses the modal if the backend is incorrectly sending requires_password_change = true
    // but the user has already set a password.
    if (isAuthenticated && user && !user.requires_password_change) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const loginSuccess = await login(accountNumber, password);
      if (loginSuccess) {
        // The AuthContext now handles password change modal logic
        // If login is successful and no password change is required, navigate to dashboard
        // The password change modal will be shown automatically by AuthContext if needed
        if (!user?.requires_password_change) {
          navigate('/dashboard');
        }
        // If password change is required, the modal will be shown automatically
        // and navigation will happen after password change completion
      }
    } catch (err) {
      // error state from useAuth() should cover most login errors
      console.error("Login submit error", err)
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleModalClose = (wasSuccess: boolean) => {
    handlePasswordModalClose(wasSuccess);
    if (wasSuccess) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl">
        <div className="flex justify-start items-center mb-8 space-x-4"> {/* justify-start for left alignment */}
          <img src={logo} alt="Music Supplies Logo" className="h-48 w-auto" /> {/* h-48 for 100% larger */}
          <p className="text-gray-600 text-left"> {/* text-left for justification */}
            Established 1987, wholesale supplier with over 80% of all independent music and online music stores. Personal, dedicated sales professionals want to help independent shops and online retailers thrive.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="flex justify-center space-x-4 mb-6 items-end"> {/* Added items-end for vertical alignment */}
            <div className="w-1/4">
              <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  id="accountNumber"
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Account Number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="w-1/4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound size={16} className="text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className="w-full pl-8 pr-8 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={16} className="text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye size={16} className="text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign In button moved to its own div for alignment */}
            <div className="flex items-end"> {/* Use flex and items-end to align the button with the bottom of the inputs */}
              <button
                type="submit"
                className="bg-blue-600 text-white py-1.5 px-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
                disabled={isLoading}
              >
                {isLoading ? '...' : 'Sign In'}
              </button>
            </div>
          </div>

          <div className="text-center mb-6">
            <p className="text-gray-600 mb-2">
              Please call 1(800)321-5584 for help or any questions.
            </p>
            <p className="text-red-600 text-[22px] font-semibold">
              FOR WHOLESALE ACCOUNTS ONLY
            </p>
            <Link 
              to="/new-account-application" 
              className="block mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Click here to apply for a new account
            </Link>
          </div>

          {/* Brands Section */}
          <div className="my-8 text-center">
            <p className="text-gray-700 font-semibold mb-4">
              Distributor of Exceptional Brands Including:
            </p>
            <div className="flex justify-center">
              <img 
                src={brands} 
                alt="Music Supplies Brands" 
                className="max-w-full h-auto"
              />
            </div>
          </div>
          
          {/* Building image and footer links */}
          <div className="flex mt-2.5"> {/* Added 10px padding (mt-2.5) */}
            <div className="w-1/2 text-left pr-2"> {/* 50% width, justified left, some right padding */}
              <img src={building} alt="Lou Capece Music Building" className="max-w-full h-auto" />
            </div>
            <div className="w-1/2 text-center text-sm pl-2"> {/* 50% width, text center, some left padding */}
              <p>&copy; {new Date().getFullYear()} MusicSupplies.com. A subsidiary of Lou Capece Music. All rights reserved.</p>
              <p>2555 North Jerusalem Road, East Meadow NY 11554</p>
              <p className="mt-2">
                System Created by <a href="https://dataautomation.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">dataautomation.ai</a>
              </p>
              <div className="mt-2">
                <Link to="/privacy-policy" className="text-blue-600 hover:underline mx-2">Privacy Policy</Link> | 
                <Link to="/sms-communications" className="text-blue-600 hover:underline mx-2">SMS Policy</Link> | 
                <Link to="/email-communications" className="text-blue-600 hover:underline mx-2">Email Policy</Link>
              </div>
            </div>
          </div>
        </form>

        {/* Temporarily show modal only if user is authenticated AND requires password change */}
        {/* This is a workaround until the backend function is correctly updated */}
        {user && showPasswordChangeModal && user.requires_password_change && (
          <PasswordChangeModal
            isOpen={showPasswordChangeModal}
            onClose={handleModalClose}
            accountData={user}
          />
        )}
      </div>
    </div>
  );
};

export default Login;
