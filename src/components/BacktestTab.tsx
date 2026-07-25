'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { builtInStrategies } from '@/lib/backtest';

import type { ValuationInputs as ValuationInputsType } from '@/lib/valuation';

interface BacktestResult {
  equityCurve: { timestamp: number; equity: number }[];
  trades: {
    entryTime: number;
    exitTime: number;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    side: 'long' | 'short';
    pnl: number;
    pnlPct: number;
  }[];
  metrics: {
    totalReturn: number;
    totalReturnPct: number;
    cagr: number;
    maxDrawdown: number;
    maxDrawdownPct: number;
    volatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    expectancy: number;
    avgTrade: number;
    maxConsecutiveWins: number;
    maxConsecutiveLosses: number;
    startEquity: number;
    endEquity: number;
  };
  params: Record<string, number>;
  dataPoints: number;
}

interface BacktestTabProps {
  symbol: string;
  defaultParams?: ValuationInputsType;
}

export default function BacktestTab({ symbol, defaultParams }: BacktestTabProps) {
  const [strategies] = useState(Object.entries(builtInStrategies).map(([id, s]) => ({ id, ...s })));
  const [selectedStrategy, setSelectedStrategy] = useState<'rsi-mean-reversion' | 'ema-crossover' | 'bollinger-breakout' | 'macd'>('rsi-mean-reversion');
  const [params, setParams] = useState<Record<string, number>>({});
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [initialCapital, setInitialCapital] = useState(1000000);
  const [commissionPerTrade, setCommissionPerTrade] = useState(20);
  const [slippageBps, setSlippageBps] = useState(5);
  const [positionSize, setPositionSize] = useState<'percent' | 'fixed'>('percent');
  const [positionSizeValue, setPositionSizeValue] = useState(10);
  const [allowShort, setAllowShort] = useState(false);
  
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'results' | 'trades' | 'equity'>('results');

  // Initialize params when strategy changes
  useEffect(() => {
    const strategy = strategies.find(s => s.id === selectedStrategy);
    if (strategy) {
      setParams({ ...strategy.params, ...defaultParams });
    }
  }, [selectedStrategy, strategies, defaultParams]);

  // Set default date range (last year)
  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);
    setDateRange({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    });
  }, []);

  const runBacktest = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          strategyId: selectedStrategy,
          params,
          from: dateRange.from,
          to: dateRange.to,
          initialCapital,
          commissionPerTrade,
          slippageBps,
          positionSize,
          positionSizeValue,
          allowShort,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Backtest failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backtest failed');
    } finally {
      setLoading(false);
    }
  }, [symbol, selectedStrategy, params, dateRange, initialCapital, commissionPerTrade, slippageBps, positionSize, positionSizeValue, allowShort]);

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const formatPct = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
  const formatNumber = (val: number) => val.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-IN');

  const strategy = strategies.find(s => s.id === selectedStrategy);

  if (!strategy) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Algo Backtest — {symbol}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test trading strategies on historical data before deploying real capital
          </p>
        </div>

        {/* Strategy Selection & Parameters */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Strategy Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Strategy</h3>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value as typeof selectedStrategy)}
              className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {strategies.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{strategy.description}</p>
          </div>

          {/* Parameters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Parameters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {strategy.paramSchema.map(p => (
                <div key={p.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {p.label} <span className="text-gray-500">({p.default})</span>
                  </label>
                  <input
                    type="number"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={params[p.key] ?? p.default}
                    onChange={(e) => setParams(prev => ({ ...prev, [p.key]: p.type === 'int' ? parseInt(e.target.value) : parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Backtest Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Range</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Initial Capital</label>
                <input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commission/Trade</label>
                  <input
                    type="number"
                    value={commissionPerTrade}
                    onChange={(e) => setCommissionPerTrade(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slippage (bps)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={slippageBps}
                    onChange={(e) => setSlippageBps(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position Size</label>
                  <select
                    value={positionSize}
                    onChange={(e) => setPositionSize(e.target.value as 'percent' | 'fixed')}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  >
                    <option value="percent">% of Equity</option>
                    <option value="fixed">Fixed Qty</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Size Value</label>
                  <input
                    type="number"
                    step="0.1"
                    value={positionSizeValue}
                    onChange={(e) => setPositionSizeValue(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowShort}
                  onChange={(e) => setAllowShort(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Allow Short Selling</span>
              </label>
            </div>
          </div>

          {/* Run Button */}
          <div className="lg:col-span-3 flex justify-center">
            <button
              onClick={runBacktest}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Running Backtest...' : 'Run Backtest'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricCard label="Total Return" value={formatCurrency(result.metrics.totalReturn)} subValue={formatPct(result.metrics.totalReturnPct)} color={result.metrics.totalReturn >= 0 ? 'green' : 'red'} />
              <MetricCard label="CAGR" value={formatPct(result.metrics.cagr)} color="blue" />
              <MetricCard label="Max Drawdown" value={formatPct(result.metrics.maxDrawdownPct)} subValue={formatCurrency(result.metrics.maxDrawdown)} color="red" />
              <MetricCard label="Sharpe Ratio" value={result.metrics.sharpeRatio.toFixed(2)} color="purple" />
              <MetricCard label="Win Rate" value={formatPct(result.metrics.winRate)} subValue={`${result.metrics.winningTrades}/${result.metrics.totalTrades}`} color="green" />
              <MetricCard label="Profit Factor" value={result.metrics.profitFactor.toFixed(2)} color="blue" />
              <MetricCard label="Expectancy" value={formatCurrency(result.metrics.expectancy)} color="purple" />
              <MetricCard label="Total Trades" value={result.metrics.totalTrades.toString()} color="gray" />
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                {['results', 'equity', 'trades'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as typeof activeTab)}
                    className={`px-6 py-3 font-medium transition-colors ${
                      activeTab === tab
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'results' && <ResultsPanel metrics={result.metrics} />}
                {activeTab === 'equity' && <EquityCurveChart equityCurve={result.equityCurve} initialCapital={result.metrics.startEquity} />}
                {activeTab === 'trades' && <TradesTable trades={result.trades} />}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, subValue, color }: { label: string; value: string; subValue?: string; color: string }) {
  const colors = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    gray: 'text-gray-600 dark:text-gray-400',
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color as keyof typeof colors]}`}>{value}</p>
      {subValue && <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{subValue}</p>}
    </div>
  );
}

