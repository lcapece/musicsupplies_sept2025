import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface CategoryData {
  prdmetacat: string;
  prdmaincat: string;
  prdsubcat: string;
  count: number;
}

interface CategorySummary {
  meta: { [key: string]: number };
  main: { [key: string]: { [key: string]: number } };
  sub: { [key: string]: { [key: string]: { [key: string]: number } } };
}

const CategoryManagementTab: React.FC = () => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [categorySummary, setCategorySummary] = useState<CategorySummary>({
    meta: {},
    main: {},
    sub: {}
  });
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState({
    meta: '',
    main: '',
    sub: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      // Get all unique category combinations with product counts
      const { data, error } = await supabase
        .from('lcmd_products')
        .select('prdmetacat, prdmaincat, prdsubcat')
        .not('partnumber', 'ilike', 'TEST-%');

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      // Process the data to create category summaries
      const categoryMap: { [key: string]: CategoryData } = {};
      const summary: CategorySummary = { meta: {}, main: {}, sub: {} };

      data?.forEach(item => {
        const meta = item.prdmetacat || 'Uncategorized';
        const main = item.prdmaincat || 'Uncategorized';
        const sub = item.prdsubcat || 'Uncategorized';
        
        const key = `${meta}|${main}|${sub}`;
        
        if (!categoryMap[key]) {
          categoryMap[key] = {
            prdmetacat: meta,
            prdmaincat: main,
            prdsubcat: sub,
            count: 0
          };
        }
        categoryMap[key].count++;

        // Build summary
        summary.meta[meta] = (summary.meta[meta] || 0) + 1;
        
        if (!summary.main[meta]) summary.main[meta] = {};
        summary.main[meta][main] = (summary.main[meta][main] || 0) + 1;
        
        if (!summary.sub[meta]) summary.sub[meta] = {};
        if (!summary.sub[meta][main]) summary.sub[meta][main] = {};
        summary.sub[meta][main][sub] = (summary.sub[meta][main][sub] || 0) + 1;
      });

      setCategories(Object.values(categoryMap));
      setCategorySummary(summary);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkCategoryUpdate = async () => {
    const oldCategory = prompt('Enter old category name to replace:');
    if (!oldCategory) return;

    const newCategoryName = prompt('Enter new category name:');
    if (!newCategoryName) return;

    const categoryType = prompt('Category type (meta/main/sub):');
    if (!['meta', 'main', 'sub'].includes(categoryType || '')) {
      alert('Invalid category type. Must be meta, main, or sub.');
      return;
    }

    if (window.confirm(`Replace all "${oldCategory}" with "${newCategoryName}" in ${categoryType} category?`)) {
      try {
        setLoading(true);
        
        let updateField = '';
        switch (categoryType) {
          case 'meta':
            updateField = 'prdmetacat';
            break;
          case 'main':
            updateField = 'prdmaincat';
            break;
          case 'sub':
            updateField = 'prdsubcat';
            break;
        }

        const { error } = await supabase
          .from('lcmd_products')
          .update({ [updateField]: newCategoryName })
          .eq(updateField, oldCategory);

        if (error) {
          console.error('Error updating categories:', error);
          alert('Error updating categories');
          return;
        }

        fetchCategories();
        alert('Category update completed');
      } catch (error) {
        console.error('Error:', error);
        alert('Error updating categories');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteEmptyCategories = async () => {
    if (window.confirm('This will clean up products with empty/null category fields. Continue?')) {
      try {
        setLoading(true);
        
        // Update empty categories to "Uncategorized"
        await supabase
          .from('lcmd_products')
          .update({ prdmetacat: 'Uncategorized' })
          .is('prdmetacat', null);

        await supabase
          .from('lcmd_products')
          .update({ prdmaincat: 'Uncategorized' })
          .is('prdmaincat', null);

        await supabase
          .from('lcmd_products')
          .update({ prdsubcat: 'Uncategorized' })
          .is('prdsubcat', null);

        fetchCategories();
        alert('Category cleanup completed');
      } catch (error) {
        console.error('Error:', error);
        alert('Error cleaning up categories');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddCategoryToProducts = async () => {
    if (!newCategory.meta) {
      alert('Meta category is required');
      return;
    }

    const partNumbers = prompt('Enter comma-separated part numbers to assign this category to:');
    if (!partNumbers) return;

    const partNumberArray = partNumbers.split(',').map(pn => pn.trim());

    try {
      setLoading(true);
      
      for (const partNumber of partNumberArray) {
        await supabase
          .from('lcmd_products')
          .update({
            prdmetacat: newCategory.meta,
            prdmaincat: newCategory.main || null,
            prdsubcat: newCategory.sub || null
          })
          .eq('partnumber', partNumber);
      }

      setShowAddModal(false);
      setNewCategory({ meta: '', main: '', sub: '' });
      fetchCategories();
      alert('Categories assigned successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Error assigning categories');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Category Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Assign Categories
          </button>
          <button
            onClick={handleBulkCategoryUpdate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Bulk Update
          </button>
          <button
            onClick={handleDeleteEmptyCategories}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Clean Up
          </button>
        </div>
      </div>

      {/* Category Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meta Categories */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Meta Categories</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(categorySummary.meta)
              .sort(([,a], [,b]) => b - a)
              .map(([category, count]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-sm text-gray-900 truncate">{category}</span>
                  <span className="text-sm font-medium text-blue-600">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Main Categories */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Main Categories</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {Object.entries(categorySummary.main).map(([meta, mainCats]) => (
              <div key={meta} className="border-l-2 border-blue-200 pl-2">
                <div className="text-xs font-medium text-gray-500 mb-1">{meta}</div>
                {Object.entries(mainCats).map(([main, count]) => (
                  <div key={main} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 truncate">{main}</span>
                    <span className="text-xs text-gray-500">{count}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Sub Categories */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sub Categories</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {Object.entries(categorySummary.sub).map(([meta, mainCats]) => (
              <div key={meta} className="border-l-2 border-green-200 pl-2">
                <div className="text-xs font-medium text-gray-500 mb-1">{meta}</div>
                {Object.entries(mainCats).map(([main, subCats]) => (
                  <div key={main} className="ml-2">
                    <div className="text-xs text-gray-600 mb-1">{main}</div>
                    {Object.entries(subCats).map(([sub, count]) => (
                      <div key={sub} className="flex justify-between items-center ml-2">
                        <span className="text-xs text-gray-700 truncate">{sub}</span>
                        <span className="text-xs text-gray-500">{count}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Combinations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Category Combinations ({categories.length} unique combinations)
          </h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">Loading categories...</div>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">No categories found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meta Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Main Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sub Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Count
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories
                  .sort((a, b) => b.count - a.count)
                  .map((category, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {category.prdmetacat}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {category.prdmaincat}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {category.prdsubcat}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {category.count}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Categories to Products</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Category (Required)</label>
                <input
                  type="text"
                  value={newCategory.meta}
                  onChange={(e) => setNewCategory({ ...newCategory, meta: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="e.g., Instruments"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Main Category (Optional)</label>
                <input
                  type="text"
                  value={newCategory.main}
                  onChange={(e) => setNewCategory({ ...newCategory, main: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="e.g., Guitars"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sub Category (Optional)</label>
                <input
                  type="text"
                  value={newCategory.sub}
                  onChange={(e) => setNewCategory({ ...newCategory, sub: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="e.g., Electric Guitars"
                />
              </div>
              <div className="text-sm text-gray-600">
                After clicking "Assign", you'll be prompted to enter part numbers to assign these categories to.
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategoryToProducts}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Assign Categories
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagementTab;
