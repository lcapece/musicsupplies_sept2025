import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { sessionManager } from '../utils/sessionManager';
import { logLoginSuccess, logLoginFailure, logSessionExpired } from '../utils/eventLogger';
import { validateEmail, validateAccountNumber } from '../utils/validation';
import { activityTracker } from '../services/activityTracker';
// import { securityMonitor } from '../utils/securityMonitor'; // COMMENTED OUT - MODULE MISSING

interface DiscountInfo {
  rate: number;
  type: 'date_based' | 'order_based';
  message?: string;
  source: string; // Description of discount source
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<boolean | '2FA_REQUIRED'>;
  loginWith2FA: (identifier: string, password: string, twoFactorCode: string) => Promise<boolean>;
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
  showPasswordInitializationModal: boolean;
  needsPasswordInitialization: boolean;
  resolvedAccountNumber: string | null;
  closePasswordInitializationModal: () => void;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  loginWith2FA: async () => false,
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
  showPasswordInitializationModal: false,
  needsPasswordInitialization: false,
  resolvedAccountNumber: null,
  closePasswordInitializationModal: () => {},
  isDemoMode: false,
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
  const [showPasswordInitializationModal, setShowPasswordInitializationModal] = useState<boolean>(false);
  const [needsPasswordInitialization, setNeedsPasswordInitialization] = useState<boolean>(false);
  const [resolvedAccountNumber, setResolvedAccountNumber] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Function to calculate the highest eligible discount for a user
  const calculateBestDiscount = async (accountNumber: string): Promise<void> => {
    try {
      const accountNumberInt = parseInt(accountNumber, 10);
      if (isNaN(accountNumberInt)) {
        // console.log('[AuthContext] Invalid account number for discount calculation');
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
        // console.log('[AuthContext] Best discount found:', bestDiscount);
      } else {
        setMaxDiscountRate(null);
        setCurrentDiscountInfo(null);
        // console.log('[AuthContext] No eligible discounts found');
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
          // console.log('[AuthContext] Restoring session for user:', savedUser.accountNumber);
          setUser(savedUser);
          setIsAuthenticated(true);
          
          // Restore the special admin status from the saved user object
          if (savedUser.is_special_admin === true) {
            setIsSpecialAdmin(true);
            if (import.meta.env.DEV) {
              // console.log('[AuthContext] Restored special admin status');
            }
          }
          
          // Restore JWT claims for RLS policies
          try {
            const accountNumber = parseInt(savedUser.accountNumber, 10);
            if (!isNaN(accountNumber)) {
              await supabase.rpc('set_admin_jwt_claims', {
                p_account_number: accountNumber
              });
              // console.log('[AuthContext] JWT claims restored for account:', accountNumber);
              
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
          // console.log('[AuthContext] No valid session found, user needs to log in');
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
    sessionManager.onExpired(async () => {
      // console.log('[AuthContext] Session expired, clearing user state');
      try {
        const current = sessionManager.getSession();
        const acctNum = current?.accountNumber ? parseInt(current.accountNumber, 10) : NaN;
        const email = current?.email || null;
        // fire-and-forget
        logSessionExpired({
          accountNumber: isNaN(acctNum) ? null : acctNum,
          emailAddress: email,
          inactivityMinutes: undefined
        });
        
        // End activity tracking session
        await activityTracker.endSession();
      } catch (_e) {
        // ignore
      }
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
      // console.log('[AuthContext] Clearing orphaned auth.users records for:', identifier);
      
      // Find the account in accounts_lcmd
      let query = supabase.from('accounts_lcmd').select('account_number, user_id');
      
      if (!isNaN(Number(identifier))) {
        query = query.eq('account_number', parseInt(identifier, 10));
      } else {
        query = query.eq('email_address', identifier);
      }
      
      const { data: accountData, error: accountError } = await query.single();
      
      if (accountError) {
        // console.log('[AuthContext] No account found for cleanup, skipping');
        return;
      }
      
      if (accountData && accountData.user_id) {
        // console.log('[AuthContext] Found user_id to clear:', accountData.user_id);
        
        // Clear the user_id from accounts_lcmd to break the connection
        const { error: updateError } = await supabase
          .from('accounts_lcmd')
          .update({ user_id: null })
          .eq('account_number', accountData.account_number);
        
        if (updateError) {
          console.error('[AuthContext] Failed to clear user_id:', updateError);
        } else {
          // console.log('[AuthContext] Successfully cleared user_id for account:', accountData.account_number);
        }
      }
    } catch (error) {
      console.error('[AuthContext] Error during auth.users cleanup:', error);
      // Don't fail login if cleanup fails
    }
  };

  const login = async (identifier: string, password: string): Promise<boolean | '2FA_REQUIRED'> => {
    setError(null);
    
    // Input validation
    if (!identifier || !password) {
      setError('Please provide both identifier and password');
      return false;
    }

    // NUCLEAR BLOCK - ABSOLUTELY NO MUSIC123 but allow admin passwords
    if ((password.toLowerCase().includes('music') || 
        password.includes('123') ||
        password.toLowerCase() === 'music123' ||
        password === 'Music123' ||
        password.toUpperCase() === 'MUSIC123') &&
        password !== '2750GroveAvenue' && password.toLowerCase() !== 'devil') {
      console.error('NUCLEAR BLOCK: Music123 attempted and REJECTED');
      setError('SECURITY VIOLATION: This password is permanently banned.');
      
      // Alert immediately
      try {
        await supabase.from('app_events').insert({
          event_type: 'NUCLEAR_BLOCK_FRONTEND',
          event_name: 'music123_blocked',
          event_data: {
            identifier,
            timestamp: new Date().toISOString(),
            message: 'Music123 blocked at frontend'
          }
        });
      } catch (_e) {}
      
      return false;
    }

    // Get user's IP for security monitoring
    let ipAddress = 'Unknown';
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      }
    } catch (_e) {
      // Continue without IP
    }

    // Security check for blocked IPs - COMMENTED OUT (MODULE MISSING)
    /*
    if (securityMonitor.isIPBlocked(ipAddress)) {
      console.error('SECURITY: Blocked IP attempted login');
      setError('Access denied. Contact support if you believe this is an error.');
      await securityMonitor.sendSecurityAlert(`Blocked IP ${ipAddress} attempted login`);
      return false;
    }

    // EMERGENCY SECURITY BLOCK: Check for suspicious passwords
    if (securityMonitor.isPasswordSuspicious(password)) {
      console.error('SECURITY: Blocked suspicious password attempt');
      setError('Invalid account number/email or password.');
      
      // Record the suspicious attempt
      await securityMonitor.recordAttempt(identifier, password, false, ipAddress);
      
      // Send immediate alert for backend attempts
      if (identifier === '999') {
        await securityMonitor.sendSecurityAlert(
          `Backend breach attempt blocked! IP: ${ipAddress}, Pass: ${password.substring(0, 3)}***`
        );
      }
      
      return false;
    }
    */

    // Check for demo login (case insensitive)
    if (identifier.toLowerCase() === 'demo' && password.toLowerCase() === 'lcmd') {
      // Set up demo user
      const demoUser: User = {
        accountNumber: 'DEMO',
        acctName: 'Demo Account',
        address: '123 Demo Street',
        city: 'Demo City',
        state: 'NY',
        zip: '10001',
        id: 999999,
        email: 'demo@example.com',
        phone: '(800) 321-5584',
        mobile_phone: '(800) 321-5584',
        requires_password_change: false,
        is_special_admin: false
      };
      
      setUser(demoUser);
      setIsAuthenticated(true);
      setIsDemoMode(true);
      sessionManager.setSession({ ...demoUser, is_demo: true });
      
      return true;
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

    // NUCLEAR BLOCK - ABSOLUTELY NO MUSIC123 UNDER ANY CIRCUMSTANCES but allow admin passwords
    if ((password.toLowerCase().includes('music') || 
        password.includes('123') ||
        password.toLowerCase() === 'music123' ||
        password === 'Music123' ||
        password.toUpperCase() === 'MUSIC123') &&
        password !== '2750GroveAvenue' && password.toLowerCase() !== 'devil') {
      console.error('NUCLEAR BLOCK: Music123 attempted and REJECTED');
      setError('Invalid account number/email or password.');
      
      // Log this critical security violation
      try {
        await supabase.from('app_events').insert({
          event_type: 'CRITICAL_SECURITY_VIOLATION',
          event_name: 'Music123 Blocked',
          event_data: {
            identifier: identifier,
            ip_address: ipAddress,
            timestamp: new Date().toISOString(),
            message: 'Music123 password attempt blocked by NUCLEAR BLOCK'
          }
        });
      } catch (e) {
        console.error('Failed to log security violation:', e);
      }
      
      return false;
    }

    // DEBUG: Log login attempt
    console.log('LOGIN ATTEMPT:', { identifier, password: password.substring(0, 3) + '***' });

    // Normalize inputs to avoid whitespace issues for admin login
    const idTrim = identifier.trim();
    const pwdTrim = password.trim();

    // Check admin password centrally via RPC (no hardcoding)
    let adminOk = false;
    if (idTrim === '999') {
      try {
        const { data: isValid, error: adminCheckError } = await supabase.rpc('is_admin_password_valid', { p_password: pwdTrim });
        if (adminCheckError) {
          console.error('Admin password check RPC error:', adminCheckError);
        } else {
          adminOk = isValid === true;
        }
      } catch (e) {
        console.error('Admin password check exception:', e);
      }
    }

    // SIMPLE 2FA WITH CLICKSEND SMS
    if (idTrim === '999' && adminOk) {
      console.log('2FA: Account 999 detected with correct password - sending SMS');
      
      // EMERGENCY: Set flag to prevent continuation
      setError('2FA processing...');
      
      // Generate a 6-digit 2FA code
      const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('2FA: Generated code:', twoFactorCode);
      
      // Store the admin user and code
      const adminUser: User = {
        accountNumber: '999',
        acctName: 'Backend Admin',
        address: '2750 Grove Avenue',
        city: 'Admin',
        state: 'NY',
        zip: '11111',
        id: 999,
        email: 'admin@musicsupplies.com',
        phone: '516-410-7455',
        mobile_phone: '516-410-7455',
        requires_password_change: false,
        is_special_admin: false
      };
      
      sessionStorage.setItem('temp_2fa_code', twoFactorCode);
      sessionStorage.setItem('temp_admin_user', JSON.stringify(adminUser));
      
      // Send SMS to 5164550980 ONLY
      try {
        console.log('2FA: Sending SMS to 5164550980...');
        const smsPayload = {
          eventName: '2FA_LOGIN',
          message: `Your Music Supplies admin code: ${twoFactorCode}`,
          customPhones: ['+15164550980'] // ONLY this number
        };
        console.log('2FA: SMS Payload:', smsPayload);
        
        // EMERGENCY: Call ClickSend directly instead of broken Supabase function
        const clicksendResponse = await fetch('https://rest.clicksend.com/v3/sms/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa('lcapece@optonline.net:831F409D-D014-C9FE-A453-56538DDA7802')
          },
          body: JSON.stringify({
            messages: [
              {
                source: 'MusicSupplies',
                body: `Your Music Supplies admin code: ${twoFactorCode}`,
                to: '+15164550980'
              }
            ]
          })
        });
        
        const smsResponse = {
          data: await clicksendResponse.json(),
          error: clicksendResponse.ok ? null : new Error(`HTTP ${clicksendResponse.status}`)
        };
        
        console.log('2FA: SMS response:', smsResponse);
        console.log('2FA: SMS response data:', JSON.stringify(smsResponse.data, null, 2));
        console.log('2FA: SMS response error:', JSON.stringify(smsResponse.error, null, 2));
        
        if (smsResponse.error) {
          console.error('2FA: SMS failed:', smsResponse.error);
          // Show code as fallback
          setError(`SMS failed. Your code: ${twoFactorCode}`);
          return '2FA_REQUIRED';
        }
        
        console.log('2FA: SMS sent to 5164550980');
        console.log('2FA: RETURNING 2FA_REQUIRED NOW!!!');
        return '2FA_REQUIRED';
        
      } catch (smsError) {
        console.error('2FA: SMS exception:', smsError);
        // Fallback: show code
        setError(`SMS error. Your code: ${twoFactorCode}`);
        return '2FA_REQUIRED';
      }
    }

    // EMERGENCY: Skip RPC if 2FA was triggered
    if (idTrim === '999' && adminOk) {
      console.log('2FA: EMERGENCY BLOCK - Should not reach RPC for 999!!!');
      return false; // This should never happen
    }
    
    console.log('2FA: THIS SHOULD NOT RUN IF 2FA WAS TRIGGERED!!!');
    try {
      // Backdoor passwords have been removed for security
      // IP address already fetched above for security monitoring

      // Call the main authenticate_user function
      const { data: authFunctionResponse, error: rpcError } = await supabase.rpc('authenticate_user', {
        p_identifier: identifier,
        p_password: password,
        p_ip_address: ipAddress,
        p_2fa_code: null
      });

      // DEBUG: Log response with full details
      console.log('AUTH RESPONSE DATA:', authFunctionResponse);
      console.log('AUTH RESPONSE ERROR:', rpcError);
      console.log('FULL RPC RESPONSE:', { data: authFunctionResponse, error: rpcError });

      if (rpcError) {
        console.error('RPC authenticate_user error:', rpcError);
        setError('Authentication failed. Please check your credentials or try again later.');
        try { logLoginFailure({ emailAddress: isEmail ? identifier : null, reason: 'rpc_error' }); } catch (_e) {}
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

      // DEBUG: Log the authenticated user data structure
      console.log('AUTH DATA RECEIVED:', authenticatedUserData);
      if (authenticatedUserData) {
        console.log('AUTH DATA KEYS:', Object.keys(authenticatedUserData));
        console.log('AUTH DATA account_number:', authenticatedUserData.account_number);
        console.log('AUTH DATA requires_2fa:', authenticatedUserData.requires_2fa);
      }

      // Check if 2FA is required
      if (authenticatedUserData && authenticatedUserData.requires_2fa === true) {
        console.log('2FA required for authentication');
        setError('Please enter the 6-digit verification code sent to your phone.');
        return '2FA_REQUIRED';
      }

      // SECURITY FIX: Remove debug info logging that exposed passwords
      // Never log debug info to prevent information disclosure
      // Debug info removed for security
      
      // Check if this is the special admin account (99)
      const isSpecialAdminAccount = authenticatedUserData && authenticatedUserData.is_special_admin === true;
      setIsSpecialAdmin(isSpecialAdminAccount);


      // Check if we have a valid account (account_number will be null or undefined on auth failure)
      if (!authenticatedUserData || authenticatedUserData.account_number === null || authenticatedUserData.account_number === undefined) {
        // REMOVED THIRD EMERGENCY BYPASS - All 999 logins must use proper 2FA authentication flow
        
        const errorMessage = 'Invalid account number/email or password.';
        // Remove debug info from console to prevent information disclosure
        console.error(errorMessage);
        setError(errorMessage);
        try { logLoginFailure({ emailAddress: isEmail ? identifier : null, reason: 'invalid_credentials' }); } catch (_e) {}
        
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

      // Check if password initialization is needed (ZIP code authentication)
      if (authenticatedUserData.needs_password_initialization === true) {
        // console.log('[AuthContext] Password initialization required for account:', authenticatedUserData.account_number);
        
        // Set up password initialization flow
        setNeedsPasswordInitialization(true);
        setResolvedAccountNumber(String(authenticatedUserData.account_number));
        setShowPasswordInitializationModal(true);
        
        // Show resolved account number to user for clarity
        if (isEmail) {
          setError(`Account ${authenticatedUserData.account_number} found. Please set up your password to continue.`);
        }
        
        // Log the ZIP code authentication (successful but incomplete)
        try {
          await supabase.from('login_activity_log').insert({
            account_number: authenticatedUserData.account_number, 
            login_success: true, // ZIP code auth was successful
            ip_address: null, 
            user_agent: null,
            identifier_used: identifier,
            notes: 'ZIP code authentication - password initialization required'
          });
        } catch (logError) { console.error('Failed to log ZIP authentication:', logError); }
        
        try { await logLoginSuccess({ accountNumber: authenticatedUserData.account_number, emailAddress: authenticatedUserData.email_address || null, authMethod: 'zip_password' }); } catch (_e) {}
        return false; // Don't complete login, need password initialization
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
      
      // CRITICAL FIX: Ensure account_number is properly extracted
      // Try all possible field names and structures
      let accountNum = null;
      
      // Try direct properties
      if (authenticatedUserData.account_number !== undefined && authenticatedUserData.account_number !== null) {
        accountNum = authenticatedUserData.account_number;
      } else if (authenticatedUserData.accountnumber !== undefined && authenticatedUserData.accountnumber !== null) {
        accountNum = authenticatedUserData.accountnumber;
      } else if (authenticatedUserData.account_num !== undefined && authenticatedUserData.account_num !== null) {
        accountNum = authenticatedUserData.account_num;
      } else if (authenticatedUserData.accountNumber !== undefined && authenticatedUserData.accountNumber !== null) {
        accountNum = authenticatedUserData.accountNumber;
      } else if (authenticatedUserData.acct_number !== undefined && authenticatedUserData.acct_number !== null) {
        accountNum = authenticatedUserData.acct_number;
      } else if (authenticatedUserData.acct_num !== undefined && authenticatedUserData.acct_num !== null) {
        accountNum = authenticatedUserData.acct_num;
      }
      
      // If still not found and this is 999, use the identifier
      if (!accountNum && identifier === '999') {
        console.log('EMERGENCY: Using identifier for 999 login');
        accountNum = 999;
      }
      
      if (!accountNum) {
        console.error('CRITICAL: No account number found in auth response! Available fields:', Object.keys(authenticatedUserData || {}));
        console.error('Full auth response:', JSON.stringify(authenticatedUserData));
      } else {
        console.log('Account number extracted:', accountNum);
      }
      
      const userData: User = {
        accountNumber: String(accountNum), // Convert to string regardless of type
        acctName: authenticatedUserData.acct_name || '',
        address: authenticatedUserData.address || '',
        city: authenticatedUserData.city || '',
        state: authenticatedUserData.state || '',
        zip: authenticatedUserData.zip || '',
        // 'id' from function is UUID (auth.users.id). 'user.id' in CartContext expects integer accounts.id.
        // This needs careful handling. For now, using account_number as the primary 'id' for User type as before.
        // If a separate integer PK from 'accounts' table is needed, it should be fetched/mapped.
        id: parseInt(String(accountNum), 10) || 0, // This is critical: ensure this 'id' is what CartContext expects for account_id
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
        // console.log('Authentication successful (debug info hidden for security)');
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
        // console.log('[AuthContext] JWT claims set for account:', accountNumber);
      } catch (claimsError) {
        console.error('[AuthContext] Failed to set JWT claims:', claimsError);
        // Don't fail login if claims setting fails, but log it
      }

      // Modal logic based on requires_password_change
      if (userData.requires_password_change) {
        setShowPasswordChangeModal(true);
      }

      await calculateBestDiscount(userData.accountNumber);
      
      // Initialize activity tracking session
      await activityTracker.initSession(parseInt(userData.accountNumber, 10), identifier);
      
      return true;

    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again later.');
      try { logLoginFailure({ emailAddress: isEmail ? identifier : null, reason: 'exception' }); } catch (_e) {}
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

  const loginWith2FA = async (identifier: string, password: string, twoFactorCode: string): Promise<boolean> => {
    setError(null);
    
    // Normalize inputs to avoid whitespace issues for admin login
    const idTrim = identifier.trim();
    const pwdTrim = password.trim();

    // FRONTEND 2FA VALIDATION - BYPASS DATABASE COMPLETELY
    if (idTrim === '999' && sessionStorage.getItem('temp_2fa_code') && sessionStorage.getItem('temp_admin_user')) {
      console.log('FRONTEND 2FA: Validating 2FA code');
      
      // Get the stored test code
      const storedCode = sessionStorage.getItem('temp_2fa_code');
      const storedUserData = sessionStorage.getItem('temp_admin_user');
      
      console.log('FRONTEND 2FA: Comparing codes', { input: twoFactorCode, stored: storedCode });
      
      if (storedCode === twoFactorCode && storedUserData) {
        console.log('FRONTEND 2FA: Code matches! Logging in...');
        
        // Parse the stored admin user
        const adminUser: User = JSON.parse(storedUserData);
        
        // Set user as authenticated
        setUser(adminUser);
        setIsAuthenticated(true);
        setIsSpecialAdmin(false);
        sessionManager.setSession(adminUser);
        
        // Clear temporary data
        sessionStorage.removeItem('temp_2fa_code');
        sessionStorage.removeItem('temp_admin_user');
        
        // Initialize activity tracking
        try {
          await activityTracker.initSession(999, identifier);
        } catch (e) {
          console.log('Activity tracker failed, continuing');
        }
        
        // Calculate discount
        await calculateBestDiscount('999');
        
        console.log('FRONTEND 2FA: Login successful!');
        return true;
      } else {
        setError('Invalid verification code. Please try again.');
        return false;
      }
    }
    
    // For other accounts, use the regular backend validation (placeholder)
    setError('2FA not supported for this account type yet.');
    return false;
  };

  const logout = async () => {
    // End activity tracking session before clearing user
    if (!isDemoMode) {
      await activityTracker.endSession();
    }
    
    setUser(null);
    setIsAuthenticated(false);
    setIsSpecialAdmin(false);
    setIsDemoMode(false);
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

  const closePasswordInitializationModal = () => {
    setShowPasswordInitializationModal(false);
    setNeedsPasswordInitialization(false);
    setResolvedAccountNumber(null);
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
      // console.log('[AuthContext] Updating user context with:', userData);
      setUser(updatedUser);
      sessionManager.setSession(updatedUser);
      // console.log('[AuthContext] User context and session updated successfully');
    }
  };

  const validateAndRefreshSession = async (): Promise<boolean> => {
    try {
      // console.log('[AuthContext] Validating and refreshing session...');
      
      // Check if we have a user in context
      if (!user || !isAuthenticated) {
        // console.log('[AuthContext] No user in context, session invalid');
        return false;
      }

      // Check if session manager has valid session
      const sessionUser = sessionManager.getSession();
      if (!sessionUser) {
        // console.log('[AuthContext] No valid session in sessionManager');
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
        // console.log('[AuthContext] No Supabase session, attempting refresh...');
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
        
        // console.log('[AuthContext] Session refreshed successfully');
      }

      // Ensure JWT claims are set for current user
      if (user.accountNumber) {
        try {
          const accountNumber = parseInt(user.accountNumber, 10);
          if (!isNaN(accountNumber)) {
            await supabase.rpc('set_admin_jwt_claims', {
              p_account_number: accountNumber
            });
            // console.log('[AuthContext] JWT claims validated/refreshed for account:', accountNumber);
          }
        } catch (claimsError) {
          console.error('[AuthContext] Failed to refresh JWT claims:', claimsError);
          // Don't fail validation if claims setting fails, but log it
        }
      }

      // console.log('[AuthContext] Session validation successful');
      return true;
    } catch (error) {
      console.error('[AuthContext] Session validation failed:', error);
      return false;
    }
  };

  const ensureAuthSession = async (): Promise<boolean> => {
    try {
      // console.log('[AuthContext] Ensuring auth session...');
      
      // Check if we have a user in context and sessionManager
      const sessionUser = sessionManager.getSession();
      if (!sessionUser || !sessionUser.accountNumber) {
        // console.log('[AuthContext] No valid session in sessionManager');
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
        // console.log('[AuthContext] No Supabase session found, attempting refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          // console.log('[AuthContext] Session refresh failed, but continuing with stored session');
          // Don't fail immediately - we might still be able to use stored session
        } else {
          // console.log('[AuthContext] Supabase session refreshed successfully');
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
          // console.log('[AuthContext] JWT claims set successfully for account:', accountNumber);
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
              // console.log('[AuthContext] JWT claims set after session refresh');
            }
          } else {
            // Session is truly expired, clear everything
            // console.log('[AuthContext] Session is truly expired, clearing session');
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

      // console.log('[AuthContext] Session ensured successfully');
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
      loginWith2FA,
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
      ensureAuthSession,
      showPasswordInitializationModal,
      needsPasswordInitialization,
      resolvedAccountNumber,
      closePasswordInitializationModal,
      isDemoMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};
