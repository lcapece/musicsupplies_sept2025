import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PromoCode } from '../../types';
import { Plus, Filter } from 'lucide-react';

const PromoCodeManagementTab: React.FC = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'upcoming'>('active');

  // Fetch promo codes from the database
  useEffect(() => {
    const fetchPromoCodes = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('promo_codes')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPromoCodes(data || []);
      } catch (err: any) {
        console.error('Error fetching promo codes:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPromoCodes();
  }, []);

  // Filter promo codes based on selected filter
  const filteredPromoCodes = promoCodes.filter((promo) => {
    const now = new Date();
    const startDate = new Date(promo.start_date);
    const endDate = new Date(promo.end_date);

    switch (filter) {
      case 'active':
        return promo.is_active && startDate <= now && endDate >= now;
      case 'expired':
        return endDate < now;
      case 'upcoming':
        return startDate > now;
      default:
        return true;
    }
  });

  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Determine status label and color for a promo code
  const getStatusInfo = (promo: PromoCode) => {
    const now = new Date();
    const startDate = new Date(promo.start_date);
    const endDate = new Date(promo.end_date);
    
    if (!promo.is_active) {
      return { label: 'Inactive', color: 'bg-gray-200 text-gray-800' };
    } else if (startDate > now) {
      return { label: 'Upcoming', color: 'bg-blue-100 text-blue-800' };
    } else if (endDate < now) {
      return { label: 'Expired', color: 'bg-red-100 text-red-800' };
    } else if (promo.max_uses !== null && promo.uses_remaining !== null && promo.uses_remaining <= 0) {
      return { label: 'Depleted', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { label: 'Active', color: 'bg-green-100 text-green-800' };
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Promo Code Management</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter size={18} />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">All Promo Codes</option>
              <option value="active">Active Codes</option>
              <option value="expired">Expired Codes</option>
              <option value="upcoming">Upcoming Codes</option>
            </select>
          </div>
          <button
            onClick={() => alert('Add Promo Code functionality is being implemented')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
          >
            <Plus size={16} className="mr-2" />
            Add New Promo Code
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Range</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPromoCodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    No promo codes found
                  </td>
                </tr>
              ) : (
                filteredPromoCodes.map((promo) => {
                  const statusInfo = getStatusInfo(promo);
                  return (
                    <tr key={promo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{promo.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{promo.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {promo.type === 'percent_off' ? 'Percentage' : 'Fixed Amount'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {promo.type === 'percent_off' ? `${promo.value}%` : `$${promo.value.toFixed(2)}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${promo.min_order_value.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {promo.max_uses === null ? (
                          'Unlimited'
                        ) : (
                          `${promo.uses_remaining || 0}/${promo.max_uses}`
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(promo.start_date)} - {formatDate(promo.end_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PromoCodeManagementTab;
