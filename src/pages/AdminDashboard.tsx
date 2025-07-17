import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import OrderHistoryTab from '../components/admin/OrderHistoryTab';
import AccountsTab from '../components/admin/AccountsTab';
import HistoryTab from '../components/admin/HistoryTab';
import ClickSendTab from '../components/admin/ClickSendTab';
import EmailTab from '../components/admin/EmailTab';
import GeneralSettingsTab from '../components/admin/GeneralSettingsTab';
import AccountApplicationsTab from '../components/admin/AccountApplicationsTab';
import CategoryManagementTab from '../components/admin/CategoryManagementTab';
import ManageTreeviewTab from '../components/admin/ManageTreeviewTab'; 
import PromoCodeManagementTab from '../components/admin/PromoCodeManagementTab';
import S3ImageCacheTab from '../components/admin/S3ImageCacheTab';
import { applyPromoCodeFunctionMigration, applyBrandMapColumnsMigration } from '../utils/applyMigration';
import { applyPromoCodeLimitsUpdates } from '../utils/applyPromoCodeLimitsUpdates';

type AdminTab = 'orderhistory' | 'accounts' | 'history' | 'clicksend' | 'email' | 'generalsettings' | 'applications' | 'categories' | 'managetreeview' | 'promocodes' | 's3cache' | 'database';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('orderhistory');

  const tabs = [
    { id: 'orderhistory' as AdminTab, label: 'Order History', icon: '📋' },
    { id: 'accounts' as AdminTab, label: 'Accounts', icon: '👥' },
    { id: 'applications' as AdminTab, label: 'Applications', icon: '📝' },
    { id: 'categories' as AdminTab, label: 'Categories', icon: '🗂️' },
    { id: 'promocodes' as AdminTab, label: 'Promo Codes', icon: '🏷️' },
    { id: 'history' as AdminTab, label: 'History', icon: '📊' },
    { id: 'clicksend' as AdminTab, label: 'ClickSend SMS', icon: '📱' },
    { id: 'email' as AdminTab, label: 'Email', icon: '📧' },
    { id: 'generalsettings' as AdminTab, label: 'General Settings', icon: '⚙️' },
    { id: 'managetreeview' as AdminTab, label: 'Manage Treeview', icon: '🌲' },
    { id: 's3cache' as AdminTab, label: 'S3 Image Cache', icon: '🖼️' },
    { id: 'database' as AdminTab, label: 'Database', icon: '🔧' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'orderhistory':
        return <OrderHistoryTab />;
      case 'accounts':
        return <AccountsTab />;
      case 'applications':
        return <AccountApplicationsTab />;
      case 'categories':
        return <CategoryManagementTab />;
      case 'history':
        return <HistoryTab />;
      case 'clicksend':
        return <ClickSendTab />;
      case 'email':
        return <EmailTab />;
      case 'generalsettings':
        return <GeneralSettingsTab />;
      case 'managetreeview':
        return <ManageTreeviewTab />;
      case 'promocodes':
        return <PromoCodeManagementTab />;
      case 's3cache':
        return <S3ImageCacheTab />;
      case 'database':
        return <DatabaseAdminTab />;
      default:
        return <OrderHistoryTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-gray-900">
                🛠️ Administrator Backend
              </div>
              <div className="text-sm text-gray-500">
                Account: {user?.accountNumber} - {user?.acctName}
              </div>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="px-6">
          <nav className="flex space-x-0 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

// Database Admin Tab for applying migrations
const DatabaseAdminTab: React.FC = () => {
  const [migrationResults, setMigrationResults] = useState<{ [key: string]: { success: boolean; message: string } }>({});
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});

  const handleApplyPromoCodeLimits = async () => {
    setIsLoading(prev => ({ ...prev, promoCodeLimits: true }));
    try {
      const result = await applyPromoCodeLimitsUpdates();
      setMigrationResults(prev => ({ ...prev, promoCodeLimits: result }));
    } catch (error) {
      setMigrationResults(prev => ({ 
        ...prev, 
        promoCodeLimits: { 
          success: false, 
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        } 
      }));
    } finally {
      setIsLoading(prev => ({ ...prev, promoCodeLimits: false }));
    }
  };

  const handleApplyPromoCodeFunction = async () => {
    setIsLoading(prev => ({ ...prev, promoCode: true }));
    try {
      const result = await applyPromoCodeFunctionMigration();
      setMigrationResults(prev => ({ ...prev, promoCode: result }));
    } catch (error) {
      setMigrationResults(prev => ({ 
        ...prev, 
        promoCode: { 
          success: false, 
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        } 
      }));
    } finally {
      setIsLoading(prev => ({ ...prev, promoCode: false }));
    }
  };

  const handleApplyBrandMapColumns = async () => {
    setIsLoading(prev => ({ ...prev, brandMap: true }));
    try {
      const result = await applyBrandMapColumnsMigration();
      setMigrationResults(prev => ({ ...prev, brandMap: result }));
    } catch (error) {
      setMigrationResults(prev => ({ 
        ...prev, 
        brandMap: { 
          success: false, 
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        } 
      }));
    } finally {
      setIsLoading(prev => ({ ...prev, brandMap: false }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Database Administration</h2>
      <p className="text-gray-600 mb-6">
        Apply database migrations and fixes. Use these options with caution.
      </p>

      <div className="space-y-6">
        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Promo Code Function</h3>
          <p className="text-sm text-gray-600 mb-3">
            Adds the <code>get_best_promo_code</code> function needed for the promo code popup to work correctly.
          </p>
          <div className="flex items-center justify-between">
            <button
              onClick={handleApplyPromoCodeFunction}
              disabled={isLoading.promoCode}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                isLoading.promoCode
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isLoading.promoCode ? 'Applying...' : 'Apply Migration'}
            </button>
            {migrationResults.promoCode && (
              <div className={`text-sm ${migrationResults.promoCode.success ? 'text-green-600' : 'text-red-600'}`}>
                {migrationResults.promoCode.message}
              </div>
            )}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Brand & MAP Columns</h3>
          <p className="text-sm text-gray-600 mb-3">
            Adds the <code>brand</code> and <code>map</code> (Manufacturer's Advertised Price) columns to the products table.
          </p>
          <div className="flex items-center justify-between">
            <button
              onClick={handleApplyBrandMapColumns}
              disabled={isLoading.brandMap}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                isLoading.brandMap
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isLoading.brandMap ? 'Applying...' : 'Apply Migration'}
            </button>
            {migrationResults.brandMap && (
              <div className={`text-sm ${migrationResults.brandMap.success ? 'text-green-600' : 'text-red-600'}`}>
                {migrationResults.brandMap.message}
              </div>
            )}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Promo Code Account Limits</h3>
          <p className="text-sm text-gray-600 mb-3">
            Adds per-account usage limit functionality to promo codes, allowing for one-time use codes and other restrictions.
          </p>
          <div className="flex items-center justify-between">
            <button
              onClick={handleApplyPromoCodeLimits}
              disabled={isLoading.promoCodeLimits}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                isLoading.promoCodeLimits
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isLoading.promoCodeLimits ? 'Applying...' : 'Apply Migration'}
            </button>
            {migrationResults.promoCodeLimits && (
              <div className={`text-sm ${migrationResults.promoCodeLimits.success ? 'text-green-600' : 'text-red-600'}`}>
                {migrationResults.promoCodeLimits.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
