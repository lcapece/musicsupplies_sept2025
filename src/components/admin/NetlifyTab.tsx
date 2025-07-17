cimport React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface DeploymentInfo {
  id: string;
  state: string;
  created_at: string;
  updated_at: string;
  deploy_url: string;
  branch: string;
  commit_ref: string;
  commit_url: string;
  title: string;
}

interface SiteInfo {
  id: string;
  name: string;
  url: string;
  admin_url: string;
  deploy_url: string;
  state: string;
  created_at: string;
  updated_at: string;
}

const NetlifyTab: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null);
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([]);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);

  // Check if user is admin (account 999)
  const isAdmin = user?.accountNumber === '999';

  useEffect(() => {
    if (isAdmin) {
      fetchSiteInfo();
      fetchDeployments();
    }
  }, [isAdmin]);

  const fetchSiteInfo = async () => {
    try {
      setIsLoadingInfo(true);
      
      // Get current user from localStorage (custom auth system)
      const savedUser = localStorage.getItem('user');
      let currentUser = null;
      if (savedUser) {
        try {
          currentUser = JSON.parse(savedUser);
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
        }
      }

      if (!currentUser || currentUser.accountNumber !== '999') {
        console.log('Not authenticated as admin, skipping site info');
        return;
      }

      // Use Netlify API to get site information
      const response = await fetch('https://api.netlify.com/api/v1/sites', {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_NETLIFY_API_TOKEN || process.env.NETLIFY_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Netlify API error: ${response.status}`);
      }

      const sites = await response.json();
      
      // Find the current site (you might need to adjust this logic based on your site name)
      const currentSite = sites.find((site: any) => 
        site.name.includes('musicsupplies') || 
        site.url.includes('musicsupplies') ||
        sites.length === 1 // If only one site, use it
      ) || sites[0]; // Fallback to first site

      if (currentSite) {
        setSiteInfo(currentSite);
      }

    } catch (error) {
      console.error('Error fetching site info:', error);
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const fetchDeployments = async () => {
    try {
      if (!siteInfo?.id) return;

      const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteInfo.id}/deploys?per_page=5`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_NETLIFY_API_TOKEN || process.env.NETLIFY_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Netlify API error: ${response.status}`);
      }

      const deploymentsData = await response.json();
      setDeployments(deploymentsData);

    } catch (error) {
      console.error('Error fetching deployments:', error);
    }
  };

  const triggerDeploy = async () => {
    if (!isAdmin) {
      setMessage('Access denied. Admin privileges required.');
      setMessageType('error');
      return;
    }

    if (!siteInfo?.id) {
      setMessage('Site information not available. Please refresh the page.');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('Triggering new deployment...');
    setMessageType('info');

    try {
      // Get current user from localStorage (custom auth system)
      const savedUser = localStorage.getItem('user');
      let currentUser = null;
      if (savedUser) {
        try {
          currentUser = JSON.parse(savedUser);
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
        }
      }

      if (!currentUser || currentUser.accountNumber !== '999') {
        setMessage('Access denied. Must be logged in as admin account 999.');
        setMessageType('error');
        return;
      }

      // Trigger a new build
      const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteInfo.id}/builds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_NETLIFY_API_TOKEN || process.env.NETLIFY_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to trigger deployment: ${response.status}`);
      }

      const deployment = await response.json();
      
      setMessage(`✅ Deployment triggered successfully! Deploy ID: ${deployment.id}`);
      setMessageType('success');
      
      // Refresh deployments after a short delay
      setTimeout(() => {
        fetchDeployments();
      }, 2000);

    } catch (error: any) {
      console.error('Error triggering deployment:', error);
      setMessage(`❌ Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'ready':
      case 'published':
        return 'text-green-600 bg-green-50';
      case 'building':
      case 'processing':
        return 'text-blue-600 bg-blue-50';
      case 'error':
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Access denied. Admin privileges required to manage Netlify deployments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Netlify Deployment Management</h2>
        <p className="text-gray-600">
          Manage your Netlify site deployments, trigger new builds, and monitor deployment status.
        </p>
      </div>

      {/* Site Information */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Site Information</h3>
        {isLoadingInfo ? (
          <p className="text-gray-500">Loading site information...</p>
        ) : siteInfo ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-500">Site Name</div>
              <div className="text-lg text-gray-900">{siteInfo.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Status</div>
              <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(siteInfo.state)}`}>
                {siteInfo.state}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Site URL</div>
              <a href={siteInfo.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                {siteInfo.url}
              </a>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Admin URL</div>
              <a href={siteInfo.admin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                Netlify Dashboard
              </a>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Unable to load site information</p>
        )}
      </div>

      {/* Deployment Actions */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Deployment Actions</h3>
        <div className="space-y-4">
          <div>
            <button
              onClick={triggerDeploy}
              disabled={isLoading || !siteInfo}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-md font-medium mr-4"
            >
              {isLoading ? 'Deploying...' : 'Trigger New Deployment'}
            </button>
            <span className="text-sm text-gray-600">
              Start a new build and deployment from the latest code
            </span>
          </div>
          
          <div>
            <button
              onClick={() => { fetchSiteInfo(); fetchDeployments(); }}
              disabled={isLoading}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md font-medium mr-4"
            >
              Refresh Status
            </button>
            <span className="text-sm text-gray-600">
              Update site information and deployment history
            </span>
          </div>
        </div>
      </div>

      {/* Recent Deployments */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Deployments</h3>
        {deployments.length > 0 ? (
          <div className="space-y-4">
            {deployments.map((deployment) => (
              <div key={deployment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(deployment.state)}`}>
                      {deployment.state}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(deployment.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Branch: {deployment.branch}
                  </div>
                </div>
                <div className="text-sm text-gray-900 mb-1">
                  {deployment.title || 'No title'}
                </div>
                <div className="flex space-x-4 text-sm">
                  <a 
                    href={deployment.deploy_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View Deploy
                  </a>
                  {deployment.commit_url && (
                    <a 
                      href={deployment.commit_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View Commit
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No recent deployments found</p>
        )}
      </div>

      {/* Status Messages */}
      {message && (
        <div className={`p-4 rounded-md mb-6 ${
          messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          messageType === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <p>{message}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">How It Works</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>Monitor your Netlify site status and recent deployments</li>
          <li>Trigger new deployments directly from your admin panel</li>
          <li>View deployment history and status updates</li>
          <li>Access Netlify dashboard and deployment URLs quickly</li>
          <li>All actions require admin account 999 authentication</li>
        </ul>
      </div>
    </div>
  );
};

export default NetlifyTab;
