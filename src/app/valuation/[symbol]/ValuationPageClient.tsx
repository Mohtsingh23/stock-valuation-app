'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import StockSearch from '@/components/StockSearch';
import ValuationDashboard from '@/components/ValuationDashboard';
import ValuationInputs from '@/components/ValuationInputs';
import BacktestTab from '@/components/BacktestTab';
import PaperTradingTab from '@/components/PaperTradingTab';
import type { ValuationInputs as ValuationInputsType } from '@/lib/valuation';

interface ValuationPageClientProps {
  initialSymbol: string;
}

export default function ValuationPageClient({ initialSymbol }: ValuationPageClientProps) {
  const searchParams = useSearchParams();
  // Use initialSymbol from props, or fallback to search params
  const effectiveSymbol = initialSymbol || searchParams?.get('symbol') || 'RELIANCE.NS';

  // Default valuation inputs (used for auto-fetch)
  const FALLBACK_INPUTS: ValuationInputsType = {
    revenue: 100000,
    revenueGrowth: 12,
    ebitdaMargin: 15,
    taxRate: 25,
    capexToRevenue: 5,
    workingCapitalToRevenue: 10,
    wacc: 12,
    terminalGrowth: 5,
    sharesOutstanding: 1000,
    netDebt: 5000,
    currentPrice: 1000,
  };

  const [symbol, setSymbol] = useState(effectiveSymbol);
  const [stockData, setStockData] = useState<any>(null);
  const [valuationData, setValuationData] = useState<any>(null);
  const [inputs, setInputs] = useState<Partial<ValuationInputsType>>({});
  const [loading, setLoading] = useState(true);
  const [valuationLoading, setValuationLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState<'valuation' | 'inputs' | 'backtest' | 'paper-trading'>('valuation');
  
  // Use a ref to track the current effect version
  // In StrictMode, effects run twice. We only want the latest effect's results.
  const effectIdRef = useRef(0);
  
  // Fetch stock data when symbol changes
  useEffect(() => {
    // Increment to get a unique ID for this effect run
    const thisEffectId = ++effectIdRef.current;
    console.log('[DEBUG] useEffect TRIGGERED for symbol:', symbol, 'effectId:', thisEffectId);
    setLoading(true);
    setError('');

    async function loadStockData() {
      console.log('[DEBUG] loadStockData STARTED for symbol:', symbol, 'effectId:', thisEffectId);
      try {
        console.log('[DEBUG] Fetching quote...');
        const quoteRes = await fetch(`/api/stocks/quote?symbol=${symbol}`).then(r => {
          console.log('[DEBUG] Quote response status:', r.status);
          return r.json();
        });
        console.log('[DEBUG] Quote response:', quoteRes);

        // Abort if a newer effect has started
        if (thisEffectId !== effectIdRef.current) {
          console.log('[DEBUG] Aborted - newer effect exists:', thisEffectId, 'vs', effectIdRef.current);
          return;
        }

        console.log('[DEBUG] Fetching details...');
        const detailsRes = await fetch(`/api/stocks/details?symbol=${symbol}`).then(r => {
          console.log('[DEBUG] Details response status:', r.status);
          return r.json();
        });
        console.log('[DEBUG] Details response:', detailsRes);

        if (thisEffectId !== effectIdRef.current) {
          console.log('[DEBUG] Aborted - newer effect exists:', thisEffectId, 'vs', effectIdRef.current);
          return;
        }

        console.log('[DEBUG] Fetching chart...');
        const chartRes = await fetch(`/api/stocks/chart?symbol=${symbol}&period1=${Math.floor(Date.now()/1000) - 60*60*24*150}&period2=${Math.floor(Date.now()/1000)}&interval=1d`).then(r => {
          console.log('[DEBUG] Chart response status:', r.status);
          return r.json();
        });
        console.log('[DEBUG] Chart response:', chartRes);

        if (quoteRes.error || detailsRes.error || chartRes.error) {
          console.error('[DEBUG] API returned errors:', { 
            quoteError: quoteRes.error, 
            detailsError: detailsRes.error, 
            chartError: chartRes.error 
          });
          throw new Error('Failed to load market data');
        }

        console.log('[DEBUG] API responses OK:', {
          quoteSymbol: quoteRes.symbol,
          quotePrice: quoteRes.price,
          hasFinancialData: !!detailsRes.financialData,
          hasChart: !!chartRes.chart
        });

        // Only update state if this is still the current effect
        if (thisEffectId === effectIdRef.current) {
          console.log('[DEBUG] Setting stockData state', { 
            quote: quoteRes.symbol, 
            hasDetails: !!detailsRes.financialData 
          });
          const newStockData = {
            quote: quoteRes,
            details: detailsRes,
            chart: chartRes.chart,
          };
          console.log('[DEBUG] newStockData to set:', { 
            quoteSymbol: newStockData.quote?.symbol,
            hasDetails: !!newStockData.details,
            hasChart: !!newStockData.chart
          });
          setStockData(newStockData);
          console.log('[DEBUG] setStockData called');
        }
      } catch (err) {
        console.error('[DEBUG] loadStockData error:', err);
        if (thisEffectId === effectIdRef.current) {
          setError(err instanceof Error ? err.message : 'Could not load stock data');
        }
      } finally {
        console.log('[DEBUG] Finally block, effectId:', thisEffectId, 'current:', effectIdRef.current);
        if (thisEffectId === effectIdRef.current) {
          console.log('[DEBUG] Setting loading to false');
          setLoading(false);
        } else {
          console.log('[DEBUG] Not setting loading - newer effect exists');
        }
      }
    }

    loadStockData();
    // Cleanup does nothing - the version check handles stale effects
    return () => { 
      console.log('[DEBUG] Cleanup for effectId:', thisEffectId);
    };
  }, [symbol]);

  // Debug panel to show state
  const debugInfo = (
    <div style={{ 
      position: 'fixed', bottom: 10, right: 10, 
      background: 'rgba(0,0,0,0.8)', color: 'white', 
      padding: 10, borderRadius: 5, fontSize: 12, 
      zIndex: 9999, fontFamily: 'monospace', maxWidth: 400 
    }}>
      <div><strong>Debug State:</strong></div>
      <div>effectId: {effectIdRef.current}</div>
      <div>hasStockData: {String(!!stockData)}</div>
      <div>hasValuationData: {String(!!valuationData)}</div>
      <div>loading: {String(loading)}</div>
      <div>valuationLoading: {String(valuationLoading)}</div>
      <div>activeView: {activeView}</div>
      <div>hasCurrentPrice: {String(!!inputs.currentPrice)}</div>
      <div>inputsKeys: {Object.keys(inputs).join(', ')}</div>
      <div>stockData keys: {stockData ? Object.keys(stockData).join(', ') : 'null'}</div>
      <div>valuationData keys: {valuationData ? Object.keys(valuationData).join(', ') : 'null'}</div>
      {valuationData && valuationData.valuation && (
        <div>valuation.consensus: {JSON.stringify(valuationData.valuation.consensus)}</div>
      )}
    </div>
  );

  // Auto-fetch valuation when stock data loads
  useEffect(() => {
    console.log('[DEBUG] First useEffect TRIGGERED', { hasStockData: !!stockData, hasValuationData: !!valuationData });
    if (stockData && !valuationData && Object.keys(inputs).length === 0) {
      console.log('[DEBUG] Auto-fetching valuation with default inputs');
      fetchValuation({ ...FALLBACK_INPUTS });
    }
  }, [stockData]);

  // Fetch valuation when inputs change
  useEffect(() => {
    console.log('[DEBUG] Second useEffect TRIGGERED', { hasStockData: !!stockData, hasCurrentPrice: !!inputs.currentPrice, inputsKeys: Object.keys(inputs) });
    if (stockData && inputs.currentPrice) {
      console.log('[DEBUG] Fetching valuation with current inputs');
      fetchValuation({ ...FALLBACK_INPUTS, ...inputs } as ValuationInputsType);
    }
  }, [inputs]);

  // Fetch valuation function
  const fetchValuation = async (completeInputs: ValuationInputsType) => {
    console.log('[DEBUG] fetchValuation CALLED', { hasStockData: !!stockData, hasCurrentPrice: !!completeInputs.currentPrice, inputs: completeInputs });
    if (!stockData || !completeInputs.currentPrice) return;
    
    setValuationLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(completeInputs).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      params.append('symbol', symbol);
      
      console.log('[DEBUG] Fetching valuation with params:', params.toString());
      const res = await fetch(`/api/valuation?${params.toString()}`);
      console.log('[DEBUG] Valuation response status:', res.status);
      const data = await res.json();
      console.log('[DEBUG] Valuation response:', data);
      
      if (data.error) {
        console.error('[DEBUG] Valuation error:', data.error);
        throw new Error(data.error);
      }
      
      console.log('[DEBUG] Setting valuationData');
      setValuationData(data);
    } catch (err) {
      console.error('[DEBUG] Valuation fetch error:', err);
      setValuationData({ error: err instanceof Error ? err.message : 'Valuation failed' });
    } finally {
      console.log('[DEBUG] Setting valuationLoading to false');
      setValuationLoading(false);
    }
  };

  const handleStockSelect = (stock: { symbol: string; name: string }) => {
    setSymbol(stock.symbol);
    setInputs({});
    setValuationData(null);
  };

  const handleCalculate = (completeInputs: ValuationInputsType) => {
    setInputs(completeInputs);
    fetchValuation(completeInputs);
  };

  // Early returns for loading/error states - AFTER all hooks
  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading {symbol}...</p>
          </div>
        </div>
        {debugInfo}
      </>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Stock Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Could not load data for {symbol}. Please try another symbol.
          </p>
          <StockSearch onSelect={handleStockSelect} initialQuery={symbol} />
        </div>
      </div>
    );
  }

  const { quote, details, chart } = stockData;
  const financialData = details?.financialData;
  const keyStats = details?.defaultKeyStatistics;
  const summaryDetail = details?.summaryDetail;
  const profile = details?.summaryProfile;

  // Prepare valuation inputs from live data
  const liveInputs: Partial<ValuationInputsType> = {
    revenue: financialData?.totalRevenue ? financialData.totalRevenue / 1e7 : 0,
    revenueGrowth: keyStats?.revenueGrowth ? keyStats.revenueGrowth * 100 : 12,
    ebitdaMargin: financialData?.ebitda && financialData?.totalRevenue
      ? (financialData.ebitda / financialData.totalRevenue) * 100
      : 15,
    taxRate: 25.17,
    capexToRevenue: 5,
    workingCapitalToRevenue: 10,
    wacc: 12,
    terminalGrowth: 5,
    sharesOutstanding: keyStats?.sharesOutstanding ? keyStats.sharesOutstanding / 1e7 : 1,
    netDebt: (keyStats?.totalDebt || 0) - (keyStats?.totalCash || 0),
    currentPrice: quote.price,
    peRatio: quote.peRatio,
    forwardPE: quote.forwardPE,
    pbRatio: quote.pbRatio,
    evEbitda: quote.evEbitda,
    dividendYield: quote.dividendYield ? quote.dividendYield * 100 : 0,
    dividendGrowth: 10,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Stock Valuation — {symbol}</h1>
          <StockSearch onSelect={handleStockSelect} initialQuery={symbol} />
        </div>

        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setActiveView('valuation')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'valuation'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Valuation
          </button>
          <button
            onClick={() => setActiveView('inputs')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'inputs'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Inputs & Assumptions
          </button>
          <button
            onClick={() => setActiveView('backtest')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'backtest'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Backtest
          </button>
          <button
            onClick={() => setActiveView('paper-trading')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'paper-trading'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Paper Trading
          </button>
        </div>

        {activeView === 'valuation' && (
                  <ValuationDashboard
                    result={valuationData}
                    stockData={stockData}
                    inputs={inputs}
                  />
                )}

        {activeView === 'inputs' && (
          <ValuationInputs
            initialInputs={inputs}
            onCalculate={handleCalculate}
          />
        )}

        {activeView === 'backtest' && (
          <BacktestTab symbol={symbol} defaultParams={FALLBACK_INPUTS} />
        )}

        {activeView === 'paper-trading' && (
          <PaperTradingTab symbol={symbol} />
        )}
      </div>
    </div>
  );
}