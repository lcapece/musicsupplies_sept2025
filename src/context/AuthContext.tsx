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
  validateAndRefreshSession: async () => false,
  ensureAuthSession: async () => false,
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

  // Function to clear orphaned auth.users records
  const clearOrphanedAuthUsers = async (identifier: string): Promise<void> => {
    try {
      console.log('[AuthContext] Clearing orphaned auth.users records for:', identifier);
      
      // Find the account in accounts_lcmd
      let query = supabase.from('accounts_lcmd').select('account_number, user_id');
      
      if (!isNaN(Number(identifier))) {
        query = query.eq('account_number', parseInt(identifier, 10));
      } else {
        query = query.eq('email_address', identifier);
      }
      
      const { data: accountData, error: accountError } = await query.single();
      
      if (accountError) {
        console.log('[AuthContext] No account found for cleanup, skipping');
        return;
      }
      
      if (accountData && accountData.user_id) {
        console.log('[AuthContext] Found user_id to clear:', accountData.user_id);
        
        // Clear the user_id from accounts_lcmd to break the connection
        const { error: updateError } = await supabase
          .from('accounts_lcmd')
          .update({ user_id: null })
          .eq('account_number', accountData.account_number);
        
        if (updateError) {
          console.error('[AuthContext] Failed to clear user_id:', updateError);
        } else {
          console.log('[AuthContext] Successfully cleared user_id for account:', accountData.account_number);
        }
      }
    } catch (error) {
      console.error('[AuthContext] Error during auth.users cleanup:', error);
      // Don't fail login if cleanup fails
    }
  };

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

    // CRITICAL: Clear any orphaned auth.users records before authentication
    await clearOrphanedAuthUsers(identifier);

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
      // Call the authenticate_user_v2 PL/pgSQL function (FIXED VERSION)
      const { data: authFunctionResponse, error: rpcError } = await supabase.rpc('authenticate_user_v2', {
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

      // SECURITY FIX: Remove debug info logging that exposed passwords
      // Debug info is only logged in development mode and passwords are excluded
      if (authenticatedUserData && authenticatedUserData.debug_info && import.meta.env.DEV) {
        // Never log the actual debug_info as it may contain sensitive data
        console.log('Authentication debug info available (hidden for security)');
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
      // The function returns columns: account_number, acct_name, address, city, state, zip, id (UUID), email_address, phone, mobile_phone, requires_password_change, is_special_admin, debug_info
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
        phone: authenticatedUserData.phone || '',
        mobile_phone: authenticatedUserData.mobile_phone || '',
        requires_password_change: authenticatedUserData.requires_password_change === true,
        is_special_admin: authenticatedUserData.is_special_admin === true,
        // If the UUID id from auth.users is needed on User type, add it:
        // auth_user_id: authenticatedUserData.id 
      };
      
      // SECURITY FIX: Never log debug info that might contain passwords
      // This is completely removed to prevent password exposure
      if (authenticatedUserData.debug_info && import.meta.env.DEV) {
        console.log('Authentication successful (debug info hidden for security)');
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
          phone: data.phone || '',
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

  const validateAndRefreshSession = async (): Promise<boolean> => {
    try {
      console.log('[AuthContext] Validating and refreshing session...');
      
      // Check if we have a user in context
      if (!user || !isAuthenticated) {
        console.log('[AuthContext] No user in context, session invalid');
        return false;
      }

      // Check if session manager has valid session
      const sessionUser = sessionManager.getSession();
      if (!sessionUser) {
        console.log('[AuthContext] No valid session in sessionManager');
        setUser(null);
        setIsAuthenticated(false);
        setIsSpecialAdmin(false);
        return false;
      }

      // Verify Supabase auth session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('[AuthContext] Error getting Supabase session:', error);
        return false;
      }

      // If no Supabase session, try to refresh
      if (!session) {
        console.log('[AuthContext] No Supabase session, attempting refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error('[AuthContext] Session refresh failed:', refreshError);
          // Clear invalid session
          sessionManager.clearSession();
          setUser(null);
          setIsAuthenticated(false);
          setIsSpecialAdmin(false);
          return false;
        }
        
        console.log('[AuthContext] Session refreshed successfully');
      }

      // Ensure JWT claims are set for current user
      if (user.accountNumber) {
        try {
          const accountNumber = parseInt(user.accountNumber, 10);
          if (!isNaN(accountNumber)) {
            await supabase.rpc('set_admin_jwt_claims', {
              p_account_number: accountNumber
            });
            console.log('[AuthContext] JWT claims validated/refreshed for account:', accountNumber);
          }
        } catch (claimsError) {
          console.error('[AuthContext] Failed to refresh JWT claims:', claimsError);
          // Don't fail validation if claims setting fails, but log it
        }
      }

      console.log('[AuthContext] Session validation successful');
      return true;
    } catch (error) {
      console.error('[AuthContext] Session validation failed:', error);
      return false;
    }
  };

  const ensureAuthSession = async (): Promise<boolean> => {
    try {
      console.log('[AuthContext] Ensuring auth session...');
      
      // Check if we have a user in context and sessionManager
      const sessionUser = sessionManager.getSession();
      if (!sessionUser || !sessionUser.accountNumber) {
        console.log('[AuthContext] No valid session in sessionManager');
        setError('Authentication session expired. Please log in again.');
        return false;
      }

      // Check Supabase auth session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[AuthContext] Error getting Supabase session:', sessionError);
      }

      // If no Supabase session, try to refresh it
      if (!session) {
        console.log('[AuthContext] No Supabase session found, attempting refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.log('[AuthContext] Session refresh failed, but continuing with stored session');
          // Don't fail immediately - we might still be able to use stored session
        } else {
          console.log('[AuthContext] Supabase session refreshed successfully');
        }
      }

      // Ensure user context is up to date
      if (!user || user.accountNumber !== sessionUser.accountNumber) {
        setUser(sessionUser);
        setIsAuthenticated(true);
        setIsSpecialAdmin(sessionUser.is_special_admin || false);
      }

      // Try to set JWT claims for database operations
      try {
        const accountNumber = parseInt(sessionUser.accountNumber, 10);
        if (!isNaN(accountNumber)) {
          await supabase.rpc('set_admin_jwt_claims', {
            p_account_number: accountNumber
          });
          console.log('[AuthContext] JWT claims set successfully for account:', accountNumber);
        }
      } catch (claimsError) {
        console.error('[AuthContext] Failed to set JWT claims:', claimsError);
        
        // If JWT claims fail, the user's session might be truly expired
        // Try one more refresh attempt
        try {
          const { data: retryRefresh, error: retryError } = await supabase.auth.refreshSession();
          if (!retryError && retryRefresh.session) {
            // Retry JWT claims with fresh session
            const accountNumber = parseInt(sessionUser.accountNumber, 10);
            if (!isNaN(accountNumber)) {
              await supabase.rpc('set_admin_jwt_claims', {
                p_account_number: accountNumber
              });
              console.log('[AuthContext] JWT claims set after session refresh');
            }
          } else {
            // Session is truly expired, clear everything
            console.log('[AuthContext] Session is truly expired, clearing session');
            sessionManager.clearSession();
            setUser(null);
            setIsAuthenticated(false);
            setIsSpecialAdmin(false);
            setError('Your session has expired. Please log in again.');
            return false;
          }
        } catch (retryError) {
          // Final attempt failed
          console.error('[AuthContext] Final session restoration attempt failed:', retryError);
          sessionManager.clearSession();
          setUser(null);
          setIsAuthenticated(false);
          setIsSpecialAdmin(false);
          setError('Your session has expired. Please log in again.');
          return false;
        }
      }

      console.log('[AuthContext] Session ensured successfully');
      return true;
    } catch (error) {
      console.error('[AuthContext] Error ensuring auth session:', error);
      setError('Authentication error. Please try logging in again.');
      return false;
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
      closeDeactivatedAccountModal,
      validateAndRefreshSession,
      ensureAuthSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};
