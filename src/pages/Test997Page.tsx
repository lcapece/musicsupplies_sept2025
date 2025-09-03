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
  const [productData, setProductData] = useState<ProductMember[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [filteredColumns, setFilteredColumns] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditableCell | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ [key: string]: 'saving' | 'saved' | 'error' }>({});
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Debounce timer for auto-save
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Column mapping with ordinal, field name, and display name
  const columnMapping = [
    { ordinal: 1, fieldName: 'partnumber', displayName: 'Part Number' },
    { ordinal: 2, fieldName: 'description', displayName: 'Short Description' },
    { ordinal: 3, fieldName: 'price', displayName: 'Price' },
    { ordinal: 4, fieldName: 'listprice', displayName: 'MSRP' },
    { ordinal: 5, fieldName: 'map', displayName: 'MAP' },
    { ordinal: 6, fieldName: 'prdmaincat', displayName: 'Category: Main' },
    { ordinal: 7, fieldName: 'prdsubcat', displayName: 'Category: Sub' },
    { ordinal: 8, fieldName: 'upc', displayName: 'UPC' },
    { ordinal: 9, fieldName: 'brand', displayName: 'Brand' },
    { ordinal: 10, fieldName: 'image', displayName: 'Image File' },
    { ordinal: 11, fieldName: 'inv_max', displayName: 'Inv: Max' },
    { ordinal: 12, fieldName: 'inv_min', displayName: 'Inv: Min' },
    { ordinal: 13, fieldName: 'date_created', displayName: 'Created' },
    { ordinal: 14, fieldName: 'date_edited', displayName: 'Edited' },
    { ordinal: 15, fieldName: 'vendor', displayName: 'Vendor' },
    { ordinal: 16, fieldName: 'vendor_part_number', displayName: 'Vendor Part' }
  ];

  // Fetch product data
  const fetchProductData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('pre_products_supabase')
        .select('*')
        .limit(100)
        .order('id', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }
      
      console.log('Product data fetched:', data);
      setProductData(data || []);
      
      // Extract column names from first row
      if (data && data.length > 0) {
        const allCols = Object.keys(data[0]);
        setColumns(allCols);
        
        // Filter columns based on mapping and availability
        const filtered = columnMapping
          .filter(mapping => allCols.includes(mapping.fieldName))
          .sort((a, b) => a.ordinal - b.ordinal)
          .map(mapping => mapping.fieldName);
        
        setFilteredColumns(filtered);
        
        // Initialize column widths
        const initialWidths: { [key: string]: number } = {};
        filtered.forEach(col => {
          initialWidths[col] = 120; // Default width
        });
        setColumnWidths(initialWidths);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch product data';
      setError(`${errorMessage}. Please check the console for more details.`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get display name for a field
  const getDisplayName = useCallback((fieldName: string) => {
    const mapping = columnMapping.find(m => m.fieldName === fieldName);
    return mapping ? mapping.displayName : fieldName;
  }, []);

  // Auto-size columns based on content
  const autoSizeColumns = useCallback(() => {
    const newWidths: { [key: string]: number } = {};
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.font = '12px Poppins, sans-serif'; // Match our font
    
    filteredColumns.forEach(col => {
      const displayName = getDisplayName(col);
      let maxWidth = context.measureText(displayName).width + 20; // Header width + padding
      
      // Check first 50 rows for content width
      const rowsToCheck = Math.min(50, productData.length);
      for (let i = 0; i < rowsToCheck; i++) {
        const value = String(productData[i][col] || '');
        const textWidth = context.measureText(value).width + 20; // Content + padding
        maxWidth = Math.max(maxWidth, textWidth);
      }
      
      // Set minimum and maximum widths
      newWidths[col] = Math.max(80, Math.min(300, maxWidth));
    });
    
    setColumnWidths(newWidths);
  }, [filteredColumns, productData, getDisplayName]);

  // Minimize columns - set width to average of first 50 rows, with header consideration
  const minimizeColumns = useCallback(() => {
    const newWidths: { [key: string]: number } = {};
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.font = '12px Poppins, sans-serif'; // Match our font
    
    filteredColumns.forEach(col => {
      const displayName = getDisplayName(col);
      const headerWidth = context.measureText(displayName).width + 20;
      
      // Calculate average width from first 50 rows
      let totalWidth = 0;
      const rowsToCheck = Math.min(50, productData.length);
      
      for (let i = 0; i < rowsToCheck; i++) {
        const value = String(productData[i][col] || '');
        totalWidth += context.measureText(value).width + 20;
      }
      
      const avgWidth = rowsToCheck > 0 ? totalWidth / rowsToCheck : 80;
      
      // If header is greater than average, set to 10% more than header width
      if (headerWidth > avgWidth) {
        newWidths[col] = Math.max(60, headerWidth * 1.1);
      } else {
        newWidths[col] = Math.max(60, avgWidth);
      }
    });
    
    setColumnWidths(newWidths);
  }, [filteredColumns, productData, getDisplayName]);

  // Auto-save function with debouncing
  const autoSave = useCallback(async (id: string, field: string, value: string) => {
    const key = `${id}-${field}`;
    setSaveStatus(prev => ({ ...prev, [key]: 'saving' }));

    try {
      const updateData: any = {};
      updateData[field] = value;

      const { error } = await supabase
        .from('pre_products_supabase')
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
      setProductData(prev => prev.map(product => 
        product.id === id ? { ...product, [field]: value } : product
      ));

    } catch (err) {
      setSaveStatus(prev => ({ ...prev, [key]: 'error' }));
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    }
  }, []);

  // Handle cell edit
  const handleCellEdit = (id: string, field: string, value: string) => {
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
    const maxRow = productData.length - 1;
    const maxCol = filteredColumns.length - 1;

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
  }, [selectedCell, isEditing, productData.length, filteredColumns.length]);

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

  // Format currency values
  const formatCurrency = (value: any) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Get cell value for editing
  const getCellValue = (product: ProductMember, colIndex: number) => {
    const field = filteredColumns[colIndex];
    if (editingCell?.id === product.id && editingCell?.field === field) {
      return editingCell.value;
    }
    return String(product[field] || '');
  };

  // Get formatted cell value for display
  const getFormattedCellValue = (product: ProductMember, field: string) => {
    const value = product[field];
    const fieldLower = field.toLowerCase();
    if (['price', 'listprice', 'map', 'webmsrp'].includes(fieldLower)) {
      return formatCurrency(value);
    }
    return String(value || '');
  };

  // Load data on component mount
  useEffect(() => {
    fetchProductData();
  }, [fetchProductData]);

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
          <p className="mt-4 text-gray-600">Loading product data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Products Spreadsheet - Test997</h1>
            <p className="text-xs text-gray-600">
              {productData.length} rows × {filteredColumns.length} columns
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={autoSizeColumns}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition-colors"
            >
              Auto-Size Columns
            </button>
            <button
              onClick={minimizeColumns}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition-colors"
            >
              Minimize Columns
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
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

      {/* Spreadsheet Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="border-collapse w-full">
          <thead className="bg-red-100 sticky top-0 z-10">
            <tr>
              {filteredColumns.map((col, colIndex) => (
                <th
                  key={col}
                  className="border border-gray-300 px-1 py-0.5 text-center text-xs font-medium text-red-700 uppercase tracking-wider"
                  style={{ width: columnWidths[col] || 120, minWidth: columnWidths[col] || 120 }}
                >
                  {getDisplayName(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {productData.map((product, rowIndex) => (
              <tr key={product.id} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                {filteredColumns.map((col, colIndex) => {
                  const isSelected = selectedCell?.rowIndex === rowIndex && selectedCell?.colIndex === colIndex;
                  const isCurrentlyEditing = isEditing && isSelected;
                  
                  return (
                    <td 
                      key={col}
                      className={`border border-gray-300 px-1 py-0.5 relative ${
                        isSelected ? 'ring-1 ring-blue-400 bg-blue-50' : 'hover:bg-gray-100'
                      }`}
                      style={{ width: columnWidths[col] || 120, minWidth: columnWidths[col] || 120 }}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                    >
                      {isCurrentlyEditing ? (
                        <input
                          type="text"
                          value={getCellValue(product, colIndex)}
                          onChange={(e) => handleCellEdit(product.id, col, e.target.value)}
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
                          className="w-full h-4 px-1 border-0 outline-none bg-white text-xs"
                          style={{ fontFamily: 'Poppins, sans-serif' }}
                          autoFocus
                        />
                      ) : (
                        <div className={`h-4 px-1 flex items-center text-xs cursor-cell truncate ${
                          ['price', 'listprice', 'map', 'webmsrp'].includes(col.toLowerCase()) ? 'justify-end' : ''
                        }`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {getFormattedCellValue(product, col)}
                        </div>
                      )}
                      
                      {saveStatus[`${product.id}-${col}`] && (
                        <div className="absolute right-0.5 top-0.5">
                          {saveStatus[`${product.id}-${col}`] === 'saving' && (
                            <div className="animate-spin h-2 w-2 border border-blue-500 border-t-transparent rounded-full"></div>
                          )}
                          {saveStatus[`${product.id}-${col}`] === 'saved' && (
                            <svg className="h-2 w-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {saveStatus[`${product.id}-${col}`] === 'error' && (
                            <svg className="h-2 w-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Test997Page;
