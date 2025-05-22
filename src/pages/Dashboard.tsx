import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import CategoryTree from '../components/CategoryTree';
import ProductTable from '../components/ProductTable';
import SearchBar from '../components/SearchBar';
import Header from '../components/Header';
import OrderHistory from './OrderHistory';
import WebOrdersDisplay from './WebOrdersDisplay'; // Importing the new component
import { Product } from '../types';
import { useMemo } from 'react'; // Import useMemo
import { Link } from 'react-router-dom'; // Import Link for footer

const Dashboard: React.FC = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | null; direction: 'ascending' | 'descending' }>({ key: 'partnumber', direction: 'ascending' });
  const [selectedMetaCategory, setSelectedMetaCategory] = useState<string | undefined>();
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | undefined>();
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | undefined>();
  // States for category names
  const [selectedMetaCategoryName, setSelectedMetaCategoryName] = useState<string | undefined>();
  const [selectedMainCategoryName, setSelectedMainCategoryName] = useState<string | undefined>();
  const [selectedSubCategoryName, setSelectedSubCategoryName] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'products' | 'orders' | 'weborders'>('products');
  const [searchTerms, setSearchTerms] = useState<{
    primary: string;
    additional: string;
    exclude: string;
  }>({
    primary: '',
    additional: '',
    exclude: ''
  });

  useEffect(() => {
    fetchProducts();
  }, [selectedMetaCategory, selectedMainCategory, selectedSubCategory, searchTerms, inStockOnly]); // sortConfig is not a dependency here if sorting client-side after fetch

  const requestSort = (key: keyof Product) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedProducts = useMemo(() => {
    let sortableProducts = [...products];
    if (sortConfig.key !== null) {
      sortableProducts.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];

        // Handle null or undefined values by pushing them to the end
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableProducts;
  }, [products, sortConfig]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let query = supabase.from('lcmd_products').select('*');

      if (selectedMetaCategory) {
        query = query.eq('prdmetacat', selectedMetaCategory);
      }
      if (selectedMainCategory) {
        query = query.eq('prdmaincat', selectedMainCategory);
      }
      if (selectedSubCategory) {
        query = query.eq('prdsubcat', selectedSubCategory);
      }

      // Filter out test products
      query = query.not('partnumber', 'ilike', 'TEST-%');

      // Apply search terms by checking partnumber and description
      if (searchTerms.primary) {
        query = query.or(`partnumber.ilike.%${searchTerms.primary}%,description.ilike.%${searchTerms.primary}%`);
      }
      if (searchTerms.additional) {
        // This acts as an AND condition with the primary search due to sequential application
        query = query.or(`partnumber.ilike.%${searchTerms.additional}%,description.ilike.%${searchTerms.additional}%`);
      }
      if (searchTerms.exclude) {
        // Product must NOT contain the exclude term in partnumber AND must NOT contain it in description.
        query = query.not('partnumber', 'ilike', `%${searchTerms.exclude}%`);
        query = query.not('description', 'ilike', `%${searchTerms.exclude}%`);
      }

      if (inStockOnly) {
        query = query.gt('inventory', 0);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Updated to match CategorySelection type from CategoryTree.tsx
  const handleCategorySelect = (selection: import('../components/CategoryTree').CategorySelection | null) => {
    // Clear previous search terms when a category is selected or deselected
    setSearchQuery('');
    setSearchTerms({ primary: '', additional: '', exclude: '' });

    if (selection) {
      setSelectedCategoryId(selection.id);
      const { namePath, level } = selection;
      
      // Extract category codes from ID (meta_CODE, main_META_CODE, sub_META_MAIN_CODE)
      const idParts = selection.id.split('_');
      const type = idParts[0]; // 'meta', 'main', or 'sub'
      
      if (type === 'meta' && namePath.length >= 1) {
        setSelectedMetaCategory(idParts.slice(1).join('_'));
        setSelectedMainCategory(undefined);
        setSelectedSubCategory(undefined);
        setSelectedMetaCategoryName(namePath[0]);
        setSelectedMainCategoryName(undefined);
        setSelectedSubCategoryName(undefined);
      } else if (type === 'main' && namePath.length >= 2) {
        setSelectedMetaCategory(idParts[1]);
        setSelectedMainCategory(idParts.slice(2).join('_'));
        setSelectedSubCategory(undefined);
        setSelectedMetaCategoryName(namePath[0]);
        setSelectedMainCategoryName(namePath[1]);
        setSelectedSubCategoryName(undefined);
      } else if (type === 'sub' && namePath.length >= 3) {
        setSelectedMetaCategory(idParts[1]);
        setSelectedMainCategory(idParts[2]);
        setSelectedSubCategory(idParts.slice(3).join('_'));
        setSelectedMetaCategoryName(namePath[0]);
        setSelectedMainCategoryName(namePath[1]);
        setSelectedSubCategoryName(namePath[2]);
      } else {
        // Fallback or error case if path and id don't align, clear all
        setSelectedMetaCategory(undefined);
        setSelectedMainCategory(undefined);
        setSelectedSubCategory(undefined);
        setSelectedMetaCategoryName(undefined);
        setSelectedMainCategoryName(undefined);
        setSelectedSubCategoryName(undefined);
        setSelectedCategoryId(null);
      }
    } else {
      // Deselection: clear all category related states
      setSelectedCategoryId(null);
      setSelectedMetaCategory(undefined);
      setSelectedMainCategory(undefined);
      setSelectedSubCategory(undefined);
      setSelectedMetaCategoryName(undefined);
      setSelectedMainCategoryName(undefined);
      setSelectedSubCategoryName(undefined);
    }
  };
  
  const handleSearch = (primaryQuery: string, additionalQuery: string, excludeQuery: string, showInStock: boolean) => {
    setSearchQuery(primaryQuery);
    setInStockOnly(showInStock);
    setSearchTerms({
      primary: primaryQuery,
      additional: additionalQuery,
      exclude: excludeQuery
    });
    setSelectedMetaCategory(undefined);
    setSelectedMainCategory(undefined);
    setSelectedSubCategory(undefined);
    setSelectedMetaCategoryName(undefined);
    setSelectedMainCategoryName(undefined);
    setSelectedSubCategoryName(undefined);
    setSelectedCategoryId(null); // Also clear selectedCategoryId
  };

  const handleViewChange = (view: 'products' | 'orders' | 'weborders') => {
    setActiveView(view);
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header onViewChange={handleViewChange} activeView={activeView} />
      
      <div className="flex-grow flex flex-col">
        {activeView === 'products' ? (
          <>
            <div className="py-4 px-4 sm:px-6 lg:px-8">
              <SearchBar onSearch={handleSearch} />
            </div>
            
            <div className="flex-grow px-4 sm:px-6 lg:px-8 pb-6">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-3">
                  <CategoryTree 
                    onSelectCategory={handleCategorySelect}
                    selectedCategoryId={selectedCategoryId}
                  />
                </div>
                
                <div className="col-span-12 lg:col-span-9">
                  <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                    {(() => {
                      const path = [];
                      if (selectedMetaCategoryName) path.push(selectedMetaCategoryName);
                      if (selectedMainCategoryName) path.push(selectedMainCategoryName);
                      if (selectedSubCategoryName) path.push(selectedSubCategoryName);

                      if (path.length > 0) {
                        return `Current Path: ${path.join(' > ')}`;
                      }
                      if (searchTerms.primary || searchTerms.additional || searchTerms.exclude) {
                        return `Search results for: "${searchTerms.primary}${searchTerms.additional ? ' + ' + searchTerms.additional : ''}${searchTerms.exclude ? ' - ' + searchTerms.exclude : ''}"`;
                      }
                      return "Showing all product groups";
                    })()}
                  </div>
                  {loading ? (
                    <div className="text-center py-8 bg-white rounded-lg shadow">
                      <p className="text-gray-500">Loading products...</p>
                    </div>
                  ) : !selectedMainCategory && !selectedSubCategory && selectedMetaCategory && sortedProducts.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-lg shadow">
                      <p className="text-gray-500">There are no active products in this category at the moment.</p>
                    </div>
                  ) : (
                    <ProductTable 
                      products={sortedProducts} // Use sortedProducts
                      requestSort={requestSort}
                      sortConfig={sortConfig}
                      // Title could be dynamic or removed if breadcrumbs are sufficient
                      title={searchQuery ? `Search Results for "${searchQuery}"` : (selectedMetaCategoryName || 'Products')}
                    />
                  )}
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'orders' ? (
          <OrderHistory />
        ) : activeView === 'weborders' ? (
          <WebOrdersDisplay /> 
        ) : null}
      </div>

      <footer className="bg-gray-300 text-gray-700 py-6 px-4 sm:px-6 lg:px-8 text-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <div>
            &copy; {new Date().getFullYear()} Lou Capece Music Distributors
          </div>
          <div>
            <Link to="/sms-communications" className="hover:text-blue-600 hover:underline">
              SMS Messaging Policy & Disclaimer
            </Link>
          </div>
          <div className="font-semibold">
            CONFIDENTIAL: Wholesale Only
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
