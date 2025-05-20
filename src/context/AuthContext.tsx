                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (accountNumber: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  logout: () => {},
  isAuthenticated: false,
  error: null
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('user');
      }
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
        zip: accountData.zip || ''
      };
      
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(userData));
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
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, error }}>
      {children}
    </AuthContext.Provider>
  );
};
