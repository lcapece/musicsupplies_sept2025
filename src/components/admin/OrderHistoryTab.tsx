import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Order {
  invoice: number;
  account_number: number;
  acct_name: string;
  inv_date: string;
  salesman: string;
  total: number;
  line_count: number;
}

interface OrderLine {
  id: number;
  invoice: number;
  account_number: number;
  part_number: string;
  description: string;
  qty: number;
  price: number;
  extended: number;
}

const OrderHistoryTab: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('production_ordhist')
        .select(`
          invoice,
          account_number,
          acct_name,
          inv_date,
          salesman,
          total,
          line_count
        `)
        .gt('invoice', 750000)
        .order('invoice', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderLines = async (invoice: number) => {
    try {
      const { data, error } = await supabase
        .from('production_ordhist')
        .select(`
          id,
          invoice,
          account_number,
          part_number,
          description,
          qty,
          price,
          extended
        `)
        .eq('invoice', invoice)
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching order lines:', error);
        return;
      }

      setOrderLines(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleOrderClick = (invoice: number) => {
    if (selectedOrder === invoice) {
      setSelectedOrder(null);
      setOrderLines([]);
    } else {
      setSelectedOrder(invoice);
      fetchOrderLines(invoice);
    }
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.invoice.toString().includes(searchTerm) ||
      order.acct_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.account_number.toString().includes(searchTerm);
    
    const matchesDate = !dateFilter || order.inv_date.includes(dateFilter);
    
    const matchesAccount = !accountFilter || 
      order.account_number.toString().includes(accountFilter);

    return matchesSearch && matchesDate && matchesAccount;
  });

  const totalOrderValue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const averageOrderValue = filteredOrders.length > 0 ? totalOrderValue / filteredOrders.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
          <p className="text-sm text-gray-600 mt-1">Orders with invoice numbers greater than 750,000</p>
        </div>
        <button
          onClick={fetchOrders}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Refresh Orders
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total Orders</div>
          <div className="text-2xl font-bold text-gray-900">{filteredOrders.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total Value</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalOrderValue)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Average Order</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(averageOrderValue)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Unique Accounts</div>
          <div className="text-2xl font-bold text-purple-600">
            {new Set(filteredOrders.map(o => o.account_number)).size}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search (Invoice, Account, Company)
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search orders..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Filter</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input
              type="text"
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              placeholder="Filter by account..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex space-x-2">
          <button
            onClick={() => {
              setSearchTerm('');
              setDateFilter('');
              setAccountFilter('');
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Order List ({filteredOrders.length} orders)
          </h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">Loading orders...</div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">No orders found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salesman
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lines
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <React.Fragment key={order.invoice}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => handleOrderClick(order.invoice)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {order.invoice}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.account_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {order.acct_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(order.inv_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.salesman}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.line_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-blue-600 hover:text-blue-900">
                          {selectedOrder === order.invoice ? 'Hide Details' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                    {selectedOrder === order.invoice && (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">
                              Order Lines for Invoice {order.invoice}
                            </h4>
                            {orderLines.length === 0 ? (
                              <div className="text-sm text-gray-600">Loading order details...</div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left py-2 text-gray-600">Part Number</th>
                                      <th className="text-left py-2 text-gray-600">Description</th>
                                      <th className="text-right py-2 text-gray-600">Qty</th>
                                      <th className="text-right py-2 text-gray-600">Price</th>
                                      <th className="text-right py-2 text-gray-600">Extended</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {orderLines.map((line) => (
                                      <tr key={line.id} className="border-b border-gray-100">
                                        <td className="py-2 text-gray-900">{line.part_number}</td>
                                        <td className="py-2 text-gray-600 max-w-xs truncate">
                                          {line.description}
                                        </td>
                                        <td className="py-2 text-right text-gray-900">{line.qty}</td>
                                        <td className="py-2 text-right text-gray-900">
                                          {formatCurrency(line.price)}
                                        </td>
                                        <td className="py-2 text-right font-medium text-green-600">
                                          {formatCurrency(line.extended)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistoryTab;
