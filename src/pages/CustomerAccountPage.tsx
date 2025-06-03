import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface AccountInfo {
  account_number: number;
  acct_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email?: string;
  sms_number?: string;
  is_dirty: boolean;
}

const CustomerAccountPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (user) {
      fetchAccountInfo();
    }
  }, [user]);

  const fetchAccountInfo = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('accounts_lcmd')
        .select('*')
        .eq('account_number', user?.accountNumber)
        .single();

      if (error) {
        console.error('Error fetching account info:', error);
        setMessage({type: 'error', text: 'Error loading account information'});
        return;
      }

      setAccountInfo(data);
    } catch (error) {
      console.error('Error:', error);
      setMessage({type: 'error', text: 'Error loading account information'});
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestSMS = async () => {
    if (!accountInfo?.sms_number) {
      setMessage({type: 'error', text: 'Please set your SMS number first'});
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase.functions.invoke('send-test-sms', {
        body: {
          accountNumber: user?.accountNumber,
          accountName: user?.acctName,
          smsNumber: accountInfo.sms_number,
          message: `Hello ${user?.acctName}! This is a test message from MusicSupplies.com. Your account ${user?.accountNumber} is set up to receive order notifications.`
        }
      });

      if (error) {
        console.error('Error sending test SMS:', error);
        setMessage({type: 'error', text: 'Failed to send test SMS'});
        return;
      }

      setMessage({type: 'success', text: 'Test SMS sent successfully!'});
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage({type: 'error', text: 'Error sending test SMS'});
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAccount = async (updatedInfo: Partial<AccountInfo>) => {
    if (!accountInfo) return;

    try {
      setSaving(true);
      
      // Update the account with is_dirty flag set to true
      const { error } = await supabase
        .from('accounts_lcmd')
        .update({
          ...updatedInfo,
          is_dirty: true // Always set dirty flag when customer updates info
        })
        .eq('account_number', accountInfo.account_number);

      if (error) {
        console.error('Error updating account:', error);
        setMessage({type: 'error', text: 'Error updating account information'});
        return;
      }

      // Refresh account info
      await fetchAccountInfo();
      setMessage({type: 'success', text: 'Account information updated successfully'});
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage({type: 'error', text: 'Error updating account information'});
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
    if (!user) return;

    try {
      setSaving(true);

      // Verify current password first
      const { data: authData, error: authError } = await supabase
        .rpc('authenticate_user_lcmd', {
          p_account_number: user.accountNumber,
          p_password: currentPassword
        });

      if (authError || !authData) {
        setMessage({type: 'error', text: 'Current password is incorrect'});
        return;
      }

      // Update password in logon_lcmd table
      const { error: updateError } = await supabase
        .from('logon_lcmd')
        .upsert({
          account_number: user.accountNumber,
          password: newPassword,
          created_at: new Date().toISOString()
        });

      if (updateError) {
        console.error('Error updating password:', updateError);
        setMessage({type: 'error', text: 'Error updating password'});
        return;
      }

      // Set account as dirty since password was changed
      await handleUpdateAccount({ is_dirty: true });
      
      setShowPasswordModal(false);
      setMessage({type: 'success', text: 'Password updated successfully'});
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage({type: 'error', text: 'Error updating password'});
    } finally {
      setSaving(false);
    }
  };

  const AccountInfoForm: React.FC = () => {
    const [formData, setFormData] = useState<AccountInfo | null>(accountInfo);

    useEffect(() => {
      setFormData(accountInfo);
    }, [accountInfo]);

    if (!formData) return null;

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleUpdateAccount(formData);
    };

    const hasChanges = accountInfo && formData && (
      formData.acct_name !== accountInfo.acct_name ||
      formData.address !== accountInfo.address ||
      formData.city !== accountInfo.city ||
      formData.state !== accountInfo.state ||
      formData.zip !== accountInfo.zip ||
      formData.phone !== accountInfo.phone ||
      formData.email !== accountInfo.email ||
      formData.sms_number !== accountInfo.sms_number
    );

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={formData.acct_name || ''}
              onChange={(e) => setFormData({...formData, acct_name: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            type="text"
            value={formData.address || ''}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="123 Main Street"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={formData.city || ''}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              type="text"
              value={formData.state || ''}
              onChange={(e) => setFormData({...formData, state: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="NY"
              maxLength={2}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code
            </label>
            <input
              type="text"
              value={formData.zip || ''}
              onChange={(e) => setFormData({...formData, zip: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="12345"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (Optional)
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="contact@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SMS Number (Optional)
            </label>
            <div className="flex space-x-2">
              <input
                type="tel"
                value={formData.sms_number || ''}
                onChange={(e) => setFormData({...formData, sms_number: e.target.value})}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="+1234567890"
              />
              {formData.sms_number && (
                <button
                  type="button"
                  onClick={handleSendTestSMS}
                  disabled={saving}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md disabled:bg-gray-400"
                >
                  Test SMS
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Include country code (e.g., +1 for US/Canada). You'll receive order notifications via SMS.
            </p>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Change Password
          </button>
          
          <button
            type="submit"
            disabled={!hasChanges || saving}
            className={`px-6 py-2 rounded-md text-sm font-medium ${
              hasChanges && !saving
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    );
  };

  const PasswordChangeModal: React.FC = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (newPassword !== confirmPassword) {
        setMessage({type: 'error', text: 'New passwords do not match'});
        return;
      }
      
      if (newPassword.length < 6) {
        setMessage({type: 'error', text: 'Password must be at least 6 characters long'});
        return;
      }

      handlePasswordChange(currentPassword, newPassword);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
                minLength={6}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
                minLength={6}
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-gray-300"
              >
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading account information...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
              <div className="text-sm text-gray-500">
                Account: {user?.accountNumber} - {accountInfo?.acct_name}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/dashboard"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Back to Dashboard
              </a>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mx-6 mt-4 p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-8 px-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
            <p className="text-sm text-gray-600 mt-1">
              Update your account details. Changes will be synchronized with our main system.
              {accountInfo?.is_dirty && (
                <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                  Pending Sync
                </span>
              )}
            </p>
          </div>
          
          <div className="p-6">
            {accountInfo ? <AccountInfoForm /> : (
              <div className="text-center text-gray-500 py-8">
                No account information found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && <PasswordChangeModal />}
    </div>
  );
};

export default CustomerAccountPage;
