import React, { useState } from 'react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { ChevronLeft, ChevronRight, ArrowDown, ArrowUp } from 'lucide-react'; // Added ArrowDown, ArrowUp

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
  showMapPrice = true // Default to true
}) => {
  const { addToCart } = useCart();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [tableContainerRef, setTableContainerRef] = useState<HTMLDivElement | null>(null);

  const [addingToCart, setAddingToCart] = useState<string | null>(null);

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

  // Calculate pagination
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = products.slice(startIndex, startIndex + itemsPerPage);

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

  const handleAddToCart = (product: Product) => {
    console.log('ProductTable: handleAddToCart called for:', product.partnumber);
    
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
    
    console.log('ProductTable: Product has inventory, proceeding to add to cart');
    
    // Set loading state IMMEDIATELY
    setAddingToCart(product.partnumber);
    
    // Call addToCart directly - it's synchronous!
    addToCart({
      partnumber: product.partnumber,
      description: product.description,
      price: product.price,
      inventory: product.inventory
    });
    
    console.log('ProductTable: addToCart called successfully');
    
    // Clear loading state with visual feedback
    setTimeout(() => {
      setAddingToCart(null);
    }, 600);
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

  // Reusable pagination component
  const PaginationControls = ({ position }: { position: 'top' | 'bottom' }) => (
    <div className={`px-6 py-3 border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0 ${
      position === 'top' ? 'border-b' : 'border-t'
    }`}>
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-700">
          Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, products.length)} of {products.length} products
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={`itemsPerPage-${position}`} className="text-sm text-gray-700">Show:</label>
          <select
            id={`itemsPerPage-${position}`}
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium transition-colors ${
            currentPage === 1
              ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
              : 'text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          }`}
        >
          <ChevronLeft size={16} className="mr-1" />
          Previous
        </button>
        
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-700">Page</span>
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
            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-sm text-gray-700">of {totalPages}</span>
        </div>

        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium transition-colors ${
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
      <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      </div>
      
      {products && products.length > 0 ? (
        <>
          {/* Top Pagination */}
          <PaginationControls position="top" />
          
          {/* Scrollable table container with fixed height and visible scrollbar */}
          <div 
            className="flex-1 overflow-y-auto overflow-x-auto product-table-scroll"
            style={{ 
              maxHeight: 'calc(100vh - 400px)', // Constrain height to force scrolling
              minHeight: '300px' // Minimum height to show scrollbar area
            }}
          >
            <table className="min-w-full divide-y divide-gray-200 text-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-3 py-2 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[12%]"
                    onClick={() => requestSort('partnumber')}
                  >
                    Part Number 
                    {sortConfig.key === 'partnumber' && (
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                    )}
                  </th>
                  <th 
                    className="px-3 py-2 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-[40%]"
                    onClick={() => requestSort('description')}
                  >
                    Description
                    {sortConfig.key === 'description' && (
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                    )}
                  </th>
                  <th 
                    className="px-3 py-2 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('brand')}
                  >
                    Brand
                    {sortConfig.key === 'brand' && (
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                    )}
                  </th>
                  {showUpcColumn && (
                    <th 
                      className="px-3 py-2 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                      className="px-3 py-2 text-right text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('webmsrp')}
                    >
                      MSRP
                      {sortConfig.key === 'webmsrp' && (
                        <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                      )}
                    </th>
                  )}
                  <th 
                    className="px-3 py-2 text-right text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 bg-blue-50 w-[8%]"
                    onClick={() => requestSort('price')}
                  >
                    Your Price
                    {sortConfig.key === 'price' && (
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                    )}
                  </th>
                  {showMapPrice && (
                    <th 
                      className="px-3 py-2 text-right text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('map')}
                    >
                      MAP
                      {sortConfig.key === 'map' && (
                        <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                      )}
                    </th>
                  )}
                  <th 
                    className="px-3 py-2 text-center text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('inventory')}
                  >
                    Inventory
                    {sortConfig.key === 'inventory' && (
                      <span className="ml-1">{sortConfig.direction === 'ascending' ? <ArrowUp size={12} className="inline"/> : <ArrowDown size={12} className="inline"/>}</span>
                    )}
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">
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
                    <td className="px-3 py-2 whitespace-nowrap text-lg font-medium text-gray-900 w-[12%]">
                      {product.partnumber}
                    </td>
                    <td className="px-3 py-2 text-lg text-gray-500 w-[40%]">
                      {product.description}
                    </td>
                    <td className="px-3 py-2 text-lg text-gray-500">
                      {product && product.brand ? product.brand : '---'}
                    </td>
                    {showUpcColumn && (
                      <td className="px-3 py-2 text-lg text-gray-500">
                        {product && product.upc ? product.upc : '---'}
                      </td>
                    )}
                    {showMsrp && (
                      <td className="px-3 py-2 whitespace-nowrap text-lg text-right font-medium">
                        {formatListPrice(product.webmsrp)}
                      </td>
                    )}
                    <td className="px-3 py-2 whitespace-nowrap text-lg text-right font-medium bg-blue-50 text-blue-800 font-bold w-[8%]">
                      {formatPrice(product.price)}
                    </td>
                    {showMapPrice && (
                      <td className="px-3 py-2 whitespace-nowrap text-lg text-right font-medium">
                        {product && 'map' in product ? formatMapPrice(product.map) : <span className="text-gray-500">---</span>}
                      </td>
                    )}
                    <td className="px-3 py-2 whitespace-nowrap text-lg text-center">
                      {getInventoryDisplay(product.inventory)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        className={`inline-flex items-center px-2 py-1 border border-transparent text-sm font-medium rounded-md ${
                          product.inventory && product.inventory > 0
                            ? addingToCart === product.partnumber
                              ? 'text-white bg-green-600'
                              : 'text-white bg-blue-600 hover:bg-blue-700'
                            : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        }`}
                        disabled={!product.inventory || product.inventory <= 0 || addingToCart === product.partnumber}
                      >
                        {addingToCart === product.partnumber ? 'Added!' : 'Add to Cart'}
                      </button>
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
