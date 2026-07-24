'use client';

import { useEffect, useMemo, useState } from 'react';
import { POPULAR_INDIAN_STOCKS } from '@/lib/stock-api';
import { makeIntradayRecommendation, makePositionalRecommendation, technicalSnapshot, type Recommendation } from '@/lib/recommendation';

type Mode = 'intraday' | 'positional';
type Quote = { name?: string; price?: number; change?: number; changePercent?: number; exchange?: string; peRatio?: number };
type Financial = { returnOnEquity?: number; profitMargins?: number; debtToEquity?: number };
type ChartPoint = { close?: number; volume?: number };
type MarketData = { quote: Quote; details: { financialData?: Financial }; chart: { quotes?: ChartPoint[] } };
const currency = (value?: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0);

export default function RecommendationWorkspace() {
  const [symbol, setSymbol] = useState('RELIANCE.NS');
  const [query, setQuery] = useState('Reliance Industries');
  const [mode, setMode] = useState<Mode>('intraday');
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sector, setSector] = useState('All sectors');

  const selected = POPULAR_INDIAN_STOCKS.find(stock => stock.symbol === symbol);
  const sectors = ['All sectors', ...Array.from(new Set(POPULAR_INDIAN_STOCKS.map(stock => stock.sector)))];
  const choices = useMemo(() => POPULAR_INDIAN_STOCKS.filter(stock => (sector === 'All sectors' || stock.sector === sector) && `${stock.name} ${stock.symbol}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6), [query, sector]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const end = Math.floor(Date.now() / 1000);
        const start = end - 60 * 60 * 24 * 150;
        const [quote, details, chart] = await Promise.all([
          fetch(`/api/stocks/quote?symbol=${symbol}`).then(r => r.json()),
          fetch(`/api/stocks/details?symbol=${symbol}`).then(r => r.json()),
          fetch(`/api/stocks/chart?symbol=${symbol}&period1=${start}&period2=${end}&interval=1d`).then(r => r.json()),
        ]);
        if (quote.error || details.error || chart.error) throw new Error('Market data could not be loaded.');
        if (!cancelled) setData({ quote, details, chart: chart.chart } as MarketData);
      } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load market data.'); }
      finally { if (!cancelled) setLoading(false); }
    }
    load(); return () => { cancelled = true; };
  }, [symbol]);

  const closes = (data?.chart?.quotes || []).map((item) => item.close).filter((item): item is number => Number.isFinite(item));
  const volumes = (data?.chart?.quotes || []).map((item) => item.volume || 0);
  const tech = technicalSnapshot(closes, volumes);
  const recommendation: Recommendation | null = data ? (mode === 'intraday' ? makeIntradayRecommendation(tech) : makePositionalRecommendation(tech, data.details.financialData, data.quote)) : null;
  const actionStyle = recommendation?.action === 'BUY' ? 'signal-buy' : recommendation?.action === 'WATCH' ? 'signal-watch' : 'signal-avoid';
  const dailyChange = data?.quote.change ?? 0;
  const dailyChangePercent = data?.quote.changePercent ?? 0;

  function choose(stock: typeof POPULAR_INDIAN_STOCKS[number]) { setSymbol(stock.symbol); setQuery(stock.name); }

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">↗</span><span>nivesh<span>IQ</span></span></div><div className="market-status"><i /> NSE market data · Yahoo Finance</div><button className="refresh" onClick={() => setSymbol(symbol)}>↻ Refresh</button></header>
    <section className="hero"><p className="eyebrow">INDIAN EQUITY INTELLIGENCE</p><h1>Find your next move,<br /><em>with conviction.</em></h1><p>Live NSE research that translates price action and business quality into a clear, risk-aware plan.</p></section>
    <section className="control-panel">
      <div className="search-block"><label>SEARCH NSE STOCKS</label><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Reliance, TCS, HDFCBANK..." />{query && <div className="search-results">{choices.map(stock => <button key={stock.symbol} onClick={() => choose(stock)}><span><b>{stock.name}</b><small>{stock.symbol.replace('.NS', '')} · {stock.sector}</small></span><strong>→</strong></button>)}</div>}</div>
      <div><label>SECTOR FILTER</label><select value={sector} onChange={e => setSector(e.target.value)}>{sectors.map(item => <option key={item}>{item}</option>)}</select></div>
      <div className="mode-toggle"><label>STRATEGY HORIZON</label><div><button className={mode === 'intraday' ? 'active' : ''} onClick={() => setMode('intraday')}>Intraday<br /><small>minutes → hours</small></button><button className={mode === 'positional' ? 'active' : ''} onClick={() => setMode('positional')}>Positional<br /><small>weeks → months</small></button></div></div>
    </section>
    {error && <div className="error-box">{error}</div>}
    {loading || !recommendation || !data ? <div className="loading">Analysing live market data…</div> : <>
      <section className="stock-head"><div><p className="eyebrow">{selected?.sector || data.quote.exchange}</p><h2>{data.quote.name || selected?.name} <span>{symbol.replace('.NS', '')}</span></h2></div><div className="quote"><strong>{currency(data.quote.price)}</strong><span className={dailyChange >= 0 ? 'up' : 'down'}>{dailyChange >= 0 ? '+' : ''}{dailyChangePercent.toFixed(2)}% today</span></div></section>
      <section className="recommendation-card"><div className="rec-top"><div><p className="eyebrow">{mode === 'intraday' ? 'INTRADAY SETUP' : 'POSITIONAL INVESTMENT PLAN'}</p><h2>{recommendation.action === 'BUY' ? 'Favourable setup detected' : recommendation.action === 'WATCH' ? 'Wait for confirmation' : 'Risk outweighs the setup'}</h2></div><div className={`signal ${actionStyle}`}><span>{recommendation.action}</span><small>{recommendation.score}/100 · {recommendation.confidence} conviction</small></div></div><div className="plan-grid"><PlanItem label="IDEAL ENTRY" value={currency(recommendation.entry)} hint="Near current price"/><PlanItem label="PROTECTIVE STOP" value={currency(recommendation.stopLoss)} hint="Exit if thesis breaks"/><PlanItem label="INITIAL TARGET" value={currency(recommendation.target)} hint={`Risk / reward ${recommendation.riskReward}`}/></div><div className="thesis"><b>Why this signal</b>{recommendation.reasons.slice(0, 3).map(reason => <p key={reason}>● {reason}</p>)}</div></section>
      <section className="analysis-grid"><div className="panel"><div className="panel-title"><span>Technical pulse</span><small>Daily timeframe</small></div><Metric label="RSI (14)" value={tech.rsi.toString()} note={tech.rsi > 70 ? 'Overbought' : tech.rsi < 40 ? 'Weak momentum' : 'Healthy momentum'} /><Metric label="20-day average" value={currency(tech.sma20)} note={tech.price > tech.sma20 ? 'Price above trend' : 'Price below trend'} /><Metric label="Volume ratio" value={`${tech.volumeRatio.toFixed(1)}×`} note="vs 20-day average" /></div><div className="panel"><div className="panel-title"><span>Fundamental quality</span><small>Latest reported</small></div><Metric label="Return on equity" value={`${((data.details.financialData?.returnOnEquity || 0) * 100).toFixed(1)}%`} note="Capital efficiency" /><Metric label="Profit margin" value={`${((data.details.financialData?.profitMargins || 0) * 100).toFixed(1)}%`} note="Earnings quality" /><Metric label="Trailing P/E" value={data.quote.peRatio?.toFixed(1) || '—'} note="Compare with sector peers" /></div><div className="panel risk-panel"><div className="panel-title"><span>Risk checklist</span><small>Always verify</small></div><p>• Use a stop-loss; no signal guarantees returns.</p><p>• Check news, results and corporate actions before entry.</p><p>• Keep a single position within your risk limit.</p></div></section>
      <footer>Educational research only — not SEBI-registered investment advice. Live quotes may be delayed; verify with your broker before trading.</footer>
    </>}
  </main>;
}

function PlanItem({ label, value, hint }: { label: string; value: string; hint: string }) { return <div><label>{label}</label><strong>{value}</strong><small>{hint}</small></div>; }
function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <div className="metric"><span>{label}</span><b>{value}</b><small>{note}</small></div>; }
