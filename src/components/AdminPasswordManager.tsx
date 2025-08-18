import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Lock, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminPasswordManager: React.FC = () => {
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const { user } = useAuth();

  // Load current admin password from database
  const loadAdminPassword = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_password');
      
      if (error) {
        console.error('Error loading admin password:', error);
        setMessage({ type: 'error', text: 'Failed to load admin password' });
      } else {
        setAdminPassword(data || '');
        setNewPassword(data || '');
      }
    } catch (err) {
      console.error('Exception loading admin password:', err);
      setMessage({ type: 'error', text: 'Error loading admin password' });
    } finally {
      setIsLoading(false);
    }
  };

  // Save new admin password to database
  const saveAdminPassword = async () => {
    if (!newPassword || newPassword.trim() === '') {
      setMessage({ type: 'error', text: 'Password cannot be empty' });
      return;
    }

    // Check for Music123 pattern
    if (newPassword.toLowerCase().includes('music') || 
        newPassword.includes('123') ||
        newPassword.toLowerCase() === 'music123') {
      setMessage({ type: 'error', text: 'This password has been permanently banned for security reasons' });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    
    try {
      const { data, error } = await supabase.rpc('update_admin_password', {
        p_new_password: newPassword,
        p_updated_by: user?.accountNumber || 'system'
      });
      
      if (error) {
        console.error('Error updating admin password:', error);
        setMessage({ type: 'error', text: 'Failed to update admin password' });
      } else if (data === true) {
        setAdminPassword(newPassword);
        setMessage({ type: 'success', text: 'Admin password updated successfully' });
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to update admin password' });
      }
    } catch (err) {
      console.error('Exception updating admin password:', err);
      setMessage({ type: 'error', text: 'Error updating admin password' });
    } finally {
      setIsSaving(false);
    }
  };

  // Load password on component mount
  useEffect(() => {
    loadAdminPassword();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
          <Lock className="mr-2" size={24} />
          Administrative Password
        </h2>
        <p className="text-gray-600">
          Manage the administrative password for account 999 (Backend Admin)
        </p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700'
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {/* Current Password Display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Admin Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={adminPassword}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 pr-10"
              placeholder={isLoading ? 'Loading...' : 'No password set'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              title={showPassword ? 'Hide password' : 'Reveal password'}
            >
              {showPassword ? (
                <EyeOff className="text-gray-500 hover:text-gray-700" size={20} />
              ) : (
                <Eye className="text-gray-500 hover:text-gray-700" size={20} />
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {showPassword ? 'Password is visible - ensure you are in a private view' : 'Click the eye icon to reveal the password'}
          </p>
        </div>

        {/* New Password Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Admin Password
          </label>
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter new password"
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter a new password to replace the current admin password
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={saveAdminPassword}
            disabled={isSaving || newPassword === adminPassword}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="mr-2" size={18} />
            {isSaving ? 'Saving...' : 'Save Password'}
          </button>
          
          <button
            onClick={loadAdminPassword}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h3 className="text-sm font-semibold text-yellow-800 mb-1">Security Notice</h3>
        <ul className="text-xs text-yellow-700 space-y-1">
          <li>• This password provides full administrative access to the system</li>
          <li>• Keep this password secure and change it regularly</li>
          <li>• Do not share this password with unauthorized personnel</li>
          <li>• All password changes are logged for audit purposes</li>
          <li>• The password "Music123" and similar patterns are permanently banned</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminPasswordManager;