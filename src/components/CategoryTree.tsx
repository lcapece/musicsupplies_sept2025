import React, { useState, useEffect } from 'react';
import { ProductGroup } from '../types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { categoryTreeData } from '../data/categoryTree';

export interface CategorySelection {
  id: string;
  namePath: string[]; // Path of names from root to selected category
  level: number;
}
interface CategoryTreeProps {
  onSelectCategory: (selection: CategorySelection | null) => void; // Updated to pass object or null for deselection
  selectedCategoryId: string | null;
}

// SVG Icons for each main category
const CategoryIcons: { [key: string]: React.FC<{ className?: string }> } = {
  'Acccessories & Supplies': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="16" cy="16" r="1.5" />
    </svg>
  ),
  'Amps, Speakers, Mic\'s & Sound': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="8" width="18" height="12" rx="1" />
      <circle cx="8" cy="14" r="2.5" />
      <circle cx="16" cy="14" r="2.5" />
      <line x1="7" y1="4" x2="7" y2="8" />
      <line x1="17" y1="4" x2="17" y2="8" />
    </svg>
  ),
  'Band & Orchestra': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 3L5 7v10a2 2 0 002 2h10a2 2 0 002-2V7l-4-4" />
      <line x1="9" y1="3" x2="15" y2="3" />
      <line x1="12" y1="9" x2="12" y2="15" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  ),
  'Cables': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12h4l2-4 4 8 2-4h4" />
      <circle cx="4" cy="12" r="2" />
      <circle cx="20" cy="12" r="2" />
    </svg>
  ),
  'Fretted Instruments': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 2L8 6v12a2 2 0 002 2h4a2 2 0 002-2V6l-3-4" />
      <line x1="11" y1="2" x2="13" y2="2" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="15" x2="16" y2="15" />
      <circle cx="12" cy="18" r="1" />
    </svg>
  ),
  'Guitar Accessories': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
  'Guitar Parts': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <circle cx="9" cy="8" r="1" />
      <circle cx="15" cy="8" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="16" r="1" />
      <circle cx="15" cy="16" r="1" />
    </svg>
  ),
  'Instructional Material': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="12" y2="15" />
    </svg>
  ),
  'Instrument Cases & Bags': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="8" width="14" height="12" rx="2" />
      <path d="M9 8V6a2 2 0 012-2h2a2 2 0 012 2v2" />
      <line x1="8" y1="14" x2="16" y2="14" />
    </svg>
  ),
  'Instrument Display Hangers': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v6" />
      <path d="M8 8h8" />
      <path d="M10 8v12" />
      <path d="M14 8v12" />
      <line x1="6" y1="20" x2="18" y2="20" />
    </svg>
  ),
  'Keyboards, Pianos & Accordions': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="8" width="18" height="8" />
      <line x1="6" y1="8" x2="6" y2="16" />
      <line x1="9" y1="8" x2="9" y2="16" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="15" y1="8" x2="15" y2="16" />
      <line x1="18" y1="8" x2="18" y2="16" />
      <rect x="5" y="8" width="2" height="5" fill="currentColor" />
      <rect x="8" y="8" width="2" height="5" fill="currentColor" />
      <rect x="14" y="8" width="2" height="5" fill="currentColor" />
      <rect x="17" y="8" width="2" height="5" fill="currentColor" />
    </svg>
  ),
  'Maintenance & Cleaners': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 2v8a2 2 0 002 2h0a2 2 0 002-2V2" />
      <path d="M10 2h4" />
      <rect x="8" y="12" width="8" height="10" rx="1" />
      <path d="M12 16v2" />
    </svg>
  ),
  'Pedals & Effects': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="8" width="16" height="10" rx="2" />
      <circle cx="8" cy="13" r="1.5" />
      <circle cx="12" cy="13" r="1.5" />
      <circle cx="16" cy="13" r="1.5" />
      <line x1="6" y1="4" x2="8" y2="8" />
      <line x1="18" y1="4" x2="16" y2="8" />
    </svg>
  ),
  'Percussion': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="7" />
      <line x1="3" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="21" y2="12" />
      <path d="M7 7l1.5 1.5M16 16l1.5 1.5M7 17l1.5-1.5M16 8l1.5-1.5" />
    </svg>
  ),
  'Picks': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3C8 3 5 6 5 10c0 5 7 11 7 11s7-6 7-11c0-4-3-7-7-7z" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  ),
  'Small & Hand Instruments': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 18v-6a2 2 0 012-2h4a2 2 0 012 2v6" />
      <path d="M8 18h8" />
      <circle cx="10" cy="7" r="2" />
      <circle cx="14" cy="7" r="2" />
      <line x1="10" y1="4" x2="10" y2="5" />
      <line x1="14" y1="4" x2="14" y2="5" />
    </svg>
  ),
  'Stands & Lighting': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v8" />
      <path d="M12 10l-4 6h8l-4-6" />
      <line x1="8" y1="22" x2="16" y2="22" />
      <line x1="12" y1="16" x2="12" y2="22" />
      <circle cx="12" cy="4" r="2" fill="currentColor" />
    </svg>
  ),
  'Straps': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 4h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
      <path d="M6 14h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 012-2z" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="16" y1="10" x2="16" y2="14" />
    </svg>
  ),
  'String Instrument Parts & Supplies': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 2l2 4v14l-2 2-2-2V6l2-4" />
      <path d="M16 4c2 0 3 1 3 3v10c0 2-1 3-3 3" />
      <line x1="8" y1="8" x2="15" y2="8" />
      <line x1="8" y1="12" x2="15" y2="12" />
      <line x1="8" y1="16" x2="15" y2="16" />
    </svg>
  ),
  'String Instruments': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 2v20l2-2h2l2 2V2l-2 2h-2l-2-2z" />
      <path d="M9 8h6M9 12h6M9 16h6" />
      <circle cx="7" cy="5" r="1" />
      <circle cx="17" cy="5" r="1" />
    </svg>
  ),
  'Strings': ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="2" x2="12" y2="22" strokeWidth="1" />
      <line x1="8" y1="2" x2="8" y2="22" strokeWidth="1.5" />
      <line x1="16" y1="2" x2="16" y2="22" strokeWidth="2" />
      <line x1="4" y1="2" x2="4" y2="22" strokeWidth="2.5" />
      <line x1="20" y1="2" x2="20" y2="22" strokeWidth="3" />
    </svg>
  ),
};

