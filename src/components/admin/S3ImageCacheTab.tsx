import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface S3File {
  filename: string;
  size: number;
  lastModified: string;
}

interface CacheStats {
  totalFiles: number;
  lastUpdated: string | null;
}

const S3ImageCacheTab: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [cacheStats, setCacheStats] = useState<CacheStats>({ totalFiles: 0, lastUpdated: null });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Check if user is admin (account 999)
  const isAdmin = user?.accountNumber === '999';

  useEffect(() => {
    if (isAdmin) {
      fetchCacheStats();
    }
  }, [isAdmin]);

  const fetchCacheStats = async () => {
    try {
      setIsLoadingStats(true);
      
      // Check if user is authenticated as account 999
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
        console.log('Not authenticated as admin, skipping cache stats');
        setCacheStats({ totalFiles: 0, lastUpdated: null });
        return;
      }

      const { data, error } = await supabase
        .from('s3_image_cache')
        .select('id, cache_updated')
        .order('cache_updated', { ascending: false });

      if (error) {
        console.error('Error fetching cache stats:', error);
        // Don't show error message for stats, just log it
        setCacheStats({ totalFiles: 0, lastUpdated: null });
        return;
      }

      const totalFiles = data?.length || 0;
      const lastUpdated = data && data.length > 0 ? data[0].cache_updated : null;

      setCacheStats({ totalFiles, lastUpdated });
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      setCacheStats({ totalFiles: 0, lastUpdated: null });
    } finally {
      setIsLoadingStats(false);
    }
  };

  const listS3Files = async (): Promise<S3File[]> => {
    // For now, return empty array - AWS SDK integration will be added later
    // This allows the site to deploy to Netlify without AWS dependencies
    throw new Error('S3 file listing is currently disabled for deployment. The clear cache function still works to manage existing cached files.');
  };

  const rebuildCache = async () => {
    if (!isAdmin) {
      setMessage('Access denied. Admin privileges required.');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('Rebuilding S3 image cache...');
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

      // Step 1: Clear existing cache using admin function
      const { data: clearResult, error: clearError } = await supabase.rpc('admin_rebuild_s3_image_cache', {
        p_account_number: parseInt(currentUser.accountNumber)
      });
      
      if (clearError) throw clearError;

      // Step 2: List all files in S3 bucket
      setMessage('Fetching S3 file list...');
      const s3Files = await listS3Files();

      if (s3Files.length === 0) {
        setMessage('No image files found in S3 bucket.');
        setMessageType('info');
        return;
      }

      // Step 3: Add files to cache using admin function
      setMessage(`Adding ${s3Files.length} files to cache...`);
      const { data: addResult, error: addError } = await supabase.rpc('admin_add_s3_files_to_cache', {
        p_account_number: parseInt(currentUser.accountNumber),
        file_list: s3Files
      });

      if (addError) throw addError;

      setMessage(`✅ ${addResult || 'Cache rebuilt successfully!'}`);
      setMessageType('success');
      
      // Refresh stats
      await fetchCacheStats();

    } catch (error: any) {
      console.error('Error rebuilding cache:', error);
      setMessage(`❌ Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = async () => {
    if (!isAdmin) {
      setMessage('Access denied. Admin privileges required.');
      setMessageType('error');
      return;
    }

    if (!confirm('Are you sure you want to clear the S3 image cache? This will remove all cached file information.')) {
      return;
    }

    setIsLoading(true);
    setMessage('Clearing S3 image cache...');
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

      // Use admin function to clear cache
      const { data, error } = await supabase.rpc('admin_rebuild_s3_image_cache', {
        p_account_number: parseInt(currentUser.accountNumber)
      });
      
      if (error) throw error;

      setMessage('✅ S3 image cache cleared successfully.');
      setMessageType('success');
      
      // Refresh stats
      await fetchCacheStats();

    } catch (error: any) {
      console.error('Error clearing cache:', error);
      setMessage(`❌ Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Access denied. Admin privileges required to manage S3 image cache.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">S3 Image Cache Management</h2>
        <p className="text-gray-600">
          Manage the cached list of S3 image files for fast lookups. This eliminates the need to make HTTP requests 
          to check if images exist, dramatically improving performance.
        </p>
      </div>

      {/* Cache Statistics */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cache Statistics</h3>
        {isLoadingStats ? (
          <p className="text-gray-500">Loading statistics...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{cacheStats.totalFiles}</div>
              <div className="text-sm text-blue-800">Total Cached Files</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-green-800">Last Updated</div>
              <div className="text-sm text-green-600">
                {cacheStats.lastUpdated 
                  ? new Date(cacheStats.lastUpdated).toLocaleString()
                  : 'Never'
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cache Actions</h3>
        <div className="space-y-4">
          <div>
            <button
              onClick={rebuildCache}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-md font-medium mr-4"
            >
              {isLoading ? 'Rebuilding...' : 'Rebuild Cache from S3'}
            </button>
            <span className="text-sm text-gray-600">
              Fetch all image files from S3 bucket and update the cache
            </span>
          </div>
          
          <div>
            <button
              onClick={clearCache}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded-md font-medium mr-4"
            >
              {isLoading ? 'Clearing...' : 'Clear Cache'}
            </button>
            <span className="text-sm text-gray-600">
              Remove all cached file information
            </span>
          </div>
        </div>
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
          <li>The cache stores a list of all image files in the S3 bucket (mus86077)</li>
          <li>When products are displayed, the system checks the cache instead of making HTTP requests to S3</li>
          <li>This provides instant image existence checking with case-insensitive matching</li>
          <li>Rebuild the cache whenever new images are added to the S3 bucket</li>
          <li>The cache includes filename, size, and last modified date for each file</li>
        </ul>
      </div>
    </div>
  );
};

export default S3ImageCacheTab;
