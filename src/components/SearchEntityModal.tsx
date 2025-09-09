import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface EntityResult {
  id: string;
  business_name: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

interface SearchEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (accountId: string, businessName: string) => void;
}

const SearchEntityModal: React.FC<SearchEntityModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount
}) => {
  const [accountNumber, setAccountNumber] = useState('');
  const [filters, setFilters] = useState('');
  const [accounts, setAccounts] = useState<EntityResult[]>([]);
  const [prospects, setProspects] = useState<EntityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data for initial display
  const mockAccounts: EntityResult[] = [
    { id: '3895', business_name: 'Al Hemer Music Co', city: 'Orchard Park', state: 'NY', zip: '14127', phone: '7166629533' },
    { id: '208910', business_name: "Alice's Kitchen", city: 'Monterey Park', state: 'CA', zip: '09175', phone: '6268981828' },
    { id: '203489', business_name: 'Aliceville Pawn & Gun', city: 'Aliceville', state: 'AL', zip: '03544', phone: '2053737300' },
    { id: '205871', business_name: 'Alien Alliance Audio', city: 'Springfield', state: 'IL', zip: '06270', phone: '2175284481' },
    { id: '208368', business_name: 'Alien Zone', city: 'Roswell', state: 'NM', zip: '08820', phone: '5756276982' }
  ];

  const mockProspects: EntityResult[] = [
    { id: '206695', business_name: '102 Pawn', city: 'Shawnee', state: 'OK', zip: '07480', phone: '4055463687' },
    { id: '50315', business_name: '105 Pawn', city: 'Montgomery', state: 'TX', zip: '77356', phone: '9365880808' },
    { id: '208884', business_name: '123 Musical Instrument', city: 'El Monte', state: 'CA', zip: '09173', phone: '6262757928' },
    { id: '8335', business_name: '123 Pawn Shop', city: 'Walla Walla', state: 'WA', zip: '99362', phone: '5095297296' },
    { id: '207466', business_name: '12 Keys Music Lessons', city: 'Odessa', state: 'tx', zip: '07976', phone: '4322575862' },
    { id: '207840', business_name: '12th Fret Music', city: 'Boise', state: 'ID', zip: '08370', phone: '2083432320' }
  ];

  useEffect(() => {
    if (isOpen) {
      // Initialize with mock data
      setAccounts(mockAccounts);
      setProspects(mockProspects);
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!accountNumber.trim() && !filters.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let accountsQuery;
      let prospectsQuery;

      // Search accounts query
      if (accountNumber.trim()) {
        accountsQuery = supabase
          .from('v_entity_type_union')
          .select('id, business_name, city, state, zip, phone')
          .eq('type', 'account')
          .eq('id', accountNumber.trim())
          .order('business_name');
      } else {
        accountsQuery = supabase
          .from('v_entity_type_union')
          .select('id, business_name, city, state, zip, phone')
          .eq('type', 'account')
          .order('business_name')
          .limit(50);
      }

      // Add filters if provided
      if (filters.trim()) {
        const filterText = `%${filters.trim()}%`;
        accountsQuery = accountsQuery.or(`business_name.ilike.${filterText},phone.ilike.${filterText}`);
      }

      // Search prospects query  
      prospectsQuery = supabase
        .from('v_entity_type_union')
        .select('id, business_name, city, state, zip, phone')
        .eq('type', 'prospect')
        .order('business_name')
        .limit(50);

      if (filters.trim()) {
        const filterText = `%${filters.trim()}%`;
        prospectsQuery = prospectsQuery.or(`zip.ilike.${filterText},business_name.ilike.${filterText},phone.ilike.${filterText}`);
      }

      // Execute both queries
      const [accountsResult, prospectsResult] = await Promise.all([
        accountsQuery,
        prospectsQuery
      ]);

      if (accountsResult.error) {
        console.error('Accounts search error:', accountsResult.error);
        setAccounts([]);
      } else {
        setAccounts(accountsResult.data || []);
      }

      if (prospectsResult.error) {
        console.error('Prospects search error:', prospectsResult.error);
        setProspects([]);
      } else {
        setProspects(prospectsResult.data || []);
      }

    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
      setAccounts([]);
      setProspects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (entity: EntityResult, type: 'account' | 'prospect') => {
    if (type === 'account') {
      onSelectAccount(entity.id, entity.business_name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Search Entity</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Controls */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            {/* Account Number Input - ~1 inch wide */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">acct num</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-20 px-3 py-2 border border-gray-300 rounded bg-gray-100 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder=""
              />
            </div>

            {/* Filters Input - ~3 inches wide */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">filters</label>
              <input
                type="text"
                value={filters}
                onChange={(e) => setFilters(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-72 px-3 py-2 border border-gray-300 rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder=""
              />
            </div>

            {/* Search Button */}
            <div className="flex flex-col justify-end">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold rounded transition-colors"
              >
                {loading ? 'SEARCHING...' : 'SEARCH'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Accounts Section */}
          <div>
            <h3 className="text-lg font-bold text-red-600 mb-3">Accounts</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">id</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">business_name</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">city</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">state</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">zip</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">phone</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account, index) => (
                    <tr 
                      key={account.id}
                      className={`cursor-pointer hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      onClick={() => handleRowClick(account, 'account')}
                      title="Click to select this account"
                    >
                      <td className="border border-gray-300 px-3 py-2 text-sm">{account.id}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm font-medium">{account.business_name}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{account.city}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{account.state}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{account.zip}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{account.phone}</td>
                    </tr>
                  ))}
                  {accounts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="border border-gray-300 px-3 py-4 text-center text-gray-500 text-sm">
                        No accounts found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Prospects Section */}
          <div>
            <h3 className="text-lg font-bold text-red-600 mb-3">Prospects</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">id</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">business_name</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">city</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">state</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">zip</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">phone</th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((prospect, index) => (
                    <tr 
                      key={prospect.id}
                      className={`cursor-pointer hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      onClick={() => handleRowClick(prospect, 'prospect')}
                      title="Click to select this prospect"
                    >
                      <td className="border border-gray-300 px-3 py-2 text-sm">{prospect.id}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm font-medium">{prospect.business_name}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{prospect.city}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{prospect.state}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{prospect.zip}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{prospect.phone}</td>
                    </tr>
                  ))}
                  {prospects.length === 0 && (
                    <tr>
                      <td colSpan={6} className="border border-gray-300 px-3 py-4 text-center text-gray-500 text-sm">
                        No prospects found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchEntityModal;
