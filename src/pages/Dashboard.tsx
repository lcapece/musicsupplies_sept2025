import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import CategoryTree from '../components/CategoryTree';
import ProductTable from '../components/ProductTable';
import SearchBar from '../components/SearchBar';
import Header from '../components/Header';
import OrderHistory from './OrderHistory';
import WebOrdersDisplay from './WebOrdersDisplay';
import { Product, User as AuthUser, RtExtended } from '../types'; // Assuming User type is exported from types
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import ImageComingSoon from '../images/coming-soon.png';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import PromotionalPopupModal, { PromotionalOffersStatus } from '../components/PromotionalPopupModal';
import PromoCodePopup from '../components/PromoCodePopup'; // Import the PromoCodePopup component

const Dashboard: React.FC = () => {
  const { user } = useAuth(); // Get user from AuthContext
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
  const [rtExtendedData, setRtExtendedData] = useState<RtExtended | null>(null); // New state for rt_extended data
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
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [promoStatusData, setPromoStatusData] = useState<PromotionalOffersStatus | null>(null);
  const [showPromoCodePopup, setShowPromoCodePopup] = useState(false); // State for PromoCodePopup

  useEffect(() => {
    fetchProducts();
    setSelectedProductForImage(null);
  }, [selectedMainCategory, selectedSubCategory, searchTerms, inStockOnly]);

  useEffect(() => {
    const fetchAndShowPromoPopup = async () => {
      // TEMPORARILY DISABLED due to CORS errors
      // Will be fixed when Edge Functions are properly deployed
      console.log('Promotional offers status functionality temporarily disabled');
      
      // ORIGINAL CODE (commented out until Edge Functions are deployed)
      /*
      if (user && user.accountNumber !== '999' && typeof user.id === 'number') {
        const promoShownKey = `promoPopupShown_session_${user.id}`;
        const alreadyShownThisSession = sessionStorage.getItem(promoShownKey);

        if (!alreadyShownThisSession) {
          try {
            const { data, error } = await supabase.functions.invoke('get-promotional-offers-status', {
              body: { account_id: user.id },
            });
            if (error) throw error;

            if (data && (data.introductoryPromo || data.everydayDiscount)) {
              setPromoStatusData(data);
              setShowPromoPopup(true);
              sessionStorage.setItem(promoShownKey, 'true'); // Mark as shown for this session
            }
          } catch (err) {
            console.error("Error fetching promotional offers status:", err);
          }
        }
      }
      */
    };
    fetchAndShowPromoPopup();
  }, [user]);
  
  // Effect to check and show promo codes
  useEffect(() => {
    const checkForPromoCodes = async () => {
      if (user && user.accountNumber !== '999') {
        const promoCodeShownKey = `promoCodeShown_session_${user.accountNumber}`;
        const alreadyShownThisSession = sessionStorage.getItem(promoCodeShownKey);
        
        if (!alreadyShownThisSession) {
          // Show promo code popup after a short delay to avoid overwhelming the user
          setTimeout(() => {
            setShowPromoCodePopup(true);
            sessionStorage.setItem(promoCodeShownKey, 'true');
          }, 1000);
        }
      }
    };
    
    checkForPromoCodes();
  }, [user]);

  // Effect to load product image with priority logic
  // Effect to fetch rt_extended data when a product is selected
  useEffect(() => {
    const fetchRtExtendedData = async () => {
      if (selectedProductForImage) {
        const { data, error } = await supabase
          .from('rt_extended')
          .select('*')
          .eq('partnumber', selectedProductForImage.partnumber)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
          console.error('Error fetching rt_extended data:', error);
          setRtExtendedData(null);
        } else if (data) {
          setRtExtendedData(data);
        } else {
          setRtExtendedData(null);
        }
      } else {
        setRtExtendedData(null);
      }
    };

    fetchRtExtendedData();
  }, [selectedProductForImage]);

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
            console.warn(`[Dashboard] Image load warning for ${url}:`, eventOrMessage); // Changed from console.error to console.warn
            reject(eventOrMessage);
          };
          img.src = url;
        });
      };

      const tryLoadImages = async () => {
        // 1. Check rt_extended for image_name and local src/images folder
        if (rtExtendedData?.image_name) {
          const localImageName = rtExtendedData.image_name.toLowerCase();
          const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif']; // Common image extensions

          for (const ext of imageExtensions) {
            const localImagePath = `/src/images/${localImageName}${ext}`;
            // Check if the file exists locally (this is a client-side check, won't actually verify file existence on server)
            // For a true check, you'd need a server endpoint or to list all images in src/images at build time.
            // For now, we'll assume if the path is constructed, it might exist.
            // A more robust solution would involve pre-loading all image names or a server endpoint.
            // Given the current setup, we'll try to load it and see if it fails.
            try {
              const response = await fetch(localImagePath);
              if (response.ok) {
                setCurrentImageUrl(localImagePath);
                foundImage = true;
                return;
              }
            } catch (e) {
              console.warn(`[Dashboard] Local image check failed for ${localImagePath}:`, e);
            }
          }
        }

        // 2. If no local image found, proceed with S3 logic
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
        if (!foundImage && await attemptLoadSequence(partNumberOriginal, "original")) {
          foundImage = true;
          return;
        }
        
        // --- Fallback 1: Strip one suffix from part number and retry ---
        let currentPnToTry = partNumberOriginal;
        let lastHyphenIndex = currentPnToTry.lastIndexOf('-');
        
        if (!foundImage && lastHyphenIndex > 0) {
          currentPnToTry = currentPnToTry.substring(0, lastHyphenIndex);
          console.log(`[Dashboard] Full PN attempts failed. Trying base PN (1st strip): ${currentPnToTry}`);
          if (await attemptLoadSequence(currentPnToTry, "stripped_1")) {
            foundImage = true;
            return;
          }

          // --- Fallback 2: Strip a second suffix (if possible) and retry ---
          lastHyphenIndex = currentPnToTry.lastIndexOf('-');
          if (!foundImage && lastHyphenIndex > 0) {
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
  }, [selectedProductForImage, showImageAndSpecs, rtExtendedData]); // Add rtExtendedData to dependencies

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
      console.log('Fetching products for:', { selectedMainCategory, selectedSubCategory, searchTerms, inStockOnly });
      console.log('Category filters being applied:', { mainCategory: selectedMainCategory, subCategory: selectedSubCategory }); // Added for debugging
      let query = supabase.from('products_supabase').select('*');

      // Re-enabling filters after fixing category mapping
      // Construct filter string manually to ensure exact matching
      if (selectedMainCategory && selectedSubCategory) {
        query = query.filter('prdmaincat', 'ilike', selectedMainCategory)
                     .filter('prdsubcat', 'eq', selectedSubCategory);
      } else if (selectedMainCategory) {
        query = query.filter('prdmaincat', 'ilike', selectedMainCategory);
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

      // Log the fetched data
      console.log('Fetched raw product data:', data);

      setProducts(data || []);
      console.log('Products state after setProducts:', data); // Added for debugging
      console.log('Products state after setProducts:', data); // Added for debugging
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Updated to match CategorySelection type from CategoryTree.tsx
  const handleCategorySelect = (selection: import('../components/CategoryTree').CategorySelection | null) => {
    setSearchQuery('');
    setSearchTerms({ primary: '', additional: '', exclude: '' });
    setSelectedProductForImage(null); 

    if (selection) {
      setSelectedCategoryId(selection.id); // selection.id is the category_code of the selected node
      const { namePath, isMainCategory, parentCategoryCode } = selection;
      
      if (isMainCategory) {
        setSelectedMainCategory(namePath[0]); // Use the name for main category
        setSelectedSubCategory(undefined);
        setSelectedMainCategoryName(namePath[0]);
        setSelectedSubCategoryName(undefined);
      } else { // It's a subcategory
        setSelectedMainCategory(namePath[0]); // Use the name for main category
        // For selectedSubCategory, we need the actual prdsubcat value, which is the subcategory's name.
        // namePath[1] should be the subcategory name.
        setSelectedSubCategory(namePath[1]);
        setSelectedMainCategoryName(namePath[0]);
        setSelectedSubCategoryName(namePath[1]);
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
                  <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
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
                  <div className="mb-4 flex items-center space-x-6">
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
                    <div className={`flex flex-col ${showImageAndSpecs ? 'lg:flex-row' : ''} gap-6`}>
                      <div className={`${showImageAndSpecs ? 'lg:w-2/3' : 'w-full'}`}>
                        <ProductTable 
                          products={sortedProducts}
                          requestSort={requestSort}
                          sortConfig={sortConfig}
                          title={searchQuery ? `Search Results for "${searchQuery}"` : (selectedMainCategoryName || 'Products')}
                          onRowClick={(product) => setSelectedProductForImage(product)} // Handle row click
                        />
                      </div>
                      {showImageAndSpecs && selectedProductForImage && (
                        <div className="lg:w-1/3 bg-white p-4 rounded-lg shadow">
                          <h3 className="text-lg font-semibold mb-2">
                            {selectedProductForImage.partnumber} - Image & Specs
                          </h3>
                          <div className="mb-4 flex justify-center">
                            <img 
                              src={currentImageUrl} // Use state for image URL
                              alt={selectedProductForImage.description || selectedProductForImage.partnumber}
                              className="max-h-[550px] w-auto object-contain rounded border"
                              // onError is less critical now as pre-loading sets placeholder
                            />
                          </div>
                          <div>
                            <h4 className="font-medium mb-1">Specifications:</h4>
                            <p className="text-sm text-gray-600 mb-2">{selectedProductForImage.description}</p>
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                              <li>Net Price: ${selectedProductForImage.price?.toFixed(2) ?? 'N/A'}</li>
                              <li>List Price: ${selectedProductForImage.webmsrp !== undefined && selectedProductForImage.webmsrp !== null ? selectedProductForImage.webmsrp.toFixed(2) : 'N/A'}</li>
                              <li>Inventory: {selectedProductForImage.inventory ?? 'N/A'}</li>
                            </ul>
                            
                            <div className="mt-3">
                              {rtExtendedData?.ext_descr ? (
                                <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: rtExtendedData.ext_descr }} />
                              ) : (
                                <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: selectedProductForImage.longdescription || 'No additional description available' }} />
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                       {showImageAndSpecs && !selectedProductForImage && (
                        <div className="lg:w-1/3 bg-white p-4 rounded-lg shadow flex items-center justify-center">
                          <p className="text-gray-500">Select a product to view its image and specs.</p>
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

      {promoStatusData && (
        <PromotionalPopupModal
          isOpen={showPromoPopup}
          onClose={() => setShowPromoPopup(false)}
          promoStatus={promoStatusData}
        />
      )}
      
      {/* Promo Code Popup */}
      <PromoCodePopup
        isOpen={showPromoCodePopup}
        onClose={() => setShowPromoCodePopup(false)}
      />
    </div>
  );
};

export default Dashboard;
