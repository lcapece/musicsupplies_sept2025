import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import CategoryTree from '../components/CategoryTree';
import ProductTable from '../components/ProductTable';
import SearchBar from '../components/SearchBar';
import Header from '../components/Header';
import OrderHistory from '../pages/OrderHistory';
import WebOrdersDisplay from '../pages/WebOrdersDisplay'; // Importing the new component
import { Product } from '../types';
import { useMemo } from 'react'; // Import useMemo
import { Link } from 'react-router-dom'; // Import Link for footer
import ImageComingSoon from '../images/coming-soon.png'; // Import the placeholder image

const Dashboard: React.FC = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | null; direction: 'ascending' | 'descending' }>({ key: 'partnumber', direction: 'ascending' });
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | undefined>();
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | undefined>();
  // States for category names
  const [selectedMainCategoryName, setSelectedMainCategoryName] = useState<string | undefined>();
  const [selectedSubCategoryName, setSelectedSubCategoryName] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showImageAndSpecs, setShowImageAndSpecs] = useState(true); // Changed to true for default checked
  const [selectedProductForImage, setSelectedProductForImage] = useState<Product | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(ImageComingSoon); // State for the image URL to display
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
    setSelectedProductForImage(null);
  }, [selectedMainCategory, selectedSubCategory, searchTerms, inStockOnly]);

  // Effect to load product image with priority logic
  useEffect(() => {
    if (showImageAndSpecs && selectedProductForImage) {
      const partNumberOriginal = selectedProductForImage.partnumber; // Use original case from database
      const s3BaseUrl = `https://mus86077.s3.amazonaws.com/`; // CORRECTED BUCKET NAME
      // Suffixes based on S3 screenshot (e.g., GV-1310-2.jpg, GV-1310-2S.jpg)
      const suffixes = ['-2', '-1', '-0', '-2S', '-2T']; // Match case from S3 screenshot
      let foundImage = false;

      const loadImage = (url: string): Promise<void> => { // Promise<void> as we only care about success/failure
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = (eventOrMessage) => { // The argument can be an Event or a string
            console.error(`[Dashboard] Image load error for ${url}:`, eventOrMessage); // Log the raw error/event
            reject(eventOrMessage);
          };
          img.src = url;
        });
      };

      const tryLoadImages = async () => {
        const attemptLoadSequence = async (pnBase: string, attemptType: string): Promise<boolean> => {
          // Try suffixed versions with original case of pnBase
          for (const s3Suffix of suffixes) {
            const url = `${s3BaseUrl}${pnBase}${s3Suffix}.jpg`;
            console.log(`[Dashboard] Attempting (${attemptType} pn: ${pnBase}, s3Suffix: ${s3Suffix}): ${url}`);
            try { await loadImage(url); setCurrentImageUrl(url); console.log(`[Dashboard] Success: ${url}`); return true; } catch (e) { /* continue */ }
          }
          // Try direct match with original case of pnBase
          const directUrl = `${s3BaseUrl}${pnBase}.jpg`;
          console.log(`[Dashboard] Attempting direct (${attemptType} pn: ${pnBase}): ${directUrl}`);
          try { await loadImage(directUrl); setCurrentImageUrl(directUrl); console.log(`[Dashboard] Success direct: ${directUrl}`); return true; } catch (e) { /* continue */ }

          // Try suffixed versions with lowercase pnBase
          const pnBaseLower = pnBase.toLowerCase();
          // Only attempt lowercase if it's different from original case, to avoid redundant checks if pnBase is already lowercase
          if (pnBaseLower !== pnBase) { 
            for (const s3Suffix of suffixes.map(s => s.toLowerCase())) { // Ensure S3 suffixes are also lowercase for this block
              const lcUrlSuffix = `${s3BaseUrl}${pnBaseLower}${s3Suffix}.jpg`;
              console.log(`[Dashboard] Attempting (lc ${attemptType} pn: ${pnBaseLower}, lc s3Suffix: ${s3Suffix}): ${lcUrlSuffix}`);
              try { await loadImage(lcUrlSuffix); setCurrentImageUrl(lcUrlSuffix); console.log(`[Dashboard] Success: ${lcUrlSuffix}`); return true; } catch (e) { /* continue */ }
            }
            // Try direct match with lowercase pnBase
            const lcDirectUrl = `${s3BaseUrl}${pnBaseLower}.jpg`;
            console.log(`[Dashboard] Attempting direct (lc ${attemptType} pn: ${pnBaseLower}): ${lcDirectUrl}`);
            try { await loadImage(lcDirectUrl); setCurrentImageUrl(lcDirectUrl); console.log(`[Dashboard] Success direct: ${lcDirectUrl}`); return true; } catch (e) { /* continue */ }
          }
          return false;
        };

        // --- Main attempt with full original part number ---
        if (await attemptLoadSequence(partNumberOriginal, "original")) {
          foundImage = true;
          return;
        }
        
        // --- Fallback 1: Strip one suffix from part number and retry ---
        let currentPnToTry = partNumberOriginal;
        let lastHyphenIndex = currentPnToTry.lastIndexOf('-');
        
        if (lastHyphenIndex > 0) {
          currentPnToTry = currentPnToTry.substring(0, lastHyphenIndex);
          console.log(`[Dashboard] Full PN attempts failed. Trying base PN (1st strip): ${currentPnToTry}`);
          if (await attemptLoadSequence(currentPnToTry, "stripped_1")) {
            foundImage = true;
            return;
          }

          // --- Fallback 2: Strip a second suffix (if possible) and retry ---
          lastHyphenIndex = currentPnToTry.lastIndexOf('-');
          if (lastHyphenIndex > 0) {
            currentPnToTry = currentPnToTry.substring(0, lastHyphenIndex);
            console.log(`[Dashboard] 1st stripped PN attempts failed. Trying base PN (2nd strip): ${currentPnToTry}`);
            if (await attemptLoadSequence(currentPnToTry, "stripped_2")) {
              foundImage = true;
              return;
            }
          }
        }
        // This is where foundImage is checked after all attempts.
        // If still false, the placeholder will be set by the IIFE.
      };
      
      // IIFE to manage placeholder flashing
      (async () => {
        // Do not set placeholder here initially to prevent flash
        // setCurrentImageUrl(ImageComingSoon); 
        await tryLoadImages();
        if (!foundImage) {
          console.log('[Dashboard] All image attempts failed, using placeholder.');
          setCurrentImageUrl(ImageComingSoon);
        }
      })();

    } else {
      setCurrentImageUrl(ImageComingSoon); // Reset to placeholder if panel is hidden or no product selected
    }
  }, [selectedProductForImage, showImageAndSpecs]);

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
      let query = supabase.from('products_supabase').select('*');

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
    setSelectedProductForImage(null); // Reset selected product

    if (selection) {
      setSelectedCategoryId(selection.id);
      const { namePath, level } = selection;
      
      // Extract category codes from ID (main_CODE, sub_MAIN_CODE)
      const idParts = selection.id.split('_');
      const type = idParts[0]; // 'main' or 'sub'
      
      if (type === 'main' && namePath.length >= 1) {
        setSelectedMainCategory(idParts.slice(1).join('_'));
        setSelectedSubCategory(undefined);
        setSelectedMainCategoryName(namePath[0]);
        setSelectedSubCategoryName(undefined);
      } else if (type === 'sub' && namePath.length >= 2) {
        setSelectedMainCategory(idParts[1]);
        setSelectedSubCategory(idParts.slice(2).join('_'));
        setSelectedMainCategoryName(namePath[0]);
        setSelectedSubCategoryName(namePath[1]);
      } else {
        // Fallback or error case if path and id don't align, clear all
        setSelectedMainCategory(undefined);
        setSelectedSubCategory(undefined);
        setSelectedMainCategoryName(undefined);
        setSelectedSubCategoryName(undefined);
        setSelectedCategoryId(null);
      }
    } else {
      // Deselection: clear all category related states
      setSelectedCategoryId(null);
      setSelectedMainCategory(undefined);
      setSelectedSubCategory(undefined);
      setSelectedMainCategoryName(undefined);
      setSelectedSubCategoryName(undefined);
    }
  };
  
  const handleSearch = (primaryQuery: string, additionalQuery: string, excludeQuery: string) => { // Removed showInStock parameter
    setSearchQuery(primaryQuery);
    // setInStockOnly is now handled by its own checkbox onChange
    setSearchTerms({
      primary: primaryQuery,
      additional: additionalQuery,
      exclude: excludeQuery
    });
    setSelectedProductForImage(null); // Reset selected product
    setSelectedMainCategory(undefined);
    setSelectedSubCategory(undefined);
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
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 mb-2 sm:mb-0">
                      {(() => {
                        const path = [];
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

                    {/* Toggles Container */}
                    <div className="flex items-center space-x-6">
                      {/* Toggle for Show Images & Specs */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="showImageAndSpecs"
                          checked={showImageAndSpecs}
                          onChange={(e) => {
                            setShowImageAndSpecs(e.target.checked);
                            if (!e.target.checked) {
                              setSelectedProductForImage(null); // Clear selection when hiding
                            }
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="showImageAndSpecs" className="ml-2 block text-sm text-gray-900">
                          Show Images & Specs
                        </label>
                      </div>

                      {/* Toggle for Show In-Stock Items Only */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="inStockOnly"
                          checked={inStockOnly}
                          onChange={(e) => setInStockOnly(e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="inStockOnly" className="ml-2 block text-sm text-gray-900">
                          Show In-Stock Items Only
                        </label>
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-8 bg-white rounded-lg shadow">
                      <p className="text-gray-500">Loading products...</p>
                    </div>
                  ) : sortedProducts.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-lg shadow">
                      <p className="text-gray-500">There are no active products in this category at the moment.</p>
                    </div>
                  ) : (
                    // Product Table and Image/Specs Area
                    <div>
                        <ProductTable 
                          products={sortedProducts}
                          requestSort={requestSort}
                          sortConfig={sortConfig}
                          title={searchQuery ? `Search Results for "${searchQuery}"` : (selectedMainCategoryName || 'Products')}
                          onRowClick={(product) => setSelectedProductForImage(product)} // Handle row click
                          className="block w-full" {/* Added className directly to ProductTable */}
                        />
                      {showImageAndSpecs && (
                        <div className="block w-full mt-6 bg-white p-4 rounded-lg shadow">
                          {selectedProductForImage ? (
                            <>
                              <h3 className="text-lg font-semibold mb-2">
                                {selectedProductForImage.partnumber} - Image & Specs
                              </h3>
                              <div className="mb-4 flex justify-center">
                                <img 
                                  src={currentImageUrl} // Use state for image URL
                                  alt={selectedProductForImage.description || selectedProductForImage.partnumber}
                                  className="max-h-[550px] w-auto object-contain rounded border"
                                />
                              </div>
                              <div>
                                <h4 className="font-medium mb-1">Specifications:</h4>
                                <p className="text-sm text-gray-600 mb-2">{selectedProductForImage.description}</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                  <li>Net Price: ${selectedProductForImage.price?.toFixed(2) ?? 'N/A'}</li>
                                  <li>List Price: ${selectedProductForImage.webmsrp ?? 'N/A'}</li>
                                  <li>Inventory: {selectedProductForImage.inventory ?? 'N/A'}</li>
                                </ul>
                                
                                <div className="mt-3">
                                  <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: selectedProductForImage.longdescription || 'No additional description available' }} />
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-center py-8">
                              <p className="text-gray-500">Select a product to view its image and specs.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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

</file_content>

Now that you have the latest state of the file, try the operation again with fewer, more precise SEARCH blocks. For large files especially, it may be prudent to try to limit yourself to <5 SEARCH/REPLACE blocks at a time, then wait for the user to respond with the result of the operation before following up with another replace_in_file call to make additional edits.
(If you run into this error 3 times in a row, you may use the write_to_file tool as a fallback.)
</error><environment_details>
# VSCode Visible Files
../../VSCode/src/components/ShoppingCart.tsx
../../VSCode/src/components/ShoppingCart.tsx
src/components/Dashboard.tsx

# VSCode Open Tabs
supabase/migrations/20250517181000_add_test_accounts.sql
src/invoices/invoice.css
src/pages/OrderHistory.tsx
supabase/migrations/20250517181100_create_production_ordhist.sql
supabase/migrations/20250517184100_add_test_orders.sql
src/invoices/invoice.html
supabase/migrations/20250611080834_add_introductory_promo.sql
src/components/admin/DiscountManagementTab.tsx
supabase/functions/assign-introductory-promo-to-account/index.ts
supabase/functions/_shared/cors.ts
supabase/functions/get-applicable-intro-promo/index.ts
supabase/functions/record-intro-promo-usage/index.ts
src/components/ShoppingCart.tsx
supabase/migrations/20250611084754_ensure_web_orders_table.sql
supabase/functions/get-promotional-offers-status/index.ts
src/components/PromotionalPopupModal.tsx
supabase/migrations/20250605080500_consolidate_accounts_password_logic.sql
supabase/migrations/20250610132000_create_login_activity_log_table.sql
src/context/AuthContext.tsx
supabase/migrations/20250605021000_final_authenticate_fix.sql
fix_login_now.sql
fix_password_modal_now.sql
src/components/PasswordChangeModal.tsx
src/context/CartContext.tsx
src/pages/Dashboard.tsx
supabase/migrations/20250611103000_fix_authenticate_function_final.sql
src/components/Login.tsx
src/pages/CustomerAccountPage.tsx
supabase/migrations/20250611_add_is_dirty_to_accounts_lcmd.sql
supabase/migrations/20250611_add_rls_to_treeview_datasource.sql
supabase/migrations/20250610124500_create_treeview_view.sql
src/data/categoryTree.ts
src/components/ProductTable.tsx
src/components/Dashboard.tsx
src/components/ProductImportModal.tsx
supabase/functions/import-products-from-dropbox/index.ts
src/pages/WebOrdersDisplay.tsx
src/pages/AdminAccountApplicationsPage.tsx
src/components/ActiveDiscountDisplayModal.tsx
src/pages/PrivacyPolicyPage.tsx
src/pages/EmailCommunicationsPage.tsx
src/pages/SmsCommunicationsPage.tsx
node_modules/.bin/music_supplies_logo.png
node_modules/favicon.png
public/favicon.png
index.html
src/images/coming-soon.png
src/components/SearchBar.tsx
supabase/migrations/20250530181600_fix_account_101_data.sql
supabase/config.toml
.env
supabase/functions/send-sms-verification/index.ts
supabase/migrations/20250605095500_create_unresolved_issues_table.sql
src/components/admin/UnresolvedIssuesTab.tsx
supabase/functions/send-test-sms/index.ts
supabase/migrations/20250610115000_update_webmsrp_display.sql
src/types/index.ts
supabase/migrations/20250610121500_create_tree_view_data_source.sql
src/components/admin/CategoryManagementTab.tsx
supabase/migrations/20250610125000_fix_treeview_table_access.sql
src/utils/applyMigration.ts
src/components/admin/GeneralSettingsTab.tsx
supabase/migrations/20250610131000_remove_special_account_password_rules.sql
supabase/migrations/20250610131500_drop_authenticate_user_lcmd_function.sql
src/components/admin/HistoryTab.tsx
src/pages/AdminDashboard.tsx
src/components/CategoryTree.tsx
src/utils/iconGenerator.ts
src/components/admin/ManageTreeviewTab.tsx
src/components/admin/ClickSendTab.tsx
src/components/admin/SmsNotificationTab.tsx
src/components/admin/AccountApplicationsTab.tsx
src/pages/NewAccountApplicationPage.tsx
src/lib/errorReporting.ts
src/main.tsx
src/components/ErrorBoundary.tsx
src/App.tsx
supabase/migrations/20250603100000_fix_default_password_logic.sql
IMPORTANT_SUPABASE_CONFIG.md
src/components/admin/ProductGroupManagementTab.tsx
supabase/migrations/20250603140000_update_products_to_two_level_structure.sql
supabase/migrations/20250603143000_fix_requires_password_change_null.sql
supabase/migrations/20250603145000_drop_old_authenticate_function.sql
supabase/migrations/20250603151000_fix_missing_rls_policies.sql
supabase/migrations/20250603152000_fix_rls_policies_for_custom_auth.sql
src/components/admin/AccountsTab.tsx
src/components/admin/MissingSubgroupsTab.tsx
supabase/migrations/20250604120000_add_order_based_discounts.sql
src/components/DiscountFormModal.tsx
supabase/migrations/20250604130000_insert_first_orders_promo.sql
src/components/admin/ProductManagementTab.tsx
src/components/admin/ProductsTab.tsx
../../Users/ryanh/AppData/Roaming/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
supabase/migrations/20250605014900_fix_zip_code_password_logic.sql
supabase/migrations/20250605020000_fix_authenticate_function_parameter_type.sql
src/components/admin/IconGenerationTab.tsx
src/components/OrderConfirmationModal.tsx
CLICKSEND_SMS_SETUP.md
supabase/migrations/20250530174500_create_logon_lcmd_table.sql
test_accounts.md
netlify.toml
Dockerfile
nginx.conf
DEPLOYMENT.md
deploy.sh
deploy.bat
fix_login_manual.sql
supabase/migrations/20250601061500_create_sms_verification_table.sql
supabase/functions/verify-sms-code/index.ts
SMS_VERIFICATION_SETUP.md
supabase/migrations/20250602154000_add_account_115.sql
supabase/migrations/20250602154500_add_password_hashing.sql
src/components/admin/SystemAnalyticsTab.tsx
src/components/admin/OrderManagementTab.tsx
src/components/admin/AccountManagementTab.tsx
supabase/migrations/20250602155000_add_admin_account.sql
src/components/admin/OrderHistoryTab.tsx
supabase/migrations/20250602160000_create_admin_backend.sql
src/components/admin/ManagementTab.tsx
src/components/Header.tsx
src/components/admin/DataSyncTab.tsx
supabase/functions/send-order-sms/index.ts

# Current Time
6/14/2025, 3:42:00 PM (America/New_York, UTC-4:00)

# Context Window Usage
163,992 / 1,048.576K tokens used (16%)

# Current Mode
ACT MODE
</environment_details>