const getCategoryIcon = (categoryName: string) => {
  const Icon = CategoryIcons[categoryName];
  if (Icon) {
    return <Icon className="w-6 h-6 text-red-600" />;
  }
  // Default icon if no specific icon is found
  return (
    <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
};

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
    onSelectCategory({ id: category.id, namePath: newNamePath, level: category.level });
  };
  
  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-2 cursor-pointer hover:bg-gray-100 ${isSelected ? 'bg-blue-100' : ''}`}
        onClick={handleSelect}
        style={{ paddingLeft: `${(level - 1) * 20 + 8}px` }}
      >
        {hasChildren ? (
          <span onClick={handleToggle} className="mr-2 flex-shrink-0">
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </span>
        ) : (
          <span className="mr-2 w-5 flex-shrink-0"></span>
        )}
        <span className="mr-3 flex-shrink-0">
          {level === 1 ? getCategoryIcon(category.name) : null}
        </span>
        <span className={`text-base text-left truncate ${level === 2 ? 'text-blue-600' : ''}`}>
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

  const loadCategories = () => {
    setLoading(true);
    try {
      // Use static category tree data - no database call needed
      setCategories(categoryTreeData);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred loading categories');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();

    // Listen for refresh event from admin panel (future feature)
    const handleRefresh = () => {
      loadCategories();
    };

    window.addEventListener('refreshCategoryTree', handleRefresh);

    return () => {
      window.removeEventListener('refreshCategoryTree', handleRefresh);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-12rem)] p-4">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading categories...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-12rem)] p-4">
        <div className="flex items-center justify-center h-full">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full overflow-y-auto w-full flex flex-col">
      <div className="p-3 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
        <h3 className="font-medium text-gray-700">Product Categories</h3>
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
          <span className="text-base text-left text-gray-600 italic">Show All Products</span>
        </div>
      </div>
    </div>
  );
};

export default CategoryTree;
