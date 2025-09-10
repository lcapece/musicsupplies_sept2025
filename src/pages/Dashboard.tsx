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
import { logKeywordSearch, logNavTreeSearch } from '../utils/eventLogger';
import { activityTracker } from '../services/activityTracker';
import { logSearchActivity, getSessionId, buildSearchQuery } from '../utils/performantLogger';
import DemoModeBanner from '../components/DemoModeBanner';
import { useNavigate } from 'react-router-dom';
import { useAutoVersionCheck } from '../hooks/useAutoVersionCheck';

const Dashboard: React.FC = () => {
  const { user, isDemoMode, logout } = useAuth(); // Get user and demo mode from AuthContext
  const navigate = useNavigate();
  
  // Silent automatic version checking (backup to Header)
  useAutoVersionCheck();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | null; direction: 'ascending' | 'descending' }>({ key: 'partnumber', direction: 'ascending' });
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | undefined>();
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | undefined>();
  // States for category names
  const [selectedMainCategoryName, setSelectedMainCategoryName] = useState<string | undefined>();
  const [selectedSubCategoryName, setSelectedSubCategoryName] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(true); // Changed to true for default checked
  const [showImageAndSpecs, setShowImageAndSpecs] = useState(true); // Changed to true for default checked
  const [showMsrp, setShowMsrp] = useState(true); // New state for showing MSRP column
  const [showMapPrice, setShowMapPrice] = useState(true); // New state for showing MAP Price column
  const [showMasterCartonPrices, setShowMasterCartonPrices] = useState(true); // New state for showing Master Carton Prices, default checked
  const [selectedProductForImage, setSelectedProductForImage] = useState<Product | null>(null);
  const [rtExtendedData, setRtExtendedData] = useState<RtExtended | null>(null); // New state for rt_extended data
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(''); // State for the image URL to display - start empty to prevent flash
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
  const [exactMatches, setExactMatches] = useState<Set<string>>(new Set()); // Track exact part number matches
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [promoStatusData, setPromoStatusData] = useState<PromotionalOffersStatus | null>(null);
  const [showPromoCodePopup, setShowPromoCodePopup] = useState(false); // State for PromoCodePopup
  const [inventoryRefreshTimestamp, setInventoryRefreshTimestamp] = useState<string | null>(null); // State for inventory refresh timestamp
  const [fontSize, setFontSize] = useState<'smaller' | 'standard' | 'larger'>('standard'); // State for font size

  // Handle demo timeout
  const handleDemoTimeout = () => {
    logout();
    navigate('/');
  };

  // Disable copy/paste in demo mode
  useEffect(() => {
    if (isDemoMode) {
      const handleCopy = (e: ClipboardEvent) => {
        e.preventDefault();
        return false;
      };
      
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        return false;
      };
      
      const handleSelectStart = (e: Event) => {
        e.preventDefault();
        return false;
      };

      document.addEventListener('copy', handleCopy);
      document.addEventListener('cut', handleCopy);
      document.addEventListener('paste', handleCopy);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('selectstart', handleSelectStart);
      
      // Add CSS class to body
      document.body.classList.add('demo-mode-no-select');

      return () => {
        document.removeEventListener('copy', handleCopy);
        document.removeEventListener('cut', handleCopy);
        document.removeEventListener('paste', handleCopy);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('selectstart', handleSelectStart);
        document.body.classList.remove('demo-mode-no-select');
      };
    }
  }, [isDemoMode]);

  // Load saved font preference on mount
  useEffect(() => {
    const loadUserFontPreference = async () => {
      if (user?.accountNumber) {
        try {
          const { data, error } = await supabase.rpc('get_user_font_preference', {
            user_account: user.accountNumber
          });
          
          if (!error && data) {
            setFontSize(data as 'smaller' | 'standard' | 'larger');
          } else {
            // Explicitly set to standard if no preference found
            setFontSize('standard');
          }
        } catch (error) {
          console.log('Font preference not loaded (table may not exist yet):', error);
          // Fallback to standard - this is normal until migration is applied
          setFontSize('standard');
        }
      } else {
        // If no user, default to standard
        setFontSize('standard');
      }
    };

    loadUserFontPreference();
  }, [user?.accountNumber]);

  // Save font preference when changed
  const handleFontSizeChange = async (newSize: 'smaller' | 'standard' | 'larger') => {
    setFontSize(newSize);
    
    if (user?.accountNumber) {
      try {
        await supabase.rpc('save_user_font_preference', {
          user_account: user.accountNumber,
          font_preference: newSize
        });
      } catch (error) {
        console.log('Font preference not saved (table may not exist yet):', error);
        // This is normal until migration is applied
      }
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchInventoryRefreshTimestamp();
    setSelectedProductForImage(null);
  }, [searchTerms, inStockOnly]); // Removed selectedMainCategory, selectedSubCategory to disconnect tree nav from dataset

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
  
  // Effect to check and show promo codes - DISABLED
  useEffect(() => {
    // Popup disabled per user request
    console.log('Promo code popup disabled');
  }, [user]);

  // Combined effect to fetch rt_extended data and load product image
  useEffect(() => {
    const fetchRtExtendedDataAndLoadImage = async () => {
      if (!showImageAndSpecs || !selectedProductForImage) {
        setCurrentImageUrl('');
        setRtExtendedData(null);
        return;
      }

      // IMMEDIATELY clear the current image to prevent showing previous product's image
      setCurrentImageUrl('');

      // First fetch rt_extended data
      let rtData: RtExtended | null = null;
      try {
        const { data, error } = await supabase
          .from('rt_extended')
          .select('*')
          .eq('part_number', selectedProductForImage.partnumber)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching rt_extended data:', error);
        } else if (data) {
          rtData = data;
        }
        setRtExtendedData(rtData);
      } catch (error) {
        console.error('Error fetching rt_extended data:', error);
        setRtExtendedData(null);
      }

      // Now load the image with the fetched rt_extended data
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

      // Helper function to get fallback image from database
      const getFallbackImageFromDatabase = async (): Promise<string | null> => {
        if (!selectedProductForImage?.brand || !selectedProductForImage?.category) {
          console.log('[Dashboard] Missing required fields for fallback:', {
            partnumber: selectedProductForImage?.partnumber,
            brand: selectedProductForImage?.brand,
            category: selectedProductForImage?.category
          });
          return null;
        }

        console.log('[Dashboard] Calling fallback function with:', {
          input_partnumber: selectedProductForImage.partnumber,
          input_brand: selectedProductForImage.brand,
          input_category: selectedProductForImage.category
        });

        try {
          const { data, error } = await supabase.rpc('get_fallback_image_for_product_v2', {
            input_partnumber: selectedProductForImage.partnumber,
            input_brand: selectedProductForImage.brand,
            input_category: selectedProductForImage.category
          });

          if (error) {
            console.error('[Dashboard] Error getting fallback image:', error);
            return null;
          }

          console.log('[Dashboard] Fallback function returned:', data);
          return data;
        } catch (error) {
          console.error('[Dashboard] Exception getting fallback image:', error);
          return null;
        }
      };

      // Helper function to extract filename from path (handles forward slashes)
      const extractImageFilename = (imagePath: string): string => {
        if (!imagePath) return '';
        return imagePath.split('/').pop() || '';
      };

      // Helper function to check S3 cache and load image if exists
      const tryS3ImageFromCache = async (filename: string, source: string): Promise<boolean> => {
        if (!filename) return false;
        
        try {
          // Check if image exists in cache (case-insensitive)
          const { data: exactFilename, error } = await supabase.rpc('get_s3_image_filename', {
            input_filename: filename
          });
          
          if (error) {
            console.warn(`[Dashboard] Cache lookup error for ${filename}:`, error);
            return false;
          }
          
          if (exactFilename) {
            const s3Url = `${s3BaseUrl}${exactFilename}`;
            console.log(`[Dashboard] Found in cache (${source}): ${s3Url}`);
            setCurrentImageUrl(s3Url);
            return true;
          } else {
            console.log(`[Dashboard] Not found in cache (${source}): ${filename}`);
            return false;
          }
        } catch (e) {
          console.warn(`[Dashboard] Cache lookup failed (${source}): ${filename}`, e);
          return false;
        }
      };

      const tryLoadImages = async () => {
        // PRIORITY #1: Check products_supabase.groupedimage (S3 bucket)
        if (selectedProductForImage.groupedimage) {
          const imageName = extractImageFilename(selectedProductForImage.groupedimage);
          if (await tryS3ImageFromCache(imageName, 'Priority #1: groupedimage')) {
            foundImage = true;
            return;
          }
        }

        // PRIORITY #2: Check rt_extended.image_name (local src/images folder)
        if (rtData?.image_name) {
          const localImageName = rtData.image_name.toLowerCase();
          const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

          for (const ext of imageExtensions) {
            const localImagePath = `/src/images/${localImageName}${ext}`;
            try {
              const response = await fetch(localImagePath);
              if (response.ok) {
                setCurrentImageUrl(localImagePath);
                foundImage = true;
                console.log(`[Dashboard] Success (Priority #2: rt_extended local): ${localImagePath}`);
                return;
              }
            } catch (e) {
              console.warn(`[Dashboard] Local image check failed for ${localImagePath}:`, e);
            }
          }
        }

        // PRIORITY #4: Current S3 partnumber logic with case-insensitive matching
        const attemptLoadSequence = async (pnBase: string, attemptType: string): Promise<boolean> => {
          // Case variations to try
          const caseVariations = [
            pnBase,                    // Original case
            pnBase.toUpperCase(),      // Uppercase
            pnBase.toLowerCase()       // Lowercase
          ];
          
          // Remove duplicates
          const uniqueVariations = [...new Set(caseVariations)];
          
          for (const variation of uniqueVariations) {
            // Try suffixed versions
            for (const s3Suffix of suffixes) {
              const url = `${s3BaseUrl}${variation}${s3Suffix}.jpg`;
              console.log(`[Dashboard] Attempting (Priority #4 ${attemptType} pn: ${variation}, s3Suffix: ${s3Suffix}): ${url}`);
              try { 
                await loadImage(url); 
                setCurrentImageUrl(url); 
                console.log(`[Dashboard] Success: ${url}`); 
                return true; 
              } catch (e) { /* continue */ }
            }
            
            // Try direct match
            const directUrl = `${s3BaseUrl}${variation}.jpg`;
            console.log(`[Dashboard] Attempting direct (Priority #4 ${attemptType} pn: ${variation}): ${directUrl}`);
            try { 
              await loadImage(directUrl); 
              setCurrentImageUrl(directUrl); 
              console.log(`[Dashboard] Success direct: ${directUrl}`); 
              return true; 
            } catch (e) { /* continue */ }
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
          console.log(`[Dashboard] Priority #4 Full PN attempts failed. Trying base PN (1st strip): ${currentPnToTry}`);
          if (await attemptLoadSequence(currentPnToTry, "stripped_1")) {
            foundImage = true;
            return;
          }

          // --- Fallback 2: Strip a second suffix (if possible) and retry ---
          lastHyphenIndex = currentPnToTry.lastIndexOf('-');
          if (!foundImage && lastHyphenIndex > 0) {
            currentPnToTry = currentPnToTry.substring(0, lastHyphenIndex);
            console.log(`[Dashboard] Priority #4 1st stripped PN attempts failed. Trying base PN (2nd strip): ${currentPnToTry}`);
            if (await attemptLoadSequence(currentPnToTry, "stripped_2")) {
              foundImage = true;
              return;
            }
          }
        }

        // PRIORITY #3: NEW - Fallback from similar products (S3 bucket) - ONLY after Priority #4 fails
        if (!foundImage) {
          const fallbackImage = await getFallbackImageFromDatabase();
          console.log('[Dashboard] Raw fallback image returned:', fallbackImage);
          if (fallbackImage) {
            const fallbackImageName = extractImageFilename(fallbackImage);
            console.log('[Dashboard] Extracted fallback filename:', fallbackImageName);
            if (await tryS3ImageFromCache(fallbackImageName, 'Priority #3: fallback from similar products')) {
              foundImage = true;
              return;
            }
            // If the extracted filename fails, try the raw fallback image as-is
            if (await tryS3ImageFromCache(fallbackImage, 'Priority #3: fallback raw')) {
              foundImage = true;
              return;
            }
          }
        }
      };
      
      // Load images without setting placeholder initially to prevent flash
      await tryLoadImages();
      if (!foundImage) {
        console.log('[Dashboard] All image attempts failed, using placeholder.');
        setCurrentImageUrl(ImageComingSoon);
      }
    };

    fetchRtExtendedDataAndLoadImage();
  }, [selectedProductForImage, showImageAndSpecs]); // Removed rtExtendedData dependency to prevent loops

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

  const fetchInventoryRefreshTimestamp = async () => {
    try {
      // Replace exec_sql with direct query to avoid function dependency
      const { data, error } = await supabase
        .from('products_supabase')
        .select('inventory_refreshed')
        .not('inventory_refreshed', 'is', null)
        .order('inventory_refreshed', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching inventory refresh timestamp:', error);
        return;
      }

      if (data && data.inventory_refreshed) {
        const timestamp = new Date(data.inventory_refreshed);
        const formatted = timestamp.toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        setInventoryRefreshTimestamp(formatted);
      }
    } catch (error) {
      console.error('Error fetching inventory refresh timestamp:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('Fetching products for:', { selectedMainCategory, selectedSubCategory, searchTerms, inStockOnly });
      console.log('Category filters being applied:', { mainCategory: selectedMainCategory, subCategory: selectedSubCategory }); // Added for debugging
      let query = supabase.from('products_supabase').select('*, groupedimage');

      // Category filtering logic will need to be updated once database migration is complete
      // For now, we'll comment out the old category filtering
      // if (selectedMainCategory && selectedSubCategory) {
      //   query = query.filter('category', 'eq', selectedSubCategory);
      // } else if (selectedMainCategory) {
      //   query = query.filter('category', 'eq', selectedMainCategory);
      // }

      // Filter out test products - COMMENTED OUT to allow TEST products in search results
      // query = query.not('partnumber', 'ilike', 'TEST-%');

      // PHASE 3: Filter out promo codes from product search results - TEMPORARILY DISABLED FOR DEBUGGING
      // Get list of promo codes to exclude from product search
      // const { data: promoCodes, error: promoError } = await supabase
      //   .from('promo_codes')
      //   .select('code');
      
      // if (!promoError && promoCodes && promoCodes.length > 0) {
      //   // Exclude products whose partnumber matches any promo code
      //   const promoCodeList = promoCodes.map(promo => promo.code);
      //   query = query.not('partnumber', 'in', `(${promoCodeList.join(',')})`);
      //   console.log('Filtered out promo codes from product search:', promoCodeList);
      // }

      // Apply search terms - handle AND logic properly
      // When both primary and additional are present, we need to fetch broader set and filter client-side
      if (searchTerms.primary || searchTerms.additional) {
        if (searchTerms.primary && searchTerms.additional) {
          // For AND logic, we first get all products matching primary term
          query = query.or(`partnumber.ilike.%${searchTerms.primary}%,description.ilike.%${searchTerms.primary}%,brand.ilike.%${searchTerms.primary}%`);
        } else if (searchTerms.primary) {
          // Only primary search term - search partnumber, description, and brand
          query = query.or(`partnumber.ilike.%${searchTerms.primary}%,description.ilike.%${searchTerms.primary}%,brand.ilike.%${searchTerms.primary}%`);
        } else if (searchTerms.additional) {
          // Only additional search term (when primary is empty)
          query = query.or(`partnumber.ilike.%${searchTerms.additional}%,description.ilike.%${searchTerms.additional}%,brand.ilike.%${searchTerms.additional}%`);
        }
      }

      // Apply in-stock filter
      if (inStockOnly) {
        query = query.gt('inventory', 0);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      let filteredData = data || [];

      // Apply AND logic client-side for additional term
      if (searchTerms.primary && searchTerms.additional && filteredData.length > 0) {
        const additionalLower = searchTerms.additional.toLowerCase();
        filteredData = filteredData.filter(product => {
          const partnumberMatch = product.partnumber?.toLowerCase().includes(additionalLower) || false;
          const descriptionMatch = product.description?.toLowerCase().includes(additionalLower) || false;
          const brandMatch = product.brand?.toLowerCase().includes(additionalLower) || false;
          return partnumberMatch || descriptionMatch || brandMatch;
        });
        console.log(`Applied AND filter for additional term "${searchTerms.additional}": ${data.length} -> ${filteredData.length} products`);
      }

      // Apply exclude filter client-side for better control
      if (searchTerms.exclude && filteredData.length > 0) {
        const excludeLower = searchTerms.exclude.toLowerCase();
        filteredData = filteredData.filter(product => {
          const partnumberHasExclude = product.partnumber?.toLowerCase().includes(excludeLower) || false;
          const descriptionHasExclude = product.description?.toLowerCase().includes(excludeLower) || false;
          const brandHasExclude = product.brand?.toLowerCase().includes(excludeLower) || false;
          // Keep product only if exclude term is NOT in any field
          return !partnumberHasExclude && !descriptionHasExclude && !brandHasExclude;
        });
        console.log(`Applied exclude filter for "${searchTerms.exclude}": ${filteredData.length} products remaining`);
      }

      // CRITICAL: Exact part number match prioritization
      let finalData = filteredData;
      const newExactMatches = new Set<string>();
      
      if (searchTerms.primary && filteredData.length > 0) {
        const primaryLower = searchTerms.primary.toLowerCase();
        const exactMatchProducts: Product[] = [];
        const wildcardMatches: Product[] = [];
        
        filteredData.forEach(product => {
          if (product.partnumber?.toLowerCase() === primaryLower) {
            exactMatchProducts.push(product);
            newExactMatches.add(product.partnumber); // Track exact matches for highlighting
          } else {
            wildcardMatches.push(product);
          }
        });
        
        // Combine exact matches first, then wildcard matches
        if (exactMatchProducts.length > 0) {
          finalData = [...exactMatchProducts, ...wildcardMatches];
          console.log(`Prioritized ${exactMatchProducts.length} exact part number matches for "${searchTerms.primary}"`);
        }
      }
      
      // Update exact matches state for highlighting
      setExactMatches(newExactMatches);

      // Log the fetched data
      console.log('Fetched raw product data:', data);
      console.log('Final filtered data:', finalData);

      setProducts(finalData);
      try {
        const resultsCount = Array.isArray(finalData) ? finalData.length : 0;
        const acctNum = user?.accountNumber ? parseInt(user.accountNumber, 10) : NaN;
        const email = user?.email || null;
        // Log keyword search when search terms are used (and categories were cleared in handleSearch)
        if ((searchTerms.primary || searchTerms.additional || searchTerms.exclude) && user) {
          logKeywordSearch({
            accountNumber: isNaN(acctNum) ? null : acctNum,
            emailAddress: email,
            query: searchTerms.primary || '',
            filters: {
              additional: searchTerms.additional || undefined,
              exclude: searchTerms.exclude || undefined,
            },
            resultsCount,
          });
          
          // Track search activity with new tracking system
          const searchStartTime = Date.now();
          activityTracker.trackSearch({
            searchTerm: [searchTerms.primary, searchTerms.additional].filter(Boolean).join(' '),
            searchType: 'keyword',
            resultsCount,
            searchDurationMs: Date.now() - searchStartTime,
            filtersApplied: {
              additional: searchTerms.additional || undefined,
              exclude: searchTerms.exclude || undefined,
              inStockOnly: inStockOnly || undefined
            }
          });
          
          // NEW: High-performance search logging
          logSearchActivity({
            account_number: isNaN(acctNum) ? null : acctNum,
            session_id: getSessionId(),
            search_term_1: searchTerms.primary || undefined,
            search_term_2: searchTerms.additional || undefined,
            exclusion_term: searchTerms.exclude || undefined,
            search_query_full: buildSearchQuery(searchTerms.primary, searchTerms.additional, searchTerms.exclude),
            results_count: resultsCount,
            results_clicked: false, // Will be updated when user clicks on results
            user_email: email || undefined
          });
        }
        // Log nav tree search when browsing by categories (no search terms)
        else if ((selectedMainCategoryName || selectedSubCategoryName) && !(searchTerms.primary || searchTerms.additional || searchTerms.exclude)) {
          const path = [selectedMainCategoryName, selectedSubCategoryName].filter(Boolean) as string[];
          logNavTreeSearch({
            accountNumber: isNaN(acctNum) ? null : acctNum,
            emailAddress: email,
            categoryPath: path,
            resultsCount,
          });
          
          // Track category navigation as search activity
          activityTracker.trackSearch({
            searchTerm: path.join(' > '),
            searchType: 'category',
            resultsCount,
            filtersApplied: {
              mainCategory: selectedMainCategoryName,
              subCategory: selectedSubCategoryName,
              inStockOnly: inStockOnly || undefined
            }
          });
          
          // NEW: High-performance search logging for category navigation
          logSearchActivity({
            account_number: isNaN(acctNum) ? null : acctNum,
            session_id: getSessionId(),
            search_term_1: selectedMainCategoryName || undefined,
            search_term_2: selectedSubCategoryName || undefined,
            exclusion_term: undefined, // No exclusion in category navigation
            search_query_full: path.join(' > '),
            results_count: resultsCount,
            results_clicked: false, // Will be updated when user clicks on results
            user_email: email || undefined
          });
        }
      } catch (_e) {}
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
    // Category selection no longer clears search terms or triggers dataset changes
    // setSearchQuery('');
    // setSearchTerms({ primary: '', additional: '', exclude: '' });
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
    const p = primaryQuery.trim();
    const a = additionalQuery.trim();
    const e = excludeQuery.trim();
    setSearchQuery(p);
    // setInStockOnly is now handled by its own checkbox onChange
    setSearchTerms({
      primary: p,
      additional: a,
      exclude: e
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
    <div className="h-screen bg-gray-100 flex flex-col relative">
      {isDemoMode && <DemoModeBanner onTimeout={handleDemoTimeout} />}
      <Header onViewChange={handleViewChange} activeView={activeView} />
      
      
      <div className="flex flex-col h-[85vh]">
        {activeView === 'products' ? (
          <>
            <div className="py-2 px-4 sm:px-6 lg:px-8 flex-shrink-0">
              <SearchBar onSearch={handleSearch} fontSize={fontSize} />
            </div>
            
            <div className="flex-1 px-4 sm:px-6 lg:px-8 pb-2 overflow-hidden">
              <div className="flex h-full">
                <div className="w-64 flex-shrink-0 pr-8">
                  <CategoryTree 
                    onSelectCategory={handleCategorySelect}
                    selectedCategoryId={selectedCategoryId}
                    fontSize={fontSize}
                  />
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col">
                  {/* Single Consolidated Row - Layout matching user's image */}
                  <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md w-full overflow-visible">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      {/* Left side: Path display */}
                      <div className={`${fontSize === 'smaller' ? 'font-professional-smaller' : fontSize === 'larger' ? 'font-professional-larger' : 'font-professional-standard'} text-gray-700`}>
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

                      {/* Center: Main checkboxes */}
                      <div className="flex items-center justify-center gap-6">
                        {/* Show Images & Specs checkbox */}
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="showImageAndSpecs"
                            checked={showImageAndSpecs}
                            onChange={(e) => {
                              setShowImageAndSpecs(e.target.checked);
                              if (!e.target.checked) {
                                setSelectedProductForImage(null);
                              }
                            }}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="showImageAndSpecs" className={`ml-2 block ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} text-gray-900`}>
                            Show Images & Specs
                          </label>
                        </div>
                        
                        {/* Show In-Stock Items Only checkbox */}
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="inStockOnly"
                            checked={inStockOnly}
                            onChange={(e) => setInStockOnly(e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="inStockOnly" className={`ml-2 block ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} text-gray-900`}>
                            Show In-Stock Items Only
                          </label>
                        </div>
                      </div>

                      {/* Right side: Additional controls */}
                      <div className="flex items-center flex-wrap gap-6">
                        {/* Inventory timestamp */}
                        <div className={`${fontSize === 'smaller' ? 'text-xs' : fontSize === 'larger' ? 'text-base' : 'text-sm'} text-gray-600`}>
                          {inventoryRefreshTimestamp ? `Inventory as of: ${inventoryRefreshTimestamp}` : 'Loading inventory timestamp...'}
                        </div>

                        {/* Conditional checkboxes that appear only when showImageAndSpecs is off */}
                        {!showImageAndSpecs && (
                          <>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="showMsrp"
                                checked={showMsrp}
                                onChange={(e) => setShowMsrp(e.target.checked)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor="showMsrp" className={`ml-2 block ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} text-gray-900`}>
                                Show MSRP
                              </label>
                            </div>
                            
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="showMapPrice"
                                checked={showMapPrice}
                                onChange={(e) => setShowMapPrice(e.target.checked)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor="showMapPrice" className={`ml-2 block ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} text-gray-900`}>
                                Show MAP Price
                              </label>
                            </div>
                            
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="showMasterCartonPrices"
                                checked={showMasterCartonPrices}
                                onChange={(e) => setShowMasterCartonPrices(e.target.checked)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor="showMasterCartonPrices" className={`ml-2 block ${fontSize === 'smaller' ? 'text-sm' : fontSize === 'larger' ? 'text-lg' : 'text-base'} text-gray-900`}>
                                Show Master Carton Prices
                              </label>
                            </div>
                          </>
                        )}
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
                    <div className={`flex flex-col ${showImageAndSpecs ? 'lg:flex-row' : ''} gap-4 flex-1`}>
                      <div className={`${showImageAndSpecs ? 'lg:w-4/5' : 'w-full'} flex flex-col h-full`}>
                        <ProductTable 
                          products={sortedProducts}
                          requestSort={requestSort}
                          sortConfig={sortConfig}
                          title={searchQuery ? `Search Results for "${searchQuery}"` : (selectedMainCategoryName || 'Products')}
                          onRowClick={(product) => setSelectedProductForImage(product)} // Handle row click
                          showUpcColumn={!showImageAndSpecs} // Show UPC column when images are hidden
                          showMsrp={!showImageAndSpecs && showMsrp} // Only show MSRP when in wide view mode and checkbox is checked
                          showMapPrice={!showImageAndSpecs && showMapPrice} // Only show MAP when in wide view mode and checkbox is checked
                          className="h-full"
                          fontSize={fontSize}
                          onFontSizeChange={setFontSize}
                          enableFiltering={false} // Disable table filters for customer interface
                          exactMatches={exactMatches} // Pass exact matches for highlighting
                        />
                      </div>
                      {showImageAndSpecs && selectedProductForImage && (
                        <div className="lg:w-1/5 bg-white p-3 rounded-lg shadow">
                          <h3 className="text-lg font-semibold mb-2">
                            {selectedProductForImage.partnumber} - Image & Specs
                          </h3>
                          <div className="mb-4 flex justify-center">
                            {currentImageUrl ? (
                              <img 
                                src={currentImageUrl}
                                alt={selectedProductForImage.description || selectedProductForImage.partnumber}
                                className="max-h-[550px] w-auto object-contain rounded border"
                                onError={() => setCurrentImageUrl(ImageComingSoon)}
                              />
                            ) : (
                              <img 
                                src={ImageComingSoon}
                                alt="No image available"
                                className="max-h-[550px] w-auto object-contain rounded border"
                              />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium mb-1">Specifications:</h4>
                            <p className="text-sm text-gray-600 mb-2">{selectedProductForImage.description}</p>
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                              <li>Brand: {selectedProductForImage.brand ?? 'N/A'}</li>
                              <li>UPC: {selectedProductForImage.upc ?? 'N/A'}</li>
                              <li>Net Price: {isDemoMode ? (
                                <span className="font-bold text-red-600">DEMO</span>
                              ) : (
                                `$${selectedProductForImage.price?.toFixed(2) ?? 'N/A'}`
                              )}</li>
                              <li>MSRP: ${selectedProductForImage.webmsrp !== undefined && selectedProductForImage.webmsrp !== null ? selectedProductForImage.webmsrp.toFixed(2) : 'N/A'}</li>
                              <li>MAP: {selectedProductForImage.map !== undefined && selectedProductForImage.map !== null ? 
                                `$${selectedProductForImage.map.toFixed(2)}` : 'N/A'}</li>
                              <li>Inventory: {isDemoMode ? (
                                <span className="font-bold text-red-600">DEMO</span>
                              ) : (
                                selectedProductForImage.inventory ?? 'N/A'
                              )}</li>
                            </ul>
                            
                            <div className="mt-3">
                              {rtExtendedData?.ext_descr ? (
                                <div className="text-sm text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: rtExtendedData.ext_descr }} />
                              ) : selectedProductForImage.longdescription ? (
                                <div className="text-sm text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedProductForImage.longdescription }} />
                              ) : (
                                <p className="text-sm text-gray-700">No additional description available</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      {showImageAndSpecs && !selectedProductForImage && (
                        <div className="lg:w-1/5 bg-white p-3 rounded-lg shadow flex items-center justify-center">
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
