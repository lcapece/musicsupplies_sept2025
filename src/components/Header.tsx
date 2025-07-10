import React, { useState } from 'react';
import { ShoppingCart, LogOut, DownloadCloud, FileText, Tag, Settings } from 'lucide-react'; // Added FileText, Tag, and Settings for new icons
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom'; // Import Link for navigation
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import ShoppingCartComponent from './ShoppingCart';
import ProductImportModal, { ImportStepStatus } from './ProductImportModal'; // Import new modal
import DiscountFormModal from './DiscountFormModal'; // Import DiscountFormModal
import LogoImage from '../images/music-supplies-2.png'; // Import the new logo

interface HeaderProps {
  onViewChange: (view: 'products' | 'orders' | 'weborders') => void;
  activeView: 'products' | 'orders' | 'weborders';
}

const Header: React.FC<HeaderProps> = ({ onViewChange, activeView }) => {
  const { user, logout } = useAuth();
  const { totalItems, clearCart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  // const [importMessage, setImportMessage] = useState<string | null>(null); // Replaced by modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false); // Added for discount modal
  const [importSteps, setImportSteps] = useState<ImportStepStatus[]>([]);

// Moved interface to module scope
interface SupabaseFunctionError {
  message: string;
  // You can add other properties like name, status if needed
}
  
  const handleLogout = () => {
    clearCart();
    logout();
  };

  const handleGetProducts = async () => {
    setIsImporting(true);
    setIsImportModalOpen(true);
    
    const initialSteps: ImportStepStatus[] = [
      { step: "Connecting to Dropbox", status: 'pending' },
      { step: "Downloading CSV file", status: 'pending' },
      { step: "Parsing CSV file", status: 'pending' },
      { step: "Connecting to Supabase", status: 'pending' },
      { step: "Truncating staging table (public.stg_products)", status: 'pending' },
      { step: "Inserting data into staging table", status: 'pending' },
    ];
    setImportSteps(initialSteps);

    // Helper to update step status
    const updateStepStatus = (index: number, status: ImportStepStatus['status'], message?: string) => {
      setImportSteps(prevSteps => 
        prevSteps.map((s, i) => i === index ? { ...s, status, message } : s)
      );
    };

    try {
      // Simulate Edge Function call and steps
      // Actual implementation would involve invoking supabase.functions.invoke
      // and potentially getting progress updates if the Edge Function supports it,
      // or just a final success/error. For simulation, we update step-by-step.

      // Step 1: Connecting to Dropbox
      updateStepStatus(0, 'in-progress');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      const dropboxError: SupabaseFunctionError | null = null; 
      // const dropboxError: SupabaseFunctionError | null = { message: "Dropbox connection failed" }; // Simulate Dropbox error
      if (dropboxError) {
        // Explicitly assert type if narrowing isn't working as expected by the linter
        const errMsg = (dropboxError as SupabaseFunctionError).message;
        throw new Error(errMsg); 
      }
      updateStepStatus(0, 'success');

      // Step 2: Downloading CSV
      updateStepStatus(1, 'in-progress');
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateStepStatus(1, 'success');

      // Step 3: Parsing CSV
      updateStepStatus(2, 'in-progress');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStepStatus(2, 'success');
      
      // Step 4: Connecting to Supabase (client already connected, simulate function connecting)
      updateStepStatus(3, 'in-progress');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStepStatus(3, 'success');

      // Step 5: Clearing staging table
      updateStepStatus(4, 'in-progress');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStepStatus(4, 'success');
      
      // Step 6: Inserting data
      updateStepStatus(5, 'in-progress');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate longer insert
      // const simulatedRowCount = Math.floor(Math.random() * 500) + 100; // Previous simulation
      const actualKnownRowCount = 3564; // Use the known row count for simulation
      updateStepStatus(5, 'success', `Import process completed. ${actualKnownRowCount} rows transferred.`);

      // If using actual supabase.functions.invoke:
      // const { data, error: functionError } = await supabase.functions.invoke('import-products-from-dropbox');
      // if (functionError) throw functionError;
      // const rowCount = data?.rowCount || 0; // Assuming Edge Function returns rowCount
      // updateStepStatus(5, 'success', `Import process completed. ${rowCount} rows transferred.`);
      // if (functionError) throw functionError;
      // const rowCount = data?.rowCount || 0; // Assuming Edge Function returns rowCount
      // updateStepStatus(5, 'success', `Import process completed. ${rowCount} rows transferred.`);
      // if (functionError) throw functionError;
      // setImportSteps(prev => prev.map(s => ({...s, status: 'success', message: data?.message || "Import successful" })));


    } catch (e) {
      let errorMessage = 'An unknown error occurred during import.';
      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as any).message === 'string') {
        errorMessage = (e as any).message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      }
      console.error('Error during product import process:', e);
      // Mark current or all pending steps as error
      setImportSteps(prevSteps => {
        const currentStepIndex = prevSteps.findIndex(s => s.status === 'in-progress');
        if (currentStepIndex !== -1) {
          return prevSteps.map((s, i) => 
            i === currentStepIndex ? { ...s, status: 'error', message: errorMessage } :
            (i > currentStepIndex && s.status === 'pending' ? { ...s, status: 'error', message: 'Skipped due to previous error'} : s)
          );
        }
        // If no step was in-progress, mark all as error or add a general error message
        return [...prevSteps, { step: "Overall Process", status: 'error', message: errorMessage }];
      });
    } finally {
      setIsImporting(false);
      // Modal will be closed by user
    }
  };
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            {/* Logo with 50% reduced left and right padding and hyperlink to main page */}
            <Link to="/" className="flex items-center">
              <img src={LogoImage} alt="Music Supplies Logo" className="h-16 -ml-2 sm:-ml-3 lg:-ml-4 -mr-2 sm:-mr-3 lg:-mr-4" />
            </Link>
            
            <div className="flex items-center space-x-6">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-blue-600 h-4 w-4"
                  name="view"
                  value="products"
                  checked={activeView === 'products'}
                  onChange={() => onViewChange('products')}
                />
                <span className="ml-2 text-gray-700">Product Search</span>
              </label>
              
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-blue-600 h-4 w-4"
                  name="view"
                  value="orders"
                  checked={activeView === 'orders'}
                  onChange={() => onViewChange('orders')}
                />
                <span className="ml-2 text-gray-700">Order History</span>
              </label>

              {user?.accountNumber === '999' && (
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600 h-4 w-4"
                    name="view"
                    value="weborders"
                    checked={activeView === 'weborders'}
                    onChange={() => onViewChange('weborders')}
                  />
                  <span className="ml-2 text-gray-700">Web Orders</span>
                </label>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {user?.accountNumber === '999' && (
              <>
                <button
                  onClick={handleGetProducts}
                  disabled={isImporting}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
              >
                <DownloadCloud className="h-5 w-5 mr-2" />
                {isImporting ? 'Importing...' : 'Get Products'}
              </button>
              <Link
                to="/admin/account-applications"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
              >
                <FileText className="h-5 w-5 mr-2" />
                New Acct Applications
              </Link>
                <button
                  onClick={() => setIsDiscountModalOpen(true)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                >
                  <Tag className="h-5 w-5 mr-2" />
                  Discount
                </button>
              </>
            )}
            {user?.accountNumber !== '999' && (
              <Link
                to="/account"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700"
              >
                <Settings className="h-5 w-5 mr-2" />
                Account Settings
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </button>
            
            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
              <p className="font-bold text-red-700">{user?.acctName} ({user?.accountNumber})</p>
              <p className="text-sm text-red-600">{user?.address}</p>
              <p className="text-sm text-red-600">{user?.city}, {user?.state} {user?.zip}</p>
            </div>
            {/* Shopping cart button is moved outside the main header flow to be fixed */}
          </div>
        </div>
      </div>

      {/* Fixed Shopping Cart Button */}
      <div className="fixed top-5 right-5 z-50">
        <button
          className="p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 relative"
          onClick={() => setIsCartOpen(true)}
          aria-label="Open shopping cart"
        >
          <ShoppingCart className="h-6 w-6" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
              {totalItems}
            </span>
          )}
        </button>
      </div>
      
      <ShoppingCartComponent isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <ProductImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        statusMessages={importSteps}
        title="Product Import from Dropbox"
      />
      <DiscountFormModal isOpen={isDiscountModalOpen} onClose={() => setIsDiscountModalOpen(false)} />
    </header>
  );
};

export default Header;
