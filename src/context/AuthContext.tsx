                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface ActiveDiscountInfo {
  message: string;
  startDate: string;
  endDate: string;
  percentage: number | null; // Added discount percentage
}

interface AuthContextType {
  user: User | null;
  login: (accountNumber: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean; // Added isLoading
  error: string | null;
  fetchUserAccount: (accountNumber: string) => Promise<User | null>; // Added fetchUserAccount
  activeDiscount: ActiveDiscountInfo | null;
  showActiveDiscountModal: boolean;
  clearActiveDiscount: () => void;
  showPasswordChangeModal: boolean; 
  openPasswordChangeModal: () => void; 
  handlePasswordModalClose: (wasSuccess: boolean) => void; // Renamed and takes a boolean
  showDiscountFormModal: boolean; 
  openDiscountFormModal: () => void; 
  closeDiscountFormModal: () => void; 
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
  isAuthenticated: false,
  isLoading: true, 
  error: null,
  fetchUserAccount: async () => null, 
  activeDiscount: null,
  showActiveDiscountModal: false,
  clearActiveDiscount: () => {},
  showPasswordChangeModal: false,
  openPasswordChangeModal: () => {},
  handlePasswordModalClose: () => {}, // Default empty fn
  showDiscountFormModal: false,
  openDiscountFormModal: () => {},
  closeDiscountFormModal: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Added isLoading state
  const [activeDiscount, setActiveDiscount] = useState<ActiveDiscountInfo | null>(null);
  const [showActiveDiscountModal, setShowActiveDiscountModal] = useState<boolean>(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState<boolean>(false);
  const [showDiscountFormModal, setShowDiscountFormModal] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      }
    } catch (e) {
      // If parsing fails or any error, ensure user is cleared
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false); // Set loading to false after checking local storage
    }
  }, []);

  const login = async (accountNumber: string, password: string): Promise<boolean> => {
    setError(null);
    
    try {
      const accountNumberInt = parseInt(accountNumber, 10);
      
      if (isNaN(accountNumberInt)) {
        setError('Invalid account number format');
        return false;
      }

      // The following block for hardcoded test login for account 101 is being removed.
      // if (accountNumberInt === 101 && password === "A11803") {
      //   const userData: User = {
      //     accountNumber: "101",
      //     acctName: "All Music", 
      //     address: "123 Main St", 
      //     city: "Springfield",
      //     state: "IL",
      //     zip: "62701"
      //   };
      //   
      //   setUser(userData);
      //   setIsAuthenticated(true);
      //   localStorage.setItem('user', JSON.stringify(userData));
      //   return true;
      // }

      // Call the RPC function for login
      const rpcParams = {
        p_account_number: accountNumberInt,
        p_password: password // Pass the original password, the function handles lowercasing
      };
      const newRpcFunctionName = 'authenticate_user_lcmd'; // New function name
      console.log(`[AuthContext] Calling RPC: ${newRpcFunctionName} with params:`, { p_account_number: accountNumberInt, p_password: '***' }); // Log params, obscuring password

      const { data: rpcResult, error: rpcError } = await supabase.rpc(newRpcFunctionName, rpcParams);

      if (rpcError) {
        console.error('RPC Database error:', rpcError);
        setError('An error occurred while trying to log in. Please try again.');
        return false;
      }

      // rpcResult will be an array. If login is successful, it should contain one user object.
      if (!rpcResult || rpcResult.length === 0) {
        setError('Invalid account number or password');
        return false;
      }
      
      const accountData = rpcResult[0]; // Get the first user object from the array

      if (!accountData) { // Should not happen if rpcResult.length > 0, but as a safeguard
        setError('Invalid account number or password');
        return false;
      }

      const userData: User = {
        accountNumber: String(accountData.account_number), // Ensure it's a string
        acctName: accountData.acct_name || '',
        address: accountData.address || '',
        city: accountData.city || '',
        state: accountData.state || '',
        zip: accountData.zip || '',
        // Assuming 'requires_password_change' is a boolean field from the RPC result
        requires_password_change: accountData.requires_password_change || false, 
        id: accountData.id // Make sure id is also populated for updates
      };
      
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(userData));

      // Modal logic based on requires_password_change
      if (userData.requires_password_change) {
        setShowPasswordChangeModal(true);
      } 
      // else {
      //   // Removed automatic opening of DiscountFormModal on login
      //   // setShowDiscountFormModal(true); 
      // }

      // Check for active discounts (this displays a notification, not the form)
      try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const { data: discountData, error: discountError } = await supabase
          .from('lcmd_discount')
          .select('promo_message, start_date, end_date, discount') // Selects the 'discount' column
          // Removed date filters: .lte('start_date', today) and .gte('end_date', today)
          .order('created_at', { ascending: false }) // Get the most recently created discount
          .limit(1)
          .single();

        if (discountError && discountError.code !== 'PGRST116') { // PGRST116: "The result contains 0 rows"
          console.error('[AuthContext] Error fetching latest discount from Supabase:', discountError);
          setActiveDiscount(null); 
        } else if (discountData) {
          console.log('[AuthContext] Found latest discount data:', discountData);
          const percentage = discountData.discount ? discountData.discount * 100 : null;
          // The condition to display/use the discount is still if its percentage is positive.
          // The user is now responsible for ensuring the latest discount in the table is the one they want active.
          if (percentage !== null && percentage > 0) {
            setActiveDiscount({
              message: discountData.promo_message,
              startDate: discountData.start_date, // Still store these for info, though not used for filtering
              endDate: discountData.end_date,
              percentage: percentage,
            });
            setShowActiveDiscountModal(true); 
          } else {
            console.log('[AuthContext] Latest discount data found, but its percentage is null or not positive. Percentage calculated:', percentage);
            setActiveDiscount(null); 
          }
        } else {
          console.log('[AuthContext] No discount records found in lcmd_discount table, or PGRST116 error.');
          setActiveDiscount(null);
        }
      } catch (discountCheckError) {
        console.error('[AuthContext] Exception during discount check logic:', discountCheckError);
        setActiveDiscount(null); 
      }

      return true;

    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again later.');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    setActiveDiscount(null); // Clear discount on logout
    setShowActiveDiscountModal(false);
    // Optionally, set isLoading to false if it's relevant for logout screen transitions
    // setIsLoading(false); 
  };

  const clearActiveDiscount = () => {
    setActiveDiscount(null);
    setShowActiveDiscountModal(false);
  };

  const openPasswordChangeModal = () => setShowPasswordChangeModal(true);

  const handlePasswordModalClose = (wasSuccess: boolean) => {
    setShowPasswordChangeModal(false);
    if (wasSuccess) {
      // Update user context if requires_password_change was set to false
      // This happens because PasswordChangeModal itself updates the DB.
      // The local user state also needs to reflect this.
      if (user && user.requires_password_change) { // Check if it was true before
        const updatedUser = { ...user, requires_password_change: false };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      // Removed automatic opening of DiscountFormModal after password change success
      // setShowDiscountFormModal(true); 
    }
    // If wasSuccess is false, only the password modal is closed.
  };

  const openDiscountFormModal = () => setShowDiscountFormModal(true);
  const closeDiscountFormModal = () => setShowDiscountFormModal(false);


  const fetchUserAccount = async (accountNumber: string): Promise<User | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const accountNumberInt = parseInt(accountNumber, 10);
      if (isNaN(accountNumberInt)) {
        setError('Invalid account number format for fetching.');
        return null;
      }

      const { data, error: rpcError } = await supabase
        .from('accounts_lcmd')
        .select('*')
        .eq('account_number', accountNumberInt)
        .single();

      if (rpcError) {
        console.error('Error fetching user account:', rpcError);
        setError('Could not fetch account details.');
        return null;
      }

      if (data) {
        const fetchedUser: User = {
          accountNumber: String(data.account_number),
          acctName: data.acct_name || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip: data.zip || '',
          id: data.id, // Ensure the UUID 'id' is mapped
          email: data.email_address || '', // Map email_address to email (corrected to lowercase)
          mobile_phone: data.mobile_phone || '',
          requires_password_change: data.requires_password_change || false, // Also fetch this flag
          // Add other relevant fields from your 'accounts' table
        };
        // Optionally update the context's user state if this is the logged-in user
        // For now, just returning the fetched data
        return fetchedUser;
      }
      return null;
    } catch (err) {
      console.error('Fetch user account error:', err);
      setError('An unexpected error occurred while fetching account details.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated, 
      isLoading, 
      error, 
      fetchUserAccount,
      activeDiscount,
      showActiveDiscountModal,
      clearActiveDiscount,
      showPasswordChangeModal,
      openPasswordChangeModal,
      handlePasswordModalClose, // Updated name
      showDiscountFormModal,
      openDiscountFormModal,
      closeDiscountFormModal
    }}>
      {children}
    </AuthContext.Provider>
  );
};
