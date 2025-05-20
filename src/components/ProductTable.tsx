import React, { useState } from 'react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductTableProps {
  products: Product[];
  title?: string;
}

const ProductTable: React.FC<ProductTableProps> = ({ products = [], title = 'Products' }) => {
  const { addToCart } = useCart();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const handleAddToCart = (product: Product) => {
    if (product.inventory && product.inventory > 0) {
      addToCart({
        partnumber: product.partnumber,
        description: product.description,
        price: product.price || 0
      });
    }
  };

  const getInventoryDisplay = (inventory: number | null) => {
    if (inventory === null || inventory <= 0) {
      return <span className="text-red-600 font-medium">Out of Stock</span>;
    } else if (inventory <= 2) {
      return <span className="bg-yellow-100 px-2 py-1 rounded text-yellow-800 font-medium">Low Stock</span>;
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

  // Calculate pagination
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = products.slice(startIndex, startIndex + itemsPerPage);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      </div>
      
      {products && products.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Part Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inventory
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProducts.map((product) => (
                  <tr key={product.partnumber} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.partnumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {product.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {getInventoryDisplay(product.inventory)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleAddToCart(product)}
                        className={`inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md ${
                          product.inventory && product.inventory > 0
                            ? 'text-white bg-blue-600 hover:bg-blue-700'
                            : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        }`}
                        disabled={!product.inventory || product.inventory <= 0}
                      >
                        Add to Cart
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className={`inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm ${
                  currentPage === 1
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                <ChevronLeft size={16} className="mr-1" />
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm ${
                  currentPage === totalPages
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                Next
                <ChevronRight size={16} className="ml-1" />
              </button>
            </div>
          )}
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