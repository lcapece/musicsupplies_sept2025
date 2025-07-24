import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import AccountsTab from '../components/admin/AccountsTab';
import AccountApplicationsTab from '../components/admin/AccountApplicationsTab';
import WebOrdersTab from '../components/admin/WebOrdersTab';
import HistoryTab from '../components/admin/HistoryTab';
import ClickSendTab from '../components/admin/ClickSendTab';

type TabType = 'accounts' | 'applications' | 'orders' | 'history' | 'sms' | 'clicksend';

const AdminDashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('accounts');
  const [headerView, setHeaderView] = useState<'products' | 'orders' | 'weborders'>('products');

  if (!isAuthenticated || user?.accountNumber !== '999') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-700">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'accounts', label: 'Accounts', icon: '👥' },
    { id: 'applications', label: 'Applications', icon: '📝' },
    { id: 'orders', label: 'Web Orders', icon: '🛒' },
    { id: 'history', label: 'Order History', icon: '📊' },
    { id: 'sms', label: 'SMS Notifications', icon: '📱' },
    { id: 'clicksend', label: 'ClickSend', icon: '📨' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'accounts':
        return <AccountsTab />;
      case 'applications':
        return <AccountApplicationsTab />;
      case 'orders':
        return <WebOrdersTab />;
      case 'history':
        return <HistoryTab />;
      case 'sms':
        return <div className="text-center py-8 text-gray-500">SMS Notifications coming soon...</div>;
      case 'clicksend':
        return <ClickSendTab />;
      default:
        return <AccountsTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onViewChange={setHeaderView}
        activeView={headerView}
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="border-b border-gray-200">
            <div className="px-6 py-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.acctName || 'Administrator'}
              </p>
            </div>
            
            {/* Tab Navigation */}
            <div className="px-6">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
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
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
