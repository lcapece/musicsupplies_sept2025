import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Lock, Save, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface AdminPasswordManagerProps {
  accountNumber?: string; // Default to 999 if not provided
}

const AdminPasswordManager: React.FC<AdminPasswordManagerProps> = ({ 
  accountNumber = '999' 
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | null; text: string }>({ type: null, text: '' });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    // Check for basic password strength
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    
    if (!hasUpperCase && !hasLowerCase && !hasNumbers) {
      setMessage({ type: 'error', text: 'Password should contain a mix of letters and numbers' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: null, text: '' });

    try {
      // First verify the current password
      const { data: authData, error: authError } = await supabase.rpc('authenticate_user', {
        p_identifier: accountNumber,
        p_password: currentPassword
      });

      if (authError || !authData) {
        setMessage({ type: 'error', text: 'Current password is incorrect' });
        setIsLoading(false);
        return;
      }

      // Update the password
      const { error: updateError } = await supabase.rpc('update_user_password', {
        p_account_number: parseInt(accountNumber),
        p_new_password: newPassword
      });

      if (updateError) {
        // If the function doesn't exist, try direct update
        const { error: directError } = await supabase
          .from('user_passwords')
          .update({ 
            password_hash: await supabase.rpc('crypt', { 
              password: newPassword, 
              salt: await supabase.rpc('gen_salt', { type: 'bf' }) 
            }),
            updated_at: new Date().toISOString()
          })
          .eq('account_number', parseInt(accountNumber));

        if (directError) {
          throw directError;
        }
      }

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: 'Failed to change password. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <Lock className="text-purple-600" size={24} />
        <h3 className="text-lg font-semibold text-gray-900">
          Change Admin Password
        </h3>
      </div>

      {accountNumber === '999' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            This will change the master admin (999) password. Make sure to remember the new password!
          </p>
        </div>
      )}

      <form onSubmit={handlePasswordChange} className="space-y-4">
        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent pr-10"
              placeholder="Enter current password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent pr-10"
              placeholder="Enter new password (min 8 characters)"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent pr-10"
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* Password Requirements */}
        <div className="text-xs text-gray-600 space-y-1">
          <p>Password requirements:</p>
          <ul className="ml-4 space-y-0.5">
            <li>• At least 8 characters long</li>
            <li>• Mix of letters and numbers recommended</li>
            <li>• Avoid common words or patterns</li>
          </ul>
        </div>

        {/* Messages */}
        {message.type && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Changing Password...
            </>
          ) : (
            <>
              <Save size={20} />
              Change Password
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AdminPasswordManager;