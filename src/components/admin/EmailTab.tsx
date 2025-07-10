import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface TestEmail {
  id: string;
  to: string;
  subject: string;
  message: string;
  status: 'sending' | 'sent' | 'failed';
  timestamp: string;
  error?: string;
}

const EmailTab: React.FC = () => {
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmails, setTestEmails] = useState<TestEmail[]>([]);

  const handleSendTestEmail = async (to: string, subject: string, message: string) => {
    const emailId = `test-${Date.now()}`;
    
    // Add to test emails immediately
    const newTestEmail: TestEmail = {
      id: emailId,
      to: to,
      subject,
      message,
      status: 'sending',
      timestamp: new Date().toISOString()
    };

    setTestEmails(prev => [newTestEmail, ...prev]);

    try {
      const { data, error } = await supabase.functions.invoke('send-mailgun-email', {
        body: {
          to: to,
          subject: subject,
          text: message,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2563eb;">Test Email from Music Supplies Admin</h2>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr style="margin: 20px 0; border: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
              This is a test email sent from the Music Supplies administration panel.
            </p>
          </div>`
        }
      });

      if (error) {
        console.error('Error sending test email:', error);
        // Update status to failed
        setTestEmails(prev => prev.map(email => 
          email.id === emailId ? { ...email, status: 'failed', error: error.message } : email
        ));
        alert('Failed to send test email: ' + error.message);
        return;
      }

      // Update status to sent
      setTestEmails(prev => prev.map(email => 
        email.id === emailId ? { ...email, status: 'sent' } : email
      ));

      alert('Test email sent successfully');
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTestEmails(prev => prev.map(email => 
        email.id === emailId ? { ...email, status: 'failed', error: errorMessage } : email
      ));
      alert('Error sending test email: ' + errorMessage);
    }
  };

  const TestEmailModal: React.FC<{
    onClose: () => void;
    onSend: (to: string, subject: string, message: string) => void;
  }> = ({ onClose, onSend }) => {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('Test Email from Music Supplies');
    const [message, setMessage] = useState('This is a test email to verify the Mailgun integration is working correctly.');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!to.trim()) {
        alert('Please enter an email address');
        return;
      }
      
      if (!subject.trim()) {
        alert('Please enter a subject');
        return;
      }
      
      if (!message.trim()) {
        alert('Please enter a message');
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to.trim())) {
        alert('Please enter a valid email address');
        return;
      }

      onSend(to.trim(), subject.trim(), message.trim());
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Send Test Email
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Send a test email to verify Mailgun integration
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Email Address
              </label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                required
              />
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
                rows={6}
                required
              />
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
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Send Test Email
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Management</h2>
          <p className="text-sm text-gray-600 mt-1">Send emails via Mailgun integration</p>
        </div>
        <div>
          <button
            onClick={() => setShowTestModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            📧 Send Test Email
          </button>
        </div>
      </div>

      {/* Configuration Info */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Mailgun Configuration</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Sender:</strong> marketing@mg.musicsupplies.com</li>
          <li>• <strong>Service:</strong> Mailgun API</li>
          <li>• <strong>Credentials:</strong> Stored in Supabase Edge Vault</li>
          <li>• <strong>Status:</strong> Ready for testing</li>
        </ul>
      </div>

      {/* Test Emails History */}
      {testEmails.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Test Emails</h3>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {testEmails.slice(0, 10).map((email) => (
              <div key={email.id} className="px-6 py-3 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      To: {email.to}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Subject: {email.subject}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate max-w-md">
                      {email.message}
                    </div>
                    {email.error && (
                      <div className="text-xs text-red-600 mt-1">
                        Error: {email.error}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      email.status === 'sent' ? 'bg-green-100 text-green-800' :
                      email.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {email.status}
                    </span>
                    <div className="text-xs text-gray-500">
                      {new Date(email.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Email Management Instructions</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Use the "Send Test Email" button to test the Mailgun integration</li>
          <li>• All emails are sent from marketing@mg.musicsupplies.com</li>
          <li>• Test emails include both plain text and HTML formatting</li>
          <li>• Email delivery status will be displayed in the Recent Test Emails section</li>
          <li>• Ensure Mailgun credentials are properly configured in Supabase Edge Vault</li>
        </ul>
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <TestEmailModal
          onClose={() => setShowTestModal(false)}
          onSend={handleSendTestEmail}
        />
      )}
    </div>
  );
};

export default EmailTab;
