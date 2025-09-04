import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import PromoCodeManager from '../components/PromoCodeManager';

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

type TabType = 'products' | 'placeholder1' | 'placeholder2';

const Test997Page: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [productData, setProductData] = useState<ProductMember[]>([]);
  const [filteredProductData, setFilteredProductData] = useState<ProductMember[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [filteredColumns, setFilteredColumns] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditableCell | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ [key: string]: 'saving' | 'saved' | 'error' }>({});
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [partNumberFilter, setPartNumberFilter] = useState('');
  const [descriptionFilter1, setDescriptionFilter1] = useState('');
  const [descriptionFilter2, setDescriptionFilter2] = useState('');
  const [descriptionFilterNot, setDescriptionFilterNot] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [vendorOptions, setVendorOptions] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);

  // Debounce timer for auto-save
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Column mapping with ordinal, field name, and display name
  const columnMapping = [
    { ordinal: 1, fieldName: 'partnumber', displayName: 'Part Number' },
    { ordinal: 2, fieldName: 'description', displayName: 'Short Description' },
    { ordinal: 3, fieldName: 'price', displayName: 'Price' },
    { ordinal: 4, fieldName: 'master_carton_qty', displayName: 'MAST CART QTY' },
    { ordinal: 5, fieldName: 'master_carton_price', displayName: 'MAST CART $' },
    { ordinal: 6, fieldName: 'listprice', displayName: 'MSRP' },
    { ordinal: 7, fieldName: 'map', displayName: 'MAP' },
    { ordinal: 8, fieldName: 'upc', displayName: 'UPC' },
    { ordinal: 9, fieldName: 'category', displayName: 'Category' },
    { ordinal: 10, fieldName: 'brand', displayName: 'Brand' },
    { ordinal: 11, fieldName: 'image', displayName: 'Image File' },
    { ordinal: 12, fieldName: 'inv_max', displayName: 'Inv: Max' },
    { ordinal: 13, fieldName: 'inv_min', displayName: 'Inv: Min' },
    { ordinal: 14, fieldName: 'date_created', displayName: 'Created' },
    { ordinal: 15, fieldName: 'date_edited', displayName: 'Edited' },
    { ordinal: 16, fieldName: 'vendor', displayName: 'Vendor' },
    { ordinal: 17, fieldName: 'vendor_part_number', displayName: 'Vendor Part' }
  ];

  // Tab configuration
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'products', label: 'Products', icon: '📦' },
    { id: 'placeholder1', label: 'Promo Codes', icon: '🎟️' },
    { id: 'placeholder2', label: 'PLACEHOLDER2', icon: '⚙️' },
  ];

  // Fetch brand options from keyvals table
  const fetchBrandOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('keyvals')
        .select('val_txt')
        .eq('key_txt', 'BRAND')
        .order('val_txt');

      if (error) {
        console.error('Error fetching brand options:', error);
        return;
      }

      const brands = data?.map(item => item.val_txt) || [];
      setBrandOptions(brands);
      console.log('✅ Brand options loaded:', brands.length, 'brands');
    } catch (err) {
      console.error('Error loading brand options:', err);
    }
  }, []);

  // Fetch vendor options from keyvals table
  const fetchVendorOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('keyvals')
        .select('val_txt')
        .ilike('key_txt', 'VENDORS')
        .order('val_txt');

      if (error) {
        console.error('Error fetching vendor options:', error);
        return;
      }

      const vendors = data?.map(item => item.val_txt) || [];
      setVendorOptions(vendors);
      console.log('✅ Vendor options loaded:', vendors.length, 'vendors');
    } catch (err) {
      console.error('Error loading vendor options:', err);
    }
  }, []);

  // Fetch product data using RPC to bypass PostgREST 1000-row limit
  const fetchProductData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching all products using RPC function...');

      // Use RPC function to get ALL records without PostgREST limits
      const { data, error } = await supabase.rpc('get_all_products');

      if (error) {
        console.error('Supabase RPC error:', error);
        throw new Error(`RPC error: ${error.message} (Code: ${error.code})`);
      }
      
      console.log('✅ Product data fetched via RPC:', data?.length, 'records');
      
      // No need for count comparison since RPC bypasses all PostgREST limits
      if (data && data.length > 1000) {
        console.log('🎉 Successfully bypassed 1000-row limit! Loaded', data.length, 'records');
      }
      setProductData(data || []);
      setFilteredProductData(data || []);
      
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

  // Filter products with all 4 filters (part number + 3 description filters)
  const filterProducts = useCallback(() => {
    let filtered = productData;

    // Apply part number filter
    if (partNumberFilter.trim()) {
      filtered = filtered.filter(product => {
        const partNumber = String(product.partnumber || '').toLowerCase();
        const searchTerm = partNumberFilter.toLowerCase();
        return partNumber.includes(searchTerm);
      });
    }

    // Apply description filter 1 (AND condition)
    if (descriptionFilter1.trim()) {
      filtered = filtered.filter(product => {
        const description = String(product.description || '').toLowerCase();
        const searchTerm = descriptionFilter1.toLowerCase();
        return description.includes(searchTerm);
      });
    }

    // Apply description filter 2 (AND condition)
    if (descriptionFilter2.trim()) {
      filtered = filtered.filter(product => {
        const description = String(product.description || '').toLowerCase();
        const searchTerm = descriptionFilter2.toLowerCase();
        return description.includes(searchTerm);
      });
    }

    // Apply description filter NOT (AND NOT condition)
    if (descriptionFilterNot.trim()) {
      filtered = filtered.filter(product => {
        const description = String(product.description || '').toLowerCase();
        const searchTerm = descriptionFilterNot.toLowerCase();
        return !description.includes(searchTerm);
      });
    }

    setFilteredProductData(filtered);
  }, [productData, partNumberFilter, descriptionFilter1, descriptionFilter2, descriptionFilterNot]);

  // Handle filter input change
  const handleFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      filterProducts();
    }
  };

  // Handle description filter input changes
  const handleDescriptionFilter1KeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      filterProducts();
    }
  };

  const handleDescriptionFilter2KeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      filterProducts();
    }
  };

  const handleDescriptionFilterNotKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      filterProducts();
    }
  };

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
      const rowsToCheck = Math.min(50, filteredProductData.length);
      for (let i = 0; i < rowsToCheck; i++) {
        const value = String(filteredProductData[i][col] || '');
        const textWidth = context.measureText(value).width + 20; // Content + padding
        maxWidth = Math.max(maxWidth, textWidth);
      }
      
      // Set minimum and maximum widths
      newWidths[col] = Math.max(80, Math.min(300, maxWidth));
    });
    
    setColumnWidths(newWidths);
  }, [filteredColumns, filteredProductData, getDisplayName]);

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
      const rowsToCheck = Math.min(50, filteredProductData.length);
      
      for (let i = 0; i < rowsToCheck; i++) {
        const value = String(filteredProductData[i][col] || '');
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
  }, [filteredColumns, filteredProductData, getDisplayName]);

  // Auto-save function with debouncing - using partnumber as unique identifier
  const autoSave = useCallback(async (partnumber: string, field: string, value: string) => {
    const key = `${partnumber}-${field}`;
    setSaveStatus(prev => ({ ...prev, [key]: 'saving' }));

    try {
      const updateData: any = {};
      updateData[field] = value;

      const { error } = await supabase
        .from('pre_products_supabase')
        .update(updateData)
        .eq('partnumber', partnumber);

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
        product.partnumber === partnumber ? { ...product, [field]: value } : product
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
    const maxRow = filteredProductData.length - 1;
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
  }, [selectedCell, isEditing, filteredProductData.length, filteredColumns.length]);

  // Handle cell click
  const handleCellClick = (rowIndex: number, colIndex: number) => {
    setSelectedCell({ rowIndex, colIndex });
    // In edit mode, single click enters edit mode immediately
    if (editMode) {
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
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
    if (editingCell?.id === product.partnumber && editingCell?.field === field) {
      return editingCell.value;
    }
    return String(product[field] || '');
  };

  // Get formatted cell value for display
  const getFormattedCellValue = (product: ProductMember, field: string) => {
    const value = product[field];
    const fieldLower = field.toLowerCase();
    if (['price', 'listprice', 'map', 'webmsrp', 'master_carton_price'].includes(fieldLower)) {
      return formatCurrency(value);
    }
    return String(value || '');
  };

  // Load data on component mount (only for products tab)
  useEffect(() => {
    if (activeTab === 'products') {
      fetchProductData();
      fetchBrandOptions();
      fetchVendorOptions();
    }
  }, [activeTab, fetchProductData, fetchBrandOptions, fetchVendorOptions]);

  // Auto-apply filters when any filter value changes
  useEffect(() => {
    if (activeTab === 'products') {
      filterProducts();
      setCurrentPage(0); // Reset to first page when filters change
    }
  }, [activeTab, filterProducts]);

  // Add keyboard event listener
  useEffect(() => {
    if (activeTab === 'products') {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [activeTab, handleKeyDown]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'products':
        return renderProductsTab();
    case 'placeholder1':
        return <PromoCodeManager />;
      case 'placeholder2':
        return (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-6xl mb-4">⚙️</div>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">PLACEHOLDER2</h2>
              <p className="text-gray-500">This tab is currently empty and ready for future content.</p>
            </div>
          </div>
        );
      default:
        return renderProductsTab();
    }
  };

  // Render products tab content
  const renderProductsTab = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading product data...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {/* Product Count Display */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-lg font-medium text-gray-800" style={{ fontSize: '13.5pt' }}>
                {(partNumberFilter || descriptionFilter1 || descriptionFilter2 || descriptionFilterNot) 
                  ? `Showing ${filteredProductData.length.toLocaleString()} products (based on filter)`
                  : `Showing all ${productData.length.toLocaleString()} Products (unfiltered)`
                }
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`px-4 py-1 rounded text-xs font-medium transition-colors ${
                    editMode 
                      ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                  title={editMode ? 'Switch to View Mode' : 'Switch to Edit Mode'}
                >
                  {editMode ? '✏️ EDIT MODE' : '👁️ VIEW MODE'}
                </button>
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
            
            {/* Enhanced Pagination Controls */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                Page {currentPage + 1} of {Math.ceil(filteredProductData.length / rowsPerPage)}
              </span>
              
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(0)}
                disabled={currentPage === 0}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded"
                title="First Page"
              >
                ««
              </button>
              
              {/* Previous Page */}
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded"
                title="Previous Page"
              >
                ‹ Previous
              </button>
              
              {/* Page Input */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">Go to:</span>
                <input
                  type="number"
                  min="1"
                  max={Math.ceil(filteredProductData.length / rowsPerPage)}
                  value={currentPage + 1}
                  onChange={(e) => {
                    const page = parseInt(e.target.value) - 1;
                    const maxPage = Math.ceil(filteredProductData.length / rowsPerPage) - 1;
                    if (page >= 0 && page <= maxPage) {
                      setCurrentPage(page);
                    }
                  }}
                  className="w-12 px-1 py-1 text-xs border border-gray-300 rounded text-center"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                />
              </div>
              
              {/* Next Page */}
              <button
                onClick={() => setCurrentPage(Math.min(Math.ceil(filteredProductData.length / rowsPerPage) - 1, currentPage + 1))}
                disabled={currentPage >= Math.ceil(filteredProductData.length / rowsPerPage) - 1}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded"
                title="Next Page"
              >
                Next ›
              </button>
              
              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(Math.ceil(filteredProductData.length / rowsPerPage) - 1)}
                disabled={currentPage >= Math.ceil(filteredProductData.length / rowsPerPage) - 1}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded"
                title="Last Page"
              >
                »»
              </button>
              
              {/* Rows per page selector */}
              <div className="flex items-center gap-1 ml-4">
                <span className="text-xs text-gray-600">Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    const newRowsPerPage = parseInt(e.target.value);
                    setRowsPerPage(newRowsPerPage);
                    setCurrentPage(0); // Reset to first page
                  }}
                  className="px-1 py-1 text-xs border border-gray-300 rounded"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
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

        {/* Filter Row */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0">
          <div className="bg-gray-50 border border-gray-300 rounded-lg mx-4 my-2 p-3">
            <div className="flex space-x-7">
              <div className="flex-1 border border-gray-300 rounded px-2 py-1" style={{ width: '180%' }}>
                <input
                  type="text"
                  placeholder="Part Number..."
                  value={partNumberFilter}
                  onChange={(e) => setPartNumberFilter(e.target.value)}
                  onKeyDown={handleFilterKeyDown}
                  className="w-full px-1 py-1 text-xs text-gray-700 border-0 bg-transparent rounded outline-none"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                />
              </div>
              <div className="flex-1 border border-gray-300 rounded px-2 py-1" style={{ width: '180%' }}>
                <input
                  type="text"
                  placeholder="Description MUST include..."
                  value={descriptionFilter1}
                  onChange={(e) => setDescriptionFilter1(e.target.value)}
                  onKeyDown={handleDescriptionFilter1KeyDown}
                  className="w-full px-1 py-1 text-xs text-gray-700 border-0 bg-transparent rounded outline-none"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                />
              </div>
              <div className="flex-1 border border-gray-300 rounded px-2 py-1" style={{ width: '180%' }}>
                <input
                  type="text"
                  placeholder="AND description must also include..."
                  value={descriptionFilter2}
                  onChange={(e) => setDescriptionFilter2(e.target.value)}
                  onKeyDown={handleDescriptionFilter2KeyDown}
                  className="w-full px-1 py-1 text-xs text-gray-700 border-0 bg-transparent rounded outline-none"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                />
              </div>
              <div className="flex-1 border border-gray-300 rounded px-2 py-1" style={{ width: '180%' }}>
                <input
                  type="text"
                  placeholder="Description must NOT include..."
                  value={descriptionFilterNot}
                  onChange={(e) => setDescriptionFilterNot(e.target.value)}
                  onKeyDown={handleDescriptionFilterNotKeyDown}
                  className="w-full px-1 py-1 text-xs text-gray-700 border-0 bg-transparent rounded outline-none"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Spreadsheet Table */}
        <div className={`flex-1 overflow-auto ${editMode ? 'bg-orange-50' : 'bg-white'}`}>
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
              {filteredProductData
                .slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)
                .map((product, displayRowIndex) => {
                  const actualRowIndex = currentPage * rowsPerPage + displayRowIndex;
                  // Use a combination of id and index as fallback for unique keys
                  const uniqueKey = product.id || `row-${actualRowIndex}-${product.partnumber || displayRowIndex}`;
                  return (
                    <tr key={uniqueKey} className={`${displayRowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      {filteredColumns.map((col, colIndex) => {
                        const isSelected = selectedCell?.rowIndex === actualRowIndex && selectedCell?.colIndex === colIndex;
                        const isCurrentlyEditing = isEditing && isSelected;
                        
                        return (
                          <td 
                            key={col}
                            className={`border border-gray-300 px-1 py-0.5 relative ${
                              isSelected ? 'ring-1 ring-blue-400 bg-blue-50' : 'hover:bg-gray-100'
                            }`}
                            style={{ width: columnWidths[col] || 120, minWidth: columnWidths[col] || 120 }}
                            onClick={() => handleCellClick(actualRowIndex, colIndex)}
                            onDoubleClick={() => handleCellDoubleClick(actualRowIndex, colIndex)}
                          >
                            {isCurrentlyEditing ? (
                              col === 'brand' ? (
                                <select
                                  value={getCellValue(product, colIndex)}
                                  onChange={(e) => {
                                    // Use partnumber as unique identifier
                                    if (product.partnumber) {
                                      handleCellEdit(product.partnumber, col, e.target.value);
                                      // Auto-close after selection
                                      setTimeout(() => setIsEditing(false), 50);
                                    } else {
                                      console.error('Cannot update product: missing partnumber', product);
                                      setError('Cannot update product: missing partnumber');
                                      setIsEditing(false);
                                    }
                                  }}
                                  onBlur={() => {
                                    setIsEditing(false);
                                  }}
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
                                  className="w-full px-1 py-1 border border-gray-300 outline-none bg-white text-xs"
                                  style={{ fontFamily: 'Poppins, sans-serif', height: 'auto', minHeight: '20px' }}
                                  autoFocus
                                >
                                  <option value="">Select Brand...</option>
                                  {brandOptions.map((brand, index) => (
                                    <option key={`brand-${index}-${brand}`} value={brand}>
                                      {brand}
                                    </option>
                                  ))}
                                </select>
                              ) : col === 'vendor' ? (
                                <select
                                  value={getCellValue(product, colIndex)}
                                  onChange={(e) => {
                                    // Use partnumber as unique identifier
                                    if (product.partnumber) {
                                      handleCellEdit(product.partnumber, col, e.target.value);
                                      // Auto-close after selection
                                      setTimeout(() => setIsEditing(false), 50);
                                    } else {
                                      console.error('Cannot update product: missing partnumber', product);
                                      setError('Cannot update product: missing partnumber');
                                      setIsEditing(false);
                                    }
                                  }}
                                  onBlur={() => {
                                    setIsEditing(false);
                                  }}
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
                                  className="w-full px-1 py-1 border border-gray-300 outline-none bg-white text-xs"
                                  style={{ fontFamily: 'Poppins, sans-serif', height: 'auto', minHeight: '20px' }}
                                  autoFocus
                                >
                                  <option value="">Select Vendor...</option>
                                  {vendorOptions.map((vendor, index) => (
                                    <option key={`vendor-${index}-${vendor}`} value={vendor}>
                                      {vendor}
                                    </option>
                                  ))}
                                </select>
                              ) : (
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
                              )
                            ) : (
                              <div className={`h-4 px-1 flex items-center text-xs cursor-cell truncate ${
                                ['price', 'listprice', 'map', 'webmsrp', 'master_carton_price'].includes(col.toLowerCase()) ? 'justify-end' : ''
                              }`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                                {getFormattedCellValue(product, col)}
                              </div>
                            )}
                            
                            {saveStatus[`${product.partnumber}-${col}`] && (
                              <div className="absolute right-0.5 top-0.5">
                                {saveStatus[`${product.partnumber}-${col}`] === 'saving' && (
                                  <div className="animate-spin h-2 w-2 border border-blue-500 border-t-transparent rounded-full"></div>
                                )}
                                {saveStatus[`${product.partnumber}-${col}`] === 'saved' && (
                                  <svg className="h-2 w-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                                {saveStatus[`${product.partnumber}-${col}`] === 'error' && (
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
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="border-b border-gray-200">
            {/* Tab Navigation */}
            <div className="px-6 pt-6">
              <nav className="-mb-px flex space-x-8 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-2 border-b-4 font-medium text-base whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2 text-xl">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Test997Page;
