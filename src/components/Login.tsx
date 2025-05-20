import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User } from 'lucide-react';

// Import images from /src/images/
import p1 from '../images/p1.jpg';
import p2 from '../images/p2.jpg';
import p3 from '../images/p3.jpg';
import p4 from '../images/p4.jpg';
import p5 from '../images/p5.jpg';
import p6 from '../images/p6.jpg';
import p7 from '../images/p7.jpg';
import p8 from '../images/p8.jpg';
import p9 from '../images/p9.jpg';
import p10 from '../images/p10.jpg';

const Login: React.FC = () => {
  const [accountNumber, setAccountNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(accountNumber, password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4"> {/* Added px-4 for some padding on very small screens */}
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl"> {/* Changed max-w-md to max-w-2xl */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-4">MusicSupplies.com</h1>
          <p className="text-gray-600">
            MusicSupplies.com is the customer portal for Lou Capece Music Distributors.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Account Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                id="accountNumber"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your account number"
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
                <KeyRound size={18} className="text-gray-400" />
              </div>
              <input
                type="password"
                id="password"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="text-center mb-6">
            <p className="text-gray-600 mb-2">
              Please call 1(800)321-5584 for help or any questions.
            </p>
            <p className="text-red-600 text-[22px] font-semibold">
              FOR WHOLESALE ACCOUNTS ONLY
            </p>
          </div>

          {/* Added Distributor Brands Section */}
          <div className="my-8 text-center">
            <p className="text-gray-700 font-semibold mb-4">
              Distributor of Exceptional Brands Including:
            </p>
            {/* First row of images */}
            <div className="flex justify-center items-center space-x-2 sm:space-x-4 mb-4">
              {[p1, p2, p3, p4, p5].map((imgSrc, index) => (
                <img 
                  key={`p${index + 1}`}
                  src={imgSrc} 
                  alt={`Brand p${index + 1}`} 
                  className="h-10 sm:h-12 md:h-16 object-contain" 
                />
              ))}
            </div>
            {/* Second row of images */}
            <div className="flex justify-center items-center space-x-2 sm:space-x-4">
              {[p6, p7, p8, p9, p10].map((imgSrc, index) => (
                <img 
                  key={`p${index + 6}`}
                  src={imgSrc} 
                  alt={`Brand p${index + 6}`} 
                  className="h-10 sm:h-12 md:h-16 object-contain" 
                />
              ))}
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
