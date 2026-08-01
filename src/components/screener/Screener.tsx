'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { POPULAR_INDIAN_STOCKS } from '@/lib/stock-api';
import { TouchNumberInput, TouchSelect, ResponsiveTable } from '@/components/ui/MobileComponents';

export interface ScreenerFilter {
  id: string;
  label: string;
  type: 'number' | 'select' | 'range';
  field: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  defaultMin?: number;
  defaultMax?: number;
  defaultValue?: string | number;
  placeholder?: string;
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  sector: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  marketCap: number;
  peRatio: number;
  pbRatio: number;
  roe: number;
  roce: number;
  debtToEquity: number;
  revenueGrowth: number;
  profitGrowth: number;
  dividendYield: number;
  dividendYieldPct: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  avgVolume: number;
  beta: number;
  evToEbitda: number;
  promoterHolding: number;
  fiiHolding: number;
  diiHolding: number;
  promoterPledge: number;
  profitMargin: number;
  operatingMargin: number;
  faceValue: number;
}

const SCREENER_FILTERS: ScreenerFilter[] = [
  { id: 'sector', label: 'Sector', type: 'select', field: 'sector', options: [] },
  { id: 'marketCap', label: 'Market Cap (₹ Cr)', type: 'range', field: 'marketCap', min: 0, max: 2000000, step: 1000, defaultMin: 0, defaultMax: 2000000 },
  { id: 'currentPrice', label: 'Current Price (₹)', type: 'range', field: 'currentPrice', min: 0, max: 50000, step: 1, defaultMin: 0, defaultMax: 50000 },
  { id: 'peRatio', label: 'P/E Ratio', type: 'range', field: 'peRatio', min: 0, max: 200, step: 0.5, defaultMin: 0, defaultMax: 200 },
  { id: 'pbRatio', label: 'P/B Ratio', type: 'range', field: 'pbRatio', min: 0, max: 50, step: 0.1, defaultMin: 0, defaultMax: 50 },
  { id: 'evToEbitda', label: 'EV/EBITDA', type: 'range', field: 'evToEbitda', min: 0, max: 100, step: 0.5, defaultMin: 0, defaultMax: 100 },
  { id: 'roe', label: 'ROE (%)', type: 'range', field: 'roe', min: -100, max: 100, step: 1, defaultMin: -100, defaultMax: 100 },
  { id: 'roce', label: 'ROCE (%)', type: 'range', field: 'roce', min: -100, max: 100, step: 1, defaultMin: -100, defaultMax: 100 },
  { id: 'debtToEquity', label: 'Debt/Equity', type: 'range', field: 'debtToEquity', min: 0, max: 20, step: 0.1, defaultMin: 0, defaultMax: 20 },
  { id: 'revenueGrowth', label: 'Revenue Growth (%)', type: 'range', field: 'revenueGrowth', min: -50, max: 100, step: 1, defaultMin: -50, defaultMax: 100 },
  { id: 'profitGrowth', label: 'Profit Growth (%)', type: 'range', field: 'profitGrowth', min: -50, max: 200, step: 1, defaultMin: -50, defaultMax: 200 },
  { id: 'dividendYield', label: 'Dividend Yield (%)', type: 'range', field: 'dividendYieldPct', min: 0, max: 20, step: 0.1, defaultMin: 0, defaultMax: 20 },
  { id: 'volume', label: 'Volume', type: 'range', field: 'volume', min: 0, max: 100000000, step: 100000, defaultMin: 0, defaultMax: 100000000 },
  { id: 'avgVolume', label: 'Avg Volume (30d)', type: 'range', field: 'avgVolume', min: 0, max: 100000000, step: 100000, defaultMin: 0, defaultMax: 100000000 },
  { id: 'beta', label: 'Beta', type: 'range', field: 'beta', min: -2, max: 3, step: 0.05, defaultMin: -2, defaultMax: 3 },
  { id: 'fiftyTwoWeekHigh', label: '% from 52W High', type: 'range', field: 'fiftyTwoWeekHigh', min: -100, max: 0, step: 1, defaultMin: -100, defaultMax: 0 },
  { id: 'fiftyTwoWeekLow', label: '% from 52W Low', type: 'range', field: 'fiftyTwoWeekLow', min: 0, max: 500, step: 1, defaultMin: 0, defaultMax: 500 },
  { id: 'promoterHolding', label: 'Promoter Holding (%)', type: 'range', field: 'promoterHolding', min: 0, max: 100, step: 1, defaultMin: 0, defaultMax: 100 },
  { id: 'fiiHolding', label: 'FII Holding (%)', type: 'range', field: 'fiiHolding', min: 0, max: 100, step: 1, defaultMin: 0, defaultMax: 100 },
  { id: 'diiHolding', label: 'DII Holding (%)', type: 'range', field: 'diiHolding', min: 0, max: 100, step: 1, defaultMin: 0, defaultMax: 100 },
  { id: 'promoterPledge', label: 'Promoter Pledge (%)', type: 'range', field: 'promoterPledge', min: 0, max: 100, step: 1, defaultMin: 0, defaultMax: 100 },
  { id: 'profitMargin', label: 'Profit Margin (%)', type: 'range', field: 'profitMargin', min: -100, max: 100, step: 1, defaultMin: -100, defaultMax: 100 },
  { id: 'operatingMargin', label: 'Operating Margin (%)', type: 'range', field: 'operatingMargin', min: -100, max: 100, step: 1, defaultMin: -100, defaultMax: 100 },
];

