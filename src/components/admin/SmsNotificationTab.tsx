import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface SmsNotificationSetting {
  id: number;
  event_name: string;
  event_description: string;
  is_enabled: boolean;
  notification_phone: string;
  created_at: string;
  updated_at: string;
}

const SmsNotificationTab: React.FC = () => {
  const [settings, setSettings] = useState<SmsNotificationSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sms_notification_settings')
        .select('*')
        .order('event_name', { ascending: true });

      if (error) {
        console.error('Error fetching SMS settings:', error);
        return;
      }

      setSettings(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (id: number, updates: Partial<SmsNotificationSetting>) => {
    try {
      setSaving(prev => [...prev, id]);
      
      const { error } = await supabase
        .from('sms_notification_settings')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating SMS setting:', error);
        alert('Error updating SMS notification setting');
        return;
      }

      await fetchSettings();
      alert('SMS notification setting updated successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating SMS notification setting');
    } finally {
      setSaving(prev => prev.filter(settingId => settingId !== id));
    }
  };

  const handleSendTestSMS = async (setting: SmsNotificationSetting) => {
    if (!setting.notification_phone) {
      alert('No phone number configured for this event');
      return;
    }

    try {
      const testMessage = `Test SMS for "${setting.event_description}" event from MusicSupplies.com admin panel.`;
      
      const { data, error } = await supabase.functions.invoke('send-test-sms', {
        body: {
          accountNumber: 'ADMIN',
          accountName: 'System Test',
          smsNumber: setting.notification_phone,
          message: testMessage
        }
      });

      if (error) {
        console.error('Error sending test SMS:', error);
        alert('Failed to send test SMS');
        return;
      }

      alert('Test SMS sent successfully');
    } catch (error) {
      console.error('Error:', error);
      alert('Error sending test SMS');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SMS Notification Settings</h2>
          <p className="text-sm text-gray-600 mt-1">Configure when SMS notifications are sent and to which numbers</p>
        </div>
        <button
          onClick={fetchSettings}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Total Events</div>
          <div className="text-2xl font-bold text-blue-600">{settings.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Enabled Events</div>
          <div className="text-2xl font-bold text-green-600">{settings.filter(s => s.is_enabled).length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-600">Disabled Events</div>
          <div className="text-2xl font-bold text-red-600">{settings.filter(s => !s.is_enabled).length}</div>
        </div>
      </div>

      {/* SMS Notification Settings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Event Notification Settings</h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure which events trigger SMS notifications and where they are sent
          </p>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">Loading notification settings...</div>
          </div>
        ) : settings.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-600">No notification settings found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enabled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notification Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {settings.map((setting) => (
                  <tr key={setting.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {setting.event_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {setting.event_description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={setting.is_enabled}
                          onChange={(e) => handleUpdateSetting(setting.id, { is_enabled: e.target.checked })}
                          disabled={saving.includes(setting.id)}
                          className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                        />
                        <span className={`ml-2 text-sm ${setting.is_enabled ? 'text-green-600' : 'text-red-600'}`}>
                          {setting.is_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="tel"
                        value={setting.notification_phone}
                        onChange={(e) => handleUpdateSetting(setting.id, { notification_phone: e.target.value })}
                        disabled={saving.includes(setting.id)}
                        className="text-sm text-gray-600 font-mono border border-gray-300 rounded px-2 py-1 w-32"
                        placeholder="+1234567890"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSendTestSMS(setting)}
                          disabled={!setting.notification_phone || saving.includes(setting.id)}
                          className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                        >
                          Test SMS
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">SMS Notification Instructions</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• **Enabled**: Check to enable SMS notifications for this event</li>
          <li>• **Notification Phone**: Enter the phone number that should receive SMS notifications (include country code)</li>
          <li>• **Test SMS**: Send a test message to verify the phone number works</li>
          <li>• **Order Successfully Entered**: Sent when customers place orders</li>
          <li>• **New Account Application Added**: Sent when new account applications are submitted</li>
        </ul>
      </div>
    </div>
  );
};

export default SmsNotificationTab;
