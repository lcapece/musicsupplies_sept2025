import { ProductGroup } from '../types';
import { supabase } from '../lib/supabase';

// Initial empty array for category tree data
export let categoryTreeData: ProductGroup[] = [];

// Fetch category data from Supabase
export const fetchCategoryData = async (): Promise<ProductGroup[]> => {
  try {
    // Use the correct table name (with underscores)
    const { data, error } = await supabase
      .from('treeview_datasource')
      .select('*')
      .order('display_order');

    if (error) {
      console.error('Error fetching category data:', error);
      return [];
    }

    // Transform the data to the expected format
    const transformed = buildCategoryTree(data);
    
    // Cache the data
    categoryTreeData = transformed;
    
    return transformed;
  } catch (error) {
    console.error('Error in fetchCategoryData:', error);
    return [];
  }
};

// Helper function to build the full tree structure with subcategories
// Uses the data from the tree_view_data_source table
export const buildCategoryTree = (rawData: any[]): ProductGroup[] => {
  const tree: ProductGroup[] = [];
  const mainGroups = new Map<string, ProductGroup>();

  // Process main groups (level 1)
  rawData?.forEach(row => {
    if (row.is_main_category && !mainGroups.has(row.category_code)) {
      const group: ProductGroup = {
        id: `main_${row.category_code}`,
        name: row.category_name,
        level: 1,
        parentId: null,
        children: [],
        prdmaingrp: row.category_code,
        icon: row.icon_name // Store icon name if present
      };
      mainGroups.set(row.category_code, group);
      tree.push(group);
    }
  });

  // Process sub groups (level 2)
  rawData?.forEach(row => {
    if (!row.is_main_category && row.parent_category_code) {
      const mainGroup = mainGroups.get(row.parent_category_code);
      if (mainGroup) {
        // Check if this subcategory already exists
        const existingSubGroup = mainGroup.children?.find(
          child => child.id === `sub_${row.parent_category_code}_${row.category_code}`
        );
        
        if (!existingSubGroup) {
          const subGroup: ProductGroup = {
            id: `sub_${row.parent_category_code}_${row.category_code}`,
            name: row.category_name,
            level: 2,
            parentId: mainGroup.id,
            prdsubgrp: row.category_code,
            productCount: row.product_count || 0
          };
          mainGroup.children = mainGroup.children || [];
          mainGroup.children.push(subGroup);
        }
      }
    }
  });

  return tree;
};
