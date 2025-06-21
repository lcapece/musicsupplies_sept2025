import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PasswordChangeModal from './PasswordChangeModal';
import { User } from '../types';
import logo from '../images/music_supplies_logo.png';
import building from '../images/buildings.png';

// Import all brand logos
import logo1 from '../images/logo_1.png';
import logo2 from '../images/logo_2.png';
import logo3 from '../images/logo_3.png';
import logo4 from '../images/logo_4.png';
import logo5 from '../images/logo_5.png';
import logo6 from '../images/logo_6.png';
import logo7 from '../images/logo_7.png';
import logo8 from '../images/logo_8.png';
import logo9 from '../images/logo_9.png';
import logo10 from '../images/logo_10.png';
import logo11 from '../images/logo_11.png';
import logo12 from '../images/logo_12.png';
import logo13 from '../images/logo_13.png';
import logo14 from '../images/logo_14.png';
import logo15 from '../images/logo_15.png';
import logo16 from '../images/logo_16.png';

const brandLogos = [
  logo1, logo2, logo3, logo4, logo5, logo6, logo7, logo8,
  logo9, logo10, logo11, logo12, logo13, logo14, logo15, logo16
];

const Login: React.FC = () => {
  const [accountNumber, setAccountNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, error, user, isAuthenticated, showPasswordChangeModal, handlePasswordModalClose } = useAuth();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated && user && !user.requires_password_change) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, user, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const loginSuccess = await login(accountNumber, password);
      if (loginSuccess && !user?.requires_password_change) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error("Login submit error", err);
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
    <div className="min-h-screen bg-white flex justify-center">
      <div ref={contentRef} className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          {/* Main Content */}
          <div className="flex flex-col md:flex-row items-center md:items-start mb-4">
            {/* Left Column */}
            <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left mb-4 md:mb-0">
              <img src={logo} alt="Music Supplies Logo" className="h-32 w-auto mb-4" />
              <div className="text-left w-full">
                <p className="text-red-600 text-xl font-semibold">FOR WHOLESALE ACCOUNTS ONLY</p>
              </div>
              <p className="text-gray-600 text-base mt-2">Please call 1(800)321-5584 for help or any questions.</p>
            </div>

            {/* Right Column */}
            <div className="w-full md:w-1/2 flex flex-col items-end">
              <form onSubmit={handleSubmit} className="w-full max-w-sm">
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}
                <div className="mb-4">
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
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Account Number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="mb-6">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyRound size={16} className="text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} className="text-gray-500" /> : <Eye size={18} className="text-gray-500" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            </div>
          </div>

          {/* Brands Bar */}
          <div className="my-6 text-center">
            <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
              {brandLogos.map((brandLogo, index) => (
                <div key={index} className="flex justify-center items-center">
                  <img src={brandLogo} alt={`Brand ${index + 1}`} className="max-h-14" />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row items-center md:items-start">
            <div className="w-full md:w-1/2 mb-8 md:mb-0">
              <img src={building} alt="Lou Capece Music Building" className="max-w-full h-auto rounded-lg shadow-md" />
            </div>
            <div className="w-full md:w-1/2 md:pl-8">
              <p className="text-gray-600">
                Lou Capece Music Distributors, founded in 1987, has been proudly supporting independent music shops for nearly four decades. Despite the rise of Amazon, the national chains, and massive online retailers, you can still find a local music store in nearly every small city's downtown or Main Street—and we're part of the reason why. Trusted by over 2,000 independent brick-and-mortar and online musical instrument retailers in the USA.
                <br /><br />
                With over 10 exclusive brands, including Cordovox, New York Pro, and Stadium, we provide dependable, low cost wholesale distribution and 100% personalized service. Our dedicated sales team works hand-in-hand with shop owners to help them stay competitive, well-stocked, and thriving in a challenging retail landscape.
              </p>
            </div>
          </div>

          {/* Footer Links */}
          <div className="text-center mt-12 border-t pt-6">
            <Link to="/new-account-application" className="text-blue-600 hover:underline font-medium">
              Click here to apply for a new account
            </Link>
            <div className="mt-4 text-sm text-gray-500">
              <Link to="/privacy-policy" className="hover:underline mx-2">Privacy Policy</Link> |
              <Link to="/sms-communications" className="hover:underline mx-2">SMS Policy</Link> |
              <Link to="/email-communications" className="hover:underline mx-2">Email Policy</Link>
            </div>
          </div>
        </div>
      </div>

      {user && showPasswordChangeModal && user.requires_password_change && (
        <PasswordChangeModal
          isOpen={showPasswordChangeModal}
          onClose={handleModalClose}
          accountData={user}
        />
      )}
    </div>
  );
};

export default Login;
