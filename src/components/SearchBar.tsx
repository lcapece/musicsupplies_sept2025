import React, { useState, KeyboardEvent } from 'react';

interface SearchBarProps {
  onSearch: (primaryQuery: string, additionalQuery: string, excludeQuery: string, inStockOnly: boolean) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [primaryQuery, setPrimaryQuery] = useState('');
  const [additionalQuery, setAdditionalQuery] = useState('');
  const [excludeQuery, setExcludeQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  
  const handleSearch = () => {
    onSearch(primaryQuery, additionalQuery, excludeQuery, inStockOnly);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex items-center space-x-4">
        <div className="flex-grow flex space-x-4 w-4/5">
          <div className="flex-1">
            <input
              type="text"
              className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Primary Search Terms"
              value={primaryQuery}
              onChange={(e) => setPrimaryQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSearch}
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
              className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Exclude this Term"
              value={excludeQuery}
              onChange={(e) => setExcludeQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSearch}
            />
          </div>
        </div>
        
        <div className="flex items-center">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              checked={inStockOnly}
              onChange={(e) => {
                setInStockOnly(e.target.checked);
                onSearch(primaryQuery, additionalQuery, excludeQuery, e.target.checked);
              }}
            />
            <span className="ml-2 text-sm text-gray-700">Show In-Stock Items Only</span>
          </label>
        </div>
        
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