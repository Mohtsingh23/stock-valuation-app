'use client';

import { useState, useEffect, useCallback } from 'react';
import { POPULAR_INDIAN_STOCKS } from '@/lib/stock-api';
import { TouchNumberInput, TouchSelect } from '@/components/ui/MobileComponents';

export interface WatchlistItem {
  symbol: string;
  name: string;
  sector: string;
  addedAt: number;
  targetPrice?: number;
  stopLoss?: number;
  notes?: string;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  name: string;
  type: 'above' | 'below' | 'change_pct';
  targetValue: number;
  currentPrice?: number;
  enabled: boolean;
  createdAt: number;
  triggeredAt?: number;
}

const STORAGE_KEYS = {
  WATCHLIST: 'niveshiq_watchlist',
  ALERTS: 'niveshiq_price_alerts',
  SETTINGS: 'niveshiq_settings',
};

function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedWatchlist = localStorage.getItem('niveshiq_watchlist');
      const storedAlerts = localStorage.getItem('niveshiq_price_alerts');
      if (storedWatchlist) setWatchlist(JSON.parse(storedWatchlist));
      if (storedAlerts) setAlerts(JSON.parse(storedAlerts));
    } catch (e) {
      console.error('Failed to load watchlist:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) localStorage.setItem('niveshiq_watchlist', JSON.stringify(watchlist));
  }, [watchlist, loading]);

  useEffect(() => {
    if (!loading) localStorage.setItem('niveshiq_price_alerts', JSON.stringify(alerts));
  }, [alerts, loading]);

  const addToWatchlist = useCallback((symbol: string) => {
    const stock = POPULAR_INDIAN_STOCKS.find(s => s.symbol === symbol);
    if (!stock) return false;
    if (watchlist.some(w => w.symbol === symbol)) return false;
    setWatchlist(prev => [...prev, { symbol, name: stock.name, sector: stock.sector, addedAt: Date.now() }]);
    return true;
  }, [watchlist]);

  const removeFromWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => prev.filter(w => w.symbol !== symbol));
    setAlerts(prev => prev.filter(a => a.symbol !== symbol));
  }, []);

  const updateWatchlistItem = useCallback((symbol: string, updates: Partial<WatchlistItem>) => {
    setWatchlist(prev => prev.map(w => w.symbol === symbol ? { ...w, ...updates } : w));
  }, []);

  const addAlert = useCallback((alert: Omit<PriceAlert, 'id' | 'createdAt'>) => {
    const newAlert: PriceAlert = { ...alert, id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, createdAt: Date.now() };
    setAlerts(prev => [...prev, newAlert]);
    return newAlert.id;
  }, []);

  const removeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);

  const toggleAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, enabled: !a.enabled } : a));
  }, []);

  const checkAlerts = useCallback((currentPrices: Record<string, number>) => {
    setAlerts(prev => prev.map(alert => {
      if (!alert.enabled || alert.triggeredAt) return alert;
      const currentPrice = currentPrices[alert.symbol];
      if (!currentPrice) return alert;
      let triggered = false;
      if (alert.type === 'above' && currentPrice >= alert.targetValue) triggered = true;
      if (alert.type === 'below' && currentPrice <= alert.targetValue) triggered = true;
      if (triggered) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`${alert.symbol} Price Alert`, { body: `${alert.name} hit ₹${currentPrice} (${alert.type} ₹${alert.targetValue})`, icon: '/icons/icon-192x192.png' });
        }
        return { ...alert, triggeredAt: Date.now(), currentPrice };
      }
      return { ...alert, currentPrice };
    }));
  }, []);

  const getWatchlistSymbols = useCallback(() => watchlist.map(w => w.symbol), [watchlist]);
  const isInWatchlist = useCallback((symbol: string) => watchlist.some(w => w.symbol === symbol), [watchlist]);
  const getWatchlistBySector = useCallback(() => {
    const sectors: Record<string, WatchlistItem[]> = {};
    watchlist.forEach(w => { if (!sectors[w.sector]) sectors[w.sector] = []; sectors[w.sector].push(w); });
    return sectors;
  }, [watchlist]);

  return {
    watchlist, alerts, loading,
    addToWatchlist, removeFromWatchlist, updateWatchlistItem,
    addAlert, removeAlert, toggleAlert, checkAlerts,
    getWatchlistSymbols,
    isInWatchlist: useCallback((symbol: string) => watchlist.some(w => w.symbol === symbol), [watchlist]),
    getWatchlistBySector,
    watchlistCount: watchlist.length,
    activeAlertsCount: alerts.filter(a => a.enabled && !a.triggeredAt).length,
  };
}

