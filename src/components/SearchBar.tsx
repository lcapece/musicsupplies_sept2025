import React, { useState, KeyboardEvent, useEffect } from 'react';

interface SearchBarProps {
  onSearch: (primaryQuery: string, additionalQuery: string, excludeQuery: string) => void; // Removed inStockOnly from props
  fontSize?: 'smaller' | 'standard' | 'larger';
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, fontSize = 'standard' }) => {
  const [primaryQuery, setPrimaryQuery] = useState('');
  const [additionalQuery, setAdditionalQuery] = useState('');
  const [excludeQuery, setExcludeQuery] = useState('');
  const [showSearchPrompt, setShowSearchPrompt] = useState(true);
  // const [inStockOnly, setInStockOnly] = useState(false); // Removed state from SearchBar

  // Check if user has interacted with search before
  useEffect(() => {
    const hasInteracted = sessionStorage.getItem('searchInteracted');
    if (hasInteracted) {
      setShowSearchPrompt(false);
    }
  }, []);

  const handlePrimaryInputFocus = () => {
    if (showSearchPrompt) {
      setShowSearchPrompt(false);
      sessionStorage.setItem('searchInteracted', 'true');
    }
  };
  
  const handleSearch = () => {
    // Call onSearch without inStockOnly, as it's now managed in Dashboard
    onSearch(primaryQuery, additionalQuery, excludeQuery); 
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Helper function to get font size classes
  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'smaller': return 'text-sm';
      case 'larger': return 'text-lg';
      default: return 'text-base';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex items-center space-x-4">
        <div className="flex-grow flex space-x-4 w-4/5">
          <div className="flex-1 relative">
            <input
              type="text"
              className={`block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${getFontSizeClass()} ${
                primaryQuery ? 'bg-yellow-100' : 'bg-gray-50'
              }`}
              placeholder="Primary Search Terms"
              value={primaryQuery}
              onChange={(e) => setPrimaryQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSearch}
              onFocus={handlePrimaryInputFocus}
            />
            {showSearchPrompt && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-xl font-bold search-prompt-pulse">
                  SEARCH HERE
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              type="text"
              className={`block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${getFontSizeClass()}`}
              placeholder="Additional Search Terms"
              value={additionalQuery}
              onChange={(e) => setAdditionalQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSearch}
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              className={`block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${getFontSizeClass()}`}
              placeholder="Exclude this Term"
              value={excludeQuery}
              onChange={(e) => setExcludeQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSearch}
            />
          </div>
        </div>
        {/* Removed "Show In-Stock Items Only" checkbox from here */}
        
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Search
        </button>
      </form>
    </div>
  );
};

export default SearchBar;
