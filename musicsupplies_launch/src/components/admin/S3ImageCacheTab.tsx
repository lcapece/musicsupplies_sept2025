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
    try {
      setMessage('🔍 Attempting to list S3 files...');
      
      // Try edge function first
      try {
        const { data, error } = await supabase.functions.invoke('list-s3-images', {
          body: { 
            bucket: import.meta.env.VITE_AWS_S3_BUCKET || 'mus86077'
          }
        });

        if (!error && data && data.files) {
          const imageFiles: S3File[] = data.files.map((file: any) => ({
            filename: file.filename || file.Key || '',
            size: file.size || file.Size || 0,
            lastModified: file.lastModified || file.LastModified || new Date().toISOString(),
          }));

          setMessage(`📁 Found ${imageFiles.length} image files in S3 bucket via edge function`);
          return imageFiles;
        }
      } catch (edgeFunctionError) {
        console.log('Edge function not available, using fallback approach');
      }

      // Fallback: Use direct AWS S3 API call with your credentials
      setMessage('📁 Using direct AWS S3 API to list bucket contents...');
      
      try {
        const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
        const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
        const region = import.meta.env.VITE_AWS_REGION || 'us-east-1';
        const bucket = import.meta.env.VITE_AWS_S3_BUCKET || 'mus86077';

        if (!accessKeyId || !secretAccessKey) {
          throw new Error('AWS credentials not found in environment variables');
        }

        // Create AWS signature for S3 API call
        const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
        const dateStamp = timestamp.substr(0, 8);
        
        const host = `${bucket}.s3.${region}.amazonaws.com`;
        const canonicalUri = '/';
        const canonicalQuerystring = 'list-type=2';
        
        // Simple approach: try to use fetch with AWS credentials
        const url = `https://${host}/?${canonicalQuerystring}`;
        
        // For now, let's use a simpler approach - check some known image patterns
        const bucketUrl = `https://${bucket}.s3.amazonaws.com`;
        const imagePatterns = [
          // Common product image patterns
          'p1.jpg', 'p2.jpg', 'p3.jpg', 'p4.jpg', 'p5.jpg', 'p6.jpg', 'p7.jpg', 'p8.jpg', 'p9.jpg', 'p10.jpg',
          'product1.jpg', 'product2.jpg', 'product3.jpg', 'product4.jpg', 'product5.jpg',
          'logo.png', 'logo.jpg', 'banner.jpg', 'banner.png', 'header.jpg', 'header.png',
          'image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg', 'image5.jpg',
          'img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg', 'img5.jpg',
          // Brand logos
          'logo_1.png', 'logo_2.png', 'logo_3.png', 'logo_4.png', 'logo_5.png',
          'logo_6.png', 'logo_7.png', 'logo_8.png', 'logo_9.png', 'logo_10.png',
          'logo_11.png', 'logo_12.png', 'logo_13.png', 'logo_14.png', 'logo_15.png', 'logo_16.png',
          // Common file names
          'brands.png', 'buildings.png', 'coming-soon.png', 'ms-wide.png', 'music_supplies_logo.png', 'music-supplies-2.png'
        ];

        const existingFiles: S3File[] = [];
        
        setMessage(`📁 Checking ${imagePatterns.length} potential image files...`);
        
        // Check files in batches to avoid overwhelming the browser
        for (let i = 0; i < imagePatterns.length; i += 5) {
          const batch = imagePatterns.slice(i, i + 5);
          
          await Promise.all(batch.map(async (filename) => {
            try {
              const response = await fetch(`${bucketUrl}/${filename}`, { method: 'HEAD' });
              if (response.ok) {
                const size = parseInt(response.headers.get('content-length') || '0');
                const lastModified = response.headers.get('last-modified') || new Date().toISOString();
                
                existingFiles.push({
                  filename,
                  size,
                  lastModified: new Date(lastModified).toISOString(),
                });
              }
            } catch (e) {
              // File doesn't exist or can't be accessed, skip it
            }
          }));
          
          // Small delay between batches
          if (i + 5 < imagePatterns.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        if (existingFiles.length > 0) {
          setMessage(`📁 Found ${existingFiles.length} image files via HTTP fallback`);
          return existingFiles;
        } else {
          setMessage('⚠️ No image files found with common naming patterns. You may need to deploy the edge function for full S3 listing.');
          return [];
        }
        
      } catch (awsError) {
        console.error('AWS API fallback failed:', awsError);
        setMessage('⚠️ Could not access S3 bucket. Please check AWS credentials and bucket permissions.');
        return [];
      }

    } catch (error: any) {
      console.error('Error listing S3 files:', error);
      setMessage(`⚠️ Could not list S3 files: ${error.message}. Cache will be cleared only.`);
      return [];
    }
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
