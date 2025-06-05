import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Assuming supabase client is exported from here
import { useAuth } from '../context/AuthContext';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: (wasSuccess: boolean) => void; // Updated signature
  accountData: any; // Consider defining a more specific type for accountData
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ isOpen, onClose, accountData }) => {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Added for password visibility
  const [email, setEmail] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { user, fetchUserAccount } = useAuth();

  useEffect(() => {
    if (accountData) {
      setEmail(accountData.email_address || accountData.email || ''); // Prioritize email_address from DB (corrected to lowercase)
      setMobilePhone(accountData.mobile_phone || '');
    }
  }, [accountData]);

  // Function to send a welcome SMS message
  const sendWelcomeSms = async (phoneNumber: string) => {
    if (!phoneNumber.trim()) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('send-test-sms', {
        body: {
          accountNumber: accountData.accountNumber || user?.accountNumber || '0',
          accountName: accountData.acct_name || 'Customer',
          smsNumber: phoneNumber,
          message: `Thank you for enabling SMS notifications from Music Supplies! You'll now receive order updates and promotional offers.`
        }
      });
      
      if (error) {
        console.error('Error from SMS function:', error);
        return;
      }
      
      console.log('Welcome SMS sent successfully:', data);
    } catch (err) {
      console.error('Error sending welcome SMS:', err);
      // Don't show error to user - non-critical operation
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword.length < 6) { // Basic password length validation
        setError("Password must be at least 6 characters long.");
        return;
    }

    setIsLoading(true);

    try {
      if (!user || !accountData) {
        setError("User or account data not found.");
        setIsLoading(false);
        return;
      }

      // First, update the password using the new function
      const { data: passwordUpdateResult, error: passwordError } = await supabase
        .rpc('update_user_password', { // Updated function name
          p_account_number: parseInt(accountData.accountNumber || user.accountNumber),
          p_new_password: newPassword
        });

      if (passwordError) {
        throw passwordError;
      }

      if (!passwordUpdateResult) {
        throw new Error('Failed to update password');
      }

      // Update email and mobile phone in accounts_lcmd
      const { error: updateError } = await supabase
        .from('accounts_lcmd')
        .update({
          email_address: email,
          mobile_phone: mobilePhone,
          sms_consent: smsConsent && mobilePhone.trim() ? true : false,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountData.id);

      if (updateError) {
        throw updateError;
      }
      
      // If SMS consent is enabled, send a welcome message
      if (smsConsent && mobilePhone.trim()) {
        try {
          await sendWelcomeSms(mobilePhone);
        } catch (smsErr) {
          console.error('Failed to send welcome SMS, but continuing with account update:', smsErr);
          // Non-critical error, continue with success flow
        }
      }

      onClose(true); // Close modal immediately on success and trigger next step (e.g. discount modal)

    } catch (err: any) {
      setError(err.message || "An error occurred while updating your details.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Update Your Account</h2>
        
        {error && <p className="text-red-500 bg-red-100 p-3 rounded mb-4">{error}</p>}
        {successMessage && <p className="text-green-500 bg-green-100 p-3 rounded mb-4">{successMessage}</p>}
        
        <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newPassword">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="newPassword"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm password field removed */}
            {/* <div className="mb-6"> ... </div> */}

            <hr className="my-6" />

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                Email Address (Current: {accountData?.email_address || accountData?.email || 'N/A'}) 
              </label>
              <input
                type="email"
                id="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="mobilePhone">
                Mobile Phone Number (Optional)
              </label>
              <input
                type="tel"
                id="mobilePhone"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={mobilePhone}
                onChange={(e) => setMobilePhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            {mobilePhone.trim() && (
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={smsConsent}
                    onChange={(e) => setSmsConsent(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    I consent to receive SMS messages from Music Supplies for order updates and promotional offers
                  </span>
                </label>
                {smsConsent && (
                  <p className="text-sm text-gray-600 mt-2 italic">
                    A welcome message will be sent to your phone when you save your changes.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                type="button"
                onClick={() => onClose(false)} // Call with false for cancel
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Details'}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
