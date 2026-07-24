'use client';

import { useState, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { POPULAR_INDIAN_STOCKS } from '@/lib/stock-api';
import { StockSearchResult } from '@/lib/stock-api';

interface StockSearchProps {
  onSelect: (stock: { symbol: string; name: string }) => void;
  initialQuery?: string;
}

export default function StockSearch({ onSelect, initialQuery = '' }: StockSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [popularStocks] = useState(POPULAR_INDIAN_STOCKS);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          if (data.results) {
            setResults(data.results);
            setSelectedIndex(-1);
          }
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const items = [...results, ...popularStocks.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase()) || 
      p.symbol.toLowerCase().includes(query.toLowerCase())
    )];
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const item = items[selectedIndex];
      if (item) {
        onSelect({ symbol: item.symbol, name: item.name });
        setQuery('');
        setResults([]);
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowDropdown(true);
  };

  const handleFocus = () => {
    if (query.length >= 1) setShowDropdown(true);
  };

  const handleBlur = () => {
    setTimeout(() => setShowDropdown(false), 200);
  };

  const allResults = [
    ...results,
    ...popularStocks.filter(p => 
      query.length === 0 || 
      p.name.toLowerCase().includes(query.toLowerCase()) || 
      p.symbol.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10 - results.length)
  ];

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <svg 
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search Indian stocks (e.g., RELIANCE, TCS, HDFCBANK)..."
          className="w-full pl-12 pr-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      {showDropdown && allResults.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            {results.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  Search Results
                </div>
                {results.map((stock, index) => (
                  <button
                    key={stock.symbol}
                    onClick={() => onSelect({ symbol: stock.symbol, name: stock.name })}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${selectedIndex === index ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{stock.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{stock.symbol} • {stock.exchange}</div>
                  </button>
                ))}
                {results.length > 0 && allResults.length > results.length && (
                  <div className="border-t border-gray-200 dark:border-gray-700" />
                )}
              </>
            )}
            {(query.length === 0 || results.length === 0) && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  Popular Indian Stocks
                </div>
                {popularStocks
                  .filter(p => query.length === 0 || p.name.toLowerCase().includes(query.toLowerCase()) || p.symbol.toLowerCase().includes(query.toLowerCase()))
                  .slice(0, 10)
                  .map((stock, index) => (
                    <button
                      key={stock.symbol}
                      onClick={() => onSelect({ symbol: stock.symbol, name: stock.name })}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${selectedIndex === results.length + index ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{stock.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{stock.symbol} • {stock.sector}</div>
                    </button>
                  ))}
              </>
            )}
          </div>
        </div>
      )}

      {showDropdown && allResults.length === 0 && query.length >= 2 && !isLoading && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 text-center text-gray-500 dark:text-gray-400">
          No stocks found for "{query}"
        </div>
      )}
    </div>
  );
}