const DEFAULT_SAVED_SCREENS = [
  { name: 'Large Cap Quality', filters: { marketCap: { min: 50000 }, roe: { min: 15 }, debtToEquity: { max: 1 }, profitMargin: { min: 10 } } },
  { name: 'High Dividend Yield', filters: { dividendYieldPct: { min: 3 }, marketCap: { min: 1000 } } },
  { id: 'value', name: 'Value Picks', filters: { peRatio: { max: 15 }, pbRatio: { max: 3 }, roce: { min: 15 } } },
  { name: 'Growth at Reasonable Price', filters: { revenueGrowth: { min: 15 }, profitGrowth: { min: 15 }, peRatio: { max: 25 } } },
  { name: 'Small Cap Gems', filters: { marketCap: { min: 500, max: 5000 }, roe: { min: 12 }, debtToEquity: { max: 0.5 } } },
  { name: 'Turnaround Stories', filters: { profitGrowth: { min: 50 }, revenueGrowth: { min: 10 }, peRatio: { max: 20 } } },
];

const STORAGE_KEYS = {
  SAVED_SCREENS: 'niveshiq_saved_screens',
  CURRENT_FILTERS: 'niveshiq_current_filters',
};

function generateMockData(symbol: string): ScreenerResult {
  const stock = POPULAR_INDIAN_STOCKS.find(s => s.symbol === symbol);
  const basePrice = symbol.includes('RELIANCE') ? 1307.8 :
                   symbol.includes('TCS') ? 2365.6 :
                   symbol.includes('HDFC') ? 748.15 :
                   symbol.includes('INFY') ? 1130.1 :
                   symbol.includes('ICICI') ? 1435.4 :
                   100 + Math.random() * 2000;

  return {
    symbol,
    name: stock?.name || symbol.replace('.NS', ''),
    sector: stock?.sector || 'Unknown',
    currentPrice: basePrice,
    change: (Math.random() - 0.5) * 50,
    changePercent: (Math.random() - 0.5) * 5,
    marketCap: basePrice * (100 + Math.random() * 1000) * 1e5,
    peRatio: 5 + Math.random() * 50,
    pbRatio: 0.5 + Math.random() * 10,
    roe: -20 + Math.random() * 80,
    roce: -10 + Math.random() * 60,
    debtToEquity: Math.random() * 5,
    revenueGrowth: -30 + Math.random() * 80,
    profitGrowth: -50 + Math.random() * 150,
    dividendYield: Math.random() * 5,
    dividendYieldPct: Math.random() * 5,
    fiftyTwoWeekHigh: basePrice * (1 + Math.random() * 0.5),
    fiftyTwoWeekLow: basePrice * (1 - Math.random() * 0.5),
    volume: Math.random() * 50000000,
    avgVolume: Math.random() * 30000000,
    beta: -0.5 + Math.random() * 2.5,
    evToEbitda: 5 + Math.random() * 40,
    promoterHolding: 10 + Math.random() * 70,
    fiiHolding: 5 + Math.random() * 40,
    diiHolding: 5 + Math.random() * 30,
    promoterPledge: Math.random() * 40,
    profitMargin: -20 + Math.random() * 80,
    operatingMargin: -10 + Math.random() * 60,
    faceValue: [1, 2, 5, 10][Math.floor(Math.random() * 4)],
  };
}

