import React, { useState } from 'react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, ArrowDown, ArrowUp } from 'lucide-react'; // Added ArrowDown, ArrowUp
import QuantitySelector from './QuantitySelector';

interface ProductTableProps {
  products: Product[];
  title?: string;
  requestSort: (key: keyof Product) => void;
  sortConfig: { key: keyof Product | null; direction: 'ascending' | 'descending' };
  onRowClick?: (product: Product) => void; // Added onRowClick prop
  className?: string; // Added className prop
  showUpcColumn?: boolean; // Whether to display the UPC column
  showMsrp?: boolean; // Whether to display the MSRP column
  showMapPrice?: boolean; // Whether to display the MAP Price column
  fontSize?: 'smaller' | 'standard' | 'larger';
  onFontSizeChange?: (size: 'smaller' | 'standard' | 'larger') => void;
  enableFiltering?: boolean; // Whether to show filtering controls
}

const ProductTable: React.FC<ProductTableProps> = ({ 
  products = [], 
  title = 'Products',
  requestSort,
  sortConfig,
  onRowClick, // Destructure onRowClick
  className, // Destructure className
  showUpcColumn = false, // Default to false
  showMsrp = true, // Default to true
  showMapPrice = true, // Default to true
  fontSize = 'standard',
  onFontSizeChange,
  enableFiltering = true // Default to true
}) => {
  const { addToCart, addToBackorder, isCartReady } = useCart();
  const { isDemoMode } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [tableContainerRef, setTableContainerRef] = useState<HTMLDivElement | null>(null);

  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    partnumber: '',
    description: '',
    brand: '',
    upc: '',
    priceMin: '',
    priceMax: '',
    msrpMin: '',
    msrpMax: '',
    mapMin: '',
    mapMax: '',
    inventoryMin: '',
    inventoryMax: '',
    inStockOnly: false
  });

  // Filtered products based on current filters
  const filteredProducts = React.useMemo(() => {
    if (!enableFiltering) return products;

    return products.filter(product => {
      // Part number filter
      if (filters.partnumber && !product.partnumber?.toLowerCase().includes(filters.partnumber.toLowerCase())) {
        return false;
      }

      // Description filter
      if (filters.description && !product.description?.toLowerCase().includes(filters.description.toLowerCase())) {
        return false;
      }

      // Brand filter
      if (filters.brand && !product.brand?.toLowerCase().includes(filters.brand.toLowerCase())) {
        return false;
      }

      // UPC filter
      if (filters.upc && !product.upc?.toLowerCase().includes(filters.upc.toLowerCase())) {
        return false;
      }

      // Price range filters
      if (filters.priceMin && product.price && product.price < parseFloat(filters.priceMin)) {
        return false;
      }
      if (filters.priceMax && product.price && product.price > parseFloat(filters.priceMax)) {
        return false;
      }

      // MSRP range filters
      if (filters.msrpMin && product.webmsrp && product.webmsrp < parseFloat(filters.msrpMin)) {
        return false;
      }
      if (filters.msrpMax && product.webmsrp && product.webmsrp > parseFloat(filters.msrpMax)) {
        return false;
      }

      // MAP range filters
      if (filters.mapMin && product.map && product.map < parseFloat(filters.mapMin)) {
        return false;
      }
      if (filters.mapMax && product.map && product.map > parseFloat(filters.mapMax)) {
        return false;
      }

      // Inventory range filters
      if (filters.inventoryMin && product.inventory && product.inventory < parseInt(filters.inventoryMin)) {
        return false;
      }
      if (filters.inventoryMax && product.inventory && product.inventory > parseInt(filters.inventoryMax)) {
        return false;
      }

      // In stock only filter
      if (filters.inStockOnly && (!product.inventory || product.inventory <= 0)) {
        return false;
      }

      return true;
    });
  }, [products, filters, enableFiltering]);

  // Update filter function
  const updateFilter = (key: keyof typeof filters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      partnumber: '',
      description: '',
      brand: '',
      upc: '',
      priceMin: '',
      priceMax: '',
      msrpMin: '',
      msrpMax: '',
      mapMin: '',
      mapMax: '',
      inventoryMin: '',
      inventoryMax: '',
      inStockOnly: false
    });
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'inStockOnly') return value === true;
    return value !== '';
  });

  // Note: Removed dynamic pagination calculation that was interfering with user's selection
  // and preventing proper scrolling through products

  // Reset pagination when products change (e.g., new search, category change)
  React.useEffect(() => {
    setCurrentPage(1);
  }, [products]);

  // Reset pagination when items per page changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Calculate pagination using filtered products
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  // Add keyboard navigation for pagination
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard events when not typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          if (currentPage > 1) {
            event.preventDefault();
            setCurrentPage(prev => prev - 1);
          }
          break;
        case 'ArrowRight':
          if (currentPage < totalPages) {
            event.preventDefault();
            setCurrentPage(prev => prev + 1);
          }
          break;
        case 'Home':
          if (totalPages > 1) {
            event.preventDefault();
            setCurrentPage(1);
          }
          break;
        case 'End':
          if (totalPages > 1) {
            event.preventDefault();
            setCurrentPage(totalPages);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    console.log('ProductTable: handleAddToCart called for:', product.partnumber, 'quantity:', quantity);
    
    // Basic validation
    if (!product.inventory || product.inventory <= 0) {
      console.log('ProductTable: Product out of stock, not adding to cart');
      return;
    }
    
    // Prevent double-clicks
    if (addingToCart === product.partnumber) {
      console.log('ProductTable: Already adding this product, ignoring click');
      return;
    }

    // IMPROVED FIX: Simple validation and immediate execution
    if (!addToCart || typeof addToCart !== 'function') {
      console.error('ProductTable: addToCart function not available');
      return;
    }
    
    console.log('ProductTable: Adding to cart immediately with quantity:', quantity);
    
    // Set loading state IMMEDIATELY
    setAddingToCart(product.partnumber);
    
    try {
      // Call addToCart with quantity - no delays or retry logic
      addToCart({
        partnumber: product.partnumber,
        description: product.description,
        price: product.price,
        inventory: product.inventory
      }, quantity);
      
      console.log('ProductTable: addToCart called successfully with quantity:', quantity);
      
      // Clear loading state with visual feedback
      setTimeout(() => {
        setAddingToCart(null);
      }, 600);
    } catch (error) {
      console.error('ProductTable: Error adding to cart:', error);
      setAddingToCart(null);
    }
  };

  const getInventoryDisplay = (inventory: number | null) => {
    if (inventory === null || inventory <= 0) {
      return <span className="text-red-600 font-medium">Out of Stock</span>;
    } else if (inventory <= 2) { // Covers 1 and 2
      return <span className="bg-yellow-100 px-2 py-1 rounded text-yellow-800 font-medium">Low - Call</span>;
    } else {
      return <span className="text-green-600 font-medium">{inventory}</span>;
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) {
      return <span className="text-gray-500 italic">Call for Price</span>;
    }
    return `$${price.toFixed(2)}`;
  };

  const formatListPrice = (msrp: number | null | undefined) => {
    if (msrp === null || msrp === undefined) {
      return <span className="text-gray-500">---</span>;
    }
    return `$${msrp.toFixed(2)}`;
  };

  const formatMapPrice = (map: number | null | undefined) => {
    if (map === null || map === undefined) {
      return <span className="text-gray-500">---</span>;
    }
    try {
      return `$${map.toFixed(2)}`;
    } catch (error) {
      console.error('Error formatting MAP price:', error, map);
      return <span className="text-gray-500">Error</span>;
    }
  };

  // Debug pagination
  console.log('ProductTable Pagination Debug:', {
    totalProducts: products.length,
    itemsPerPage,
    totalPages,
    currentPage,
    startIndex,
    paginatedProductsCount: paginatedProducts.length
  });

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  // Font size mappings using product table specific classes (25% smaller than standard readable sizes)
  const getFontSizeClasses = (type: 'header' | 'cell' | 'button' | 'pagination') => {
    const sizeMap = {
      smaller: {
        header: 'font-product-table-smaller',
        cell: 'font-product-table-smaller',
        button: 'font-product-table-smaller',
        pagination: 'font-product-table-smaller'
      },
      standard: {
        header: 'font-product-table-standard',
        cell: 'font-product-table-standard',
        button: 'font-product-table-standard',
        pagination: 'font-product-table-standard'
      },
      larger: {
        header: 'font-product-table-larger',
        cell: 'font-product-table-larger',
        button: 'font-product-table-larger',
        pagination: 'font-product-table-larger'
      }
    };
    return sizeMap[fontSize][type];
  };

  // Reusable pagination component
  const PaginationControls = ({ position }: { position: 'top' | 'bottom' }) => (
    <div className={`px-6 py-3 border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0 ${
      position === 'top' ? 'border-b' : 'border-t'
    }`}>
      <div className="flex items-center gap-4">
        <div className={`${fontSize === 'smaller' ? 'font-professional-smaller' : fontSize === 'larger' ? 'font-professional-larger' : 'font-professional-standard'} text-gray-700`}>
          Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
          {hasActiveFilters && (
            <span className="text-blue-600 ml-1">(filtered from {products.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={`itemsPerPage-${position}`} className={`${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} text-gray-700`}>Show:</label>
          <select
            id={`itemsPerPage-${position}`}
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className={`border border-gray-300 rounded-md px-2 py-1 ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} focus:ring-2 focus:ring-blue-500`}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
            <option value={products.length}>All ({products.length})</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Font Size Toggle - Show on both top and bottom for accessibility */}
        {onFontSizeChange && (
          <div className="flex items-center gap-1 mr-4 border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => onFontSizeChange('smaller')}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                fontSize === 'smaller'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              title="Smaller text (original size)"
            >
              A-
            </button>
            <button
              onClick={() => onFontSizeChange('standard')}
              className={`px-3 py-1 text-sm font-medium transition-colors border-x border-gray-300 ${
                fontSize === 'standard'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              title="Standard text (50% larger)"
            >
              A
            </button>
            <button
              onClick={() => onFontSizeChange('larger')}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                fontSize === 'larger'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              title="Larger text (100% larger)"
            >
              A+
            </button>
          </div>
        )}
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} font-medium transition-colors ${
            currentPage === 1
              ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
              : 'text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          }`}
        >
          <ChevronLeft size={16} className="mr-1" />
          Previous
        </button>
        
        <div className="flex items-center gap-1">
          <span className={`${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} text-gray-700`}>Page</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const page = parseInt(e.target.value);
              if (page >= 1 && page <= totalPages) {
                setCurrentPage(page);
              }
            }}
            className={`w-16 px-2 py-1 ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          />
          <span className={`${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} text-gray-700`}>of {totalPages}</span>
        </div>

        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} font-medium transition-colors ${
            currentPage === totalPages
              ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
              : 'text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          }`}
        >
          Next
          <ChevronRight size={16} className="ml-1" />
        </button>
      </div>
    </div>
  );

  return (
    <div 
      ref={setTableContainerRef}
      className={`bg-white rounded-lg shadow-sm overflow-hidden flex flex-col h-full ${className || ''}`}
    >
      {products && products.length > 0 ? (
        <>
          {/* Top Pagination */}
          <PaginationControls position="top" />
          
          {/* Filter Row */}
          {enableFiltering && (
            <div className="bg-blue-50 border-b border-gray-200 px-6 py-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} font-medium text-gray-900`}>
                  Table Filters
                </h3>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <span className={`${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} text-blue-600 bg-blue-100 px-2 py-1 rounded`}>
                      {Object.entries(filters).filter(([key, value]) => key === 'inStockOnly' ? value === true : value !== '').length} active
                    </span>
                  )}
                  <button
                    onClick={clearAllFilters}
                    disabled={!hasActiveFilters}
                    className={`${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} px-3 py-1 rounded transition-colors ${
                      hasActiveFilters
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Clear All
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {/* Part Number Filter */}
                <div>
                  <label className={`block ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} font-medium text-gray-700 mb-1`}>
                    Part Number
                  </label>
                  <input
                    type="text"
                    value={filters.partnumber}
                    onChange={(e) => updateFilter('partnumber', e.target.value)}
                    placeholder="Filter by part number..."
                    className={`w-full px-2 py-1 ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  />
                </div>

                {/* Description Filter */}
                <div>
                  <label className={`block ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} font-medium text-gray-700 mb-1`}>
                    Description
                  </label>
                  <input
                    type="text"
                    value={filters.description}
                    onChange={(e) => updateFilter('description', e.target.value)}
                    placeholder="Filter by description..."
                    className={`w-full px-2 py-1 ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  />
                </div>

                {/* Brand Filter */}
                <div>
                  <label className={`block ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} font-medium text-gray-700 mb-1`}>
                    Brand
                  </label>
                  <input
                    type="text"
                    value={filters.brand}
                    onChange={(e) => updateFilter('brand', e.target.value)}
                    placeholder="Filter by brand..."
                    className={`w-full px-2 py-1 ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  />
                </div>

                {/* Price Range */}
                <div>
                  <label className={`block ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} font-medium text-gray-700 mb-1`}>
                    Price Range
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={filters.priceMin}
                      onChange={(e) => updateFilter('priceMin', e.target.value)}
                      placeholder="Min"
                      className={`w-1/2 px-2 py-1 ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                    />
                    <input
                      type="number"
                      value={filters.priceMax}
                      onChange={(e) => updateFilter('priceMax', e.target.value)}
                      placeholder="Max"
                      className={`w-1/2 px-2 py-1 ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                    />
                  </div>
                </div>

                {/* Inventory Range */}
                <div>
                  <label className={`block ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} font-medium text-gray-700 mb-1`}>
                    Inventory Range
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={filters.inventoryMin}
                      onChange={(e) => updateFilter('inventoryMin', e.target.value)}
                      placeholder="Min"
                      className={`w-1/2 px-2 py-1 ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                    />
                    <input
                      type="number"
                      value={filters.inventoryMax}
                      onChange={(e) => updateFilter('inventoryMax', e.target.value)}
                      placeholder="Max"
                      className={`w-1/2 px-2 py-1 ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                    />
                  </div>
                </div>

                {/* In Stock Only Checkbox */}
                <div>
                  <label className={`block ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} font-medium text-gray-700 mb-1`}>
                    Stock Filter
                  </label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.inStockOnly}
                      onChange={(e) => updateFilter('inStockOnly', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className={`ml-2 ${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-sm' : 'text-xs'} text-gray-700`}>
                      In Stock Only
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Scrollable table container with fixed height and visible scrollbar */}
          <div 
            className="flex-1 overflow-y-auto overflow-x-auto product-table-scroll"
            style={{ 
              maxHeight: 'calc(100vh - 500px)', // Adjusted for top pagination
              minHeight: '300px' // Minimum height to show scrollbar area
            }}
          >
            <table className="min-w-full divide-y divide-gray-200 text-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className={`px-3 py-2 text-left ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[12%]`}
                    onClick={() => requestSort('partnumber')}
                  >
                    Part Number 
                    {sortConfig.key === 'partnumber' && (
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                    )}
                  </th>
                  <th 
                    className={`px-3 py-2 text-left ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[40%]`}
                    onClick={() => requestSort('description')}
                  >
                    Description
                    {sortConfig.key === 'description' && (
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                    )}
                  </th>
                  <th 
                    className={`px-3 py-2 text-left ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                    onClick={() => requestSort('brand')}
                  >
                    Brand
                    {sortConfig.key === 'brand' && (
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                    )}
                  </th>
                  {showUpcColumn && (
                    <th 
                      className={`px-3 py-2 text-left ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                      onClick={() => requestSort('upc')}
                    >
                      UPC
                      {sortConfig.key === 'upc' && (
                        <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                      )}
                    </th>
                  )}
                  {showMsrp && (
                    <th 
                      className={`px-3 py-2 text-right ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                      onClick={() => requestSort('webmsrp')}
                    >
                      MSRP
                      {sortConfig.key === 'webmsrp' && (
                        <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                      )}
                    </th>
                  )}
                  <th 
                    className={`px-3 py-2 text-right ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-blue-50 w-[8%]`}
                    onClick={() => requestSort('price')}
                  >
                    Your Price
                    {sortConfig.key === 'price' && (
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                    )}
                  </th>
                  {showMapPrice && (
                    <th 
                      className={`px-3 py-2 text-right ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                      onClick={() => requestSort('map')}
                    >
                      MAP
                      {sortConfig.key === 'map' && (
                        <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                      )}
                    </th>
                  )}
                  <th 
                    className={`px-3 py-2 text-center ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100`}
                    onClick={() => requestSort('inventory')}
                  >
                    Inventory
                    {sortConfig.key === 'inventory' && (
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                    )}
                  </th>
                  <th className={`px-3 py-2 text-center ${getFontSizeClasses('header')} font-medium text-gray-500 uppercase tracking-wider`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProducts.map((product) => (
                  <tr 
                    key={product.partnumber} 
                    className={`hover:bg-gray-100 ${onRowClick ? 'cursor-pointer' : ''} ${selectedProductId === product.partnumber ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      if (onRowClick) {
                        setSelectedProductId(product.partnumber);
                        onRowClick(product);
                      }
                    }}
                  >
                    <td className={`px-3 py-2 whitespace-nowrap ${getFontSizeClasses('cell')} font-medium text-gray-900 w-[12%]`}>
                      {product.partnumber}
                    </td>
                    <td className={`px-3 py-2 ${getFontSizeClasses('cell')} text-gray-500 w-[40%]`}>
                      {product.description}
                    </td>
                    <td className={`px-3 py-2 ${getFontSizeClasses('cell')} text-gray-500`}>
                      {product.brand || '---'}
                    </td>
                    {showUpcColumn && (
                      <td className={`px-3 py-2 ${getFontSizeClasses('cell')} text-gray-500`}>
                        {product.upc || '---'}
                      </td>
                    )}
                    {showMsrp && (
                      <td className={`px-3 py-2 whitespace-nowrap ${getFontSizeClasses('cell')} text-right font-medium`}>
                        {formatListPrice(product.webmsrp)}
                      </td>
                    )}
                    <td className={`px-3 py-2 whitespace-nowrap ${getFontSizeClasses('cell')} text-right font-medium bg-blue-50 text-blue-800 font-bold w-[8%] ${isDemoMode ? 'demo-mode-blur' : ''}`}>
                      {formatPrice(product.price)}
                    </td>
                    {showMapPrice && (
                      <td className={`px-3 py-2 whitespace-nowrap ${getFontSizeClasses('cell')} text-right font-medium`}>
                        {formatMapPrice(product.map)}
                      </td>
                    )}
                    <td className={`px-3 py-2 whitespace-nowrap ${getFontSizeClasses('cell')} text-center ${isDemoMode ? 'demo-mode-blur' : ''}`}>
                      {/* Hide inventory display for backorder items (inventory ≤ 2) */}
                      {product.inventory !== null && product.inventory <= 2 ? (
                        <span className="text-gray-400">---</span>
                      ) : (
                        getInventoryDisplay(product.inventory)
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-center relative">
                      <div onClick={(e) => e.stopPropagation()}>
                        {isDemoMode ? (
                          <button
                            disabled
                            className="px-3 py-1 text-sm font-medium text-gray-400 bg-gray-100 rounded cursor-not-allowed"
                          >
                            Disabled
                          </button>
                        ) : (
                          <QuantitySelector
                            product={product}
                            onAddToCart={handleAddToCart}
                            onAddToBackorder={(product, quantity) => {
                              console.log('ProductTable: Adding to backorder:', product.partnumber, 'quantity:', quantity);
                              if (addToBackorder) {
                                addToBackorder({
                                  partnumber: product.partnumber,
                                  description: product.description,
                                  price: product.price,
                                  inventory: product.inventory
                                }, quantity);
                              }
                            }}
                            disabled={!isCartReady}
                            isAdding={addingToCart === product.partnumber}
                            fontSize={fontSize}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination */}
          <PaginationControls position="bottom" />
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No products found.</p>
        </div>
      )}
    </div>
  );
};

export default ProductTable;
