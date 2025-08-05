import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import SmsConsentModal from './SmsConsentModal';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: (wasSuccess: boolean) => void;
  accountData: any;
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ isOpen, onClose, accountData }) => {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSmsConsentModal, setShowSmsConsentModal] = useState(false);
  const { user, fetchUserAccount } = useAuth();

  useEffect(() => {
    if (accountData) {
      setEmail(accountData.email_address || accountData.email || '');
      setMobilePhone(accountData.mobile_phone || '');
    }
  }, [accountData]);

  const ensureLogonEntry = async (accountNumber: number, defaultPassword: string) => {
    // Check if logon entry exists
    const { data: existingEntry, error: checkError } = await supabase
      .from('logon_lcmd')
      .select('account_number')
      .eq('account_number', accountNumber)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // Error other than "not found"
      throw checkError;
    }

    if (!existingEntry) {
      // Create the logon entry with default password
      const { error: insertError } = await supabase
        .from('logon_lcmd')
        .insert({
          account_number: accountNumber,
          password: defaultPassword
        });

      if (insertError) {
        throw insertError;
      }
      console.log(`Created logon entry for account ${accountNumber} with default password`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (newPassword.length < 6) {
        setError("Password must be at least 6 characters long.");
        setIsLoading(false);
        return;
    }

    try {
      if (!user || !accountData) {
        setError("User or account data not found.");
        setIsLoading(false);
        return;
      }

      const accountNumber = parseInt(accountData.accountNumber);
      
      // Step 1: Ensure logon_lcmd entry exists (with current/default password)
      const currentPassword = accountData.currentPassword || 'p11554'; // Use default if not available
      await ensureLogonEntry(accountNumber, currentPassword);

      // Step 2: Update password directly in logon_lcmd and mark as non-default
      const { error: passwordError } = await supabase
        .from('logon_lcmd')
        .update({ 
          password: newPassword,
          is_default_password: false,
          updated_at: new Date().toISOString(),
          password_set_date: new Date().toISOString()
        })
        .eq('account_number', accountNumber);

      if (passwordError) {
        console.error('Password update error:', passwordError);
        throw passwordError;
      }

      // Step 3: Update other account details and clear password change requirement
      const { data, error: updateError } = await supabase
        .from('accounts_lcmd')
        .update({
          email_address: email || null,
          mobile_phone: mobilePhone || null,
          requires_password_change: false
        })
        .eq('account_number', accountNumber)
        .select();

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      console.log('Update successful:', data);
      setSuccessMessage("Account updated successfully!");
      
      // Show SMS consent modal for first-time password changes
      if (accountData.requires_password_change) {
        setTimeout(() => {
          setShowSmsConsentModal(true);
        }, 1000);
      } else {
        // Wait a moment to show success message
        setTimeout(() => {
          onClose(true);
        }, 1500);
      }

    } catch (err: any) {
      console.error('Error updating account:', err);
      setError(err.message || "An error occurred while updating your details.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSmsConsent = async (consented: boolean, marketingConsent?: boolean, phoneNumber?: string) => {
    try {
      // Update SMS consent and phone number if provided
      const updateData: any = {
        sms_consent: consented,
        marketing_sms_consent: marketingConsent || false,
        sms_consent_date: consented ? new Date().toISOString() : null,
      };

      if (phoneNumber) {
        updateData.mobile_phone = phoneNumber;
      }

      await supabase
        .from('accounts_lcmd')
        .update(updateData)
        .eq('account_number', parseInt(accountData.accountNumber));
      
      // Refresh user account data to reflect changes
      await fetchUserAccount(accountData.accountNumber);
      onClose(true); // Close the password change modal after SMS consent is handled
    } catch (error) {
      console.error('Error updating SMS consent:', error);
      setError('Failed to update SMS consent.');
      onClose(false); // Close with failure
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
                    <svg xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24\" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
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

            <div className="mb-6">
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
              <p className="text-xs text-gray-500 mt-1">
                SMS preferences will be handled separately after password update
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                type="button"
                onClick={() => onClose(false)}
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

      <SmsConsentModal
        isOpen={showSmsConsentModal}
        onClose={() => setShowSmsConsentModal(false)}
        onConsent={handleSmsConsent}
      />
    </div>
  );
};

export default PasswordChangeModal;
