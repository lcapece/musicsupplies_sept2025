import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronDown, ChevronRight, RefreshCw, Guitar, Speaker, Drum, Music, Cable, HelpCircle } from 'lucide-react';

interface FetchedItem { 
  prdmaincat: string;
  prdsubcat: string | null; // Though user says it's never null, keep type for safety. Logic will adapt.
}

interface TreeNode {
  id: string; 
  name: string; 
  parent_id: string | null; 
  children?: TreeNode[];
  is_main_category: boolean; 
  icon_name: string | null; 
  // Store the original fetched item for reference, primarily prdmaincat and prdsubcat
  originalItemData: FetchedItem; 
}

const ManageTreeviewTab: React.FC = () => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useForSiteNavigation, setUseForSiteNavigation] = useState(() => {
    const storedValue = localStorage.getItem('musicSupplies_useTreeViewForNavigation');
    return storedValue !== null ? JSON.parse(storedValue) : true; 
  });

  const fetchDataFromView = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    console.log('[ManageTreeviewTab] Fetching data (prdmaincat, prdsubcat only)...');
    try {
      const { data, error: viewError } = await supabase
        .from('treeview_datasource') 
        .select('prdmaincat, prdsubcat') 
        .order('prdmaincat', { ascending: true })
        .order('prdsubcat', { ascending: true }); // nullsFirst might not be needed if prdsubcat is never null

      if (viewError) {
        console.error('[ManageTreeviewTab] Supabase query error:', viewError.message);
        throw viewError; 
      }
      
      const fetchedItems: FetchedItem[] = (data || []).filter(
        // Ensure prdmaincat is present, as it's key for structure
        (item): item is FetchedItem => typeof item.prdmaincat === 'string' && item.prdmaincat.trim() !== ''
      );
      console.log('[ManageTreeviewTab] Fetched and filtered items:', fetchedItems);

      if (fetchedItems.length === 0 && (data && data.length > 0)) {
        console.warn('[ManageTreeviewTab] All items filtered out due to missing prdmaincat.');
      }
      
      const transformedData = buildTree(fetchedItems);
      console.log('[ManageTreeviewTab] Transformed tree data:', transformedData);
      setTreeData(transformedData);

      if (transformedData.length === 0 && fetchedItems.length > 0) {
        console.warn('[ManageTreeviewTab] buildTree resulted in empty array, but source items were present. Check data structure and buildTree logic.');
      }

    } catch (err: any) {
      console.error('[ManageTreeviewTab] Error in fetchDataFromView:', err);
      setError(`Failed to load tree data: ${err.message}`);
      setTreeData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDataFromView();
  }, [fetchDataFromView]);

  useEffect(() => {
    localStorage.setItem('musicSupplies_useTreeViewForNavigation', JSON.stringify(useForSiteNavigation));
    if (useForSiteNavigation && treeData.length > 0) {
      const serializableTreeData = treeData.map(node => ({
        id: node.id,
        name: node.name,
        parent_id: node.parent_id,
        is_main_category: node.is_main_category,
        icon_name: node.icon_name,
        children: node.children ? 간단하게_직렬화된_자식_노드_배열(node.children) : undefined,
        prdmaincat: node.originalItemData.prdmaincat,
        prdsubcat: node.originalItemData.prdsubcat,
      }));
      localStorage.setItem('musicSupplies_siteNavigationTreeData', JSON.stringify(serializableTreeData));
    } else if (!useForSiteNavigation) {
      // localStorage.removeItem('musicSupplies_siteNavigationTreeData');
    }
  }, [useForSiteNavigation, treeData]);

  const 간단하게_직렬화된_자식_노드_배열 = (nodes: TreeNode[]): any[] => {
    return nodes.map(node => ({
      id: node.id,
      name: node.name,
      parent_id: node.parent_id,
      is_main_category: node.is_main_category,
      icon_name: node.icon_name,
      children: node.children ? 간단하게_직렬화된_자식_노드_배열(node.children) : undefined,
      prdmaincat: node.originalItemData.prdmaincat,
      prdsubcat: node.originalItemData.prdsubcat,
    }));
  };

  const buildTree = (items: FetchedItem[], currentParentMainCat: string | null = null): TreeNode[] => {
    const treeNodes: TreeNode[] = [];

    if (currentParentMainCat === null) { // Call for root level - identify main categories
      const uniqueMainCats = new Map<string, FetchedItem>();
      items.forEach(item => {
        if (item.prdmaincat) { // Ensure prdmaincat exists
          // A main category is represented by a unique prdmaincat value.
          // We use the first item encountered for a given prdmaincat as its representative.
          // If there are rows that explicitly define main categories (e.g., prdsubcat is a specific value like itself or empty), that logic would be better.
          // Given "prdsubcat is never null", we assume all rows are subcats, and main cats are implicit.
          if (!uniqueMainCats.has(item.prdmaincat)) {
            uniqueMainCats.set(item.prdmaincat, { prdmaincat: item.prdmaincat, prdsubcat: null }); // Synthetic main cat item
          }
        }
      });

      uniqueMainCats.forEach(mainItemRep => {
        const children = buildTree(items, mainItemRep.prdmaincat);
        treeNodes.push({
          id: mainItemRep.prdmaincat,
          name: mainItemRep.prdmaincat, 
          parent_id: null,
          is_main_category: true,
          icon_name: mainItemRep.prdmaincat, 
          children: children.length > 0 ? children : undefined,
          originalItemData: mainItemRep, 
        });
      });
    } else { // Call for subcategories - currentParentMainCat is the prdmaincat of the parent
      items.forEach(item => {
        // A row is a subcategory of currentParentMainCat if its prdmaincat matches
        // AND it has a prdsubcat (user states prdsubcat is never null).
        if (item.prdmaincat === currentParentMainCat && item.prdsubcat) {
          treeNodes.push({
            id: `${item.prdmaincat}_${item.prdsubcat}`,
            name: item.prdsubcat, 
            parent_id: item.prdmaincat,
            is_main_category: false,
            icon_name: null, 
            children: undefined, 
            originalItemData: item,
          });
        }
      });
    }
    return treeNodes.sort((a,b) => a.name.localeCompare(b.name));
  };
  
  const TreeNodeDisplay: React.FC<{ node: TreeNode; level: number }> = ({ node, level }) => {
    const [isOpen, setIsOpen] = useState(level < 1); 

    return (
      <li className="my-1 list-none"> 
        <div 
          className="flex items-center py-1 px-2 rounded hover:bg-gray-100 cursor-pointer"
          style={{ paddingLeft: `${level * 1.5}rem` }}
          onClick={() => node.children && setIsOpen(!isOpen)}
        >
          {node.children && node.children.length > 0 ? (
            isOpen ? <ChevronDown size={16} className="mr-2 text-gray-600 shrink-0" /> : <ChevronRight size={16} className="mr-2 text-gray-600 shrink-0" />
          ) : (
            <span className="w-4 mr-2 shrink-0"></span> 
          )}
          
          {node.is_main_category && (
            <span className="mr-2 h-5 w-5 flex items-center justify-center shrink-0">
              {getLucideIcon(node.icon_name)}
            </span>
          )}

          <span className={`text-sm ${node.is_main_category ? 'font-semibold text-gray-700' : 'text-gray-600'}`}>
            {node.name}
          </span>
        </div>
        {isOpen && node.children && node.children.length > 0 && (
          <ul className="pl-0"> 
            {node.children.map(childNode => (
              <TreeNodeDisplay key={childNode.id} node={childNode} level={level + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  };

  const getLucideIcon = (iconName: string | null): JSX.Element => {
    if (!iconName) return <HelpCircle size={18} className="text-gray-400" />;
    const name = iconName.toLowerCase();
    if (name.includes('fretted') || name.includes('guitar')) return <Guitar size={18} className="text-gray-600" />;
    if (name.includes('amp') || name.includes('speaker') || name.includes('sound')) return <Speaker size={18} className="text-gray-600" />;
    if (name.includes('drum') || name.includes('percussion')) return <Drum size={18} className="text-gray-600" />;
    if (name.includes('cable')) return <Cable size={18} className="text-gray-600" />;
    if (name.includes('instructional') || name.includes('keyboards') || name.includes('pianos')) return <Music size={18} className="text-gray-600" />;
    return <HelpCircle size={18} className="text-gray-400" />; 
  };

  const renderTreeNodes = (nodes: TreeNode[]): JSX.Element => {
    if (!nodes || nodes.length === 0) {
      return <p className="text-gray-500">No tree data to display. Try refreshing.</p>;
    }
    return (
      <ul className="pl-0"> 
        {nodes.map(node => (
          <TreeNodeDisplay key={node.id} node={node} level={0} />
        ))}
      </ul>
    );
  };

  const handleRefresh = () => {
    fetchDataFromView();
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setUseForSiteNavigation(isChecked);
    if (isChecked) {
      console.log("Tree view will be used for site navigation. Current tree data saved to localStorage.");
      if (treeData.length > 0) {
         const serializableTreeData = treeData.map(node => ({
            id: node.id,
            name: node.name,
            parent_id: node.parent_id,
            is_main_category: node.is_main_category,
            icon_name: node.icon_name,
            children: node.children ? 간단하게_직렬화된_자식_노드_배열(node.children) : undefined,
            prdmaincat: node.originalItemData.prdmaincat,
            prdsubcat: node.originalItemData.prdsubcat,
          }));
        localStorage.setItem('musicSupplies_siteNavigationTreeData', JSON.stringify(serializableTreeData));
      }
    } else {
      console.log("Tree view will NOT be used for site navigation.");
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
