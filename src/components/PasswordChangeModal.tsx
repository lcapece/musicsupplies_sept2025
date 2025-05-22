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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [successMessage, setSuccessMessage] = useState<string | null>(null); // Removed as it's no longer used
  const { user, fetchUserAccount } = useAuth();

  useEffect(() => {
    if (accountData) {
      setEmail(accountData.email_address || accountData.email || ''); // Prioritize email_address from DB (corrected to lowercase)
      setMobilePhone(accountData.mobile_phone || '');
    }
  }, [accountData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // setSuccessMessage(null); // Removed as successMessage state is removed

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
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

      const updates: any = {
        password: newPassword, // Storing as plain text as requested
        email_address: email, // Update email_address field in DB (corrected to lowercase)
        mobile_phone: mobilePhone,
        requires_password_change: false // Set this flag to false after successful update
      };

      const { error: updateError } = await supabase
        .from('accounts_lcmd')
        .update(updates)
        .eq('id', accountData.id);

      if (updateError) {
        throw updateError;
      }

      // setSuccessMessage("Your details have been updated successfully. Please log in again with your new password.");
      onClose(true); // Close modal immediately on success and trigger next step (e.g. discount modal)

    } catch (err: any) {
      setError(err.message || "An error occurred while updating your details.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = () => {
    // Placeholder for OTP functionality
    alert("Send OTP functionality to be implemented using Resend API.");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Update Your Account</h2>
        
        {error && <p className="text-red-500 bg-red-100 p-3 rounded mb-4">{error}</p>}
        
        <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="newPassword">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
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
                Mobile Phone Number
              </label>
              <div className="flex">
                <input
                  type="tel"
                  id="mobilePhone"
                  className="w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={handleSendOtp}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-r-md text-sm"
                >
                  Send OTP
                </button>
              </div>
            </div>

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
        {/* Removed orphaned closing parenthesis and brace */}
      </div>
    </div>
  );
};

export default PasswordChangeModal;
