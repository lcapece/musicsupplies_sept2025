import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PasswordChangeModal from './PasswordChangeModal';
import { User } from '../types';
import logo from '../images/music_supplies_logo.png';
import brands from '../images/brands.png';
import building from '../images/buildings.png';

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

  useEffect(() => {
    const scaleContent = () => {
      if (contentRef.current) {
        const contentWidth = contentRef.current.offsetWidth;
        const contentHeight = contentRef.current.offsetHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const scaleX = viewportWidth / contentWidth;
        const scaleY = viewportHeight / contentHeight;
        const scale = Math.min(scaleX, scaleY);

        contentRef.current.style.transform = `scale(${scale})`;
        contentRef.current.style.transformOrigin = 'top left';
      }
    };

    scaleContent();
    window.addEventListener('resize', scaleContent);

    return () => {
      window.removeEventListener('resize', scaleContent);
    };
  }, []);

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
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div ref={contentRef} className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Top Bar */}
          <div className="text-center mb-8">
            <p className="text-red-600 text-2xl font-semibold">FOR WHOLESALE ACCOUNTS ONLY</p>
          </div>

          {/* Main Content */}
          <div className="flex flex-col md:flex-row items-center md:items-start mb-8">
            {/* Left Column */}
            <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left mb-8 md:mb-0">
              <img src={logo} alt="Music Supplies Logo" className="h-48 w-auto mb-6" />
              <p className="text-gray-600 text-lg">Please call 1(800)321-5584 for help or any questions.</p>
            </div>

            {/* Right Column */}
            <div className="w-full md:w-1/2 flex flex-col items-center">
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
          <div className="my-12 text-center">
            <p className="text-gray-700 font-semibold mb-4">Distributor of Exceptional Brands Including:</p>
            <img src={brands} alt="Music Supplies Brands" className="max-w-full h-auto mx-auto" />
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
