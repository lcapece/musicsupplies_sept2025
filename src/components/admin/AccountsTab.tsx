import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Account {
  account_number: number;
  acct_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  requires_password_change: boolean;
  has_custom_password: boolean;
}

interface LogonEntry {
  account_number: number;
  password: string;
}

const AccountsTab: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [totalAccountCount, setTotalAccountCount] = useState(0);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const getDefaultPassword = (acctName: string, zip: string) => {
    if (!acctName || !zip) return '';
    const firstLetter = acctName.charAt(0).toLowerCase();
    const zipFirst5 = zip.substring(0, 5);
    return `${firstLetter}${zipFirst5}`;
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      
      // First get the total count
      const { count, error: countError } = await supabase
        .from('accounts_lcmd')
        .select('*', { count: 'exact', head: true });
      
      if (!countError && count) {
        setTotalAccountCount(count);
      }

      // Then fetch all accounts with a higher limit
      const { data, error } = await supabase
        .from('accounts_lcmd')
        .select(`
          account_number,
          acct_name,
          address,
          city,
          state,
          zip,
          phone,
          requires_password_change
        `)
        .order('account_number', { ascending: true })
        .limit(10000);  // Increased limit to get all accounts

      if (error) {
        console.error('Error fetching accounts:', error);
        return;
      }

      // Get all password entries
      const { data: passwordData, error: passwordError } = await supabase
        .from('logon_lcmd')
        .select('account_number, password')
        .limit(10000);

      if (passwordError) {
        console.error('Error fetching password data:', passwordError);
      }

      // Create a map of account passwords
      const passwordMap: { [key: number]: string } = {};
      passwordData?.forEach((entry: LogonEntry) => {
        passwordMap[entry.account_number] = entry.password;
      });

      // Check which accounts have custom passwords
      // FIXED LOGIC: An account has a custom password if it has ANY entry in logon_lcmd
      // The presence of an entry means someone set a custom password
      // No entry means the account uses the default pattern (first letter + zip)
      const accountsWithPasswordStatus = (data || []).map(account => {
        const hasEntry = passwordMap.hasOwnProperty(account.account_number);
        
        // If there's any entry in logon_lcmd, it's a custom password
        // This fixes the issue where account 105 was showing as default when it has a custom password
        const hasCustomPassword = hasEntry;
        
        return {
          ...account,
          has_custom_password: hasCustomPassword
        };
      });

      setAccounts(accountsWithPasswordStatus);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultPassword = async (accountNumber: number, newPassword: string) => {
    try {
      // Check if account already has a password entry
      const { data: existingPassword, error: checkError } = await supabase
        .from('logon_lcmd')
        .select('account_number')
        .eq('account_number', accountNumber)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error when no rows

      if (checkError) {
        console.error('Error checking existing password:', checkError);
        alert('Error checking existing password');
        return;
      }

      if (existingPassword) {
        // Update existing password
        const { error: updateError } = await supabase
          .from('logon_lcmd')
          .update({
            password: newPassword,
            updated_at: new Date().toISOString()
          })
          .eq('account_number', accountNumber);

        if (updateError) {
          console.error('Error updating password:', updateError);
          alert('Error updating password');
          return;
        }
      } else {
        // Insert new password entry
        const { error: insertError } = await supabase
          .from('logon_lcmd')
          .insert({
            account_number: accountNumber,
            password: newPassword
          });

        if (insertError) {
          console.error('Error inserting password:', insertError);
          alert('Error setting password');
          return;
        }
      }

      // Update the account to require password change (this is on accounts_lcmd table)
      const { error: accountUpdateError } = await supabase
        .from('accounts_lcmd')
        .update({ requires_password_change: true })
        .eq('account_number', accountNumber);

      if (accountUpdateError) {
        console.error('Error updating account:', accountUpdateError);
      }

      setShowPasswordModal(false);
      fetchAccounts();
      alert('Default password set successfully. User will be required to change it on next login.');
    } catch (error) {
      console.error('Error:', error);
      alert('Error setting default password');
    }
  };

  const handleResetPassword = async (accountNumber: number) => {
    if (window.confirm('This will reset the account to use the default password pattern (first letter + ZIP). Continue?')) {
      try {
        // Remove custom password entry
        const { error: deleteError } = await supabase
          .from('logon_lcmd')
          .delete()
          .eq('account_number', accountNumber);

        if (deleteError) {
          console.error('Error deleting password:', deleteError);
          alert('Error resetting password');
          return;
        }

        // Update account to require password change (this is on accounts_lcmd table)
        const { error: updateError } = await supabase
          .from('accounts_lcmd')
          .update({ requires_password_change: true })
          .eq('account_number', accountNumber);

        if (updateError) {
          console.error('Error updating account:', updateError);
        }

        fetchAccounts();
        alert('Password reset successfully. Account will use default password pattern.');
      } catch (error) {
        console.error('Error:', error);
        alert('Error resetting password');
      }
    }
  };

  const getDefaultPasswordDisplay = (account: Account) => {
    return getDefaultPassword(account.acct_name, account.zip) || 'N/A';
  };

  const filteredAccounts = accounts.filter(account => {
    const searchLower = searchTerm.toLowerCase();
    return !searchTerm || 
      account.account_number.toString().includes(searchTerm) ||
      (account.acct_name || '').toLowerCase().includes(searchLower) ||
      (account.city || '').toLowerCase().includes(searchLower) ||
      (account.state || '').toLowerCase().includes(searchLower);
  });

  const PasswordModal: React.FC<{
    account: Account;
    onClose: () => void;
    onSave: (accountNumber: number, password: string) => void;
  }> = ({ account, onClose, onSave }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = () => {
      if (!password.trim()) {
        alert('Please enter a password');
        return;
      }
      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
      }
      onSave(account.account_number, password);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Set Default Password for Account {account.account_number}
          </h3>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Account:</strong> {account.acct_name}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              <strong>Current Default Pattern:</strong> {getDefaultPasswordDisplay(account)}
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Default Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="bg-yellow-50 p-3 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This will set a custom default password for this account. 
                The user will be required to change it on their next login.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Set Password
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-gray-900">Accounts Management</h2>
          <p className="text-lg text-gray-600 mt-2">
            Manage account default passwords and settings
            {totalAccountCount > 0 && ` (${totalAccountCount} total accounts in database)`}
          </p>
        </div>
        <button
          onClick={fetchAccounts}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-lg font-semibold"
        >
          Refresh Accounts
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-lg font-semibold text-gray-600">Total Accounts</div>
          <div className="text-4xl font-bold text-gray-900">
            {accounts.length}
            {totalAccountCount > accounts.length && (
              <span className="text-lg text-gray-500"> of {totalAccountCount}</span>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-lg font-semibold text-gray-600">Custom Passwords</div>
          <div className="text-4xl font-bold text-blue-600">
            {accounts.filter(a => a.has_custom_password).length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-lg font-semibold text-gray-600">Using Default Pattern</div>
          <div className="text-4xl font-bold text-green-600">
            {accounts.filter(a => !a.has_custom_password).length}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center space-x-6">
          <div className="flex-1">
            <label className="block text-lg font-semibold text-gray-700 mb-2">
              Search Accounts
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by account number, company name, city, or state..."
              className="w-full border border-gray-300 rounded-md px-4 py-3 text-base"
            />
          </div>
          <button
            onClick={() => setSearchTerm('')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-md text-lg font-semibold mt-8"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900">
            Account List ({filteredAccounts.length} accounts)
          </h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-gray-600 text-xl">Loading accounts...</div>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-gray-600 text-xl">No accounts found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-8 py-5 text-left text-lg font-bold text-gray-700 uppercase tracking-wider">
                    Account #
                  </th>
                  <th className="px-8 py-5 text-left text-lg font-bold text-gray-700 uppercase tracking-wider">
                    Company Name
                  </th>
                  <th className="px-8 py-5 text-left text-lg font-bold text-gray-700 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-8 py-5 text-left text-lg font-bold text-gray-700 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-8 py-5 text-left text-lg font-bold text-gray-700 uppercase tracking-wider">
                    Password Status
                  </th>
                  <th className="px-8 py-5 text-left text-lg font-bold text-gray-700 uppercase tracking-wider">
                    Default Pattern
                  </th>
                  <th className="px-8 py-5 text-left text-lg font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAccounts.map((account) => (
                  <tr key={account.account_number} className="hover:bg-gray-50">
                    <td className="px-8 py-6 whitespace-nowrap text-lg font-bold text-gray-900">
                      {account.account_number}
                    </td>
                    <td className="px-8 py-6 text-lg text-gray-700 max-w-xs truncate font-semibold">
                      {account.acct_name || 'N/A'}
                    </td>
                    <td className="px-8 py-6 text-base text-gray-600">
                      {account.city || 'N/A'}, {account.state || 'N/A'} {account.zip || 'N/A'}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-base text-gray-600">
                      {account.phone || 'N/A'}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-base">
                      <div className="space-y-2">
                        <span className={`inline-flex px-3 py-2 text-sm font-bold rounded-full ${
                          account.has_custom_password 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {account.has_custom_password ? 'Custom Password' : 'Default Pattern'}
                        </span>
                        {account.requires_password_change && (
                          <div>
                            <span className="inline-flex px-3 py-2 text-sm font-bold rounded-full bg-orange-100 text-orange-800">
                              Requires Change
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-base text-gray-600 font-mono font-bold">
                      {getDefaultPasswordDisplay(account)}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-base text-gray-500">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setSelectedAccount(account);
                            setShowPasswordModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 font-semibold text-base"
                        >
                          Set Password
                        </button>
                        {account.has_custom_password && (
                          <button
                            onClick={() => handleResetPassword(account.account_number)}
                            className="text-orange-600 hover:text-orange-900 font-semibold text-base"
                          >
                            Reset to Default
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Password Modal */}
      {showPasswordModal && selectedAccount && (
        <PasswordModal
          account={selectedAccount}
          onClose={() => setShowPasswordModal(false)}
          onSave={handleSetDefaultPassword}
        />
      )}
    </div>
  );
};

export default AccountsTab;
