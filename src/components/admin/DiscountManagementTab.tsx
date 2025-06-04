import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface DateBasedDiscount {
  id: number;
  discount: number;
  message: string;
  start_date: string;
  end_date: string;
  created_at: string;
  is_active: boolean;
}

interface OrderBasedDiscount {
  id: number;
  discount_type: string;
  discount: number;
  max_orders: number;
  created_at: string;
  updated_at: string;
}

type DiscountType = 'date_based' | 'order_based';

const DiscountManagementTab: React.FC = () => {
  const [dateBasedDiscounts, setDateBasedDiscounts] = useState<DateBasedDiscount[]>([]);
  const [orderBasedDiscounts, setOrderBasedDiscounts] = useState<OrderBasedDiscount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<any>(null);
  const [selectedDiscountType, setSelectedDiscountType] = useState<DiscountType>('date_based');
  const [activeTab, setActiveTab] = useState<DiscountType>('date_based');

  useEffect(() => {
    fetchAllDiscounts();
  }, []);

  const fetchAllDiscounts = async () => {
    try {
      setLoading(true);
      
      // Fetch date-based discounts
      const { data: dateDiscounts, error: dateError } = await supabase
        .from('lcmd_discount')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateError) {
        console.error('Error fetching date-based discounts:', dateError);
      } else {
        setDateBasedDiscounts(dateDiscounts || []);
      }

      // Fetch order-based discounts
      const { data: orderDiscounts, error: orderError } = await supabase
        .from('discount_tiers')
        .select('*')
        .eq('discount_type', 'order_based')
        .order('created_at', { ascending: false });

      if (orderError) {
        console.error('Error fetching order-based discounts:', orderError);
      } else {
        setOrderBasedDiscounts(orderDiscounts || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDateBasedDiscount = async (discountData: Partial<DateBasedDiscount>, isNew: boolean = false) => {
    try {
      if (isNew) {
        const { error } = await supabase
          .from('lcmd_discount')
          .insert([discountData]);

        if (error) {
          console.error('Error adding date-based discount:', error);
          alert('Error adding discount');
          return;
        }
      } else {
        const { error } = await supabase
          .from('lcmd_discount')
          .update(discountData)
          .eq('id', discountData.id);

        if (error) {
          console.error('Error updating date-based discount:', error);
          alert('Error updating discount');
          return;
        }
      }

      setShowAddModal(false);
      setShowEditModal(false);
      fetchAllDiscounts();
      alert(isNew ? 'Date-based discount added successfully' : 'Date-based discount updated successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Error saving discount');
    }
  };

  const handleSaveOrderBasedDiscount = async (discountData: Partial<OrderBasedDiscount>, isNew: boolean = false) => {
    try {
      const payload = {
        ...discountData,
        discount_type: 'order_based',
        updated_at: new Date().toISOString()
      };

      if (isNew) {
        const { error } = await supabase
          .from('discount_tiers')
          .insert([payload]);

        if (error) {
          console.error('Error adding order-based discount:', error);
          alert('Error adding discount');
          return;
        }
      } else {
        const { error } = await supabase
          .from('discount_tiers')
          .update(payload)
          .eq('id', discountData.id);

        if (error) {
          console.error('Error updating order-based discount:', error);
          alert('Error updating discount');
          return;
        }
      }

      setShowAddModal(false);
      setShowEditModal(false);
      fetchAllDiscounts();
      alert(isNew ? 'Order-based discount added successfully' : 'Order-based discount updated successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Error saving discount');
    }
  };

  const handleDeleteDateBasedDiscount = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this date-based discount?')) {
      try {
        const { error } = await supabase
          .from('lcmd_discount')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting date-based discount:', error);
          alert('Error deleting discount');
          return;
        }

        fetchAllDiscounts();
        alert('Date-based discount deleted successfully');
      } catch (error) {
        console.error('Error:', error);
        alert('Error deleting discount');
      }
    }
  };

  const handleDeleteOrderBasedDiscount = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this order-based discount?')) {
      try {
        const { error } = await supabase
          .from('discount_tiers')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting order-based discount:', error);
          alert('Error deleting discount');
          return;
        }

        fetchAllDiscounts();
        alert('Order-based discount deleted successfully');
      } catch (error) {
        console.error('Error:', error);
        alert('Error deleting discount');
      }
    }
  };

  const handleToggleActive = async (discount: DateBasedDiscount) => {
    try {
      const { error } = await supabase
        .from('lcmd_discount')
        .update({ is_active: !discount.is_active })
        .eq('id', discount.id);

      if (error) {
        console.error('Error toggling discount status:', error);
        alert('Error updating discount status');
        return;
      }

      fetchAllDiscounts();
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating discount status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDiscountPercentage = (discount: number) => {
    return `${(discount * 100).toFixed(1)}%`;
  };

  const isDiscountActive = (discount: DateBasedDiscount) => {
    if (!discount.is_active) return false;
    const now = new Date();
    const startDate = new Date(discount.start_date);
    const endDate = new Date(discount.end_date);
    return now >= startDate && now <= endDate;
  };

  const getMaxDiscountRate = (type: DiscountType) => {
    if (type === 'date_based') {
      const validDiscounts = dateBasedDiscounts.map(d => d.discount).filter(d => typeof d === 'number' && d > 0);
      return validDiscounts.length > 0 ? Math.max(...validDiscounts) : null;
    } else {
      const validDiscounts = orderBasedDiscounts.map(d => d.discount).filter(d => typeof d === 'number' && d > 0);
      return validDiscounts.length > 0 ? Math.max(...validDiscounts) : null;
    }
  };

  // Modal components
  const DateBasedDiscountModal: React.FC<{
    discount: DateBasedDiscount | null;
    isNew: boolean;
    onClose: () => void;
    onSave: (discount: Partial<DateBasedDiscount>, isNew: boolean) => void;
  }> = ({ discount, isNew, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<DateBasedDiscount>>(discount || {
      discount: 0,
      message: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_active: true
    });

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isNew ? 'Add New Date-Based Discount' : 'Edit Date-Based Discount'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Rate (decimal, e.g., 0.05 for 5%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.discount || ''}
                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={formData.message || ''}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={3}
                placeholder="Enter promotional message..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.is_active || false}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-900">
                Active
              </label>
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
              {isNew ? 'Add Discount' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const OrderBasedDiscountModal: React.FC<{
    discount: OrderBasedDiscount | null;
    isNew: boolean;
    onClose: () => void;
    onSave: (discount: Partial<OrderBasedDiscount>, isNew: boolean) => void;
  }> = ({ discount, isNew, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<OrderBasedDiscount>>(discount || {
      discount: 0.05,
      max_orders: 3
    });

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isNew ? 'Add New Order-Based Discount' : 'Edit Order-Based Discount'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Rate (decimal, e.g., 0.05 for 5%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.discount || ''}
                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Orders (how many times each customer can use this)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.max_orders || ''}
                onChange={(e) => setFormData({ ...formData, max_orders: parseInt(e.target.value) || 1 })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Order-Based Discount Info:</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Applies to customers' first X orders automatically</li>
                <li>• No date restrictions - always available for new customers</li>
                <li>• Tracks usage per customer to prevent abuse</li>
                <li>• Uses legacy part numbers: WEB-DISCOUNT-5-ORDER1, ORDER2, ORDER3</li>
              </ul>
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
              {isNew ? 'Add Discount' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Discount Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setSelectedDiscountType('date_based');
              setShowAddModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Add Date-Based Discount
          </button>
          <button
            onClick={() => {
              setSelectedDiscountType('order_based');
              setShowAddModal(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Add Order-Based Discount
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('date_based')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'date_based'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Date-Based Discounts ({dateBasedDiscounts.length})
          </button>
          <button
            onClick={() => setActiveTab('order_based')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'order_based'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Order-Based Discounts ({orderBasedDiscounts.length})
          </button>
        </nav>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Max {activeTab === 'date_based' ? 'Date-Based' : 'Order-Based'} Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {getMaxDiscountRate(activeTab) ? formatDiscountPercentage(getMaxDiscountRate(activeTab)!) : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total {activeTab === 'date_based' ? 'Date-Based' : 'Order-Based'}</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeTab === 'date_based' ? dateBasedDiscounts.length : orderBasedDiscounts.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {activeTab === 'date_based' ? 'Currently Active' : 'Always Available'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {activeTab === 'date_based' 
                  ? dateBasedDiscounts.filter(d => isDiscountActive(d)).length
                  : orderBasedDiscounts.length
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'date_based' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Date-Based Discounts (Promotional)</h3>
            <p className="text-sm text-gray-600 mt-1">Time-limited promotional discounts with start and end dates</p>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-600">Loading discounts...</div>
            </div>
          ) : dateBasedDiscounts.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-600">No date-based discounts found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discount Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Date
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
                  {dateBasedDiscounts.map((discount) => (
                    <tr key={discount.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatDiscountPercentage(discount.discount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {discount.message}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(discount.start_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(discount.end_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            discount.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {discount.is_active ? 'Enabled' : 'Disabled'}
                          </span>
                          {isDiscountActive(discount) && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              Currently Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => {
                              setSelectedDiscount(discount);
                              setSelectedDiscountType('date_based');
                              setShowEditModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 text-left"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(discount)}
                            className="text-orange-600 hover:text-orange-900 text-left"
                          >
                            {discount.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDeleteDateBasedDiscount(discount.id)}
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
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Order-Based Discounts (Customer Incentives)</h3>
            <p className="text-sm text-gray-600 mt-1">Incentives for new customers based on number of orders placed</p>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-600">Loading discounts...</div>
            </div>
          ) : orderBasedDiscounts.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-600">No order-based discounts found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discount Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Max Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Part Numbers Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
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
                  {orderBasedDiscounts.map((discount) => (
                    <tr key={discount.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatDiscountPercentage(discount.discount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {discount.max_orders}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="space-y-1">
                          {Array.from({ length: discount.max_orders }, (_, i) => (
                            <div key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              WEB-DISCOUNT-5-ORDER{i + 1}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(discount.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Always Active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => {
                              setSelectedDiscount(discount);
                              setSelectedDiscountType('order_based');
                              setShowEditModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 text-left"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteOrderBasedDiscount(discount.id)}
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
      )}

      {/* Modals */}
      {showAddModal && selectedDiscountType === 'date_based' && (
        <DateBasedDiscountModal
          discount={null}
          isNew={true}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveDateBasedDiscount}
        />
      )}

      {showAddModal && selectedDiscountType === 'order_based' && (
        <OrderBasedDiscountModal
          discount={null}
          isNew={true}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveOrderBasedDiscount}
        />
      )}

      {showEditModal && selectedDiscountType === 'date_based' && selectedDiscount && (
        <DateBasedDiscountModal
          discount={selectedDiscount}
          isNew={false}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveDateBasedDiscount}
        />
      )}

      {showEditModal && selectedDiscountType === 'order_based' && selectedDiscount && (
        <OrderBasedDiscountModal
          discount={selectedDiscount}
          isNew={false}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveOrderBasedDiscount}
        />
      )}
    </div>
  );
};

export default DiscountManagementTab;
