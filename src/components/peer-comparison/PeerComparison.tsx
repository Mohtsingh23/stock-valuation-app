'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { POPULAR_INDIAN_STOCKS } from '@/lib/stock-api';
import { TouchNumberInput, TouchSelect, ResponsiveTable, MobileMetricCard } from '@/components/ui/MobileComponents';

export interface PeerComparisonData {
  symbol: string;
  name: string;
  sector: string;
  currentPrice: number;
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
  evToEbitda: number;
  promoterHolding: number;
  fiiHolding: number;
  profitMargin: number;
  operatingMargin: number;
  beta: number;
}

interface PeerComparisonProps {
  initialSymbols?: string[];
}

const METRICS = [
  { key: 'currentPrice', label: 'Price (₹)', format: (v: number) => `₹${v.toFixed(2)}`, color: 'blue' },
  { key: 'changePercent', label: 'Change %', format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, color: 'green' },
  { key: 'marketCap', label: 'Market Cap', format: (v: number) => v >= 1e7 ? `₹${(v / 1e7).toFixed(2)} Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(2)} L` : `₹${v.toLocaleString()}`, color: 'blue' },
  { key: 'peRatio', label: 'P/E', format: (v: number) => v.toFixed(1), color: 'purple' },
  { key: 'pbRatio', label: 'P/B', format: (v: number) => v.toFixed(2), color: 'purple' },
  { key: 'evToEbitda', label: 'EV/EBITDA', format: (v: number) => v.toFixed(1), color: 'purple' },
  { key: 'roe', label: 'ROE %', format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, color: 'green' },
  { key: 'roce', label: 'ROCE %', format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, color: 'green' },
  { key: 'debtToEquity', label: 'D/E', format: (v: number) => v.toFixed(2), color: 'red' },
  { key: 'revenueGrowth', label: 'Rev Growth %', format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, color: 'green' },
  { key: 'profitGrowth', label: 'Profit Growth %', format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, color: 'green' },
  { key: 'dividendYield', label: 'Div Yield %', format: (v: number) => `${v.toFixed(2)}%`, color: 'blue' },
  { key: 'profitMargin', label: 'Profit Margin %', format: (v: number) => `${v.toFixed(1)}%`, color: 'green' },
  { key: 'operatingMargin', label: 'Op Margin %', format: (v: number) => `${v.toFixed(1)}%`, color: 'green' },
  { key: 'beta', label: 'Beta', format: (v: number) => v.toFixed(2), color: 'purple' },
];

function generateMockData(symbol: string) {
  const basePrice = symbol.includes('RELIANCE') ? 1307.8 :
                   symbol.includes('TCS') ? 2365.6 :
                   symbol.includes('HDFC') ? 748.15 :
                   symbol.includes('INFY') ? 1130.1 :
                   symbol.includes('ICICI') ? 1435.4 :
                   100 + Math.random() * 2000;

  return {
    symbol,
    name: POPULAR_INDIAN_STOCKS.find(s => s.symbol === symbol)?.name || symbol.replace('.NS', ''),
    sector: POPULAR_INDIAN_STOCKS.find(s => s.symbol === symbol)?.sector || 'Unknown',
    currentPrice: basePrice,
    changePercent: (Math.random() - 0.5) * 10,
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
    evToEbitda: 5 + Math.random() * 40,
    promoterHolding: 10 + Math.random() * 70,
    fiiHolding: 5 + Math.random() * 40,
    profitMargin: -20 + Math.random() * 80,
    operatingMargin: -10 + Math.random() * 60,
    beta: -0.5 + Math.random() * 2.5,
  };
}

