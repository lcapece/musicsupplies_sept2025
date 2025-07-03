import React, { useState, useEffect } from 'react';
import { ProductGroup } from '../types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { fetchCategoryData } from '../data/categoryTree';

// Define TreeNode structure consistent with what ManageTreeviewTab stores in localStorage
interface LocalTreeNode {
  id: string; 
  name: string;
  parent_id: string | null; 
  children?: LocalTreeNode[];
  is_main_category: boolean;
  icon_name: string | null;
}

export interface CategorySelection {
  id: string; // category_code
  namePath: string[]; // Path of names from root to selected category
  level: number;
  isMainCategory: boolean;
  parentCategoryCode?: string | null; // Only relevant if not a main category
}

interface CategoryTreeProps {
  onSelectCategory: (selection: CategorySelection | null) => void;
  selectedCategoryId: string | null;
}

// Icon components removed

const CategoryTreeItem: React.FC<{
  category: ProductGroup;
  level: number;
  onSelectCategory: (selection: CategorySelection) => void;
  selectedCategoryId: string | null;
  currentNamePath: string[];
}> = ({ category, level, onSelectCategory, selectedCategoryId, currentNamePath }) => {
  const [isExpanded, setIsExpanded] = useState(selectedCategoryId !== null && level === 1);
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedCategoryId === category.id;

  useEffect(() => {
    if (selectedCategoryId !== null) {
      if (category.id && selectedCategoryId.startsWith(category.id) && category.id !== selectedCategoryId) {
        setIsExpanded(true);
      }
    }
  }, [selectedCategoryId, category.id, level]);
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  
  const handleSelect = () => {
    const newNamePath = [...currentNamePath, category.name];
    const isMain = category.level === 1;

    onSelectCategory({ 
      id: category.id, 
      namePath: newNamePath, 
      level: category.level,
      isMainCategory: isMain,
      parentCategoryCode: category.parentId
    });
    
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };
  
  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-2 cursor-pointer hover:bg-gray-100 ${isSelected ? 'bg-blue-100' : ''}`}
        onClick={handleSelect}
        style={{ paddingLeft: `${level === 1 ? 8 : (level === 2 ? 20 : (level - 1) * 20 + 8)}px` }}
      >
        {hasChildren ? (
          <span onClick={handleToggle} className="mr-2 flex-shrink-0">
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
        ) : (
          <span className="mr-2 w-5 flex-shrink-0"></span>
        )}
        {/* Icon rendering removed */}
        <span className={`text-sm text-left truncate ${level === 2 ? 'text-blue-600' : ''}`}>
          {category.name}
        </span>
      </div>
      
      {isExpanded && hasChildren && (
        <div>
          {category.children?.map(child => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              level={level + 1}
              onSelectCategory={onSelectCategory}
              selectedCategoryId={selectedCategoryId}
              currentNamePath={[...currentNamePath, category.name]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CategoryTree: React.FC<CategoryTreeProps> = ({ 
  onSelectCategory,
  selectedCategoryId
}) => {
  const [categories, setCategories] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCategoryData();
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories for CategoryTree:', err);
      setError(err instanceof Error ? err.message : 'An error occurred loading categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();

    // Listen for refresh event
    const handleRefresh = () => {
      loadCategories();
    };

    window.addEventListener('refreshCategoryTree', handleRefresh);
    window.addEventListener('storage', (e) => {
      if (e.key === 'musicSupplies_useTreeViewForNavigation' || 
          e.key === 'musicSupplies_siteNavigationTreeData') {
        loadCategories();
      }
    });

    return () => {
      window.removeEventListener('refreshCategoryTree', handleRefresh);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc((100vh-12rem)*0.9)] p-4">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading categories...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc((100vh-12rem)*0.9)] p-4">
        <div className="flex items-center justify-center h-full">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc((100vh-12rem)*0.9)] overflow-y-auto w-full flex flex-col">
      <div className="p-2 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
        <h3 className="font-medium text-gray-700 text-sm">Product Categories</h3>
      </div>
      <div className="p-2 flex-grow overflow-y-auto">
        {categories.map(category => (
          <CategoryTreeItem
            key={category.id}
            category={category}
            level={1}
            onSelectCategory={onSelectCategory}
            selectedCategoryId={selectedCategoryId}
            currentNamePath={[]}
          />
        ))}
        <div 
          className="flex items-center py-2 cursor-pointer hover:bg-gray-100 mt-2 border-t pt-3"
          onClick={() => onSelectCategory(null)}
          style={{ paddingLeft: '8px' }}
        >
          <span className="mr-2 w-5 flex-shrink-0"></span>
          <span className="text-sm text-left text-gray-600 italic">Show All Products</span>
        </div>
      </div>
    </div>
  );
};

export default CategoryTree;
