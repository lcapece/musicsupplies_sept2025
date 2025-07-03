import React, { useState } from 'react';
import { applyFixedAuthFunctionMigration, applyAccount99Migration, applyBrandMapColumnsMigration } from '../utils/applyMigration';

// Banner component to allow administrators to apply the authentication function fix
const LoginFixBanner: React.FC = () => {
  const [isApplying, setIsApplying] = useState(false);
  const [isApplyingAccount99, setIsApplyingAccount99] = useState(false);
  const [isApplyingBrandMap, setIsApplyingBrandMap] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    debug?: string;
  }>({});
  const [showDebug, setShowDebug] = useState(false);

  const handleApplyFix = async () => {
    setIsApplying(true);
    setResult({});
    
    try {
      const migrationResult = await applyFixedAuthFunctionMigration();
      setResult(migrationResult);
    } catch (error) {
      console.error('Failed to apply authentication fix:', error);
      setResult({
        success: false,
        message: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyAccount99 = async () => {
    setIsApplyingAccount99(true);
    setResult({});
    
    try {
      const migrationResult = await applyAccount99Migration();
      setResult(migrationResult);
    } catch (error) {
      console.error('Failed to apply Account 99 migration:', error);
      setResult({
        success: false,
        message: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsApplyingAccount99(false);
    }
  };

  const handleApplyBrandMap = async () => {
    setIsApplyingBrandMap(true);
    setResult({});
    
    try {
      const migrationResult = await applyBrandMapColumnsMigration();
      setResult(migrationResult);
    } catch (error) {
      console.error('Failed to apply Brand/MAP columns migration:', error);
      setResult({
        success: false,
        message: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsApplyingBrandMap(false);
    }
  };

  // Only render if user is admin (account 999)
  const isAdmin = localStorage.getItem('user') && 
    JSON.parse(localStorage.getItem('user') || '{}').accountNumber === '999';

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="w-full bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="w-0 flex-1 flex items-center">
            <span className="flex p-2 rounded-lg bg-yellow-100">
              {/* Warning icon */}
              <svg className="h-6 w-6 text-yellow-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <p className="ml-3 font-medium text-yellow-700 truncate">
              <span className="md:inline">
                Authentication Issue Detected - Login system needs an update
              </span>
            </p>
          </div>
          <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto flex space-x-2">
            <button
              onClick={handleApplyFix}
              disabled={isApplying || isApplyingAccount99 || isApplyingBrandMap}
              className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
            >
              {isApplying ? 'Applying Fix...' : 'Apply Authentication Fix'}
            </button>
            <button
              onClick={handleApplyAccount99}
              disabled={isApplying || isApplyingAccount99 || isApplyingBrandMap}
              className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isApplyingAccount99 ? 'Setting up...' : 'Setup Account 99'}
            </button>
            <button
              onClick={handleApplyBrandMap}
              disabled={isApplying || isApplyingAccount99 || isApplyingBrandMap}
              className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isApplyingBrandMap ? 'Adding Columns...' : 'Add Brand/MAP Columns'}
            </button>
          </div>
        </div>

        {/* Results */}
        {result.message && (
          <div className={`mt-3 p-3 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <p className="font-medium">{result.message}</p>
            
            {result.debug && (
              <div className="mt-2">
                <button 
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-sm underline focus:outline-none"
                >
                  {showDebug ? 'Hide' : 'Show'} Debug Info
                </button>
                {showDebug && (
                  <pre className="mt-2 text-xs p-2 bg-gray-100 rounded overflow-x-auto">
                    {result.debug}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginFixBanner;
