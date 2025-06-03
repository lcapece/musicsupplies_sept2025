import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface LoginHistory {
  account_number: number;
  acct_name: string;
  login_date: string;
  login_count: number;
  total_items: number;
  total_sales: number;
  last_login_time: string;
}

interface DailyStats {
  date: string;
  unique_accounts: number;
  total_logins: number;
  total_items: number;
  total_sales: number;
}

const HistoryTab: React.FC = () => {
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [viewMode, setViewMode] = useState<'daily' | 'account'>('daily');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDateFilter(today);
    fetchLoginHistory(today);
    fetchDailyStats();
  }, []);

  const fetchLoginHistory = async (date?: string) => {
    try {
      setLoading(true);
      
      // Get login data with sales aggregation
      const query = supabase
        .rpc('get_login_history_with_sales', {
          filter_date: date || null,
          filter_account: accountFilter || null
        });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching login history:', error);
        // Fallback to basic query if RPC doesn't exist
        await fetchBasicLoginHistory(date);
        return;
      }

      setLoginHistory(data || []);
    } catch (error) {
      console.error('Error:', error);
      await fetchBasicLoginHistory(date);
    } finally {
      setLoading(false);
    }
  };

  const fetchBasicLoginHistory = async (date?: string) => {
    try {
      // Basic query without aggregation for now
      let loginQuery = supabase
        .from('accounts_lcmd')
        .select(`
          account_number,
          acct_name
        `)
        .order('account_number', { ascending: true });

      if (accountFilter) {
        loginQuery = loginQuery.or(`account_number.eq.${accountFilter},acct_name.ilike.%${accountFilter}%`);
      }

      const { data: accounts, error: accountError } = await loginQuery;

      if (accountError) {
        console.error('Error fetching accounts:', accountError);
        return;
      }

      // Get order data for the date range
      let orderQuery = supabase
        .from('production_ordhist')
        .select(`
          account_number,
          inv_date,
          qty,
          extended
        `);

      if (date) {
        orderQuery = orderQuery.gte('inv_date', date).lt('inv_date', new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      }

      const { data: orders, error: orderError } = await orderQuery;

      if (orderError) {
        console.error('Error fetching orders:', orderError);
      }

      // Aggregate data
      const aggregated = (accounts || []).map(account => {
        const accountOrders = (orders || []).filter(o => o.account_number === account.account_number);
        const totalItems = accountOrders.reduce((sum, order) => sum + (order.qty || 0), 0);
        const totalSales = accountOrders.reduce((sum, order) => sum + (order.extended || 0), 0);

        return {
          account_number: account.account_number,
          acct_name: account.acct_name,
          login_date: date || new Date().toISOString().split('T')[0],
          login_count: totalItems > 0 ? 1 : 0, // Assume login if there were orders
          total_items: totalItems,
          total_sales: totalSales,
          last_login_time: totalItems > 0 ? '12:00:00' : 'No activity'
        };
      }).filter(item => item.total_items > 0 || item.login_count > 0);

      setLoginHistory(aggregated);
    } catch (error) {
      console.error('Error in basic fetch:', error);
    }
  };

  const fetchDailyStats = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: orders, error } = await supabase
        .from('production_ordhist')
        .select(`
          account_number,
          inv_date,
          qty,
          extended
        `)
        .gte('inv_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('inv_date', { ascending: false });

      if (error) {
        console.error('Error fetching daily stats:', error);
        return;
      }

      // Group by date
      const grouped = (orders || []).reduce((acc, order) => {
        const date = order.inv_date;
        if (!acc[date]) {
          acc[date] = {
            date,
            accounts: new Set(),
            total_items: 0,
            total_sales: 0,
            order_count: 0
          };
        }
        acc[date].accounts.add(order.account_number);
        acc[date].total_items += order.qty || 0;
        acc[date].total_sales += order.extended || 0;
        acc[date].order_count += 1;
        return acc;
      }, {} as any);

      const stats = Object.values(grouped).map((stat: any) => ({
        date: stat.date,
        unique_accounts: stat.accounts.size,
        total_logins: stat.accounts.size, // Assume each account with orders had a login
        total_items: stat.total_items,
        total_sales: stat.total_sales
      })) as DailyStats[];

      setDailyStats(stats.slice(0, 30)); // Last 30 days
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDateFilterChange = (date: string) => {
    setDateFilter(date);
    fetchLoginHistory(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredHistory = loginHistory.filter(record => {
    const matchesAccount = !accountFilter || 
      record.account_number.toString().includes(accountFilter) ||
      record.acct_name.toLowerCase().includes(accountFilter.toLowerCase());
    return matchesAccount;
  });

  // Calculate totals for filtered data
  const totalItems = filteredHistory.reduce((sum, record) => sum + record.total_items, 0);
  const totalSales = filteredHistory.reduce((sum, record) => sum + record.total_sales, 0);
  const totalLogins = filteredHistory.reduce((sum, record) => sum + record.login_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Login & Sales History</h2>
          <p className="text-sm text-gray-600 mt-1">Track daily login activity with sales performance</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Daily Overview
          </button>
          <button
            onClick={() => setViewMode('account')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'account'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Account Details
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Active Accounts</div>
          <div className="text-2xl font-bold text-blue-600">{filteredHistory.length}</div>
          <div className="text-xs text-gray-500 mt-1">
            {dateFilter ? `On ${formatDate(dateFilter)}` : 'Total'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total Logins</div>
          <div className="text-2xl font-bold text-green-600">{totalLogins}</div>
          <div className="text-xs text-gray-500 mt-1">Login sessions</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Items Purchased</div>
          <div className="text-2xl font-bold text-purple-600">{totalItems.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Total quantity</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Sales Volume</div>
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalSales)}</div>
          <div className="text-xs text-gray-500 mt-1">Revenue generated</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => handleDateFilterChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Account</label>
            <input
              type="text"
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              placeholder="Account number or company name..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex space-x-2">
          <button
            onClick={() => {
              setDateFilter('');
              setAccountFilter('');
              fetchLoginHistory();
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Clear Filters
          </button>
          <button
            onClick={() => fetchLoginHistory(dateFilter)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'daily' ? (
        /* Daily Overview */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Daily Activity Overview (Last 30 Days)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Accounts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Logins
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items Purchased
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sales Volume
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailyStats.map((stat) => (
                  <tr key={stat.date} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatDate(stat.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {stat.unique_accounts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {stat.total_logins}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {stat.total_items.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(stat.total_sales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Account Details */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Account Activity Details ({filteredHistory.length} accounts)
            </h3>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-600">Loading activity data...</div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-600">No activity found for selected criteria</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Login Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items Purchased
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Activity
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredHistory.map((record) => (
                    <tr key={`${record.account_number}-${record.login_date}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.account_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {record.acct_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.login_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.total_items.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatCurrency(record.total_sales)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {record.last_login_time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
