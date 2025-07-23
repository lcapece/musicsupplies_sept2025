import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Assuming supabase client is here
// Define a type for the application data, matching your table structure
// This should ideally be in a shared types file if used elsewhere

interface TradeReference {
  name: string;
  phone: string;
  addn_info: string;
}

interface AccountApplication {
  id: string;
  created_at: string;
  submission_date?: string; // from existing table schema
  business_name: string;
  contact_name: string;
  business_email: string;
  business_phone: string;
  status: string;
  resale_cert_number?: string;
  state_registration?: string; // state_of_certificate_issue
  business_type?: string;
  requesting_credit_line?: boolean;
  trade_references?: TradeReference[] | null;
  // Add other fields from your table you want to display
  notes?: string;
}

const AdminAccountApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<AccountApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<AccountApplication | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('account_applications')
          .select('*') // Select all columns for now, can be specific later
          .order('submission_date', { ascending: false }); // Show newest first

        if (fetchError) {
          console.error("Error fetching account applications:", fetchError);
          setError(fetchError.message);
          setApplications([]);
        } else {
          setApplications(data || []);
        }
      } catch (err: any) {
        console.error("Unexpected error fetching applications:", err);
        setError(err.message || "An unexpected error occurred.");
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  if (loading) {
    return <div className="p-6 text-center">Loading applications...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600 text-center">Error loading applications: {error}</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">New Account Applications</h1>
      
      {applications.length === 0 ? (
        <p className="text-center text-gray-500 text-xl">No account applications found.</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow-lg rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-lg font-semibold text-gray-700 uppercase tracking-wider">Submitted</th>
                <th scope="col" className="px-6 py-4 text-left text-lg font-semibold text-gray-700 uppercase tracking-wider">Business Name</th>
                <th scope="col" className="px-6 py-4 text-left text-lg font-semibold text-gray-700 uppercase tracking-wider">Contact Name</th>
                <th scope="col" className="px-6 py-4 text-left text-lg font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-4 text-left text-lg font-semibold text-gray-700 uppercase tracking-wider">Phone</th>
                <th scope="col" className="px-6 py-4 text-left text-lg font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-4 text-left text-lg font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-5 whitespace-nowrap text-base text-gray-700">
                    {app.submission_date ? new Date(app.submission_date).toLocaleDateString() : new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-base font-semibold text-gray-900">{app.business_name}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-base text-gray-700">{app.contact_name}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-base text-gray-700">{app.business_email}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-base text-gray-700">{app.business_phone}</td>
                  <td className="px-6 py-5 whitespace-nowrap text-base">
                    <span className={`px-3 py-1 inline-flex text-sm font-bold rounded-full ${
                      app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      app.status === 'approved' ? 'bg-green-100 text-green-800' :
                      app.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-base">
                    <button
                      onClick={() => setSelectedApplication(app)}
                      className="text-indigo-600 hover:text-indigo-900 font-semibold text-base"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Basic Modal for Viewing Details */}
      {selectedApplication && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                      Application Details: {selectedApplication.business_name}
                    </h3>
                    <div className="mt-2 text-sm text-gray-600 space-y-2">
                      <p><strong>Submitted:</strong> {selectedApplication.submission_date ? new Date(selectedApplication.submission_date).toLocaleString() : new Date(selectedApplication.created_at).toLocaleString()}</p>
                      <p><strong>Status:</strong> {selectedApplication.status}</p>
                      <p><strong>Contact:</strong> {selectedApplication.contact_name} ({selectedApplication.business_email}, {selectedApplication.business_phone})</p>
                      <p><strong>Resale Cert #:</strong> {selectedApplication.resale_cert_number || 'N/A'}</p>
                      <p><strong>State of Issue:</strong> {selectedApplication.state_registration || 'N/A'}</p>
                      <p><strong>Retailer Type:</strong> {selectedApplication.business_type || 'N/A'}</p>
                      <p><strong>Credit Line Requested:</strong> {selectedApplication.requesting_credit_line ? 'Yes' : 'No'}</p>
                      {selectedApplication.requesting_credit_line && selectedApplication.trade_references && (
                        <div>
                          <strong>Trade References:</strong>
                          <ul className="list-disc list-inside ml-4">
                            {selectedApplication.trade_references.map((ref, idx) => (
                              <li key={idx}>{ref.name} - {ref.phone} ({ref.addn_info || 'No addn info'})</li>
                            ))}
                          </ul>
                        </div>
                      )}
                       <p><strong>Notes:</strong> {selectedApplication.notes || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setSelectedApplication(null)}
                >
                  Close
                </button>
                {/* TODO: Add buttons for Approve/Reject status changes if needed */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccountApplicationsPage;
