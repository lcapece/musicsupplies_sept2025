import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface DiscountInfo {
  rate: number;
  type: 'date_based' | 'order_based';
  message?: string;
  source: string; // Description of discount source
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean; 
  error: string | null;
  fetchUserAccount: (accountNumber: string) => Promise<User | null>; 
  maxDiscountRate: number | null;
  currentDiscountInfo: DiscountInfo | null;
  showPasswordChangeModal: boolean; 
  openPasswordChangeModal: () => void; 
  handlePasswordModalClose: (wasSuccess: boolean) => void; 
  showDiscountFormModal: boolean; 
  openDiscountFormModal: () => void; 
  closeDiscountFormModal: () => void;
  isSpecialAdmin: boolean; 
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
  isAuthenticated: false,
  isLoading: true, 
  error: null,
  fetchUserAccount: async () => null, 
  maxDiscountRate: null,
  currentDiscountInfo: null,
  showPasswordChangeModal: false,
  openPasswordChangeModal: () => {},
  handlePasswordModalClose: () => {},
  showDiscountFormModal: false,
  openDiscountFormModal: () => {},
  closeDiscountFormModal: () => {},
  isSpecialAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [maxDiscountRate, setMaxDiscountRate] = useState<number | null>(null);
  const [currentDiscountInfo, setCurrentDiscountInfo] = useState<DiscountInfo | null>(null);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState<boolean>(false);
  const [showDiscountFormModal, setShowDiscountFormModal] = useState<boolean>(false);
  const [isSpecialAdmin, setIsSpecialAdmin] = useState<boolean>(false);

  // Function to calculate the highest eligible discount for a user
  const calculateBestDiscount = async (accountNumber: string): Promise<void> => {
    try {
      const accountNumberInt = parseInt(accountNumber, 10);
      if (isNaN(accountNumberInt)) {
        console.log('[AuthContext] Invalid account number for discount calculation');
        setMaxDiscountRate(null);
        setCurrentDiscountInfo(null);
        return;
      }

      // 1. Fetch active date-based discounts
      const { data: dateDiscounts, error: dateError } = await supabase
        .from('lcmd_discount')
        .select('discount, promo_message')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString().split('T')[0])
        .gte('end_date', new Date().toISOString().split('T')[0]);

      if (dateError) {
        console.error('[AuthContext] Error fetching date-based discounts:', dateError);
      }

      // 2. Fetch order-based discounts and customer usage
      const { data: orderDiscounts, error: orderError } = await supabase
        .from('discount_tiers')
        .select('id, discount, max_orders, discount_type')
        .eq('discount_type', 'order_based');

      if (orderError) {
        console.error('[AuthContext] Error fetching order-based discounts:', orderError);
      }

      // 3. For each order-based discount, check customer usage
      const eligibleOrderDiscounts = [];
      if (orderDiscounts && orderDiscounts.length > 0) {
        for (const orderDiscount of orderDiscounts) {
          const { data: usage, error: usageError } = await supabase
            .from('account_order_discounts')
            .select('orders_used')
            .eq('account_number', accountNumber)
            .eq('discount_tier_id', orderDiscount.id)
            .limit(1);

          if (usageError) {
            console.error('[AuthContext] Error fetching order discount usage:', usageError);
            continue;
          }

          // Check if data array is not empty before accessing first element
          const ordersUsed = (usage && usage.length > 0) ? usage[0].orders_used : 0;
          const maxOrders = orderDiscount.max_orders || 0;

          // If customer still has orders remaining, this discount is eligible
          if (ordersUsed < maxOrders) {
            eligibleOrderDiscounts.push({
              rate: orderDiscount.discount,
              type: 'order_based' as const,
              message: `New customer discount - ${maxOrders - ordersUsed} orders remaining`,
              source: `Order-based discount (${ordersUsed + 1}/${maxOrders})`
            });
          }
        }
      }

      // 4. Combine and find the highest discount
      const allEligibleDiscounts = [];

      // Add date-based discounts
      if (dateDiscounts && dateDiscounts.length > 0) {
        dateDiscounts.forEach(discount => {
          if (discount.discount && discount.discount > 0) {
            allEligibleDiscounts.push({
              rate: discount.discount,
              type: 'date_based' as const,
              message: discount.promo_message || 'Promotional discount',
              source: 'Date-based promotion'
            });
          }
        });
      }

      // Add eligible order-based discounts
      allEligibleDiscounts.push(...eligibleOrderDiscounts);

      // 5. Find the highest discount
      if (allEligibleDiscounts.length > 0) {
        const bestDiscount = allEligibleDiscounts.reduce((best, current) => 
          current.rate > best.rate ? current : best
        );
        
        setMaxDiscountRate(bestDiscount.rate);
        setCurrentDiscountInfo(bestDiscount);
        console.log('[AuthContext] Best discount found:', bestDiscount);
      } else {
        setMaxDiscountRate(null);
        setCurrentDiscountInfo(null);
        console.log('[AuthContext] No eligible discounts found');
      }

    } catch (err) {
      console.error('[AuthContext] Exception calculating discounts:', err);
      setMaxDiscountRate(null);
      setCurrentDiscountInfo(null);
    }
  };

  useEffect(() => {
    const checkUserAndFetchMaxDiscount = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
          
          // Restore the special admin status from the saved user object
          if (parsedUser.is_special_admin === true) {
            setIsSpecialAdmin(true);
            console.log('[AuthContext] Restored special admin status');
          }
        }
      } catch (e) {
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
        setIsSpecialAdmin(false);
      }

      setIsLoading(false);
    };
    checkUserAndFetchMaxDiscount();
  }, []);

  const login = async (identifier: string, password: string): Promise<boolean> => {
    setError(null);
    
    try {
      // Call the authenticate_user_lcmd PL/pgSQL function
      const { data: authFunctionResponse, error: rpcError } = await supabase.rpc('authenticate_user_lcmd', {
        p_identifier: identifier,
        p_password: password
      });

      if (rpcError) {
        console.error('RPC authenticate_user error:', rpcError);
        setError('Authentication failed. Please check your credentials or try again later.');
        // Log failed attempt (RPC error)
        try {
          await supabase.from('login_activity_log').insert({
            account_number: null, // Identifier could be email, so account_number might not be available
            login_success: false, 
            ip_address: null, 
            user_agent: null,
            identifier_used: identifier // Log the identifier used for login attempt
          });
        } catch (logError) { console.error('Failed to log login attempt (RPC error):', logError); }
        return false;
      }

      // The function returns an array of rows, even if it's a single user.
      // If no user is found or auth fails, it returns an empty array or specific error.
      const authenticatedUserData = authFunctionResponse && Array.isArray(authFunctionResponse) && authFunctionResponse.length > 0 
                                  ? authFunctionResponse[0] 
                                  : null;

      // Debug info might be returned even when authentication fails
      if (authenticatedUserData && authenticatedUserData.debug_info) {
        console.log('Authentication debug info:', authenticatedUserData.debug_info);
      }
      
      // Check if this is the special admin account (99)
      const isSpecialAdminAccount = authenticatedUserData && authenticatedUserData.is_special_admin === true;
      setIsSpecialAdmin(isSpecialAdminAccount);

      // Check if we have a valid account (account_number will be null on auth failure)
      if (!authenticatedUserData || authenticatedUserData.account_number === null) {
        const errorMessage = 'Invalid account number/email or password.';
        console.error(errorMessage, authenticatedUserData?.debug_info || 'No debug info');
        setError(errorMessage);
        
        // Log failed attempt (no user data returned from function)
        try {
          await supabase.from('login_activity_log').insert({
            account_number: null, // Identifier could be email
            login_success: false, 
            ip_address: null, 
            user_agent: null,
            identifier_used: identifier
          });
        } catch (logError) { console.error('Failed to log login attempt (no data from RPC):', logError); }
        return false;
      }
      
      // Log successful attempt
      try {
        await supabase.from('login_activity_log').insert({
          account_number: authenticatedUserData.account_number, 
          login_success: true, 
          ip_address: null, 
          user_agent: null,
          identifier_used: identifier
        });
      } catch (logError) { console.error('Failed to log successful login attempt:', logError); }

      // Map data from PL/pgSQL function to User type
      // The function returns columns: account_number, acct_name, address, city, state, zip, id (UUID), email_address, mobile_phone, requires_password_change, is_special_admin, debug_info
      const userData: User = {
        accountNumber: String(authenticatedUserData.account_number), // This is BIGINT from function
        acctName: authenticatedUserData.acct_name || '',
        address: authenticatedUserData.address || '',
        city: authenticatedUserData.city || '',
        state: authenticatedUserData.state || '',
        zip: authenticatedUserData.zip || '',
        // 'id' from function is UUID (auth.users.id). 'user.id' in CartContext expects integer accounts.id.
        // This needs careful handling. For now, using account_number as the primary 'id' for User type as before.
        // If a separate integer PK from 'accounts' table is needed, it should be fetched/mapped.
        id: authenticatedUserData.account_number, // This is critical: ensure this 'id' is what CartContext expects for account_id
        email: authenticatedUserData.email_address || '', 
        mobile_phone: authenticatedUserData.mobile_phone || '',
        requires_password_change: authenticatedUserData.requires_password_change === true,
        is_special_admin: authenticatedUserData.is_special_admin === true,
        // If the UUID id from auth.users is needed on User type, add it:
        // auth_user_id: authenticatedUserData.id 
      };
      
      // Store debug info in console but don't save it to localStorage
      if (authenticatedUserData.debug_info) {
        console.log('Authentication successful with debug info:', authenticatedUserData.debug_info);
      }
      
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(userData));

      // Modal logic based on requires_password_change
      if (userData.requires_password_change) {
        setShowPasswordChangeModal(true);
      }

      await calculateBestDiscount(userData.accountNumber);
      return true;

    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again later.');
      // Log failed attempt (generic catch block)
      // Avoid logging if identifier is not reliable here, or log with a placeholder
      try {
        await supabase.from('login_activity_log').insert({
          account_number: null, // Identifier could be email
          login_success: false,
          ip_address: null,
          user_agent: null,
          identifier_used: identifier
        });
      } catch (logError) {
        console.error('Failed to log login attempt (catch block):', logError);
      }
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setIsSpecialAdmin(false); // Make sure to reset the special admin status on logout
    localStorage.removeItem('user');
  };

  const openPasswordChangeModal = () => setShowPasswordChangeModal(true);

  const handlePasswordModalClose = (wasSuccess: boolean) => {
    setShowPasswordChangeModal(false);
    if (wasSuccess) {
      if (user && user.requires_password_change) {
        const updatedUser = { ...user, requires_password_change: false };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    }
  };

  const openDiscountFormModal = () => setShowDiscountFormModal(true);
  const closeDiscountFormModal = () => setShowDiscountFormModal(false);

  const fetchUserAccount = async (identifier: string): Promise<User | null> => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('accounts_lcmd')
        .select('*');

      // Check if the identifier is a number (account number) or string (email)
      if (!isNaN(Number(identifier))) {
        query = query.eq('account_number', parseInt(identifier, 10));
      } else {
        query = query.eq('email_address', identifier);
      }

      const { data, error: queryError } = await query.single();

      if (queryError) {
        console.error('Error fetching user account:', queryError);
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
          id: data.id,
          email: data.email_address || '',
          mobile_phone: data.mobile_phone || '',
          requires_password_change: data.requires_password_change === true, // Explicitly treat only true as true
        };
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
      maxDiscountRate,
      currentDiscountInfo,
      showPasswordChangeModal,
      openPasswordChangeModal,
      handlePasswordModalClose, 
      showDiscountFormModal,
      openDiscountFormModal,
      closeDiscountFormModal,
      isSpecialAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};
