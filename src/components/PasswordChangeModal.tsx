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
  const [smsConsent, setSmsConsent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const { user, fetchUserAccount } = useAuth();

  useEffect(() => {
    if (accountData) {
      setEmail(accountData.email_address || accountData.email || ''); // Prioritize email_address from DB (corrected to lowercase)
      setMobilePhone(accountData.mobile_phone || '');
    }
  }, [accountData]);

  const handleSendSmsCode = async () => {
    if (!mobilePhone.trim()) {
      setError('Please enter a mobile phone number first');
      return;
    }

    if (!smsConsent) {
      setError('Please consent to receive SMS messages');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSendingCode(true);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('send-sms-verification', {
        body: {
          phoneNumber: mobilePhone,
          accountNumber: parseInt(accountData.accountNumber || user?.accountNumber || '0')
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to send verification code');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setCodeSent(true);
      setSuccessMessage('Verification code sent successfully! Check your phone.');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsVerifyingCode(true);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('verify-sms-code', {
        body: {
          accountNumber: parseInt(accountData.accountNumber || user?.accountNumber || '0'),
          verificationCode: verificationCode
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to verify code');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.success) {
        setPhoneVerified(true);
        setSuccessMessage('Phone number verified successfully!');
      } else {
        throw new Error('Invalid or expired verification code');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) { // Basic password length validation
        setError("Password must be at least 6 characters long.");
        return;
    }

    // If user provided phone number but hasn't verified it, require verification
    if (mobilePhone.trim() && smsConsent && !phoneVerified) {
      setError("Please verify your phone number before continuing.");
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
        .rpc('update_user_password_lcmd', {
          p_account_number: parseInt(accountData.accountNumber || user.accountNumber),
          p_new_password: newPassword
        });

      if (passwordError) {
        throw passwordError;
      }

      if (!passwordUpdateResult) {
        throw new Error('Failed to update password');
      }

      // Then update email and mobile phone in accounts_lcmd (only if phone wasn't verified via SMS)
      if (!phoneVerified) {
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
      } else {
        // If phone was verified, only update email (phone and SMS consent already updated by verification)
        const { error: updateError } = await supabase
          .from('accounts_lcmd')
          .update({
            email_address: email,
            updated_at: new Date().toISOString()
          })
          .eq('id', accountData.id);

        if (updateError) {
          throw updateError;
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
              <>
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
                </div>

                {smsConsent && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-md">
                    <h4 className="font-medium text-gray-800 mb-2">SMS Verification</h4>
                    
                    {!codeSent ? (
                      <button
                        type="button"
                        onClick={handleSendSmsCode}
                        disabled={isSendingCode}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSendingCode ? 'Sending...' : 'Send Verification Code'}
                      </button>
                    ) : !phoneVerified ? (
                      <div className="space-y-3">
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength={6}
                          />
                          <button
                            type="button"
                            onClick={handleVerifyCode}
                            disabled={isVerifyingCode}
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            {isVerifyingCode ? 'Verifying...' : 'Verify'}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleSendSmsCode}
                          disabled={isSendingCode}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Resend Code
                        </button>
                      </div>
                    ) : (
                      <div className="text-green-600 font-medium">
                        ✓ Phone number verified successfully!
                      </div>
                    )}
                  </div>
                )}
              </>
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
