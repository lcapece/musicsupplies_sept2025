import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PromoCode } from '../../types';
import { Plus, Filter, Edit, Trash2 } from 'lucide-react';
import AddPromoCodeModal from './AddPromoCodeModal';
import EditPromoCodeModal from './EditPromoCodeModal';

const PromoCodeManagementTab: React.FC = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'upcoming'>('active');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPromoCode, setSelectedPromoCode] = useState<PromoCode | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    promoCode: PromoCode | null;
  }>({ isOpen: false, promoCode: null });

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

  // Handle edit promo code
  const handleEditPromoCode = (promo: PromoCode) => {
    setSelectedPromoCode(promo);
    setIsEditModalOpen(true);
  };

  // Handle delete promo code
  const handleDeletePromoCode = (promo: PromoCode) => {
    console.log('🗑️ TRASH ICON CLICKED - Opening delete confirmation modal');
    console.log('Promo code to delete:', promo);
    setDeleteConfirmation({
      isOpen: true,
      promoCode: promo
    });
  };

  // Confirm delete promo code
  const confirmDelete = async () => {
    console.log('🗑️ DELETE FUNCTION CALLED');
    console.log('Delete confirmation state:', deleteConfirmation);
    
    if (!deleteConfirmation.promoCode) {
      console.error('❌ No promo code selected for deletion');
      return;
    }

    const promoToDelete = deleteConfirmation.promoCode;
    console.log('🎯 Attempting to delete promo code:', {
      id: promoToDelete.id,
      code: promoToDelete.code,
      name: promoToDelete.name
    });

    setLoading(true);
    setError(null);

    try {
      console.log('📡 Making Supabase delete request...');
      
      // Get current user info from localStorage (custom auth system)
      const savedUser = localStorage.getItem('user');
      let currentUser = null;
      if (savedUser) {
        try {
          currentUser = JSON.parse(savedUser);
          console.log('👤 Current user from localStorage:', {
            accountNumber: currentUser.accountNumber,
            acctName: currentUser.acct_name || currentUser.acctName,
            isSpecialAdmin: currentUser.is_special_admin
          });
        } catch (e) {
          console.error('❌ Error parsing user from localStorage:', e);
        }
      } else {
        console.error('❌ No user found in localStorage - not authenticated');
        setError('You must be logged in to delete promo codes');
        return;
      }

      // Check if user is admin (account 999)
      if (!currentUser || currentUser.accountNumber !== '999') {
        console.error('❌ User is not admin account 999:', currentUser?.accountNumber);
        setError('Only admin account 999 can delete promo codes');
        return;
      }

      // Use the admin delete function that bypasses RLS
      console.log('🔐 Calling admin_delete_promo_code function...');
      
      const { data: deleteResult, error: rpcError } = await supabase.rpc('admin_delete_promo_code', {
        p_promo_code_id: promoToDelete.id,
        p_account_number: parseInt(currentUser.accountNumber)
      });

      console.log('📊 Admin delete function result:', deleteResult);

      if (rpcError) {
        console.error('❌ RPC error calling admin_delete_promo_code:', rpcError);
        throw new Error(`Database function error: ${rpcError.message}`);
      }

      if (!deleteResult || !deleteResult.success) {
        const errorMessage = deleteResult?.error || 'Unknown error occurred';
        console.error('❌ Admin delete function failed:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('✅ Delete request completed successfully');
      console.log('🔄 Refreshing promo codes list...');

      // Refresh the promo codes list
      const { data, error: fetchError } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Error refreshing list:', fetchError);
        throw fetchError;
      }

      console.log('📋 Refreshed promo codes:', data?.length || 0, 'codes found');
      setPromoCodes(data || []);

      console.log('🎉 Closing delete confirmation modal');
      setDeleteConfirmation({ isOpen: false, promoCode: null });
      
      console.log('✅ DELETE OPERATION COMPLETED SUCCESSFULLY');
    } catch (err: any) {
      console.error('💥 ERROR in confirmDelete:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        stack: err.stack
      });
      setError(err.message || 'Failed to delete promo code');
    } finally {
      setLoading(false);
      console.log('🏁 confirmDelete function finished');
    }
  };

  // Refresh promo codes list
  const refreshPromoCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPromoCodes(data || []);
    } catch (err: any) {
      console.error('Error refreshing promo codes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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
            onClick={async () => {
              console.log('🔍 DEBUG: Checking authentication status...');
              const { data: { user }, error } = await supabase.auth.getUser();
              console.log('👤 Current user:', user);
              console.log('❌ Auth error:', error);
              
              if (user) {
                // Check account mapping
                const { data: accounts, error: accountError } = await supabase
                  .from('accounts_lcmd')
                  .select('account_number, acct_name, user_id')
                  .eq('user_id', user.id);
                console.log('🏢 User accounts:', accounts);
                console.log('❌ Account error:', accountError);
              }
            }}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-md text-sm font-medium"
          >
            Debug Auth
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Per-Account Limit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Range</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPromoCodes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-sm text-gray-500">
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
                        {!promo.uses_per_account_tracking ? (
                          'Not Tracked'
                        ) : promo.max_uses_per_account === null ? (
                          'Unlimited'
                        ) : (
                          `${promo.max_uses_per_account} per account`
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditPromoCode(promo)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit promo code"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeletePromoCode(promo)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete promo code"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      
      <AddPromoCodeModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refreshPromoCodes}
      />

      <EditPromoCodeModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPromoCode(null);
        }}
        promoCode={selectedPromoCode}
        onSuccess={refreshPromoCodes}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Delete Promo Code</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the promo code "{deleteConfirmation.promoCode?.code}"? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  console.log('❌ CANCEL BUTTON CLICKED - Closing delete modal');
                  setDeleteConfirmation({ isOpen: false, promoCode: null });
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log('🔴 DELETE BUTTON CLICKED - Calling confirmDelete function');
                  confirmDelete();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoCodeManagementTab;