function AddAlertModal({ isOpen, onClose, onSubmit, alertForm, setAlertForm }: { isOpen: boolean; onClose: () => void; onSubmit: () => void; alertForm: { symbol: string; type: 'above' | 'below'; targetValue: number }; setAlertForm: (updater: (prev: { symbol: string; type: 'above' | 'below'; targetValue: number }) => { symbol: string; type: 'above' | 'below'; targetValue: number }) => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Create Price Alert</h3>
        <div className="space-y-4">
          <TouchSelect label="Stock" value={alertForm.symbol} onChange={v => setAlertForm(p => ({ ...p, symbol: v }))} options={POPULAR_INDIAN_STOCKS.map(s => ({ value: s.symbol, label: `${s.name} (${s.symbol})` }))} placeholder="Select stock" />
          <TouchSelect label="Alert Type" value={alertForm.type} onChange={v => setAlertForm(p => ({ ...p, type: v as 'above' | 'below' }))} options={[{ value: 'above', label: 'Price goes ABOVE' }, { value: 'below', label: 'Price goes BELOW' }]} />
          <TouchNumberInput label="Target Price (₹)" value={alertForm.targetValue} onChange={v => setAlertForm(p => ({ ...p, targetValue: v }))} placeholder="1500" step={0.01} min={0} />
        </div>
        <div className="flex gap-3 pt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
          <button onClick={onSubmit} disabled={!alertForm.symbol || alertForm.targetValue <= 0} className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">Create Alert</button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ item, onClose, onSave, updateWatchlistItem }: any) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Edit {item.name}</h3>
        <div className="space-y-4">
          <TouchNumberInput label="Target Price (₹)" value={item.targetPrice || 0} onChange={v => onSave({ ...item, targetPrice: v })} placeholder="Target price" step={0.01} min={0} />
          <TouchNumberInput label="Stop Loss (₹)" value={item.stopLoss || 0} onChange={v => onSave({ ...item, stopLoss: v })} placeholder="Stop loss" step={0.01} min={0} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={item.notes || ''} onChange={e => onSave({ ...item, notes: e.target.value })} rows={3} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" placeholder="Investment thesis, catalysts, risks..." />
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
          <button onClick={() => { updateWatchlistItem(item.symbol, item); onClose(); }} className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
}

function StockSearch({ query, onChange, onAdd, isInWatchlist }: any) {
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="relative max-w-md">
        <input type="text" value={query} onChange={e => onChange(e.target.value)} placeholder="Search and add stocks (RELIANCE, TCS...)" className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>
      {query.length >= 1 && (
        <div className="mt-2 max-h-40 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {POPULAR_INDIAN_STOCKS.filter(s => s.name.toLowerCase().includes(query.toLowerCase()) || s.symbol.toLowerCase().includes(query.toLowerCase())).slice(0, 10).map(stock => (
            <button key={stock.symbol} onClick={() => { onAdd(stock.symbol); onChange(''); }} disabled={isInWatchlist(stock.symbol)} className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <div className="font-medium text-gray-900 dark:text-white">{stock.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{stock.symbol} • {stock.sector}</div>
              {isInWatchlist(stock.symbol) && <span className="text-xs text-green-600 dark:text-green-400">Added ✓</span>}
            </button>
          ))}</div>
      )}
    </div>
  );
}

