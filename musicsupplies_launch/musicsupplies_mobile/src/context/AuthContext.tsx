import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { sessionManager } from '../utils/sessionManager';
import { validateEmail, validateAccountNumber } from '../utils/validation';

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
  isAuthenticated: false,
  isLoading: true,
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const savedUser = sessionManager.getSession();
        if (savedUser) {
          setUser(savedUser);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error('[AuthContext] Session restoration failed:', e);
        sessionManager.clearSession();
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    // Set up session expiration callback
    sessionManager.onExpired(() => {
      setUser(null);
      setIsAuthenticated(false);
      setError('Your session has expired. Please log in again.');
    });

    checkUser();
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

    try {
      // Call the authenticate_user_lcmd PL/pgSQL function
      const { data: authFunctionResponse, error: rpcError } = await supabase.rpc('authenticate_user_lcmd', {
        p_identifier: identifier,
        p_password: password
      });

      if (rpcError) {
        console.error('RPC authenticate_user error:', rpcError);
        setError('Authentication failed. Please check your credentials.');
        return false;
      }

      const authenticatedUserData = authFunctionResponse && Array.isArray(authFunctionResponse) && authFunctionResponse.length > 0 
                                  ? authFunctionResponse[0] 
                                  : null;

      // Check if we have a valid account
      if (!authenticatedUserData || authenticatedUserData.account_number === null) {
        setError('Invalid account number/email or password.');
        return false;
      }

      // Map data to User type
      const userData: User = {
        accountNumber: String(authenticatedUserData.account_number),
        acctName: authenticatedUserData.acct_name || '',
        address: authenticatedUserData.address || '',
        city: authenticatedUserData.city || '',
        state: authenticatedUserData.state || '',
        zip: authenticatedUserData.zip || '',
        id: authenticatedUserData.account_number,
        email: authenticatedUserData.email_address || '',
        mobile_phone: authenticatedUserData.mobile_phone || '',
        requires_password_change: authenticatedUserData.requires_password_change === true,
        is_special_admin: authenticatedUserData.is_special_admin === true,
      };
      
      setUser(userData);
      setIsAuthenticated(true);
      sessionManager.setSession(userData);

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
    sessionManager.clearSession();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated, 
      isLoading, 
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
};
