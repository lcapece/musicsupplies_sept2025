import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
// Assuming a TreeView component exists or will be created/imported
// For now, let's use a placeholder or adapt CategoryTree if suitable
// import TreeViewComponent from '../TreeViewComponent'; // Placeholder
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'; // Icons

// Define the structure of a tree node based on treeview_datasource
interface TreeNode {
  id: string; // Or number, depending on your view's id type
  name: string;
  parent_id: string | null; // Or number
  children?: TreeNode[];
  // Potentially other fields from treeview_datasource like 'type', 'item_id'
  description?: string; // For icon matching
  icon?: JSX.Element; // For SVG icon
  is_main_branch?: boolean; // To identify main branches
}

const ManageTreeviewTab: React.FC = () => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useForSiteNavigation, setUseForSiteNavigation] = useState(true); // Default checked

  const fetchDataFromView = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: viewError } = await supabase
        .from('treeview_datasource') // Ensure this view name is correct
        .select('*')
        // Add ordering if necessary, e.g., by a sort_order column or name
        .order('name', { ascending: true }); 

      if (viewError) {
        throw viewError;
      }

      // TODO: Transform flat data from view into a hierarchical structure if needed
      // For now, assuming data might already be somewhat structured or easily transformable
      // This transformation logic will depend on the structure of 'treeview_datasource'
      const transformedData = buildTree(data || []);
      setTreeData(transformedData);

    } catch (err: any) {
      console.error('Error fetching treeview data:', err);
      setError(`Failed to load tree data: ${err.message}`);
      setTreeData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDataFromView();
  }, [fetchDataFromView]);

  // Helper function to build tree structure (simple version)
  // This needs to be adapted based on your actual data structure from treeview_datasource
  const buildTree = (items: any[], parentId: string | null = null): TreeNode[] => {
    return items
      .filter(item => item.parent_id === parentId)
      .map(item => {
        const node: TreeNode = {
          id: item.id, // Ensure 'id' field exists and is unique
          name: item.name, // Ensure 'name' field exists
          parent_id: item.parent_id,
          description: item.description || item.name, // For icon matching
          is_main_branch: !item.parent_id, // Example: root items are main branches
          children: buildTree(items, item.id)
        };
        // TODO: Add SVG icon logic here based on node.description and node.is_main_branch
        if (node.is_main_branch) {
          // node.icon = getIconForCategory(node.description); // Placeholder
        }
        return node;
      });
  };
  
  // Placeholder for rendering the tree - replace with actual TreeView component
  const renderTreeNodes = (nodes: TreeNode[]): JSX.Element => {
    return (
      <ul className="pl-4">
        {nodes.map(node => (
          <li key={node.id} className="my-1">
            <div className="flex items-center">
              {node.children && node.children.length > 0 && (
                <ChevronRight size={16} className="mr-1" /> // Basic expand icon
              )}
              {node.icon && <span className="mr-2">{node.icon}</span>}
              <span>{node.name}</span>
            </div>
            {node.children && node.children.length > 0 && (
              // Recursive call for children, ideally handled by TreeView component
              renderTreeNodes(node.children) 
            )}
          </li>
        ))}
      </ul>
    );
  };


  const handleRefresh = () => {
    fetchDataFromView();
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUseForSiteNavigation(e.target.checked);
    // TODO: Add logic to persist this setting (e.g., to localStorage or Supabase settings table)
    // And logic to trigger update of main site navigation if this is checked.
    if (e.target.checked) {
      console.log("Tree view will be used for site navigation. Data:", treeData);
      // Example: saveTreeDataForSiteNavigation(treeData);
    } else {
      console.log("Tree view will NOT be used for site navigation.");
      // Example: clearTreeDataForSiteNavigation();
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Manage Treeview</h2>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-medium text-gray-700">Treeview Preview</h3>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw size={18} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh Tree View'}
          </button>
        </div>
        
        {error && <div className="text-red-600 bg-red-100 p-3 rounded-md mb-4">{error}</div>}
        
        <div className="border border-gray-300 rounded-md p-4 min-h-[300px] bg-gray-50 overflow-auto">
          {treeData.length > 0 ? renderTreeNodes(treeData) : <p className="text-gray-500">No tree data to display. Try refreshing.</p>}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-medium text-gray-700 mb-4">Settings</h3>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="useForSiteNavigation"
            checked={useForSiteNavigation}
            onChange={handleCheckboxChange}
            className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="useForSiteNavigation" className="ml-3 block text-md font-medium text-gray-700">
            Use this Tree View for site product navigation
          </label>
        </div>
        {useForSiteNavigation && (
          <p className="mt-2 text-sm text-gray-600">
            When checked, the tree structure previewed above will be used for the main product category navigation on the customer-facing site.
          </p>
        )}
      </div>
    </div>
  );
};

export default ManageTreeviewTab;
