import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import ActiveDiscountDisplayModal from './components/ActiveDiscountDisplayModal';
import LoginFixBanner from './components/LoginFixBanner';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NewAccountApplicationPage from './pages/NewAccountApplicationPage';
import AdminAccountApplicationsPage from './pages/AdminAccountApplicationsPage';
import AdminDashboard from './pages/AdminDashboard';
import PasswordChangeModal from './components/PasswordChangeModal';
import DiscountFormModal from './components/DiscountFormModal';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'; // Import new page
import SmsCommunicationsPage from './pages/SmsCommunicationsPage'; // Import new page
import EmailCommunicationsPage from './pages/EmailCommunicationsPage'; // Import new page
import CustomerAccountPage from './pages/CustomerAccountPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage'; // Import forgot password page
import ErrorBoundary from './components/ErrorBoundary';
import SkuImportPage from './pages/SkuImportPage'; // Import SKU Import page for account 99


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

  // Log for debugging purposes
  console.log('SpecialAdminProtectedRoute: ', { 
    accountNumber: user?.accountNumber, 
    isSpecialAdmin, 
    user
  });

  return isSpecialAdmin ? children : <Navigate to="/" replace />; // Redirect non-special-admins to dashboard
};


function AppContent() {
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
      {/* Authentication Fix Banner - only shows for admin users */}
      <LoginFixBanner />
      
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
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
        <Route 
          path="/account" 
          element={
            <ProtectedRoute>
              <CustomerAccountPage />
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
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <CartProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </CartProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
