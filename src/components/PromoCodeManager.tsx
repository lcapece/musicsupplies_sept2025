import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PromoCode } from '../types';

const TEMPLATES = [
  { id: 'spend_get_free', name: 'Spend $X Get Y Part Numbers for Free' },
  { id: 'spend_get_dollar_off', name: 'Spend $X Get $Y Off Total Order' },
  { id: 'spend_get_model_free', name: 'Spend $X Get Free Y Model Number' },
  { id: 'buy_get_free', name: 'Buy Model X Get Y Units of Part Z for Free' },
  { id: 'buy_units_get_units_free', name: 'Buy X Units of Part Y Get Z Units of Part W for Free' },
];

const PromoCodeManager: React.FC = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PromoCode>>({
    is_active: false,
    allow_concurrent: false,
    type: 'dollars_off',
  });
  const [templateConfig, setTemplateConfig] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPromoCodes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (promoError) throw promoError;
      setPromoCodes(data || []);
    } catch (err) {
      console.error('Error fetching promo codes:', err);
      setError('Failed to fetch promo codes. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromoCodes();
  }, [fetchPromoCodes]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setFormData(prev => ({ ...prev, template: templateId }));
    // Reset template config when template changes
    setTemplateConfig({});
  };

  const handleTemplateConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTemplateConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const dataToSave = {
        ...formData,
        template_config: templateConfig
      };

      if (isEditing) {
        const { error: updateError } = await supabase
          .from('promo_codes')
          .update(dataToSave)
          .eq('id', isEditing);

        if (updateError) throw updateError;
        setIsEditing(null);
      } else {
        const { error: insertError } = await supabase
          .from('promo_codes')
          .insert([dataToSave]);

        if (insertError) throw insertError;
        setIsCreating(false);
      }

      setFormData({ is_active: false, allow_concurrent: false, type: 'dollars_off' });
      setTemplateConfig({});
      fetchPromoCodes();
    } catch (err) {
      console.error('Error saving promo code:', err);
      setError('Failed to save promo code. Please check the console for details.');
    }
  };

  const handleEdit = (promo: PromoCode) => {
    setIsEditing(promo.id);
    setFormData(promo);
    setTemplateConfig(promo.template_config || {});
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    try {
      const { error: deleteError } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      fetchPromoCodes();
    } catch (err) {
      console.error('Error deleting promo code:', err);
      setError('Failed to delete promo code. Please check the console for details.');
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(null);
    setFormData({ is_active: false, allow_concurrent: false, type: 'dollars_off' });
    setTemplateConfig({});
  };

  const filteredPromoCodes = promoCodes.filter(promo => 
    promo.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    promo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderTemplateConfigFields = () => {
    if (!formData.template) return null;

    switch (formData.template) {
      case 'spend_get_free':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Minimum Spend ($)</label>
              <input
                type="number"
                name="min_spend"
                value={templateConfig.min_spend || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Free Part Numbers (comma separated)</label>
              <input
                type="text"
                name="free_parts"
                value={templateConfig.free_parts || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                placeholder="e.g., PART1, PART2"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Quantity per Part</label>
              <input
                type="number"
                name="quantity_per_part"
                value={templateConfig.quantity_per_part || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
          </>
        );
      case 'spend_get_dollar_off':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Minimum Spend ($)</label>
              <input
                type="number"
                name="min_spend"
                value={templateConfig.min_spend || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Discount Amount ($)</label>
              <input
                type="number"
                name="discount_amount"
                value={templateConfig.discount_amount || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
          </>
        );
      case 'spend_get_model_free':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Minimum Spend ($)</label>
              <input
                type="number"
                name="min_spend"
                value={templateConfig.min_spend || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Free Model Number</label>
              <input
                type="text"
                name="free_model"
                value={templateConfig.free_model || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
          </>
        );
      case 'buy_get_free':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Required Model Number to Buy</label>
              <input
                type="text"
                name="required_model"
                value={templateConfig.required_model || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Free Part Number</label>
              <input
                type="text"
                name="free_part"
                value={templateConfig.free_part || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Free Units</label>
              <input
                type="number"
                name="free_units"
                value={templateConfig.free_units || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
          </>
        );
      case 'buy_units_get_units_free':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Required Part Number to Buy</label>
              <input
                type="text"
                name="required_part"
                value={templateConfig.required_part || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Required Units to Buy</label>
              <input
                type="number"
                name="required_units"
                value={templateConfig.required_units || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Free Part Number</label>
              <input
                type="text"
                name="free_part"
                value={templateConfig.free_part || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Free Units</label>
              <input
                type="number"
                name="free_units"
                value={templateConfig.free_units || ''}
                onChange={handleTemplateConfigChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading promo codes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-medium text-gray-800">Promo Code Management</h2>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded text-sm transition-colors"
            >
              + New Promo Code
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search promo codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex-shrink-0">
          <div className="flex items-center">
            <svg className="h-4 w-4 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {(isCreating || isEditing) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">{isEditing ? 'Edit Promo Code' : 'Create New Promo Code'}</h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
                onClick={handleCancel}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4 col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Promo Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Promo Code</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Legacy Code (Model Number)</label>
                  <input
                    type="text"
                    name="legacy_code"
                    value={formData.legacy_code || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Discount Type</label>
                  <select
                    name="type"
                    value={formData.type || 'dollars_off'}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  >
                    <option value="dollars_off">Dollars Off</option>
                    <option value="percent_off">Percent Off</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Discount Value</label>
                  <input
                    type="number"
                    name="value"
                    step="0.01"
                    value={formData.value || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Minimum Order Value ($)</label>
                  <input
                    type="number"
                    name="min_order_value"
                    step="0.01"
                    value={formData.min_order_value || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Max Uses per Account</label>
                  <input
                    type="number"
                    name="max_uses_per_account"
                    value={formData.max_uses_per_account || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Total Max Activations</label>
                  <input
                    type="number"
                    name="max_uses"
                    value={formData.max_uses || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </div>
                <div className="mb-4 col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Template</label>
                  <select
                    name="template"
                    value={formData.template || ''}
                    onChange={handleTemplateChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  >
                    <option value="">Select a template...</option>
                    {TEMPLATES.map(template => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4 col-span-1 md:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={formData.is_active || false}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm font-medium text-gray-700">Active</label>
                  </div>
                </div>
                <div className="mb-4 col-span-1 md:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allow_concurrent"
                      name="allow_concurrent"
                      checked={formData.allow_concurrent || false}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allow_concurrent" className="ml-2 block text-sm font-medium text-gray-700">Allow Concurrent Use with Other Promos</label>
                  </div>
                </div>
                <div className="mb-4 col-span-1 md:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="uses_per_account_tracking"
                      name="uses_per_account_tracking"
                      checked={formData.uses_per_account_tracking || false}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="uses_per_account_tracking" className="ml-2 block text-sm font-medium text-gray-700">Track Uses per Account</label>
                  </div>
                </div>
                {formData.template && (
                  <div className="mb-4 col-span-1 md:col-span-2">
                    <h4 className="text-md font-medium text-gray-800 mb-2">Template Configuration</h4>
                    {renderTemplateConfigFields()}
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-4 border-t pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isEditing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto flex flex-col">
        {filteredPromoCodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-center">No promo codes found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="border-collapse w-full" style={{ fontSize: '60%', fontFamily: 'Poppins, sans-serif' }}>
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Code</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Val</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Min$</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Max</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Rem</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Used</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Act</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Start</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">End</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Created</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Updated</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Max/Acc</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Trk/Acc</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Legacy</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Conc</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Tmpl</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Config</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPromoCodes.map((promo, index) => {
                    const today = new Date().toISOString().split('T')[0];
                    let rowBgColor = '';
                    if (promo.is_active && promo.start_date <= today && promo.end_date >= today) {
                      rowBgColor = 'bg-green-100'; // GREEN for active
                    } else if (promo.end_date < today) {
                      rowBgColor = 'bg-red-100'; // RED for date-expired
                    } else if (promo.uses_remaining === 0 || (promo.max_uses && promo.uses_remaining !== null && (promo.max_uses - promo.uses_remaining) >= promo.max_uses)) {
                      rowBgColor = 'bg-orange-100'; // AMBER/ORANGE for depleted
                    } else if (promo.start_date > today) {
                      rowBgColor = 'bg-yellow-100'; // YELLOW for upcoming
                    } else {
                      rowBgColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                    }
                    const usageCount = promo.max_uses && promo.uses_remaining !== null ? promo.max_uses - promo.uses_remaining : 'N/A';
                    return (
                      <tr key={promo.id} className={`${rowBgColor} hover:bg-gray-200`}>
                        <td className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-900">{promo.code}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{promo.name}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{promo.type === 'percent_off' ? '%' : '$'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{promo.value}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{promo.min_order_value}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{promo.max_uses || '∞'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{promo.uses_remaining !== null ? promo.uses_remaining : '∞'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{usageCount}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">
                          {promo.is_active ? (
                            <span className="px-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Y</span>
                          ) : (
                            <span className="px-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">N</span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{new Date(promo.start_date).toLocaleDateString()}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{new Date(promo.end_date).toLocaleDateString()}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{promo.created_at ? new Date(promo.created_at).toLocaleDateString() : 'N/A'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{promo.updated_at ? new Date(promo.updated_at).toLocaleDateString() : 'N/A'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{promo.max_uses_per_account || '∞'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{promo.uses_per_account_tracking ? 'Y' : 'N'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{promo.legacy_code || '-'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{promo.allow_concurrent ? 'Y' : 'N'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{promo.template || '-'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">{promo.template_config ? JSON.stringify(promo.template_config).substring(0, 20) + '...' : '-'}</td>
                        <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500">
                          <button
                            onClick={() => handleEdit(promo)}
                            className="text-indigo-600 hover:text-indigo-900 mr-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(promo.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Del
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-white border-t border-gray-200 px-4 py-2 flex-shrink-0 text-sm text-gray-700">
              <p>🟢 Active | 🔴 Expired | 🟡 Upcoming | 🟠 Depleted</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PromoCodeManager;
