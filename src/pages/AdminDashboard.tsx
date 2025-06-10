import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ManagementTab from '../components/admin/ManagementTab';
import OrderHistoryTab from '../components/admin/OrderHistoryTab';
import AccountsTab from '../components/admin/AccountsTab';
import HistoryTab from '../components/admin/HistoryTab';
import DataSyncTab from '../components/admin/DataSyncTab';
import ClickSendTab from '../components/admin/ClickSendTab';
import GeneralSettingsTab from '../components/admin/GeneralSettingsTab';
import AccountApplicationsTab from '../components/admin/AccountApplicationsTab';
import UnresolvedIssuesTab from '../components/admin/UnresolvedIssuesTab';

type AdminTab = 'management' | 'orderhistory' | 'accounts' | 'history' | 'datasync' | 'clicksend' | 'generalsettings' | 'applications' | 'unresolvedissues';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('management');

  const tabs = [
    { id: 'management' as AdminTab, label: 'Management', icon: '⚙️' },
    { id: 'orderhistory' as AdminTab, label: 'Order History', icon: '📋' },
    { id: 'accounts' as AdminTab, label: 'Accounts', icon: '👥' },
    { id: 'applications' as AdminTab, label: 'Applications', icon: '📝' },
    { id: 'history' as AdminTab, label: 'History', icon: '📊' },
    { id: 'datasync' as AdminTab, label: 'Data Sync', icon: '🔄' },
    { id: 'clicksend' as AdminTab, label: 'ClickSend SMS', icon: '📱' },
    { id: 'unresolvedissues' as AdminTab, label: 'Unresolved Issues', icon: '⚠️' },
    { id: 'generalsettings' as AdminTab, label: 'General Settings', icon: '⚙️' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'management':
        return <ManagementTab />;
      case 'orderhistory':
        return <OrderHistoryTab />;
      case 'accounts':
        return <AccountsTab />;
      case 'applications':
        return <AccountApplicationsTab />;
      case 'history':
        return <HistoryTab />;
      case 'datasync':
        return <DataSyncTab />;
      case 'clicksend':
        return <ClickSendTab />;
      case 'generalsettings':
        return <GeneralSettingsTab />;
      case 'unresolvedissues':
        return <UnresolvedIssuesTab />;
      default:
        return <ManagementTab />;
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

export default AdminDashboard;