function WatchlistContent({ watchlist, alerts, currentPrices, getWatchlistBySector, isInWatchlist, setEditingItem, removeFromWatchlist, addToWatchlist, onEdit }: { watchlist: WatchlistItem[]; alerts: PriceAlert[]; currentPrices: Record<string, number>; getWatchlistBySector: () => Record<string, WatchlistItem[]>; isInWatchlist: (symbol: string) => boolean; setEditingItem: (item: WatchlistItem | null) => void; removeFromWatchlist: (symbol: string) => void; addToWatchlist: (symbol: string) => boolean; onEdit: (item: WatchlistItem) => void }) {
  if (watchlist.length === 0) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400"><div className="text-4xl mb-2">📋</div><p className="font-medium mb-1">Your watchlist is empty</p><p className="text-sm">Search and add stocks above</p></div>;
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {Object.entries(getWatchlistBySector()).map(([sector, stocks]) => (
        <div key={sector} className="bg-gray-50/50 dark:bg-gray-900/50">
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{sector} ({stocks.length})</div>
          {stocks.map(stock => {
            const currentPrice = arguments[3]?.currentPrices?.[stock.symbol];
            const stockAlerts = alerts.filter(a => a.symbol === stock.symbol && a.enabled && !a.triggeredAt);
            return (
              <div key={stock.symbol} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0" onClick={() => onEdit(stock)}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">{stock.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{stock.symbol}</span>
                    {stock.targetPrice && <span className="text-xs text-blue-600 dark:text-blue-400 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded">Target: ₹{stock.targetPrice.toLocaleString()}</span>}
                    {stock.stopLoss && <span className="text-xs text-red-600 dark:text-red-400 px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 rounded">SL: ₹{stock.stopLoss.toLocaleString()}</span>}
                  </div>
                  {stock.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{stock.notes}</p>}
                  {stockAlerts.length > 0 && <div className="mt-1 flex gap-1 flex-wrap">{stockAlerts.map(alert => (<span key={alert.id} className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">{alert.type === 'above' ? '⬆' : '⬇'} ₹{alert.targetValue.toLocaleString()}</span>))}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {arguments[3]?.currentPrices?.[stock.symbol] && <span className="font-mono text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">₹{arguments[3].currentPrices[stock.symbol].toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>}
                  <button onClick={(e: any) => { e.stopPropagation(); arguments[3]?.onEdit(stock); }} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Edit">✏️</button>
                  <button onClick={(e: any) => { e.stopPropagation(); arguments[3]?.removeFromWatchlist(stock.symbol); }} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Remove">🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ActiveAlerts({ alerts, currentPrices, onToggle, onRemove }: { alerts: PriceAlert[]; currentPrices: Record<string, number>; onToggle: (id: string) => void; onRemove: (id: string) => void }) {
  const active = alerts.filter((a: PriceAlert) => a.enabled && !a.triggeredAt);
  if (active.length === 0) return null;
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Active Price Alerts</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {active.map(alert => {
          const currentPrice = arguments[3]?.currentPrices?.[alert.symbol];
          return (
            <div key={alert.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{alert.name}</span>
                <span className={`px-2 py-0.5 text-xs rounded ${alert.type === 'above' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{alert.type === 'above' ? 'Above' : 'Below'} ₹{alert.targetValue.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                {arguments[3]?.currentPrices?.[alert.symbol] && <span className="text-sm font-mono font-medium">₹{arguments[3].currentPrices[alert.symbol].toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>}
                <button onClick={() => arguments[3]?.onToggle(alert.id)} className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded" title="Disable">🔔</button>
                <button onClick={() => arguments[3]?.onRemove(alert.id)} className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded" title="Delete">🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TriggeredAlerts({ alerts, onRemove }: { alerts: PriceAlert[]; onRemove: (id: string) => void }) {
  const triggered = alerts.filter((a: PriceAlert) => a.triggeredAt);
  if (triggered.length === 0) return null;
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Triggered Alerts</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {triggered.sort((a, b) => (b.triggeredAt || 0) - (a.triggeredAt || 0)).slice(0, 10).map(alert => (
          <div key={alert.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2"><span className="text-green-600 dark:text-green-400">✓</span><span className="font-medium text-sm">{alert.name}</span><span className="text-xs text-gray-500">hit ₹{alert.currentPrice?.toLocaleString()} at {new Date(alert.triggeredAt!).toLocaleDateString()}</span></div>
            <button onClick={() => arguments[3]?.onRemove(alert.id)} className="p-1 text-gray-500 hover:text-red-600 rounded">🗑️</button>
          </div>
        ))}</div></div>
  );
}

export function WatchlistManager({ onClose, currentPrices = {} }: { onClose?: () => void; currentPrices?: Record<string, number> }) {
  const {
    watchlist, alerts, loading,
    addToWatchlist, removeFromWatchlist, updateWatchlistItem,
    addAlert, removeAlert, toggleAlert, checkAlerts,
    isInWatchlist, getWatchlistBySector, watchlistCount, activeAlertsCount,
  } = useWatchlist();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [alertForm, setAlertForm] = useState<{ symbol: string; type: 'above' | 'below'; targetValue: number }>({ symbol: '', type: 'above', targetValue: 0 });
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);

  useEffect(() => { if (Object.keys(currentPrices).length > 0) checkAlerts(currentPrices); }, [currentPrices, checkAlerts]);

  const handleAddAlert = () => {
    if (alertForm.symbol && alertForm.targetValue > 0) {
      const stock = POPULAR_INDIAN_STOCKS.find(s => s.symbol === alertForm.symbol);
      addAlert({ symbol: alertForm.symbol, name: stock?.name || alertForm.symbol, type: alertForm.type, targetValue: alertForm.targetValue, enabled: true });
      setShowAddAlert(false);
      setAlertForm({ symbol: '', type: 'above', targetValue: 0 });
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-500 border-t-transparent"></div></div>;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Watchlist</h2>
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">{watchlistCount} stocks</span>
          {activeAlertsCount > 0 && <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">{activeAlertsCount} alerts</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddAlert(true)} className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">+ Add Alert</button>
          {onClose && <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">✕</button>}
        </div>
      </div>

      <AddAlertModal isOpen={showAddAlert} onClose={() => setShowAddAlert(false)} onSubmit={handleAddAlert} alertForm={alertForm} setAlertForm={setAlertForm} />

      {editingItem && <EditModal item={editingItem} onClose={() => setEditingItem(null)} onSave={setEditingItem} updateWatchlistItem={updateWatchlistItem} />}

      <StockSearch query={searchQuery} onChange={setSearchQuery} onAdd={addToWatchlist} isInWatchlist={isInWatchlist} />

      <div className="max-h-[500px] overflow-y-auto">
        <WatchlistContent watchlist={watchlist} alerts={alerts} currentPrices={currentPrices} getWatchlistBySector={getWatchlistBySector} isInWatchlist={isInWatchlist} setEditingItem={setEditingItem} removeFromWatchlist={removeFromWatchlist} addToWatchlist={addToWatchlist} onEdit={setEditingItem} />
      </div>

      <ActiveAlerts alerts={alerts} currentPrices={currentPrices} onToggle={toggleAlert} onRemove={removeAlert} />
      <TriggeredAlerts alerts={alerts} onRemove={removeAlert} />
    </div>
  );
}

export { useWatchlist };
export default WatchlistManager;