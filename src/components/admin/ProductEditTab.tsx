import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, CellValueChangedEvent } from 'ag-grid-community';
import { supabase } from '../../lib/supabase';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface ProductManagerRow {
  partnumber: string;
  description: string | null;
  longdescription: string | null;
  map: number | null;
  brand: string | null;
  image: string | null;
  price: number | null;
  listprice: number | null;
  dstamp: string | null;
}

const ProductEditTab: React.FC = () => {
  const [rowData, setRowData] = useState<ProductManagerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerms, setSearchTerms] = useState({
    primary: '',
    additional: '',
    exclude: ''
  });
  const [filteredData, setFilteredData] = useState<ProductManagerRow[]>([]);

  // Column definitions with Excel-like editing
  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: 'partnumber',
      headerName: 'Part Number',
      editable: true,
      width: 150,
      pinned: 'left',
      cellStyle: { fontWeight: 'bold' }
    },
    {
      field: 'description',
      headerName: 'Description',
      editable: true,
      width: 300,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true
    },
    {
      field: 'longdescription',
      headerName: 'Long Description',
      editable: true,
      width: 400,
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true
    },
    {
      field: 'brand',
      headerName: 'Brand',
      editable: true,
      width: 120
    },
    {
      field: 'image',
      headerName: 'Image',
      editable: true,
      width: 200
    },
    {
      field: 'price',
      headerName: 'Price',
      editable: true,
      width: 100,
      cellEditor: 'agNumberCellEditor',
      valueFormatter: (params: any) => params.value != null ? `$${params.value.toFixed(2)}` : '',
      valueParser: (params: any) => parseFloat(params.newValue)
    },
    {
      field: 'listprice',
      headerName: 'List Price',
      editable: true,
      width: 100,
      cellEditor: 'agNumberCellEditor',
      valueFormatter: (params: any) => params.value != null ? `$${params.value.toFixed(2)}` : '',
      valueParser: (params: any) => parseFloat(params.newValue)
    },
    {
      field: 'map',
      headerName: 'MAP',
      editable: true,
      width: 100,
      cellEditor: 'agNumberCellEditor',
      valueFormatter: (params: any) => params.value != null ? `$${params.value.toFixed(2)}` : '',
      valueParser: (params: any) => parseFloat(params.newValue)
    },
    {
      field: 'dstamp',
      headerName: 'Date Stamp',
      editable: false,
      width: 150,
      valueFormatter: (params: any) => {
        if (params.value) {
          const date = new Date(params.value);
          return date.toLocaleDateString();
        }
        return '';
      }
    }
  ], []);

  // Default column properties
  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: true,
    editable: false,
    suppressMovable: false
  }), []);

  // Fetch products from products_manager table
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products_manager')
        .select('*')
        .order('partnumber');

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      setRowData(data || []);
      setFilteredData(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Apply search filters
  useEffect(() => {
    let filtered = [...rowData];

    // Apply primary search term
    if (searchTerms.primary) {
      const primaryLower = searchTerms.primary.toLowerCase();
      filtered = filtered.filter(product => 
        product.partnumber.toLowerCase().includes(primaryLower) ||
        product.description?.toLowerCase().includes(primaryLower) ||
        product.brand?.toLowerCase().includes(primaryLower)
      );
    }

    // Apply additional search term (AND logic)
    if (searchTerms.additional) {
      const additionalLower = searchTerms.additional.toLowerCase();
      filtered = filtered.filter(product => 
        product.partnumber.toLowerCase().includes(additionalLower) ||
        product.description?.toLowerCase().includes(additionalLower) ||
        product.brand?.toLowerCase().includes(additionalLower)
      );
    }

    // Apply exclude search term (NOT logic)
    if (searchTerms.exclude) {
      const excludeLower = searchTerms.exclude.toLowerCase();
      filtered = filtered.filter(product => 
        !product.partnumber.toLowerCase().includes(excludeLower) &&
        !product.description?.toLowerCase().includes(excludeLower) &&
        !product.brand?.toLowerCase().includes(excludeLower)
      );
    }

    setFilteredData(filtered);
  }, [rowData, searchTerms]);

  // Handle cell value changes with real-time updates
  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
    const { data, colDef, newValue, oldValue } = event;
    
    if (newValue === oldValue) return;

    try {
      // Update the database
      const { error } = await supabase
        .from('products_manager')
        .update({ [colDef.field!]: newValue })
        .eq('partnumber', data.partnumber);

      if (error) {
        console.error('Error updating product:', error);
        // Revert the change in the grid
        data[colDef.field!] = oldValue;
        event.api.refreshCells({ rowNodes: [event.node!], force: true });
        alert('Failed to update product. Please try again.');
        return;
      }

      // Update local data
      const updatedRowData = rowData.map(row => 
        row.partnumber === data.partnumber 
          ? { ...row, [colDef.field!]: newValue }
          : row
      );
      setRowData(updatedRowData);

      console.log(`Updated ${data.partnumber} - ${colDef.field}: ${oldValue} → ${newValue}`);
    } catch (error) {
      console.error('Error updating product:', error);
      // Revert the change in the grid
      data[colDef.field!] = oldValue;
      event.api.refreshCells({ rowNodes: [event.node!], force: true });
      alert('Failed to update product. Please try again.');
    }
  }, [rowData]);

  const handleSearchChange = (field: 'primary' | 'additional' | 'exclude', value: string) => {
    setSearchTerms(prev => ({ ...prev, [field]: value }));
  };

  const clearSearch = () => {
    setSearchTerms({ primary: '', additional: '', exclude: '' });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Manager - Excel-like Editor</h2>
        
        {/* Search Section */}
        <div className="bg-gray-50 p-4 rounded-lg border mb-4">
          <h3 className="text-lg font-semibold mb-3">Search & Filter Products</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="primary-search" className="block text-sm font-medium text-gray-700 mb-1">
                Search A (Primary)
              </label>
              <input
                type="text"
                id="primary-search"
                value={searchTerms.primary}
                onChange={(e) => handleSearchChange('primary', e.target.value)}
                placeholder="Part number, description, brand..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="additional-search" className="block text-sm font-medium text-gray-700 mb-1">
                Search B (Additional)
              </label>
              <input
                type="text"
                id="additional-search"
                value={searchTerms.additional}
                onChange={(e) => handleSearchChange('additional', e.target.value)}
                placeholder="Must also contain..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="exclude-search" className="block text-sm font-medium text-gray-700 mb-1">
                Search NOT (Exclude)
              </label>
              <input
                type="text"
                id="exclude-search"
                value={searchTerms.exclude}
                onChange={(e) => handleSearchChange('exclude', e.target.value)}
                placeholder="Exclude results containing..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={clearSearch}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Clear All
              </button>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Showing {filteredData.length} of {rowData.length} products
          </div>
        </div>
      </div>

      {/* AG Grid */}
      <div className="flex-1" style={{ minHeight: '600px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading products...</div>
          </div>
        ) : (
          <div className="ag-theme-alpine h-full">
            <AgGridReact
              rowData={filteredData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onCellValueChanged={onCellValueChanged}
              animateRows={true}
              rowSelection="single"
              enableCellTextSelection={true}
              suppressRowClickSelection={true}
              stopEditingWhenCellsLoseFocus={true}
              undoRedoCellEditing={true}
              undoRedoCellEditingLimit={10}
              enableRangeSelection={true}
              singleClickEdit={false}
            />
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Instructions:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li>Double-click cells to edit • Use arrow keys to navigate</li>
          <li>Press Enter to confirm edits and move to next row</li>
          <li>Changes are automatically saved to database</li>
          <li>Use Ctrl+Z to undo recent changes</li>
        </ul>
      </div>
    </div>
  );
};

export default ProductEditTab;
