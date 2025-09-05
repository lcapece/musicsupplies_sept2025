// Music Supplies App - Version 824.848p - Account 99 Admin Backend
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import ActiveDiscountDisplayModal from './components/ActiveDiscountDisplayModal';
import LoginFixBanner from './components/LoginFixBanner';
import Login from './components/Login';
import Login2 from './components/Login2';
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
import Account99Dashboard from './pages/Account99Dashboard'; // Import Account 99 admin dashboard
import EnhancedChatWidget from './components/EnhancedChatWidget';
import ChatPage from './pages/ChatPage';
import AdminKnowledgeBase from './pages/AdminKnowledgeBase'; // Admin knowledge base management
import Test997Page from './pages/Test997Page'; // Test997 staff management page
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

  // Check for admin account 999
  const isAdmin = user?.accountNumber === '999';
  return isAdmin ? children : <Navigate to="/" replace />; // Redirect non-admins to dashboard
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

  // Check if user is account 99 specifically or has special admin flag
  const isAccount99 = user?.accountNumber === '99';
  const hasAccess = isSpecialAdmin || isAccount99;

  // Only log once during development, not on every render
  React.useEffect(() => {
    console.log('SpecialAdminProtectedRoute mounted: ', { 
      accountNumber: user?.accountNumber, 
      isSpecialAdmin, 
      isAccount99,
      hasAccess,
      user
    });
  }, []);

  // Use a state variable to prevent infinite redirects
  const [redirectAttempted, setRedirectAttempted] = React.useState(false);
  
  React.useEffect(() => {
    // Reset redirect flag if user or access status changes
    if (user?.accountNumber || hasAccess !== undefined) {
      setRedirectAttempted(false);
    }
  }, [user?.accountNumber, hasAccess]);

  // If user doesn't have access and haven't attempted redirect yet
  if (!hasAccess && !redirectAttempted) {
    setRedirectAttempted(true);
    return <Navigate to="/" replace />;
  }

  return hasAccess ? children : <div>Redirecting...</div>;
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
          .from('pre_products_supabase')
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
        <Route path="/login2" element={<Login2 />} />
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
        {/* Admin Dashboard */}
        <Route 
          path="/admin" 
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
              ) : user?.accountNumber === '99' ? (
                <Navigate to="/admin99" replace />
              ) : isSpecialAdmin ? (
                <Navigate to="/sku-import" replace />
              ) : (
                <Navigate to="/shopping" replace />
              )}
            </ProtectedRoute>
          } 
        />
        {/* Shopping page - Main product browsing and shopping interface */}
        <Route 
          path="/shopping" 
          element={
            <ProtectedRoute>
              <Dashboard />
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
        {/* Account 99 Admin Dashboard */}
        <Route 
          path="/admin99"
          element={
            <SpecialAdminProtectedRoute>
              <Account99Dashboard />
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
        {/* Manager Panel - Protected route */}
        <Route 
          path="/manager" 
          element={
            <ProtectedRoute>
              <Test997Page />
            </ProtectedRoute>
          } 
        />
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
  // CHECK FOR /5150 IMMEDIATELY
  const isAdminBypass = window.location.pathname.includes('/5150') || 
                        sessionStorage.getItem('adminBypass') === 'true';
  
  const [siteStatus, setSiteStatus] = useState<{ status: string; message: string } | null>(null);
  const [statusLoading, setStatusLoading] = useState(!isAdminBypass); // Skip loading if bypassed
  const [bypassCheck, setBypassCheck] = useState(isAdminBypass); // Set bypass immediately

  // Check for bypass conditions on app load
  useEffect(() => {
    // If on login page, ALWAYS bypass site status check
    const currentPath = window.location.pathname;
    if (currentPath === '/login' || currentPath === '/5150' || currentPath.includes('login')) {
      console.log('On login page - bypassing site status check');
      sessionStorage.setItem('adminBypass', 'true');
      setStatusLoading(false);
      setBypassCheck(true);
      return; // Don't check site status on login page
    }
    
    // If already bypassed from login, stay bypassed
    if (isAdminBypass) {
      setStatusLoading(false);
      return;
    }
    
    const checkSiteStatus = async () => {
      try {

        // THIS CODE NEVER RUNS
        const { data, error } = await supabase
          .from('site_status')
          .select('is_online, message')
          .eq('id', 1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error checking site status:', error);
          // If we can't check status, allow access (fail open)
          setStatusLoading(false);
          return;
        }

        if (data && data.is_online === false) {
          // Site is offline ONLY if is_online is explicitly false
          setSiteStatus({
            status: 'offline',
            message: data.message || 'Site is temporarily unavailable for maintenance.'
          });
        }

        setStatusLoading(false);
      } catch (error) {
        console.error('Site status check failed:', error);
        // If check fails, allow access (fail open)
        setStatusLoading(false);
      }
    };

    // DISABLED - SITE ALWAYS ONLINE
    // checkSiteStatus();
  }, []);

  // NEVER SHOW LOADING OR OFFLINE - GO STRAIGHT TO APP
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
  const [statusLoading, setStatusLoading] = useState(false); // SITE ALWAYS ONLINE
  
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
    
    // DISABLED - SITE ALWAYS ONLINE
    // checkStatus();
    setStatusLoading(false); // Immediately set to false
  }, []);
  
  // NEVER SHOW LOADING - GO STRAIGHT TO APP
  return <AppContent />;
}

export default App;