export function PeerComparison({ initialSymbols = [] }: PeerComparisonProps) {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(initialSymbols.length > 0 ? initialSymbols : ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS']);
  const [data, setData] = useState<PeerComparisonData[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'radar'>('table');
  const [highlightMetric, setHighlightMetric] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'marketCap', direction: 'desc' });

  const loadData = useCallback(async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    const results = selectedSymbols.map(s => generateMockData(s));
    setData(results);
    setLoading(false);
  }, [selectedSymbols]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addSymbol = (symbol: string) => {
    if (!selectedSymbols.includes(symbol) && selectedSymbols.length < 10) {
      setSelectedSymbols(prev => [...prev, symbol]);
    }
  };

  const removeSymbol = (symbol: string) => {
    setSelectedSymbols(prev => prev.filter(s => s !== symbol));
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortConfig.key];
      const bVal = (b as any)[sortConfig.key];
      if (aVal === undefined || bVal === undefined) return 0;
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      return (aVal > bVal ? 1 : -1) * dir;
    });
  }, [data, sortConfig]);

  const getSectorMedian = (metric: string) => {
    const values = data.map(d => (d as any)[metric]).filter(v => v !== undefined && v !== null);
    if (values.length === 0) return null;
    values.sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
  };

  const formatNumber = (num: number) => {
    if (num >= 1e7) return `₹${(num / 1e7).toFixed(2)} Cr`;
    if (num >= 1e5) return `₹${(num / 1e5).toFixed(2)} L`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)} K`;
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-4 md:p-8">
      <div className="max-w-full mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Peer Comparison</h1>
            <p className="text-gray-600 dark:text-gray-400">Compare up to 10 stocks side-by-side across 20+ metrics</p>
          </div>
        </div>

        {/* Symbol Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">Selected Stocks ({selectedSymbols.length}/10)</h3>
            <div className="flex-1"></div>
            <TouchSelect
              label="Add Stock"
              value=""
              onChange={(v) => { if (v) addSymbol(v); }}
              options={POPULAR_INDIAN_STOCKS.map(s => ({ value: s.symbol, label: `${s.name} (${s.symbol})` }))}
              placeholder="Add stock..."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedSymbols.map(symbol => (
              <span key={symbol} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium">
                {POPULAR_INDIAN_STOCKS.find(s => s.symbol === symbol)?.name || symbol}
                <button onClick={() => removeSymbol(symbol)} className="ml-1 text-blue-500 hover:text-blue-700">✕</button>
              </span>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-500 border-t-transparent mx-auto mb-2"></div><p>Loading peer data...</p></div>
        ) : (
          <>
            {/* View Mode Tabs */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setViewMode('table')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Table</button>
              <button onClick={() => setViewMode('cards')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Cards</button>
              <button onClick={() => setViewMode('radar')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'radar' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Radar</button>
            </div>

            {viewMode === 'table' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <ResponsiveTable
                  data={sortedData}
                  columns={[
                    { key: 'symbol', header: 'Symbol', render: (r: any) => <span className="font-medium">{r.symbol}</span> },
                    { key: 'name', header: 'Company', render: (r: any) => <span className="text-sm">{r.name}</span> },
                    { key: 'sector', header: 'Sector', render: (r: any) => <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{r.sector}</span> },
                    ...METRICS.map(m => ({ key: m.key, header: m.label, className: 'text-right', render: (r: any) => <span className={m.color === 'green' && (r[m.key] as number) >= 0 ? 'text-green-600' : m.color === 'red' && (r[m.key] as number) > 1 ? 'text-red-600' : m.color === 'green' ? 'text-green-600' : m.color === 'red' ? 'text-red-600' : m.color === 'blue' ? 'text-blue-600' : 'text-purple-600'}>m.format((r[m.key] as number))</span> })),
                  ]}
                  keyExtractor={(r) => r.symbol}
                  onRowClick={(r) => window.open(`/valuation/${r.symbol}`, '_blank')}
                />
              </div>
            )}

            {viewMode === 'cards' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedData.map((stock, i) => (
                  <div key={stock.symbol} className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${highlightMetric ? 'ring-2 ring-blue-500' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{stock.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{stock.symbol} • {stock.sector}</p>
                      </div>
                      <span className={`text-sm font-bold ${stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {METRICS.slice(0, 6).map(m => (
                        <div key={m.key} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{m.label}</p>
                          <p className={`text-sm font-medium ${m.color === 'green' ? 'text-green-600' : m.color === 'red' ? 'text-red-600' : m.color === 'blue' ? 'text-blue-600' : 'text-purple-600'}`}>
                            {m.format((stock as any)[m.key])}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {METRICS.slice(6, 12).map(m => (
                        <div key={m.key} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{m.label}</p>
                          <p className={`text-sm font-medium ${m.color === 'green' ? 'text-green-600' : m.color === 'red' ? 'text-red-600' : m.color === 'blue' ? 'text-blue-600' : 'text-purple-600'}`}>
                            {m.format((stock as any)[m.key])}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'radar' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4">Radar Chart Comparison</h3>
                <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                  <div className="text-4xl mb-2">📊</div>
                  <p>Radar chart visualization coming soon</p>
                  <p className="text-sm">Select 2-5 stocks to compare metrics on a radar chart</p>
                </div>
              </div>
            )}

            {/* Sector Median Row */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold mb-3">Sector Median vs Selection</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {METRICS.slice(0, 8).map(m => {
                  const median = getSectorMedian(m.key);
                  const avg = data.reduce((sum, d) => sum + ((d as any)[m.key] || 0), 0) / data.length;
                  return (
                    <div key={m.key} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{m.label}</p>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="font-medium">Selection: {METRICS.find(x => x.key === m.key)?.format(avg) || avg.toFixed(1)}</span>
                        <span className={`font-medium ${median !== null && avg > median ? 'text-green-600' : median !== null && avg < median ? 'text-red-600' : ''}`}>
                          Sector: {median ? METRICS.find(x => x.key === m.key)?.format(median) || median.toFixed(1) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PeerComparison;