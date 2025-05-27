import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ActiveDiscountDisplayModal from './components/ActiveDiscountDisplayModal';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NewAccountApplicationPage from './pages/NewAccountApplicationPage';
import AdminAccountApplicationsPage from './pages/AdminAccountApplicationsPage';
import PasswordChangeModal from './components/PasswordChangeModal';
import DiscountFormModal from './components/DiscountFormModal';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'; // Import new page
import SmsCommunicationsPage from './pages/SmsCommunicationsPage'; // Import new page
import EmailCommunicationsPage from './pages/EmailCommunicationsPage'; // Import new page


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


function AppContent() {
  const { 
    user, // Get user for accountData
    // activeDiscount,  // Removed as part of new discount logic
    // showActiveDiscountModal, // Removed
    // clearActiveDiscount, // Removed
    showPasswordChangeModal,
    handlePasswordModalClose, 
    showDiscountFormModal,
    closeDiscountFormModal 
  } = useAuth();
  
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
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
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/sms-communications" element={<SmsCommunicationsPage />} />
        <Route path="/email-communications" element={<EmailCommunicationsPage />} />
         <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {/* Password Change Modal */}
      {user && showPasswordChangeModal && (
        <PasswordChangeModal
          isOpen={showPasswordChangeModal}
          onClose={handlePasswordModalClose} // Corrected name
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

      {/* Active Discount Display Modal (existing) - Temporarily removed due to AuthContext changes */}
      {/* {showActiveDiscountModal && activeDiscount && (
        <ActiveDiscountDisplayModal
          isOpen={showActiveDiscountModal}
          onClose={clearActiveDiscount}
          message={activeDiscount.message}
          startDate={activeDiscount.startDate}
          endDate={activeDiscount.endDate}
        />
      )} */}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
