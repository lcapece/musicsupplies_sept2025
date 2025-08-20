import { useEffect, useRef } from 'react';

interface VersionData {
  version: string;
  timestamp: string;
  build: number;
}

export const useAutoVersionCheck = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentVersion = import.meta.env.VITE_APP_VERSION || 'Unknown';
  
  const checkAndUpdateVersion = async () => {
    try {
      // Fetch latest version with cache-busting timestamp
      const response = await fetch(`/version.json?t=${Date.now()}`);
      if (!response.ok) return;
      
      const versionData: VersionData = await response.json();
      const latestVersion = versionData.version;
      
      // Compare versions - if different, force update
      if (latestVersion !== currentVersion) {
        console.log(`Version update detected: ${currentVersion} → ${latestVersion}`);
        
        // Clear all caches silently
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        }

        // Clear storage
        localStorage.clear();
        sessionStorage.clear();

        // Force reload to get latest version
        window.location.reload();
      }
    } catch (error) {
      // Silently fail - don't disrupt user experience
      console.debug('Version check failed:', error);
    }
  };

  useEffect(() => {
    // Initial check after component mounts (delay to avoid blocking initial load)
    const initialTimeout = setTimeout(() => {
      checkAndUpdateVersion();
    }, 5000); // Wait 5 seconds after page load

    // Set up periodic checks every 2 minutes
    intervalRef.current = setInterval(() => {
      checkAndUpdateVersion();
    }, 120000); // 120 seconds = 2 minutes

    // Cleanup on unmount
    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentVersion]);

  // Also check when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User came back to tab, check for updates
        setTimeout(checkAndUpdateVersion, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Return nothing - this is a silent hook
  return null;
};