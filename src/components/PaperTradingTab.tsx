'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PaperTrade {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  entryTime: number;
  quantity: number;
  strategyId: string;
  status: 'open' | 'closed';
  exitPrice?: number;
  exitTime?: number;
  pnl?: number;
  pnlPct?: number;
  commission: number;
  slippage: number;
}

interface PaperPosition {
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  entryTime: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  strategyId: string;
}

interface PaperTradingState {
  initialCapital: number;
  currentCapital: number;
  availableCapital: number;
  positions: PaperPosition[];
  trades: PaperTrade[];
  equityCurve: { timestamp: number; equity: number }[];
  strategyId: string;
  params: Record<string, number>;
  symbol: string;
  isRunning: boolean;
  startedAt: number;
  lastUpdate: number;
  commissionPerTrade: number;
  slippageBps: number;
  positionSize: 'percent' | 'fixed';
  positionSizeValue: number;
  allowShort: boolean;
  maxPositionSize: number;
}

interface SessionSummary {
  sessionId: string;
  symbol: string;
  strategyId: string;
  isRunning: boolean;
  initialCapital: number;
  currentCapital: number;
  totalReturn: number;
  totalReturnPct: number;
  startedAt: number;
  lastUpdate: number;
}

interface PaperTradingTabProps {
  symbol: string;
}

