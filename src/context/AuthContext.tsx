import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { sessionManager } from '../utils/sessionManager';
import { validateEmail, validateAccountNumber } from '../utils/validation';

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
  updateUser: (userData: Partial<User>) => void;
  maxDiscountRate: number | null;
  currentDiscountInfo: DiscountInfo | null;
  showPasswordChangeModal: boolean; 
  openPasswordChangeModal: () => void; 
  handlePasswordModalClose: (wasSuccess: boolean) => void; 
  showDiscountFormModal: boolean; 
  openDiscountFormModal: () => void; 
  closeDiscountFormModal: () => void;
  isSpecialAdmin: boolean;
  showDeactivatedAccountModal: boolean;
  deactivatedAccountName: string;
  closeDeactivatedAccountModal: () => void;
  validateAndRefreshSession: () => Promise<boolean>;
  ensureAuthSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
  isAuthenticated: false,
  isLoading: true, 
  error: null,
  fetchUserAccount: async () => null, 
  updateUser: () => {},
  maxDiscountRate: null,
  currentDiscountInfo: null,
  showPasswordChangeModal: false,
  openPasswordChangeModal: () => {},
  handlePasswordModalClose: () => {},
  showDiscountFormModal: false,
  openDiscountFormModal: () => {},
  closeDiscountFormModal: () => {},
  isSpecialAdmin: false,
  showDeactivatedAccountModal: false,
  deactivatedAccountName: '',
  closeDeactivatedAccountModal: () => {},
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
  const [showDeactivatedAccountModal, setShowDeactivatedAccountModal] = useState<boolean>(false);
  const [deactivatedAccountName, setDeactivatedAccountName] = useState<string>('');
  const [deactivatedAccountShown, setDeactivatedAccountShown] = useState<Set<string>>(new Set());

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
        // Use secure session manager instead of localStorage
        const savedUser = sessionManager.getSession();
        if (savedUser && savedUser.accountNumber) {
          console.log('[AuthContext] Restoring session for user:', savedUser.accountNumber);
          setUser(savedUser);
          setIsAuthenticated(true);
          
          // Restore the special admin status from the saved user object
          if (savedUser.is_special_admin === true) {
            setIsSpecialAdmin(true);
            if (import.meta.env.DEV) {
              console.log('[AuthContext] Restored special admin status');
            }
          }
          
          // Restore JWT claims for RLS policies
          try {
            const accountNumber = parseInt(savedUser.accountNumber, 10);
            if (!isNaN(accountNumber)) {
              await supabase.rpc('set_admin_jwt_claims', {
                p_account_number: accountNumber
              });
              console.log('[AuthContext] JWT claims restored for account:', accountNumber);
              
              // Calculate discount after successful session restoration
              await calculateBestDiscount(savedUser.accountNumber);
            }
          } catch (claimsError) {
            console.error('[AuthContext] Failed to restore JWT claims:', claimsError);
            // Don't fail session restoration if JWT claims fail
          }
        } else {
          // Clean up any old localStorage data
          localStorage.removeItem('user');
          console.log('[AuthContext] No valid session found, user needs to log in');
        }
      } catch (e) {
        console.error('[AuthContext] Session restoration failed:', e);
        sessionManager.clearSession();
        setUser(null);
        setIsAuthenticated(false);
        setIsSpecialAdmin(false);
        setError(null); // Don't show error on initial load
      }

      setIsLoading(false);
    };

    // Set up session expiration callback
    sessionManager.onExpired(() => {
      console.log('[AuthContext] Session expired, clearing user state');
      setUser(null);
      setIsAuthenticated(false);
      setIsSpecialAdmin(false);
      setMaxDiscountRate(null);
      setCurrentDiscountInfo(null);
      setError('Your session has expired. Please log in again.');
    });

    checkUserAndFetchMaxDiscount();
  }, []);

  const login = async (identifier: string, password: string): Promise<boolean> => {
    setError(null);
    
    // Input validation
    if (!identifier || !password) {
      setError('Please provide both identifier and password');
      return false;
    }

    // Validate identifier format
    const isEmail = identifier.includes('@');
    if (isEmail) {
      const emailValidation = validateEmail(identifier);
      if (!emailValidation.isValid) {
        setError(emailValidation.error || 'Invalid email format');
        return false;
      }
      identifier = emailValidation.sanitized || identifier;
    } else {
      const accountValidation = validateAccountNumber(identifier);
      if (!accountValidation.isValid) {
        setError(accountValidation.error || 'Invalid account number format');
        return false;
      }
      identifier = accountValidation.sanitized || identifier;
    }

    // Check for deactivated account pattern: one letter + 5 identical characters (x's or other repeating chars)
    const deactivatedPattern = /^[a-zA-Z](.)\1{4}$/;
    if (deactivatedPattern.test(password)) {
      // Check if we've already shown the modal for this account
      const accountKey = `${identifier}_deactivated`;
      if (!deactivatedAccountShown.has(accountKey)) {
        // Fetch account name to show in the modal
        try {
          const accountData = await fetchUserAccount(identifier);
          if (accountData) {
            setDeactivatedAccountName(accountData.acctName);
            setShowDeactivatedAccountModal(true);
            // Mark this account as having been shown the deactivated modal
            setDeactivatedAccountShown(prev => new Set(prev).add(accountKey));
            return false;
          }
        } catch (err) {
          console.error('Error fetching account for deactivated modal:', err);
        }
      }
      // If we've already shown the modal or couldn't fetch account data, show generic error
      setError('Invalid account number/email or password.');
      return false;
    }

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
      
      // Use secure session manager instead of localStorage
      sessionManager.setSession(userData);
      
      // Set JWT claims for admin access and RLS policies
      try {
        const accountNumber = parseInt(userData.accountNumber, 10);
        await supabase.rpc('set_admin_jwt_claims', {
          p_account_number: accountNumber
        });
        console.log('[AuthContext] JWT claims set for account:', accountNumber);
      } catch (claimsError) {
        console.error('[AuthContext] Failed to set JWT claims:', claimsError);
        // Don't fail login if claims setting fails, but log it
      }

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
    setIsSpecialAdmin(false);
    setMaxDiscountRate(null);
    setCurrentDiscountInfo(null);
    
    // Use secure session manager to clear all session data
    sessionManager.clearSession();
  };

  const openPasswordChangeModal = () => setShowPasswordChangeModal(true);

  const handlePasswordModalClose = async (wasSuccess: boolean) => {
    setShowPasswordChangeModal(false);
    if (wasSuccess && user) {
      // Re-fetch user data to get the latest info (like updated email) and ensure session is fresh
      const updatedAccount = await fetchUserAccount(user.accountNumber);
      if (updatedAccount) {
        // Ensure requires_password_change is false after a successful update
        const finalUser = { ...updatedAccount, requires_password_change: false };
        setUser(finalUser);
        sessionManager.setSession(finalUser);
      }
    }
  };

  const openDiscountFormModal = () => setShowDiscountFormModal(true);
  const closeDiscountFormModal = () => setShowDiscountFormModal(false);

  const closeDeactivatedAccountModal = () => {
    setShowDeactivatedAccountModal(false);
    setDeactivatedAccountName('');
  };

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

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      console.log('[AuthContext] Updating user context with:', userData);
      setUser(updatedUser);
      sessionManager.setSession(updatedUser);
      console.log('[AuthContext] User context and session updated successfully');
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
      updateUser,
      maxDiscountRate,
      currentDiscountInfo,
      showPasswordChangeModal,
      openPasswordChangeModal,
      handlePasswordModalClose, 
      showDiscountFormModal,
      openDiscountFormModal,
      closeDiscountFormModal,
      isSpecialAdmin,
      showDeactivatedAccountModal,
      deactivatedAccountName,
      closeDeactivatedAccountModal
    }}>
      {children}
    </AuthContext.Provider>
  );
};
