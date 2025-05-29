import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User as UserIcon } from 'lucide-react'; // Renamed User to UserIcon to avoid conflict
import { Link, useNavigate } from 'react-router-dom'; // Import Link and useNavigate
import PasswordChangeModal from './PasswordChangeModal'; // Import the modal
import { supabase } from '../lib/supabase'; // Import supabase client
import { User } from '../types'; // Import User type
import logo from '../images/music_supplies_logo.png'; // Import the logo

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
  const { login, error, user, isAuthenticated, fetchUserAccount } = useAuth(); // Added user, isAuthenticated, fetchUserAccount
  const navigate = useNavigate();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentAccountData, setCurrentAccountData] = useState<User | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      // This effect will run after login and user state is updated
      // Check for password condition if not already handled by handleSubmit
      // However, the primary check should be in handleSubmit right after login success
    }
  }, [isAuthenticated, user, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const loginSuccess = await login(accountNumber, password);
      if (loginSuccess) {
        // Special handling for test account 101 with specific password
        if (accountNumber === "101" && password === "Monday123$") {
          console.log("Test account 101 with special password, bypassing default password check.");
          navigate('/dashboard');
          setIsLoading(false); // Ensure loading is stopped
          return; // Exit handleSubmit early
        }

        // Fetch full account details to get acctName and zip for the check
        // user from useAuth might not be updated immediately or might not have all fields
        const fetchedAccount = await fetchUserAccount(accountNumber);

        if (fetchedAccount && fetchedAccount.acctName && fetchedAccount.zip) {
          const firstLetter = fetchedAccount.acctName.charAt(0).toLowerCase();
          const zip = fetchedAccount.zip.toLowerCase();
          const defaultPassword = firstLetter + zip;

          // Compare the entered password (lowercase) with the generated default password (lowercase)
          if (password.toLowerCase() === defaultPassword.toLowerCase()) {
            setCurrentAccountData(fetchedAccount);
            setIsPasswordModalOpen(true);
            // Don't navigate to dashboard yet, user needs to change password
          } else {
            navigate('/dashboard'); // Navigate to dashboard if password is not default
          }
        } else {
          // If account details can't be fetched, or are incomplete, proceed to dashboard
          // Or handle as an error - for now, proceeding.
          console.warn("Could not verify default password due to missing account details. Proceeding to dashboard.");
          navigate('/dashboard');
        }
      }
    } catch (err) {
      // error state from useAuth() should cover most login errors
      console.error("Login submit error", err)
    } 
    finally {
      setIsLoading(false);
    }
  };
  
  const handleModalClose = () => {
    setIsPasswordModalOpen(false);
    // Optionally, force logout or navigate to login if password change is mandatory
    // For now, just closing the modal. User might still be "logged in" but should ideally be forced to re-login.
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4"> {/* Added px-4 for some padding on very small screens */}
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl"> {/* Changed max-w-md to max-w-2xl */}
        <div className="text-center mb-8">
          <img src={logo} alt="Music Supplies Logo" className="mx-auto h-36 w-auto mb-4" /> {/* Increased logo size */}
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
          <div className="flex justify-center space-x-4 mb-6"> {/* Flex container for inputs */}
            <div className="w-[35%]"> {/* Account Number Input Field */}
              <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon size={18} className="text-gray-400" />
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
            
            <div className="w-[35%]"> {/* Password Input Field */}
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
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
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

        {currentAccountData && (
          <PasswordChangeModal
            isOpen={isPasswordModalOpen}
            onClose={handleModalClose}
            accountData={currentAccountData}
          />
        )}
      </div>
    </div>
  );
};

export default Login;