export function Screener() {
  const [filters, setFilters] = useState<Record<string, any>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_FILTERS);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [savedScreens, setSavedScreens] = useState<{ name: string; filters: Record<string, any> }[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SAVED_SCREENS);
      return stored ? JSON.parse(stored) : DEFAULT_SAVED_SCREENS;
    } catch {
      return DEFAULT_SAVED_SCREENS;
    }
  });
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'results' | 'saved'>('filters');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'marketCap', direction: 'desc' });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_FILTERS, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SAVED_SCREENS, JSON.stringify(savedScreens));
  }, [savedScreens]);

  const handleFilterChange = useCallback((filterId: string, value: any) => {
    setFilters(prev => {
      if (value === undefined || value === null || (typeof value === 'object' && Object.keys(value).every(k => value[k] === undefined || value[k] === null || value[k] === ''))) {
        const { [filterId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [filterId]: value };
    });
  }, []);

  const applyFilters = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const filtered = POPULAR_INDIAN_STOCKS
        .map(s => generateMockData(s.symbol))
        .filter(stock => {
          return Object.entries(filters).every(([key, value]) => {
            if (!value) return true;
            const stockValue = (stock as any)[key];
            if (stockValue === undefined || stockValue === null) return false;
            
            if (typeof value === 'object' && value !== null) {
              if (value.min !== undefined && stockValue < value.min) return false;
              if (value.max !== undefined && stockValue > value.max) return false;
              return true;
            }
            return stockValue === value;
          });
        });
      
      setResults(filtered);
      setPage(1);
      setLoading(false);
    }, 300);
  }, [filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const saveScreen = () => {
    const name = prompt('Enter screen name:');
    if (name && name.trim()) {
      setSavedScreens(prev => [...prev, { name: name.trim(), filters: { ...filters } }]);
    }
  };

  const loadScreen = (screen: { name: string; filters: Record<string, any> }) => {
    setFilters(screen.filters);
    setActiveTab('filters');
  };

  const deleteScreen = (index: number) => {
    if (confirm('Delete this saved screen?')) {
      setSavedScreens(prev => prev.filter((_, i) => i !== index));
    }
  };

  const resetFilters = () => {
    setFilters({});
  };

  const toggleColumn = (column: string) => {
    // Implementation for column visibility
  };

  const totalPages = Math.ceil(results.length / pageSize);
  const paginatedResults = results.slice((page - 1) * pageSize, page * pageSize);

  const formatNumber = (num: number) => {
    if (num >= 1e7) return `₹${(num / 1e7).toFixed(2)} Cr`;
    if (num >= 1e5) return `₹${(num / 1e5).toFixed(2)} L`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)} K`;
    return num.toLocaleString();
  };

  const formatPercent = (num: number) => `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;

  const columns = [
    { key: 'symbol', header: 'Symbol', render: (r: ScreenerResult) => <span className="font-medium">{r.symbol}</span> },
    { key: 'name', header: 'Company', render: (r: ScreenerResult) => <span className="text-sm">{r.name}</span> },
    { key: 'sector', header: 'Sector', render: (r: ScreenerResult) => <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{r.sector}</span> },
    { key: 'currentPrice', header: 'Price (₹)', className: 'text-right', render: (r: ScreenerResult) => <span className="font-mono font-medium">₹{r.currentPrice.toFixed(2)}</span> },
    { key: 'changePercent', header: 'Chg %', className: 'text-right', render: (r: ScreenerResult) => <span className={r.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>{formatPercent(r.changePercent)}</span> },
    { key: 'marketCap', header: 'Mkt Cap', className: 'text-right', render: (r: ScreenerResult) => <span>{formatNumber(r.marketCap)}</span> },
    { key: 'peRatio', header: 'P/E', className: 'text-right', render: (r: ScreenerResult) => <span>{r.peRatio.toFixed(1)}</span> },
    { key: 'pbRatio', header: 'P/B', className: 'text-right', render: (r: ScreenerResult) => <span>{r.pbRatio.toFixed(2)}</span> },
    { key: 'roe', header: 'ROE %', className: 'text-right', render: (r: ScreenerResult) => <span className={r.roe >= 15 ? 'text-green-600' : r.roe < 0 ? 'text-red-600' : ''}>{r.roe.toFixed(1)}</span> },
    { key: 'roce', header: 'ROCE %', className: 'text-right', render: (r: ScreenerResult) => <span className={r.roce >= 15 ? 'text-green-600' : ''}>{r.roce.toFixed(1)}</span> },
    { key: 'debtToEquity', header: 'D/E', className: 'text-right', render: (r: ScreenerResult) => <span className={r.debtToEquity <= 0.5 ? 'text-green-600' : r.debtToEquity > 2 ? 'text-red-600' : ''}>{r.debtToEquity.toFixed(2)}</span> },
    { key: 'revenueGrowth', header: 'Rev Gr %', className: 'text-right', render: (r: ScreenerResult) => <span className={r.revenueGrowth >= 15 ? 'text-green-600' : r.revenueGrowth < 0 ? 'text-red-600' : ''}>{formatPercent(r.revenueGrowth)}</span> },
    { key: 'profitGrowth', header: 'Pft Gr %', className: 'text-right', render: (r: ScreenerResult) => <span className={r.profitGrowth >= 15 ? 'text-green-600' : r.profitGrowth < 0 ? 'text-red-600' : ''}>{formatPercent(r.profitGrowth)}</span> },
    { key: 'dividendYieldPct', header: 'Div Yld %', className: 'text-right', render: (r: ScreenerResult) => <span>{r.dividendYieldPct.toFixed(2)}%</span> },
    { key: 'volume', header: 'Volume', className: 'text-right', render: (r: ScreenerResult) => <span>{formatNumber(r.volume)}</span> },
    { key: 'beta', header: 'Beta', className: 'text-right', render: (r: ScreenerResult) => <span>{r.beta.toFixed(2)}</span> },
    { key: 'promoterHolding', header: 'Prom %', className: 'text-right', render: (r: ScreenerResult) => <span>{r.promoterHolding.toFixed(1)}%</span> },
    { key: 'profitMargin', header: 'Pft Mar %', className: 'text-right', render: (r: ScreenerResult) => <span className={r.profitMargin >= 15 ? 'text-green-600' : r.profitMargin < 0 ? 'text-red-600' : ''}>{r.profitMargin.toFixed(1)}%</span> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-4 md:p-8">
      <div className="max-w-full mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Stock Screener</h1>
            <p className="text-gray-600 dark:text-gray-400">Filter {POPULAR_INDIAN_STOCKS.length} NSE stocks across 20+ criteria</p>
          </div>
          <div className="flex gap-2">
            <button onClick={resetFilters} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Reset</button>
            <button onClick={saveScreen} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Save Screen</button>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <button onClick={() => setActiveTab('filters')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'filters' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Filters ({Object.keys(filters).length} active)</button>
          <button onClick={() => setActiveTab('results')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'results' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Results ({results.length})</button>
          <button onClick={() => setActiveTab('saved')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'saved' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Saved Screens ({savedScreens.length})</button>
        </div>

        {activeTab === 'filters' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4">Filter Criteria</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {SCREENER_FILTERS.map(filter => {
                const value = filters[filter.id];
                if (filter.type === 'select') {
                  return (
                    <TouchSelect
                      key={filter.id}
                      label={filter.label}
                      value={value || ''}
                      onChange={v => handleFilterChange(filter.id, v || undefined)}
                      options={filter.options || []}
                      placeholder={`Select ${filter.label}`}
                    />
                  );
                }
                if (filter.type === 'range') {
                  return (
                    <div className="space-y-2" key={filter.id}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{filter.label}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <TouchNumberInput
                          label="Min"
                          value={value?.min ?? filter.defaultMin ?? 0}
                          onChange={v => handleFilterChange(filter.id, { ...value, min: v === filter.defaultMin ? undefined : v })}
                          placeholder={`Min ${filter.min}`}
                          step={filter.step}
                          min={filter.min}
                          max={filter.max}
                        />
                        <TouchNumberInput
                          label="Max"
                          value={value?.max ?? filter.defaultMax ?? filter.max}
                          onChange={v => handleFilterChange(filter.id, { ...value, max: v === filter.defaultMax ? undefined : v })}
                          placeholder={`Max ${filter.max}`}
                          step={filter.step}
                          min={filter.min}
                          max={filter.max}
                        />
                      </div>
                    </div>
                  );
                }
                return (
                  <TouchNumberInput
                    key={filter.id}
                    label={filter.label}
                    value={value ?? filter.defaultValue ?? 0}
                    onChange={v => handleFilterChange(filter.id, v)}
                    placeholder={filter.placeholder}
                    step={filter.step}
                    min={filter.min}
                    max={filter.max}
                  />
                );
              })}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={applyFilters} disabled={loading} className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Applying...' : 'Apply Filters'}
              </button>
              <button onClick={resetFilters} className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                Clear All
              </button>
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-500 border-t-transparent mx-auto mb-2"></div><p>Screening stocks...</p></div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-2">🔍</div>
                <p className="font-medium mb-1">No stocks match your criteria</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, results.length)} of {results.length} stocks
                  </span>
                  <div className="flex gap-2">
                    <select
                      value={pageSize}
                      onChange={e => { /* page size change */ }}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                    >
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                    <div className="flex gap-1">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50">Prev</button>
                      <span className="px-3 py-1 text-sm">Page {page} / {totalPages}</span>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50">Next</button>
                    </div>
                  </div>
                </div>
                <ResponsiveTable
                  data={paginatedResults}
                  columns={columns}
                  keyExtractor={(r) => r.symbol}
                  emptyMessage="No results"
                  onRowClick={(r) => window.open(`/valuation/${r.symbol}`, '_blank')}
                />
              </>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Saved Screens</h3>
              <button onClick={saveScreen} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">+ Save Current as New</button>
            </div>
            {savedScreens.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <p>No saved screens yet</p>
                <p className="text-sm">Apply filters and click "Save Screen" to create one</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {savedScreens.map((screen, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{screen.name}</h4>
                      <button onClick={() => deleteScreen(index)} className="p-1 text-gray-500 hover:text-red-600 rounded" title="Delete">🗑️</button>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      {Object.entries(screen.filters).map(([key, val]) => (
                        <span key={key} className="inline-block bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs mr-1 mb-1">
                          {key}: {typeof val === 'object' ? JSON.stringify(val) : val}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => loadScreen(screen)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Load Screen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Screener;