// Music Supplies App - Version 813.1400 - Deployment Update
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import ActiveDiscountDisplayModal from './components/ActiveDiscountDisplayModal';
import LoginFixBanner from './components/LoginFixBanner';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import SiteStatusOffline from './components/SiteStatusOffline';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NewAccountApplicationPage from './pages/NewAccountApplicationPage';
import AdminAccountApplicationsPage from './pages/AdminAccountApplicationsPage';
import AdminDashboard from './pages/AdminDashboard';
import PasswordChangeModal from './components/PasswordChangeModal';
import DiscountFormModal from './components/DiscountFormModal';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'; // Import new page
import SmsCommunicationsPage from './pages/SmsCommunicationsPage'; // Import new page
import EmailCommunicationsPage from './pages/EmailCommunicationsPage'; // Import new page
import TermsAndConditionsPage from './pages/TermsAndConditionsPage'; // Import Terms & Conditions page
import CustomerAccountPage from './pages/CustomerAccountPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage'; // Import forgot password page
import UpdatePasswordPage from './pages/UpdatePasswordPage'; // Import update password page
import SmsConsentPreviewPage from './pages/SmsConsentPreviewPage'; // Import SMS consent preview page
import ErrorBoundary from './components/ErrorBoundary';
import SkuImportPage from './pages/SkuImportPage'; // Import SKU Import page for account 99
import EnhancedChatWidget from './components/EnhancedChatWidget';
import ChatPage from './pages/ChatPage';
import AdminKnowledgeBase from './pages/AdminKnowledgeBase'; // Admin knowledge base management
import { useLocation } from 'react-router-dom';
import { VersionCheck } from './components/VersionCheck';


interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth(); // Added user

  if (isLoading) {
    return <div>Loading authentication status...</div>; // Or a spinner
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Specific protected route for admin (user 999)
const AdminProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading authentication status...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return user?.accountNumber === '999' ? children : <Navigate to="/" replace />; // Redirect non-admins to dashboard
};

// Specific protected route for special admin (user 99)
const SpecialAdminProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading, isSpecialAdmin } = useAuth();

  if (isLoading) {
    return <div>Loading authentication status...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only log once during development, not on every render
  React.useEffect(() => {
    console.log('SpecialAdminProtectedRoute mounted: ', { 
      accountNumber: user?.accountNumber, 
      isSpecialAdmin, 
      user
    });
  }, []);

  // Use a state variable to prevent infinite redirects
  const [redirectAttempted, setRedirectAttempted] = React.useState(false);
  
  React.useEffect(() => {
    // Reset redirect flag if user or isSpecialAdmin changes
    if (user?.accountNumber || isSpecialAdmin !== undefined) {
      setRedirectAttempted(false);
    }
  }, [user?.accountNumber, isSpecialAdmin]);

  // If not a special admin and haven't attempted redirect yet
  if (!isSpecialAdmin && !redirectAttempted) {
    setRedirectAttempted(true);
    return <Navigate to="/" replace />;
  }

  return isSpecialAdmin ? children : <div>Redirecting...</div>;
};


function AppContent() {
  const location = useLocation();
  const { 
    user, // Get user for accountData
    // activeDiscount,  // Removed as part of new discount logic
    // showActiveDiscountModal, // Removed
    // clearActiveDiscount, // Removed
    showPasswordChangeModal,
    handlePasswordModalClose, 
    showDiscountFormModal,
    closeDiscountFormModal,
    isSpecialAdmin
  } = useAuth();
  
  // For error handling
  const [dbUpdateError, setDbUpdateError] = useState<boolean>(false);

  // Check database updates when the app loads
  useEffect(() => {
    const checkDb = async () => {
      try {
        // Run a query to check if the new columns exist
        const { data, error } = await supabase
          .from('products_supabase')
          .select('partnumber, brand, map')
          .limit(1);
          
        if (error) {
          console.error('Database schema check failed:', error);
          setDbUpdateError(true);
        } else {
          console.log('Database schema check passed');
          setDbUpdateError(false);
        }
      } catch (err) {
        console.error('Error checking database schema:', err);
        setDbUpdateError(true);
      }
    };
    
    // Only run this check if the user is logged in
    if (user) {
      checkDb();
    }
  }, [user]);

  // Debug log for current user and special admin status
  React.useEffect(() => {
    console.log('AppContent mounted/updated: ', { 
      accountNumber: user?.accountNumber, 
      isSpecialAdmin,
      is_special_admin: user?.is_special_admin
    });
  }, [user, isSpecialAdmin]);
  
  // If there's a database update error, show an admin message
  if (dbUpdateError && user?.accountNumber === '999') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex items-center text-red-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-bold ml-4">Database Update Required</h2>
          </div>
          <p className="text-gray-700 mb-6">
            The database schema needs to be updated to include the new brand and MAP columns. 
            Please click the button below to apply the database updates.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
          >
            Apply Database Updates
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {/* Version Check Component - shows version and auto-refreshes */}
      <VersionCheck />
      
      {/* Authentication Fix Banner - only shows for admin users */}
      <LoginFixBanner />
      
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/update-password" element={<UpdatePasswordPage />} />
        {/* Admin Dashboard via /5150 bypass */}
        <Route 
          path="/5150" 
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          } 
        />
        {/* Home route with special handling for different account types */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              {user?.accountNumber === '999' ? (
                <AdminDashboard />
              ) : user?.accountNumber === '99' || isSpecialAdmin ? (
                <Navigate to="/sku-import" replace />
              ) : (
                <Dashboard />
              )}
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/new-account-application" 
          element={<NewAccountApplicationPage />} 
        />
        <Route 
          path="/admin/account-applications"
          element={
            <AdminProtectedRoute>
              <AdminAccountApplicationsPage />
            </AdminProtectedRoute>
          }
        />
        <Route 
          path="/sku-import"
          element={
            <SpecialAdminProtectedRoute>
              <SkuImportPage />
            </SpecialAdminProtectedRoute>
          }
        />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/sms-communications" element={<SmsCommunicationsPage />} />
        <Route path="/email-communications" element={<EmailCommunicationsPage />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
        <Route path="/gduej83hd68386bxsd-ejdhgdsw22" element={<SmsConsentPreviewPage />} />
        <Route 
          path="/account" 
          element={
            <ProtectedRoute>
              <CustomerAccountPage />
            </ProtectedRoute>
          } 
        />
        {/* Admin Knowledge Base Management - Account 999 only */}
        <Route 
          path="/admin/knowledge-base"
          element={
            <AdminProtectedRoute>
              <AdminKnowledgeBase />
            </AdminProtectedRoute>
          }
        />
        {/* Chat route - accessible to everyone */}
        <Route path="/chat" element={<ChatPage />} />
         {/* Redirect any unmatched routes to the home page */}
         <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {/* Password Change Modal */}
      {user && showPasswordChangeModal && (
        <PasswordChangeModal
          isOpen={showPasswordChangeModal}
          onClose={handlePasswordModalClose}
          accountData={user} 
        />
      )}

      {/* Discount Form Modal */}
      {showDiscountFormModal && (
        <DiscountFormModal
          isOpen={showDiscountFormModal}
          onClose={closeDiscountFormModal}
        />
      )}

    </>
  );
}

