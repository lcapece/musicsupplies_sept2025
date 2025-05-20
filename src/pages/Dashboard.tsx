import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import CategoryTree from '../components/CategoryTree';
import ProductTable from '../components/ProductTable';
import SearchBar from '../components/SearchBar';
import Header from '../components/Header';
import OrderHistory from './OrderHistory';
import WebOrdersDisplay from './WebOrdersDisplay'; // Importing the new component
import { Product } from '../types';

const Dashboard: React.FC = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedMetaCategory, setSelectedMetaCategory] = useState<string | undefined>();
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | undefined>();
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | undefined>();
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
  }, [selectedMetaCategory, selectedMainCategory, selectedSubCategory, searchTerms, inStockOnly]);

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

      // Apply search terms
      // Assuming primary search can be on description, partnumber, or a dedicated brand field.
      // For now, let's make primary search broader, e.g., on description and partnumber.
      // And additional search specifically on description.
      if (searchTerms.primary) {
        // Example: Searching primary term in description OR partnumber
        // This requires an .or() condition if searching multiple fields for the same term.
        // For simplicity, if 'brand' is a column, it would be query.ilike('brand', `%${searchTerms.primary}%`)
        // If primary is meant for description:
        query = query.ilike('description', `%${searchTerms.primary}%`);
        // If you have a 'brand' column and primary is for brand:
        // query = query.ilike('brand', `%${searchTerms.primary}%`); 
        // Or if primary can be in multiple text fields:
        // query = query.or(`description.ilike.%${searchTerms.primary}%,partnumber.ilike.%${searchTerms.primary}%`);
      }

      if (searchTerms.additional) {
        // Add additional search term to filter description further
        query = query.ilike('description', `%${searchTerms.additional}%`);
      }
      
      if (searchTerms.exclude) {
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
  
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    
    const [type, ...parts] = categoryId.split('_');
    
    if (type === 'meta') {
      setSelectedMetaCategory(parts.join('_'));
      setSelectedMainCategory(undefined);
      setSelectedSubCategory(undefined);
    } else if (type === 'main') {
      const [meta, main] = parts;
      setSelectedMetaCategory(meta);
      setSelectedMainCategory(main);
      setSelectedSubCategory(undefined);
    } else if (type === 'sub') {
      const [meta, main, sub] = parts;
      setSelectedMetaCategory(meta);
      setSelectedMainCategory(main);
      setSelectedSubCategory(sub);
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
                  {loading ? (
                    <div className="text-center py-8 bg-white rounded-lg shadow">
                      <p className="text-gray-500">Loading products...</p>
                    </div>
                  ) : (
                    <ProductTable 
                      products={products}
                      title={searchQuery ? `Search Results for "${searchQuery}"` : 'Products'}
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

      <footer className="bg-gray-400 py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-gray-700">
            &copy; 2025 Lou Capece Music Distributors
          </div>
          <div className="text-gray-700 font-semibold">
            CONFIDENTIAL: Wholesale Only
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
