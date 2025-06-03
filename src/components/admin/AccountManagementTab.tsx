import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';

interface AccountFilters {
  accountNumber: string;
  companyName: string;
  city: string;
  state: string;
}

const AccountManagementTab: React.FC = () => {
  const [accounts, setAccounts] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AccountFilters>({
    accountNumber: '',
    companyName: '',
    city: '',
    state: ''
  });
  const [selectedAccount, setSelectedAccount] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async (searchFilters?: AccountFilters) => {
    try {
      setLoading(true);
      let query = supabase
        .from('accounts_lcmd')
        .select('*')
        .order('account_number', { ascending: true })
        .limit(200);

      const currentFilters = searchFilters || filters;

      if (currentFilters.accountNumber) {
        query = query.eq('account_number', parseInt(currentFilters.accountNumber));
      }
      if (currentFilters.companyName) {
        query = query.ilike('acct_name', `%${currentFilters.companyName}%`);
      }
      if (currentFilters.city) {
        query = query.ilike('city', `%${currentFilters.city}%`);
      }
      if (currentFilters.state) {
        query = query.ilike('state', `%${currentFilters.state}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching accounts:', error);
        return;
      }

      // Map database fields to User interface
      const mappedAccounts: User[] = (data || []).map(account => ({
        accountNumber: String(account.account_number),
        acctName: account.acct_name || '',
        address: account.address || '',
        city: account.city || '',
        state: account.state || '',
        zip: account.zip || '',
        id: account.id,
        email_address: account.email_address || '',
        mobile_phone: account.mobile_phone || '',
        requires_password_change: account.requires_password_change || false,
        sms_consent: account.sms_consent || false,
        sms_consent_date: account.sms_consent_date || ''
      }));

      setAccounts(mappedAccounts);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchAccounts(filters);
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      accountNumber: '',
      companyName: '',
      city: '',
      state: ''
    };
    setFilters(emptyFilters);
    fetchAccounts(emptyFilters);
  };

  const handleEditAccount = (account: User) => {
    setSelectedAccount(account);
    setShowEditModal(true);
  };

  const handleDeleteAccount = async (accountNumber: string) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        const { error } = await supabase
          .from('accounts_lcmd')
          .delete()
          .eq('account_number', parseInt(accountNumber));

        if (error) {
          console.error('Error deleting account:', error);
          alert('Error deleting account');
          return;
        }

        fetchAccounts();
        alert('Account deleted successfully');
      } catch (error) {
        console.error('Error:', error);
        alert('Error deleting account');
      }
    }
  };

  const handleSaveAccount = async (account: User, isNew: boolean = false) => {
    try {
      const accountData = {
        account_number: parseInt(account.accountNumber),
        acct_name: account.acctName,
        address: account.address,
        city: account.city,
        state: account.state,
        zip: account.zip,
        email_address: account.email_address,
        mobile_phone: account.mobile_phone,
        requires_password_change: account.requires_password_change,
        sms_consent: account.sms_consent,
        sms_consent_date: account.sms_consent_date
      };

      if (isNew) {
        // Add default password for new accounts
        const { error } = await supabase
          .from('accounts_lcmd')
          .insert([{ ...accountData, password: 'temp123', requires_password_change: true }]);

        if (error) {
          console.error('Error adding account:', error);
          alert('Error adding account');
          return;
        }
      } else {
        const { error } = await supabase
          .from('accounts_lcmd')
          .update(accountData)
          .eq('account_number', parseInt(account.accountNumber));

        if (error) {
          console.error('Error updating account:', error);
          alert('Error updating account');
          return;
        }
      }

      setShowEditModal(false);
      setShowAddModal(false);
      fetchAccounts();
      alert(isNew ? 'Account added successfully' : 'Account updated successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Error saving account');
    }
  };

  const handlePasswordReset = async (accountNumber: string) => {
    if (window.confirm('Reset password to "temp123" and require password change?')) {
      try {
        const { error } = await supabase
          .from('accounts_lcmd')
          .update({ 
            password: 'temp123',
            requires_password_change: true 
          })
          .eq('account_number', parseInt(accountNumber));

        if (error) {
          console.error('Error resetting password:', error);
          alert('Error resetting password');
          return;
        }

        fetchAccounts();
        alert('Password reset successfully');
      } catch (error) {
        console.error('Error:', error);
        alert('Error resetting password');
      }
    }
  };

  const AccountModal: React.FC<{ 
    account: User | null; 
    isNew: boolean; 
    onClose: () => void; 
    onSave: (account: User, isNew: boolean) => void 
  }> = ({ account, isNew, onClose, onSave }) => {
    const [formData, setFormData] = useState<User>(account || {
      accountNumber: '',
      acctName: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      email_address: '',
      mobile_phone: '',
      requires_password_change: false,
      sms_consent: false,
      sms_consent_date: ''
    });

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isNew ? 'Add New Account' : 'Edit Account'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                disabled={!isNew}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={formData.acctName}
                onChange={(e) => setFormData({ ...formData, acctName: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email_address || ''}
                onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Phone</label>
              <input
                type="tel"
                value={formData.mobile_phone || ''}
                onChange={(e) => setFormData({ ...formData, mobile_phone: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requiresPasswordChange"
                    checked={formData.requires_password_change || false}
                    onChange={(e) => setFormData({ ...formData, requires_password_change: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="requiresPasswordChange" className="ml-2 text-sm text-gray-900">
                    Requires Password Change
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="smsConsent"
                    checked={formData.sms_consent || false}
                    onChange={(e) => setFormData({ ...formData, sms_consent: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="smsConsent" className="ml-2 text-sm text-gray-900">
                    SMS Consent
                  </label>
                </div>
              </div>
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
              onClick={() => onSave(formData, isNew)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              {isNew ? 'Add Account' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Account Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Add Account
        </button>
      </div>

      {/* Search Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter Accounts</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="Account Number"
            value={filters.accountNumber}
            onChange={(e) => setFilters({ ...filters, accountNumber: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Company Name"
            value={filters.companyName}
            onChange={(e) => setFilters({ ...filters, companyName: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="City"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="State"
            value={filters.state}
            onChange={(e) => setFilters({ ...filters, state: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={handleSearch}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Search
          </button>
          <button
            onClick={handleClearFilters}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Accounts ({accounts.length} total)
          </h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">Loading accounts...</div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">No accounts found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map((account) => (
                  <tr key={account.accountNumber} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {account.accountNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {account.acctName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {account.city}, {account.state} {account.zip}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{account.email_address}</div>
                      <div className="text-xs text-gray-500">{account.mobile_phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col space-y-1">
                        {account.requires_password_change && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Password Reset Required
                          </span>
                        )}
                        {account.sms_consent && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            SMS Consent
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => handleEditAccount(account)}
                          className="text-blue-600 hover:text-blue-900 text-left"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handlePasswordReset(account.accountNumber)}
                          className="text-orange-600 hover:text-orange-900 text-left"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.accountNumber)}
                          className="text-red-600 hover:text-red-900 text-left"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditModal && selectedAccount && (
        <AccountModal
          account={selectedAccount}
          isNew={false}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveAccount}
        />
      )}

      {showAddModal && (
        <AccountModal
          account={null}
          isNew={true}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveAccount}
        />
      )}
    </div>
  );
};

export default AccountManagementTab;
