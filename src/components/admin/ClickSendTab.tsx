import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface CustomerSMS {
  account_number: number;
  acct_name: string;
  sms_number: string | null;
  city: string;
  state: string;
  phone: string;
}

interface TestMessage {
  id: string;
  account_number: number;
  sms_number: string;
  message: string;
  status: 'sending' | 'sent' | 'failed';
  timestamp: string;
}

const ClickSendTab: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerSMS[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSMS | null>(null);
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [showAdHocModal, setShowAdHocModal] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('accounts_lcmd')
        .select('account_number, acct_name, sms_number, city, state, phone')
        .order('account_number', { ascending: true });

      if (error) {
        console.error('Error fetching customers:', error);
        return;
      }

      setCustomers(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSmsNumber = async (accountNumber: number, smsNumber: string) => {
    try {
      const { error } = await supabase
        .from('accounts_lcmd')
        .update({ 
          sms_number: smsNumber.trim() || null,
          is_dirty: true  // Mark as dirty for data warehouse sync
        })
        .eq('account_number', accountNumber);

      if (error) {
        console.error('Error updating SMS number:', error);
        alert('Error updating SMS number');
        return;
      }

      await fetchCustomers();
      alert('SMS number updated successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating SMS number');
    }
  };

  const handleSendTestMessage = async (customer: CustomerSMS, customMessage?: string) => {
    if (!customer.sms_number) {
      alert('Customer does not have an SMS number set');
      return;
    }

    const messageId = `test-${Date.now()}`;
    const defaultMessage = `Hello ${customer.acct_name}! This is a test message from MusicSupplies.com. Your account ${customer.account_number} is set up to receive order notifications.`;
    const message = customMessage || defaultMessage;

    // Add to test messages immediately
    const newTestMessage: TestMessage = {
      id: messageId,
      account_number: customer.account_number,
      sms_number: customer.sms_number,
      message,
      status: 'sending',
      timestamp: new Date().toISOString()
    };

    setTestMessages(prev => [newTestMessage, ...prev]);

    try {
      const { data, error } = await supabase.functions.invoke('send-test-sms', {
        body: {
          accountNumber: customer.account_number,
          accountName: customer.acct_name,
          smsNumber: customer.sms_number,
          message: message
        }
      });

      if (error) {
        console.error('Error sending test SMS:', error);
        // Update status to failed
        setTestMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'failed' } : msg
        ));
        alert('Failed to send test SMS');
        return;
      }

      // Update status to sent
      setTestMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'sent' } : msg
      ));

      alert('Test SMS sent successfully');
    } catch (error) {
      console.error('Error:', error);
      setTestMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'failed' } : msg
      ));
      alert('Error sending test SMS');
    }
  };

  const handleSendAdHocSMS = async (smsNumber: string, message: string) => {
    const messageId = `adhoc-${Date.now()}`;
    
    // Add to test messages immediately
    const newTestMessage: TestMessage = {
      id: messageId,
      account_number: 0, // Ad-hoc messages don't have an account
      sms_number: smsNumber,
      message,
      status: 'sending',
      timestamp: new Date().toISOString()
    };

    setTestMessages(prev => [newTestMessage, ...prev]);

    try {
      const { data, error } = await supabase.functions.invoke('send-test-sms', {
        body: {
          accountNumber: 'Ad-Hoc',
          accountName: 'Admin Direct Message',
          smsNumber: smsNumber,
          message: message
        }
      });

      if (error) {
        console.error('Error sending ad-hoc SMS:', error);
        // Update status to failed
        setTestMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'failed' } : msg
        ));
        alert('Failed to send ad-hoc SMS');
        return;
      }

      // Update status to sent
      setTestMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'sent' } : msg
      ));

      alert('Ad-hoc SMS sent successfully');
    } catch (error) {
      console.error('Error:', error);
      setTestMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'failed' } : msg
      ));
      alert('Error sending ad-hoc SMS');
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    return !searchTerm || 
      customer.account_number.toString().includes(searchTerm) ||
      customer.acct_name.toLowerCase().includes(searchLower) ||
      (customer.sms_number && customer.sms_number.includes(searchTerm));
  });

  const customersWithSms = customers.filter(c => c.sms_number);
  const customersWithoutSms = customers.filter(c => !c.sms_number);

  const AdHocSmsModal: React.FC<{
    onClose: () => void;
    onSend: (smsNumber: string, message: string) => void;
  }> = ({ onClose, onSend }) => {
    const [smsNumber, setSmsNumber] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!smsNumber.trim()) {
        alert('Please enter an SMS number');
        return;
      }
      
      if (!message.trim()) {
        alert('Please enter a message');
        return;
      }

      onSend(smsNumber.trim(), message.trim());
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Send Ad-Hoc SMS
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Send a one-time SMS message to any phone number
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMS Number (with country code)
              </label>
              <input
                type="tel"
                value={smsNumber}
                onChange={(e) => setSmsNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Include country code (e.g., +1 for US/Canada)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={4}
                required
                maxLength={160}
              />
              <p className="text-xs text-gray-500 mt-1">
                {message.length}/160 characters
              </p>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md"
              >
                Send SMS
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const SmsModal: React.FC<{
    customer: CustomerSMS;
    onClose: () => void;
    onSave: (accountNumber: number, smsNumber: string) => void;
  }> = ({ customer, onClose, onSave }) => {
    const [smsNumber, setSmsNumber] = useState(customer.sms_number || '');
    const [testMessage, setTestMessage] = useState('');

    const handleSubmit = () => {
      onSave(customer.account_number, smsNumber);
      onClose();
    };

    const handleSendTest = () => {
      if (!smsNumber.trim()) {
        alert('Please enter an SMS number first');
        return;
      }
      
      // Update the customer object with the new SMS number for testing
      const updatedCustomer = { ...customer, sms_number: smsNumber.trim() };
      handleSendTestMessage(updatedCustomer, testMessage.trim() || undefined);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Manage SMS for Account {customer.account_number}
          </h3>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Company:</strong> {customer.acct_name}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              <strong>Location:</strong> {customer.city}, {customer.state}
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMS Number (with country code)
              </label>
              <input
                type="tel"
                value={smsNumber}
                onChange={(e) => setSmsNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Include country code (e.g., +1 for US/Canada)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Message (optional)
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Leave blank for default test message..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-between mt-6">
            <button
              onClick={handleSendTest}
              disabled={!smsNumber.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:bg-gray-300"
            >
              Send Test SMS
            </button>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Save SMS Number
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ClickSend SMS Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage customer SMS numbers and send test messages</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAdHocModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Send Ad-Hoc SMS
          </button>
          <button
            onClick={fetchCustomers}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total Customers</div>
          <div className="text-2xl font-bold text-blue-600">{customers.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">With SMS Numbers</div>
          <div className="text-2xl font-bold text-green-600">{customersWithSms.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Without SMS</div>
          <div className="text-2xl font-bold text-orange-600">{customersWithoutSms.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Messages Sent</div>
          <div className="text-2xl font-bold text-purple-600">{testMessages.length}</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Customers
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by account number, company name, or SMS number..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => setSearchTerm('')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium mt-6"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Test Messages History */}
      {testMessages.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Messages</h3>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {testMessages.slice(0, 10).map((msg) => (
              <div key={msg.id} className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {msg.account_number === 0 ? 'Ad-Hoc SMS' : `Account ${msg.account_number}`} → {msg.sms_number}
                  </div>
                  <div className="text-xs text-gray-500 truncate max-w-md">
                    {msg.message}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    msg.status === 'sent' ? 'bg-green-100 text-green-800' :
                    msg.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {msg.status}
                  </span>
                  <div className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Customer SMS Management ({filteredCustomers.length} customers)
          </h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">Loading customers...</div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">No customers found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SMS Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.account_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {customer.account_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {customer.acct_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {customer.city}, {customer.state}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {customer.phone || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {customer.sms_number ? (
                        <span className="text-green-600">{customer.sms_number}</span>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowSmsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {customer.sms_number ? 'Edit SMS' : 'Add SMS'}
                        </button>
                        {customer.sms_number && (
                          <button
                            onClick={() => handleSendTestMessage(customer)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Test SMS
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ad-Hoc SMS Modal */}
      {showAdHocModal && (
        <AdHocSmsModal
          onClose={() => setShowAdHocModal(false)}
          onSend={handleSendAdHocSMS}
        />
      )}

      {/* SMS Modal */}
      {showSmsModal && selectedCustomer && (
        <SmsModal
          customer={selectedCustomer}
          onClose={() => setShowSmsModal(false)}
          onSave={handleUpdateSmsNumber}
        />
      )}
    </div>
  );
};

export default ClickSendTab;
