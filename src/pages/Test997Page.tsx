import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ProductMember {
  [key: string]: any; // Dynamic interface for all columns
}

interface EditableCell {
  id: string;
  field: string;
  value: string;
}

interface CellPosition {
  rowIndex: number;
  colIndex: number;
}

const Test997Page: React.FC = () => {
  const { user } = useAuth();
  const [staffData, setStaffData] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditableCell | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ [key: string]: 'saving' | 'saved' | 'error' }>({});
  const [newRow, setNewRow] = useState<{ account_number: string; privs: string }>({
    account_number: '',
    privs: '0'
  });
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Debounce timer for auto-save
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Define editable columns (account_number and privs)
  const editableColumns = ['account_number', 'privs'];

  // Fetch staff data
  const fetchStaffData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, let's try to get the current user session
      const { data: session } = await supabase.auth.getSession();
      console.log('Current session:', session);
      
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }
      
      console.log('Staff data fetched:', data);
      setStaffData(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch staff data';
      setError(`${errorMessage}. Please check the console for more details.`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-save function with debouncing
  const autoSave = useCallback(async (id: number, field: 'account_number' | 'privs', value: string) => {
    const key = `${id}-${field}`;
    setSaveStatus(prev => ({ ...prev, [key]: 'saving' }));

    try {
      const updateData: any = {};
      if (field === 'account_number') {
        updateData.account_number = parseInt(value);
      } else if (field === 'privs') {
        updateData.privs = parseInt(value);
      }

      const { error } = await supabase
        .from('staff')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setSaveStatus(prev => ({ ...prev, [key]: 'saved' }));
      
      // Clear saved status after 2 seconds
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[key];
          return newStatus;
        });
      }, 2000);

      // Update local data
      setStaffData(prev => prev.map(staff => 
        staff.id === id ? { ...staff, [field]: field === 'account_number' ? parseInt(value) : parseInt(value) } : staff
      ));

    } catch (err) {
      setSaveStatus(prev => ({ ...prev, [key]: 'error' }));
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    }
  }, []);

  // Handle cell edit
  const handleCellEdit = (id: number, field: 'account_number' | 'privs', value: string) => {
    setEditingCell({ id, field, value });

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer for auto-save (500ms delay)
    const timer = setTimeout(() => {
      autoSave(id, field, value);
    }, 500);

    setDebounceTimer(timer);
  };

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedCell || isEditing) return;

    const { rowIndex, colIndex } = selectedCell;
    const maxRow = staffData.length - 1;
    const maxCol = editableColumns.length - 1;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          setSelectedCell({ rowIndex: rowIndex - 1, colIndex });
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (rowIndex < maxRow) {
          setSelectedCell({ rowIndex: rowIndex + 1, colIndex });
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (colIndex > 0) {
          setSelectedCell({ rowIndex, colIndex: colIndex - 1 });
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (colIndex < maxCol) {
          setSelectedCell({ rowIndex, colIndex: colIndex + 1 });
        }
        break;
      case 'Enter':
      case 'F2':
        e.preventDefault();
        setIsEditing(true);
        break;
      case 'Escape':
        e.preventDefault();
        setSelectedCell(null);
        setIsEditing(false);
        break;
    }
  }, [selectedCell, isEditing, staffData.length, editableColumns.length]);

  // Handle cell click
  const handleCellClick = (rowIndex: number, colIndex: number) => {
    setSelectedCell({ rowIndex, colIndex });
    setIsEditing(false);
  };

  // Handle cell double click
  const handleCellDoubleClick = (rowIndex: number, colIndex: number) => {
    setSelectedCell({ rowIndex, colIndex });
    setIsEditing(true);
  };

  // Get cell value for editing
  const getCellValue = (staff: StaffMember, colIndex: number) => {
    const field = editableColumns[colIndex] as 'account_number' | 'privs';
    if (editingCell?.id === staff.id && editingCell?.field === field) {
      return editingCell.value;
    }
    return staff[field].toString();
  };

  // Handle adding new staff member
  const handleAddStaff = async () => {
    if (!newRow.account_number.trim()) {
      setError('Account number is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('staff')
        .insert([{
          account_number: parseInt(newRow.account_number),
          privs: parseInt(newRow.privs)
        }])
        .select()
        .single();

      if (error) throw error;

      setStaffData(prev => [...prev, data]);
      setNewRow({ account_number: '', privs: '0' });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add staff member');
    }
  };

  // Handle delete staff member
  const handleDeleteStaff = async (id: number) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStaffData(prev => prev.filter(staff => staff.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete staff member');
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading staff data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Staff Management - Test997</h1>
            <p className="text-sm text-gray-600 mt-1">
              Google Sheets-style editing with auto-save functionality
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Staff Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-r border-gray-200">
                    Account Number
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-r border-gray-200">
                    Privileges
                  </th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-r border-gray-200">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {staffData.map((staff, rowIndex) => (
                  <tr key={staff.id} className={`border-b border-gray-100 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    {editableColumns.map((column, colIndex) => {
                      const field = column as 'account_number' | 'privs';
                      const isSelected = selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === colIndex;
                      const isCurrentlyEditing = isEditing && isSelected;
                      
                      return (
                        <td 
                          key={colIndex}
                          className={`px-1 py-0.5 border-r border-gray-200 relative ${
                            isSelected ? 'ring-1 ring-blue-400 bg-blue-50' : 'hover:bg-gray-100'
                          }`}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                          onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                        >
                          {isCurrentlyEditing ? (
                            <input
                              type="number"
                              value={getCellValue(staff, colIndex)}
                              onChange={(e) => handleCellEdit(staff.id, field, e.target.value)}
                              onBlur={() => setIsEditing(false)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Tab') {
                                  setIsEditing(false);
                                  e.preventDefault();
                                }
                                if (e.key === 'Escape') {
                                  setIsEditing(false);
                                  e.preventDefault();
                                }
                              }}
                              className="w-full h-4 px-1 border-0 outline-none bg-white font-mono text-xs"
                              autoFocus
                            />
                          ) : (
                            <div className="h-4 px-1 flex items-center font-mono text-xs cursor-cell">
                              {staff[field]}
                            </div>
                          )}
                          
                          {saveStatus[`${staff.id}-${field}`] && (
                            <div className="absolute right-0.5 top-0.5">
                              {saveStatus[`${staff.id}-${field}`] === 'saving' && (
                                <div className="animate-spin h-2 w-2 border border-blue-500 border-t-transparent rounded-full"></div>
                              )}
                              {saveStatus[`${staff.id}-${field}`] === 'saved' && (
                                <svg className="h-2 w-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {saveStatus[`${staff.id}-${field}`] === 'error' && (
                                <svg className="h-2 w-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-1 py-0.5 text-xs text-gray-500 border-r border-gray-200 font-mono">
                      {new Date(staff.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                
                {/* Add New Row */}
                <tr className="bg-blue-100 border-t border-blue-300">
                  <td className="px-1 py-0.5">
                    <input
                      type="number"
                      placeholder="Account Number"
                      value={newRow.account_number}
                      onChange={(e) => setNewRow(prev => ({ ...prev, account_number: e.target.value }))}
                      className="w-full h-4 px-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                  <td className="px-1 py-0.5">
                    <input
                      type="number"
                      placeholder="Privileges"
                      value={newRow.privs}
                      onChange={(e) => setNewRow(prev => ({ ...prev, privs: e.target.value }))}
                      className="w-full h-4 px-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                  <td className="px-1 py-0.5 text-center">
                    <button
                      onClick={handleAddStaff}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-0.5 rounded text-xs transition-colors"
                    >
                      Add
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Spreadsheet Navigation & Controls:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h4 className="font-medium mb-1">Mouse Controls:</h4>
              <ul className="space-y-1">
                <li>• Click any cell to select it</li>
                <li>• Double-click to start editing</li>
                <li>• Changes auto-save after 500ms</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">Keyboard Navigation:</h4>
              <ul className="space-y-1">
                <li>• Arrow keys to navigate cells</li>
                <li>• Enter or F2 to start editing</li>
                <li>• Escape to exit selection/editing</li>
                <li>• Tab/Enter to finish editing</li>
              </ul>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs text-blue-600">
              💡 Status indicators: ⟳ saving | ✓ saved | ✗ error
            </p>
          </div>
        </div>

        {/* Current User Info */}
        {user && (
          <div className="mt-4 bg-gray-100 border border-gray-300 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Current User:</h3>
            <p className="text-sm text-gray-600">
              Account: {user.accountNumber} | Name: {user.acctName || 'N/A'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Test997Page;