function ResultsPanel({ metrics }: { metrics: BacktestResult['metrics'] }) {
  const rows = [
    ['Total Return', `₹${metrics.totalReturn.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${metrics.totalReturnPct >= 0 ? '+' : ''}${metrics.totalReturnPct.toFixed(2)}%)`],
    ['CAGR', `${metrics.cagr >= 0 ? '+' : ''}${metrics.cagr.toFixed(2)}%`],
    ['Volatility (Annual)', `${metrics.volatility.toFixed(2)}%`],
    ['Max Drawdown', `₹${metrics.maxDrawdown.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${metrics.maxDrawdownPct.toFixed(2)}%)`],
    ['Sharpe Ratio', metrics.sharpeRatio.toFixed(2)],
    ['Sortino Ratio', metrics.sortinoRatio.toFixed(2)],
    ['Calmar Ratio', metrics.calmarRatio.toFixed(2)],
    ['Total Trades', metrics.totalTrades.toString()],
    ['Winning Trades', metrics.winningTrades.toString()],
    ['Losing Trades', metrics.losingTrades.toString()],
    ['Win Rate', `${metrics.winRate.toFixed(2)}%`],
    ['Avg Win', `₹${metrics.avgWin.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`],
    ['Avg Loss', `₹${metrics.avgLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`],
    ['Profit Factor', metrics.profitFactor.toFixed(2)],
    ['Expectancy', `₹${metrics.expectancy.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`],
    ['Avg Trade', `₹${metrics.avgTrade.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`],
    ['Max Consec. Wins', metrics.maxConsecutiveWins.toString()],
    ['Max Consec. Losses', metrics.maxConsecutiveLosses.toString()],
    ['Start Equity', `₹${metrics.startEquity.toLocaleString('en-IN')}`],
    ['End Equity', `₹${metrics.endEquity.toLocaleString('en-IN')}`],
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {rows.map(([label, value], i) => (
        <div key={i} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
          <span className="text-gray-600 dark:text-gray-400">{label}</span>
          <span className="font-medium text-gray-900 dark:text-white">{value}</span>
        </div>
      ))}
    </div>
  );
}

function EquityCurveChart({ equityCurve, initialCapital }: { equityCurve: { timestamp: number; equity: number }[]; initialCapital: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || equityCurve.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const padding = 40;
    
    const equities = equityCurve.map(p => p.equity);
    const minEquity = Math.min(...equities, initialCapital);
    const maxEquity = Math.max(...equities, initialCapital);
    const range = maxEquity - minEquity || 1;
    
    // Background
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg') || '#f9fafb';
    ctx.fillRect(0, 0, width, height);
    
    // Grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (height - 2 * padding) * i / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Zero line
    const zeroY = padding + (height - 2 * padding) * (initialCapital - minEquity) / range;
    ctx.strokeStyle = '#9ca3af';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, zeroY);
    ctx.lineTo(width - padding, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Equity curve
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#60a5fa');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    equityCurve.forEach((point, i) => {
      const x = padding + (width - 2 * padding) * i / (equityCurve.length - 1 || 1);
      const y = padding + (height - 2 * padding) * (maxEquity - point.equity) / range;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Fill area
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fill();
  }, [equityCurve, initialCapital]);

  return (
    <div className="h-96 w-full">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

function TradesTable({ trades }: { trades: BacktestResult['trades'] }) {
  if (trades.length === 0) {
    return <div className="text-center py-12 text-gray-600 dark:text-gray-400">No trades executed</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <th className="pb-2">Entry Date</th>
            <th className="pb-2">Exit Date</th>
            <th className="pb-2">Side</th>
            <th className="pb-2">Qty</th>
            <th className="pb-2">Entry</th>
            <th className="pb-2">Exit</th>
            <th className="pb-2">P&L</th>
            <th className="pb-2">P&L %</th>
          </tr>
        </thead>
        <tbody>
          {trades.slice(-50).map((trade, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="py-2">{new Date(trade.entryTime).toLocaleDateString('en-IN')}</td>
              <td className="py-2">{new Date(trade.exitTime).toLocaleDateString('en-IN')}</td>
              <td className="py-2">
                <span className={`px-2 py-0.5 rounded text-xs ${trade.side === 'long' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {trade.side.toUpperCase()}
                </span>
              </td>
              <td className="py-2">{trade.quantity}</td>
              <td className="py-2">₹{trade.entryPrice.toFixed(2)}</td>
              <td className="py-2">₹{trade.exitPrice.toFixed(2)}</td>
              <td className={`py-2 font-medium ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{trade.pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </td>
              <td className={`py-2 font-medium ${trade.pnlPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {trades.length > 50 && (
        <p className="text-center text-gray-600 dark:text-gray-400 mt-4 text-sm">
          Showing last 50 of {trades.length} trades
        </p>
      )}
    </div>
  );
}