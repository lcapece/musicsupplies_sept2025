import { ProductGroup } from '../types';
import { supabase } from '../lib/supabase';

// Initial empty array for category tree data
export let categoryTreeData: ProductGroup[] = [];

// Fetch category data from Supabase
export const fetchCategoryData = async (): Promise<ProductGroup[]> => {
  try {
    // Use the SQL query provided to fetch category data
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        select distinct prdmaincat, prdsubcat, count(1) as product_count
        from products_supabase
        where length(prdmaincat) > 3
        group by 1, 2
        order by 1, 2
        limit 99999
      `
    });

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
// Uses the data from the SQL query with prdmaincat and prdsubcat fields
export const buildCategoryTree = (rawData: { prdmaincat: string; prdsubcat: string; product_count: number }[]): ProductGroup[] => {
  const tree: ProductGroup[] = [];
  const mainGroups = new Map<string, ProductGroup>();

  // Process main groups (level 1)
  rawData?.forEach(row => {
    if (row.prdmaincat && !mainGroups.has(row.prdmaincat)) {
      const group: ProductGroup = {
        id: `main_${row.prdmaincat}`,
        name: row.prdmaincat,
        level: 1,
        parentId: null,
        children: [],
        prdmaingrp: row.prdmaincat
      };
      mainGroups.set(row.prdmaincat, group);
      tree.push(group);
    }
  });

  // Process sub groups (level 2)
  rawData?.forEach(row => {
    if (row.prdmaincat && row.prdsubcat) {
      const mainGroup = mainGroups.get(row.prdmaincat);
      if (mainGroup) {
        // Check if this subcategory already exists
        const existingSubGroup = mainGroup.children?.find(
          child => child.name === row.prdsubcat
        );
        
        if (!existingSubGroup) {
          const subGroup: ProductGroup = {
            id: `sub_${row.prdmaincat}_${row.prdsubcat}`,
            name: row.prdsubcat,
            level: 2,
            parentId: mainGroup.id,
            prdsubgrp: row.prdsubcat,
            productCount: row.product_count
          };
          mainGroup.children = mainGroup.children || [];
          mainGroup.children.push(subGroup);
        }
      }
    }
  });

  return tree;
};