export default function PaperTradingTab({ symbol: defaultSymbol }: PaperTradingTabProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<PaperTradingState | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(false);
  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'settings'>('live');
  
  // Settings
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [strategyId, setStrategyId] = useState<'rsi-mean-reversion' | 'ema-crossover' | 'bollinger-breakout' | 'macd'>('rsi-mean-reversion');
  const [params, setParams] = useState<Record<string, number>>({});
  const [initialCapital, setInitialCapital] = useState(100000);
  const [commissionPerTrade, setCommissionPerTrade] = useState(20);
  const [slippageBps, setSlippageBps] = useState(5);
  const [positionSize, setPositionSize] = useState<'percent' | 'fixed'>('percent');
  const [positionSizeValue, setPositionSizeValue] = useState(10);
  const [allowShort, setAllowShort] = useState(false);
  const [maxPositionSize, setMaxPositionSize] = useState(20);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const strategies = [
    { id: 'rsi-mean-reversion', name: 'RSI Mean Reversion' },
    { id: 'ema-crossover', name: 'EMA Crossover' },
    { id: 'bollinger-breakout', name: 'Bollinger Breakout' },
    { id: 'macd', name: 'MACD Trend Following' },
  ];

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const apiCall = async (action: string, body: any) => {
    const response = await fetch('/api/paper-trading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  const loadSessions = async () => {
    try {
      const data = await apiCall('list', {});
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const startSession = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiCall('start', {
        symbol,
        strategyId,
        params,
        initialCapital,
        commissionPerTrade,
        slippageBps,
        positionSize,
        positionSizeValue,
        allowShort,
        maxPositionSize,
      });
      setSessionId(data.sessionId);
      setState(data.state);
      setPolling(true);
      startPolling(data.sessionId);
      loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const tickSession = async () => {
    if (!sessionId) return;
    try {
      const data = await apiCall('tick', { sessionId });
      setState(data.state);
    } catch (err) {
      console.error('Tick failed:', err);
    }
  };

  const stopSession = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const data = await apiCall('stop', { sessionId });
      setState(data.state);
      setPolling(false);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop session');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (sid: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      tickSession();
    }, 30000); // Poll every 30 seconds
    // Initial tick
    tickSession();
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const formatPct = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
  const formatDate = (ts: number) => new Date(ts).toLocaleString('en-IN');

  const totalPnl = state ? state.currentCapital - state.initialCapital : 0;
  const totalPnlPct = state ? ((state.currentCapital - state.initialCapital) / state.initialCapital) * 100 : 0;
  const unrealizedPnl = state?.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0) || 0;
  const realizedPnl = state?.trades.reduce((sum, t) => sum + (t.pnl || 0), 0) || 0;

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Paper Trading — {symbol}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Deploy strategies with virtual money in real-time. Start with ₹1L dummy capital.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex border-b border-gray-200 dark:border-gray-700">
          {['live', 'history', 'settings'].map(tab => (
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

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Live Trading Tab */}
        {activeTab === 'live' && (
          <>
            {/* Session Controls */}
            {!sessionId ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                <h3 className="text-lg font-semibold mb-4">Start New Paper Trading Session</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Symbol</label>
                    <input
                      type="text"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Strategy</label>
                    <select
                      value={strategyId}
                      onChange={(e) => setStrategyId(e.target.value as typeof strategyId)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    >
                      {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
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
                </div>
                <button
                  onClick={startSession}
                  disabled={loading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Starting...' : 'Start Paper Trading (₹1L Virtual)'}
                </button>
              </div>
            ) : (
              <div className="mb-6">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${state?.isRunning ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {state?.isRunning ? 'LIVE' : 'STOPPED'}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">Session: {sessionId?.slice(0, 20)}...</span>
                  </div>
                  <button
                    onClick={stopSession}
                    disabled={loading || !state?.isRunning}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Stop Session
                  </button>
                  <button
                    onClick={tickSession}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Manual Tick
                  </button>
                </div>

                {/* Portfolio Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                  <MetricCard label="Virtual Capital" value={formatCurrency(initialCapital)} color="gray" />
                  <MetricCard label="Current Equity" value={formatCurrency(state?.currentCapital || 0)} subValue={formatPct(totalPnlPct)} color={totalPnl >= 0 ? 'green' : 'red'} />
                  <MetricCard label="Available Cash" value={formatCurrency(state?.availableCapital || 0)} color="blue" />
                  <MetricCard label="Unrealized P&L" value={formatCurrency(unrealizedPnl)} color={unrealizedPnl >= 0 ? 'green' : 'red'} />
                  <MetricCard label="Realized P&L" value={formatCurrency(realizedPnl)} color={realizedPnl >= 0 ? 'green' : 'red'} />
                </div>

                {/* Open Positions */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold">Open Positions</h3>
                  </div>
                  <div className="p-4">
                    {state?.positions.length === 0 ? (
                      <p className="text-center text-gray-600 dark:text-gray-400 py-8">No open positions</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                              <th className="pb-2">Symbol</th>
                              <th className="pb-2">Side</th>
                              <th className="pb-2">Qty</th>
                              <th className="pb-2">Entry</th>
                              <th className="pb-2">Current</th>
                              <th className="pb-2">Unrealized P&L</th>
                              <th className="pb-2">P&L %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {state?.positions.map((pos, i) => (
                              <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                                <td className="py-2 font-medium">{pos.symbol}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${pos.side === 'long' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {pos.side.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-2">{pos.quantity}</td>
                                <td className="py-2">₹{pos.entryPrice.toFixed(2)}</td>
                                <td className="py-2">₹{pos.currentPrice.toFixed(2)}</td>
                                <td className={`py-2 font-medium ${pos.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ₹{pos.unrealizedPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </td>
                                <td className={`py-2 font-medium ${pos.unrealizedPnlPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {pos.unrealizedPnlPct >= 0 ? '+' : ''}{pos.unrealizedPnlPct.toFixed(2)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Trades */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold">Recent Trades</h3>
                  </div>
                  <div className="p-4">
                    {state?.trades.length === 0 ? (
                      <p className="text-center text-gray-600 dark:text-gray-400 py-8">No trades yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                              <th className="pb-2">Date</th>
                              <th className="pb-2">Side</th>
                              <th className="pb-2">Qty</th>
                              <th className="pb-2">Entry</th>
                              <th className="pb-2">Exit</th>
                              <th className="pb-2">P&L</th>
                              <th className="pb-2">P&L %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {state?.trades.slice(-10).reverse().map((trade, i) => (
                              <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                                <td className="py-2">{formatDate(trade.exitTime || trade.entryTime)}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${trade.side === 'long' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {trade.side.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-2">{trade.quantity}</td>
                                <td className="py-2">₹{trade.entryPrice.toFixed(2)}</td>
                                <td className="py-2">₹{trade.exitPrice?.toFixed(2) || '-'}</td>
                                <td className={`py-2 font-medium ${(trade.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ₹{(trade.pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </td>
                                <td className={`py-2 font-medium ${(trade.pnlPct || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {(trade.pnlPct || 0) >= 0 ? '+' : ''}{(trade.pnlPct || 0).toFixed(2)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Equity Curve Chart */}
            {sessionId && state && state.equityCurve.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mt-6">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold">Equity Curve (Live)</h3>
                </div>
                <div className="p-4">
                  <EquityCurveChart equityCurve={state.equityCurve} initialCapital={initialCapital} />
                </div>
              </div>
            )}
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Session History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2">Session</th>
                    <th className="pb-2">Symbol</th>
                    <th className="pb-2">Strategy</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Capital</th>
                    <th className="pb-2">Return</th>
                    <th className="pb-2">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr>
                      <td className="py-8 text-center text-gray-600 dark:text-gray-400 col-span-7">No sessions yet</td>
                    </tr>
                  ) : (
                    sessions.map(s => (
                      <tr key={s.sessionId} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-2 font-mono text-xs">{s.sessionId.slice(0, 25)}...</td>
                        <td className="py-2">{s.symbol}</td>
                        <td className="py-2">{s.strategyId}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${s.isRunning ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {s.isRunning ? 'Running' : 'Stopped'}
                          </span>
                        </td>
                        <td className="py-2">{formatCurrency(s.initialCapital)}</td>
                        <td className={`py-2 font-medium ${s.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPct(s.totalReturnPct)}
                        </td>
                        <td className="py-2">{formatDate(s.startedAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4">Trading Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commission per Trade</label>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position Size Type</label>
                <select
                  value={positionSize}
                  onChange={(e) => setPositionSize(e.target.value as 'percent' | 'fixed')}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                >
                  <option value="percent">% of Equity</option>
                  <option value="fixed">Fixed Quantity</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position Size Value</label>
                <input
                  type="number"
                  step="0.1"
                  value={positionSizeValue}
                  onChange={(e) => setPositionSizeValue(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Position Size (%)</label>
                <input
                  type="number"
                  value={maxPositionSize}
                  onChange={(e) => setMaxPositionSize(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
              <div>
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
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
              Settings apply to new sessions. Stop and restart session to apply changes.
            </p>
          </div>
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
    
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (height - 2 * padding) * i / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    const zeroY = padding + (height - 2 * padding) * (initialCapital - minEquity) / range;
    ctx.strokeStyle = '#9ca3af';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, zeroY);
    ctx.lineTo(width - padding, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
    
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