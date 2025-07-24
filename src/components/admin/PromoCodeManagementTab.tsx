import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  name: string;
  type: 'percent_off' | 'dollars_off';
  value: number;
  min_order_value: number;
  max_uses: number | null;
  uses_remaining: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  uses_per_account_tracking: boolean;
  max_uses_per_account: number | null;
  created_at: string;
  updated_at: string;
}

interface PromoCodeStats {
  promo_code: string;
  promo_name: string;
  total_uses: number;
  unique_accounts: number;
  total_discount_given: number;
  avg_order_value: number;
  max_uses_per_account: number | null;
  uses_remaining: number | null;
  is_single_use: boolean;
}

interface AccountUsage {
  account_number: string;
  times_used: number;
  first_used: string;
  last_used: string;
  total_discount: number;
}

const PromoCodeManagementTab: React.FC = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [promoStats, setPromoStats] = useState<PromoCodeStats[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<string>('');
  const [accountUsage, setAccountUsage] = useState<AccountUsage[]>([]);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);
  const [testCode, setTestCode] = useState('');
  const [testAccount, setTestAccount] = useState('');
  const [testOrderValue, setTestOrderValue] = useState('100');

  useEffect(() => {
    fetchPromoCodes();
    fetchPromoStats();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
    }
  };

  const fetchPromoStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_promo_code_usage_stats');
      if (error) throw error;
      setPromoStats(data || []);
    } catch (error) {
      console.error('Error fetching promo stats:', error);
    }
  };

  const fetchAccountUsage = async (code: string) => {
    if (!code) return;
    
    try {
      const { data, error } = await supabase.rpc('get_promo_code_usage_by_accounts', {
        p_code: code
      });
      if (error) throw error;
      setAccountUsage(data || []);
    } catch (error) {
      console.error('Error fetching account usage:', error);
    }
  };

  const testPromoCode = async () => {
    if (!testCode || !testAccount || !testOrderValue) {
      setTestResult({ success: false, message: 'Please fill all test fields' });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('check_promo_code_validity', {
        p_code: testCode,
        p_account_number: testAccount,
        p_order_value: parseFloat(testOrderValue)
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      
      if (result.is_valid) {
        setTestResult({ 
          success: true, 
          message: `Valid! ${result.message}. Discount: $${result.discount_amount}` 
        });
      } else {
        setTestResult({ 
          success: false, 
          message: result.message || 'Invalid promo code' 
        });
      }
    } catch (error) {
      console.error('Error testing promo code:', error);
      setTestResult({ success: false, message: 'Error testing promo code' });
    }
  };

  const togglePromoCode = async (promo: PromoCode) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !promo.is_active })
        .eq('id', promo.id);

      if (error) throw error;
      
      fetchPromoCodes();
      fetchPromoStats();
    } catch (error) {
      console.error('Error toggling promo code:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getPromoTypeDisplay = (type: string, value: number) => {
    return type === 'percent_off' ? `${value}%` : `$${value}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Promo Code Management</h2>
          <p className="text-sm text-gray-600 mt-1">Monitor and manage promotional codes</p>
        </div>
        <button
          onClick={() => {
            fetchPromoCodes();
            fetchPromoStats();
          }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </button>
      </div>

      {/* Promo Code Testing Tool */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Promo Code Validation</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Promo Code</label>
            <input
              type="text"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value.toUpperCase())}
              placeholder="SAVE10"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input
              type="text"
              value={testAccount}
              onChange={(e) => setTestAccount(e.target.value)}
              placeholder="123"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Value</label>
            <input
              type="number"
              value={testOrderValue}
              onChange={(e) => setTestOrderValue(e.target.value)}
              placeholder="100.00"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={testPromoCode}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Test Validation
            </button>
          </div>
        </div>
        {testResult && (
          <div className={`mt-4 p-3 rounded-md flex items-center ${
            testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {testResult.success ? <CheckCircle size={20} className="mr-2" /> : <XCircle size={20} className="mr-2" />}
            {testResult.message}
          </div>
        )}
      </div>

      {/* Usage Statistics */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Usage Statistics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unique Accounts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Discount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Single Use?
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promoStats.map((stat) => (
                <tr key={stat.promo_code} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{stat.promo_code}</div>
                    <div className="text-sm text-gray-500">{stat.promo_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {promoCodes.find(p => p.code === stat.promo_code)?.type || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stat.total_uses}
                    {stat.uses_remaining !== null && (
                      <span className="text-gray-500"> ({stat.uses_remaining} left)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stat.unique_accounts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${stat.total_discount_given.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {stat.is_single_use ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <AlertCircle size={12} className="mr-1" />
                        Single Use
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {
                        setSelectedPromo(stat.promo_code);
                        fetchAccountUsage(stat.promo_code);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Usage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Promo Code List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Promo Codes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valid Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Limits
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
              {promoCodes.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{promo.code}</div>
                    <div className="text-sm text-gray-500">{promo.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getPromoTypeDisplay(promo.type, promo.value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${promo.min_order_value.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(promo.start_date)} - {formatDate(promo.end_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {promo.uses_per_account_tracking && promo.max_uses_per_account === 1 ? (
                      <span className="text-red-600 font-medium">Single use only</span>
                    ) : promo.max_uses_per_account ? (
                      <span>{promo.max_uses_per_account} per account</span>
                    ) : (
                      <span className="text-gray-500">Unlimited</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      promo.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {promo.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => togglePromoCode(promo)}
                      className={`${
                        promo.is_active 
                          ? 'text-red-600 hover:text-red-900' 
                          : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {promo.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Usage Modal */}
      {selectedPromo && accountUsage.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Account Usage for {selectedPromo}
            </h3>
            <button
              onClick={() => {
                setSelectedPromo('');
                setAccountUsage([]);
              }}
              className="text-gray-400 hover:text-gray-500"
            >
              <XCircle size={24} />
            </button>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Times Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    First Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Discount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accountUsage.map((usage) => (
                  <tr key={usage.account_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {usage.account_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {usage.times_used}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(usage.first_used)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(usage.last_used)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${usage.total_discount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoCodeManagementTab;