function App() {
  const [siteStatus, setSiteStatus] = useState<{ status: string; message: string } | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [bypassCheck, setBypassCheck] = useState(false);

  // Check for bypass conditions on app load
  useEffect(() => {
    const checkSiteStatus = async () => {
      try {
        // Check if URL contains the bypass code /5150
        const currentPath = window.location.pathname;
        if (currentPath.includes('/5150')) {
          console.log('🔓 Site status check bypassed via URL /5150');
          setBypassCheck(true);
          setStatusLoading(false);
          // Redirect to login page without the bypass code
          window.history.replaceState({}, '', '/login');
          return;
        }

        // Check site status from database
        const { data, error } = await supabase
          .from('site_status')
          .select('status, status_message')
          .eq('status', 'offline')
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error checking site status:', error);
          // If we can't check status, allow access (fail open)
          setStatusLoading(false);
          return;
        }

        if (data) {
          // Site is offline
          setSiteStatus({
            status: data.status,
            message: data.status_message || 'Site is temporarily unavailable for maintenance.'
          });
        }

        setStatusLoading(false);
      } catch (error) {
        console.error('Site status check failed:', error);
        // If check fails, allow access (fail open)
        setStatusLoading(false);
      }
    };

    checkSiteStatus();
  }, []);

  // Show loading while checking status
  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show offline page if site is offline and no bypass
  if (siteStatus && !bypassCheck) {
    return (
      <BrowserRouter>
        <SiteStatusOfflineWrapper message={siteStatus.message} />
      </BrowserRouter>
    );
  }

  // Normal app flow
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <CartProvider>
            <NotificationProvider>
              <AppContentWithStatusCheck bypassCheck={bypassCheck} />
              {/* Enhanced Chat Widget - Available to all users, no login required */}
              {window.location.pathname !== '/chat' && <EnhancedChatWidget />}
            </NotificationProvider>
          </CartProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

// Wrapper component for offline status that can access auth context
function SiteStatusOfflineWrapper({ message }: { message: string }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SiteStatusChecker message={message} />
      </AuthProvider>
    </ErrorBoundary>
  );
}

// Component that checks if user is account 999 (admin bypass)
function SiteStatusChecker({ message }: { message: string }) {
  const { user, isAuthenticated } = useAuth();
  
  // If user is already logged in as account 999, bypass offline check
  if (isAuthenticated && user?.accountNumber === '999') {
    return (
      <CartProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </CartProvider>
    );
  }
  
  // Show offline page
  return <SiteStatusOffline message={message} />;
}

// Modified AppContent to handle bypass
function AppContentWithStatusCheck({ bypassCheck }: { bypassCheck: boolean }) {
  const { user } = useAuth();
  
  // If bypass was used or user is admin, show normal app
  if (bypassCheck || (user?.accountNumber === '999')) {
    return <AppContent />;
  }
  
  // For regular users, do a final status check
  return <AppContentWithFinalStatusCheck />;
}

// Final status check for regular users
function AppContentWithFinalStatusCheck() {
  const [siteStatus, setSiteStatus] = useState<{ status: string; message: string } | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('site_status')
          .select('status, status_message')
          .eq('status', 'offline')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking site status:', error);
        } else if (data) {
          setSiteStatus({
            status: data.status,
            message: data.status_message || 'Site is temporarily unavailable for maintenance.'
          });
        }
      } catch (error) {
        console.error('Final site status check failed:', error);
      } finally {
        setStatusLoading(false);
      }
    };
    
    checkStatus();
  }, []);
  
  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (siteStatus) {
    return <SiteStatusOffline message={siteStatus.message} />;
  }
  
  return <AppContent />;
}

export default App;
