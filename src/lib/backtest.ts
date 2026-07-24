/**
 * Backtest Engine for Algo Trading Strategies
 * Runs in Web Worker or main thread
 */

export interface Bar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  side: 'long' | 'short';
  pnl: number;
  pnlPct: number;
  commission: number;
  slippage: number;
}

export interface BacktestResult {
  equityCurve: { timestamp: number; equity: number }[];
  trades: Trade[];
  metrics: BacktestMetrics;
  params: Record<string, number>;
}

export interface BacktestMetrics {
  // Returns
  totalReturn: number;
  totalReturnPct: number;
  cagr: number;
  
  // Risk
  maxDrawdown: number;
  maxDrawdownPct: number;
  volatility: number;
  
  // Risk-adjusted
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  
  // Trade stats
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
  
  // Other
  startEquity: number;
  endEquity: number;
  startDate: number;
  endDate: number;
}

export interface StrategyParams {
  [key: string]: number;
}

export type Signal = 'buy' | 'sell' | 'hold';

export interface StrategyContext {
  bars: Bar[];
  currentIndex: number;
  currentBar: Bar;
  position: number; // current position size (0 = flat, >0 = long, <0 = short)
  equity: number;
  params: StrategyParams;
}

export interface Strategy {
  name: string;
  description: string;
  params: StrategyParams;
  paramSchema: ParamSchema[];
  init?: (ctx: StrategyContext) => void;
  onBar: (ctx: StrategyContext) => Signal;
  onExit?: (ctx: StrategyContext) => Signal;
}

export interface ParamSchema {
  key: string;
  label: string;
  type: 'number' | 'int';
  min: number;
  max: number;
  step: number;
  default: number;
}

/**
 * Built-in Strategies
 */

// RSI Mean Reversion
export const rsiMeanReversion: Strategy = {
  name: 'RSI Mean Reversion',
  description: 'Buy when RSI oversold, sell when overbought',
  params: { rsiPeriod: 14, oversold: 30, overbought: 70 },
  paramSchema: [
    { key: 'rsiPeriod', label: 'RSI Period', type: 'int', min: 2, max: 50, step: 1, default: 14 },
    { key: 'oversold', label: 'Oversold Level', type: 'int', min: 10, max: 40, step: 1, default: 30 },
    { key: 'overbought', label: 'Overbought Level', type: 'int', min: 60, max: 90, step: 1, default: 70 },
  ],
  onBar: (ctx) => {
    const { bars, currentIndex, params, position } = ctx;
    if (currentIndex < params.rsiPeriod) return 'hold';
    
    const rsi = calculateRSI(bars.slice(currentIndex - params.rsiPeriod, currentIndex + 1), params.rsiPeriod);
    
    if (position === 0 && rsi < params.oversold) return 'buy';
    if (position > 0 && rsi > params.overbought) return 'sell';
    return 'hold';
  },
};

// EMA Crossover Trend Following
export const emaCrossover: Strategy = {
  name: 'EMA Crossover',
  description: 'Buy when fast EMA crosses above slow EMA, sell on reverse cross',
  params: { fastPeriod: 20, slowPeriod: 50 },
  paramSchema: [
    { key: 'fastPeriod', label: 'Fast EMA Period', type: 'int', min: 5, max: 100, step: 1, default: 20 },
    { key: 'slowPeriod', label: 'Slow EMA Period', type: 'int', min: 10, max: 200, step: 1, default: 50 },
  ],
  onBar: (ctx) => {
    const { bars, currentIndex, params, position } = ctx;
    if (currentIndex < params.slowPeriod) return 'hold';
    
    const fastEMA = calculateEMA(bars.slice(0, currentIndex + 1), params.fastPeriod);
    const slowEMA = calculateEMA(bars.slice(0, currentIndex + 1), params.slowPeriod);
    const prevFastEMA = calculateEMA(bars.slice(0, currentIndex), params.fastPeriod);
    const prevSlowEMA = calculateEMA(bars.slice(0, currentIndex), params.slowPeriod);
    
    const crossUp = prevFastEMA <= prevSlowEMA && fastEMA > slowEMA;
    const crossDown = prevFastEMA >= prevSlowEMA && fastEMA < slowEMA;
    
    if (position === 0 && crossUp) return 'buy';
    if (position > 0 && crossDown) return 'sell';
    return 'hold';
  },
};

// Bollinger Band Breakout
export const bollingerBreakout: Strategy = {
  name: 'Bollinger Band Breakout',
  description: 'Buy on upper band breakout, sell on lower band breakdown (mean reversion)',
  params: { period: 20, stdDev: 2 },
  paramSchema: [
    { key: 'period', label: 'Period', type: 'int', min: 10, max: 50, step: 1, default: 20 },
    { key: 'stdDev', label: 'Std Dev Multiplier', type: 'number', min: 1, max: 3, step: 0.1, default: 2 },
  ],
  onBar: (ctx) => {
    const { bars, currentIndex, params, position } = ctx;
    if (currentIndex < params.period) return 'hold';
    
    const slice = bars.slice(currentIndex - params.period + 1, currentIndex + 1);
    const closes = slice.map(b => b.close);
    const sma = closes.reduce((a, b) => a + b, 0) / closes.length;
    const variance = closes.reduce((sum, c) => sum + Math.pow(c - sma, 2), 0) / closes.length;
    const std = Math.sqrt(variance);
    const upper = sma + params.stdDev * std;
    const lower = sma - params.stdDev * std;
    const close = ctx.currentBar.close;
    
    if (position === 0 && close > upper) return 'buy'; // Breakout up
    if (position > 0 && close < lower) return 'sell'; // Breakdown down
    return 'hold';
  },
};

// MACD Trend Following
export const macdStrategy: Strategy = {
  name: 'MACD Trend Following',
  description: 'MACD line crosses signal line for entries/exits',
  params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  paramSchema: [
    { key: 'fastPeriod', label: 'Fast Period', type: 'int', min: 5, max: 20, step: 1, default: 12 },
    { key: 'slowPeriod', label: 'Slow Period', type: 'int', min: 20, max: 50, step: 1, default: 26 },
    { key: 'signalPeriod', label: 'Signal Period', type: 'int', min: 5, max: 20, step: 1, default: 9 },
  ],
  onBar: (ctx) => {
    const { bars, currentIndex, params, position } = ctx;
    if (currentIndex < params.slowPeriod + params.signalPeriod) return 'hold';
    
    const macd = calculateMACD(bars.slice(0, currentIndex + 1), params.fastPeriod, params.slowPeriod, params.signalPeriod);
    const prevMacd = calculateMACD(bars.slice(0, currentIndex), params.fastPeriod, params.slowPeriod, params.signalPeriod);
    
    const crossUp = prevMacd.macd <= prevMacd.signal && macd.macd > macd.signal;
    const crossDown = prevMacd.macd >= prevMacd.signal && macd.macd < macd.signal;
    
    if (position === 0 && crossUp) return 'buy';
    if (position > 0 && crossDown) return 'sell';
    return 'hold';
  },
};

export const builtInStrategies: Record<string, Strategy> = {
  'rsi-mean-reversion': rsiMeanReversion,
  'ema-crossover': emaCrossover,
  'bollinger-breakout': bollingerBreakout,
  'macd': macdStrategy,
};

/**
 * Technical Indicator Calculations
 */
function calculateRSI(bars: Bar[], period: number): number {
  if (bars.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = bars[i].close - bars[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  for (let i = period + 1; i < bars.length; i++) {
    const change = bars[i].close - bars[i - 1].close;
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
  }
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateEMA(bars: Bar[], period: number): number {
  if (bars.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = bars[0].close;
  for (let i = 1; i < bars.length; i++) {
    ema = bars[i].close * k + ema * (1 - k);
  }
  return ema;
}

function calculateMACD(bars: Bar[], fastPeriod: number, slowPeriod: number, signalPeriod: number) {
  const closes = bars.map(b => b.close);
  const fastEMA = calculateEMAArray(closes, fastPeriod);
  const slowEMA = calculateEMAArray(closes, slowPeriod);
  const macdLine = fastEMA.map((f, i) => f - slowEMA[i]);
  const signalLine = calculateEMAArray(macdLine, signalPeriod);
  return {
    macd: macdLine[macdLine.length - 1],
    signal: signalLine[signalLine.length - 1],
    histogram: macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1],
  };
}

function calculateEMAArray(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(values[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

/**
 * Backtest Engine
 */
export interface BacktestConfig {
  symbol: string;
  bars: Bar[];
  strategy: Strategy;
  initialCapital: number;
  commissionPerTrade: number; // absolute or percentage
  slippageBps: number; // basis points
  positionSize: 'fixed' | 'percent' | 'kelly';
  positionSizeValue: number; // if fixed: qty, if percent: % of equity, if kelly: fraction
  allowShort: boolean;
  maxPositionSize?: number; // max % of equity per trade
}

export function runBacktest(config: BacktestConfig): BacktestResult {
  const { 
    bars, strategy, initialCapital, commissionPerTrade, 
    slippageBps, positionSize, positionSizeValue, allowShort, maxPositionSize = 100 
  } = config;
  
  const trades: Trade[] = [];
  const equityCurve: { timestamp: number; equity: number }[] = [];
  let equity = initialCapital;
  let position = 0; // qty (positive = long, negative = short)
  let entryPrice = 0;
  let entryTime = 0;
  let entryCommission = 0;
  let entrySlippage = 0;
  let peakEquity = initialCapital;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  
  // Initialize strategy if it has init
  if (strategy.init) {
    strategy.init({ bars, currentIndex: 0, currentBar: bars[0], position: 0, equity, params: strategy.params });
  }
  
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const ctx = {
      bars,
      currentIndex: i,
      currentBar: bar,
      position,
      equity,
      params: strategy.params,
    };
    
    const signal = strategy.onBar(ctx);
    const price = bar.close;
    
    // Calculate position size for new trades
    const getPositionSize = (): number => {
      if (positionSize === 'fixed') return positionSizeValue;
      if (positionSize === 'percent') return Math.floor((equity * positionSizeValue / 100) / price);
      // Kelly criterion simplified
      return Math.floor((equity * 0.1) / price); // 10% Kelly fraction
    };
    
    const maxQty = Math.floor((equity * maxPositionSize / 100) / price);
    
    // Execute signals
    if (signal === 'buy' && position <= 0) {
      // Close short if any
      if (position < 0) {
        const exitPrice = applySlippage(price, 'buy', slippageBps);
        const pnl = (entryPrice - exitPrice) * Math.abs(position);
        const commission = commissionPerTrade;
        const slippage = Math.abs(position) * price * slippageBps / 10000;
        equity += pnl - commission - slippage;
        
        trades.push({
          entryTime, exitTime: bar.timestamp,
          entryPrice, exitPrice,
          quantity: Math.abs(position), side: 'short',
          pnl, pnlPct: (pnl / (entryPrice * Math.abs(position))) * 100,
          commission, slippage,
        });
      }
      
      // Open long
      const qty = Math.min(getPositionSize(), maxQty);
      if (qty > 0) {
        entryPrice = applySlippage(price, 'buy', slippageBps);
        entryTime = bar.timestamp;
        entryCommission = commissionPerTrade;
        entrySlippage = qty * price * slippageBps / 10000;
        equity -= entryCommission + entrySlippage;
        position = qty;
      }
    } else if (signal === 'sell' && position >= 0) {
      // Close long if any
      if (position > 0) {
        const exitPrice = applySlippage(price, 'sell', slippageBps);
        const pnl = (exitPrice - entryPrice) * position;
        const commission = commissionPerTrade;
        const slippage = position * price * slippageBps / 10000;
        equity += pnl - commission - slippage;
        
        trades.push({
          entryTime, exitTime: bar.timestamp,
          entryPrice, exitPrice,
          quantity: position, side: 'long',
          pnl, pnlPct: (pnl / (entryPrice * position)) * 100,
          commission, slippage: entrySlippage + slippage,
        });
      }
      
      // Open short if allowed
      if (allowShort) {
        const qty = Math.min(getPositionSize(), maxQty);
        if (qty > 0) {
          entryPrice = applySlippage(price, 'sell', slippageBps);
          entryTime = bar.timestamp;
          entryCommission = commissionPerTrade;
          entrySlippage = qty * price * slippageBps / 10000;
          equity -= entryCommission + entrySlippage;
          position = -qty;
        }
      } else {
        position = 0;
      }
    }
    
    // Update equity curve (mark-to-market)
    let mtmEquity = equity;
    if (position > 0) {
      mtmEquity += (bar.close - entryPrice) * position;
    } else if (position < 0) {
      mtmEquity += (entryPrice - bar.close) * Math.abs(position);
    }
    
    equityCurve.push({ timestamp: bar.timestamp, equity: mtmEquity });
    
    // Track drawdown
    if (mtmEquity > peakEquity) peakEquity = mtmEquity;
    const dd = peakEquity - mtmEquity;
    const ddPct = (dd / peakEquity) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
    if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;
  }
  
  // Close any open position at end
  if (position !== 0) {
    const lastBar = bars[bars.length - 1];
    const exitPrice = applySlippage(lastBar.close, position > 0 ? 'sell' : 'buy', slippageBps);
    const pnl = position > 0 
      ? (exitPrice - entryPrice) * position 
      : (entryPrice - exitPrice) * Math.abs(position);
    const commission = commissionPerTrade;
    const slippage = Math.abs(position) * lastBar.close * slippageBps / 10000;
    equity += pnl - commission - slippage;
    
    trades.push({
      entryTime, exitTime: lastBar.timestamp,
      entryPrice, exitPrice,
      quantity: Math.abs(position), side: position > 0 ? 'long' : 'short',
      pnl, pnlPct: (pnl / (entryPrice * Math.abs(position))) * 100,
      commission, slippage: entrySlippage + slippage,
    });
  }
  
  const metrics = calculateMetrics({
    trades, equityCurve, initialCapital, finalEquity: equity,
    startDate: bars[0]?.timestamp, endDate: bars[bars.length - 1]?.timestamp,
    maxDrawdown, maxDrawdownPct,
  });
  
  return { equityCurve, trades, metrics, params: strategy.params };
}

function applySlippage(price: number, side: 'buy' | 'sell', slippageBps: number): number {
  const factor = slippageBps / 10000;
  return side === 'buy' ? price * (1 + factor) : price * (1 - factor);
}

function calculateMetrics(data: {
  trades: Trade[];
  equityCurve: { timestamp: number; equity: number }[];
  initialCapital: number;
  finalEquity: number;
  startDate: number;
  endDate: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
}): BacktestMetrics {
  const { trades, equityCurve, initialCapital, finalEquity, startDate, endDate, maxDrawdown, maxDrawdownPct } = data;
  
  const totalReturn = finalEquity - initialCapital;
  const totalReturnPct = (totalReturn / initialCapital) * 100;
  
  const years = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
  const cagr = years > 0 ? (Math.pow(finalEquity / initialCapital, 1 / years) - 1) * 100 : 0;
  
  // Daily returns for Sharpe/Sortino
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const ret = (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
    dailyReturns.push(ret);
  }
  
  const avgDailyReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length || 0;
  const dailyVol = Math.sqrt(dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / dailyReturns.length || 1);
  const annualVol = dailyVol * Math.sqrt(252);
  const sharpeRatio = annualVol > 0 ? (avgDailyReturn * 252) / annualVol : 0;
  
  // Sortino (downside deviation)
  const downsideReturns = dailyReturns.filter(r => r < 0);
  const downsideVol = downsideReturns.length > 0
    ? Math.sqrt(downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length) * Math.sqrt(252)
    : 0;
  const sortinoRatio = downsideVol > 0 ? (avgDailyReturn * 252) / downsideVol : 0;
  
  const calmarRatio = maxDrawdownPct > 0 ? cagr / maxDrawdownPct : 0;
  
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
  
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 0;
  const profitFactor = avgLoss > 0 ? (winningTrades.reduce((sum, t) => sum + t.pnl, 0)) / Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0)) : 0;
  const expectancy = totalTrades > 0 ? (winRate / 100 * avgWin) - ((1 - winRate / 100) * avgLoss) : 0;
  const avgTrade = totalTrades > 0 ? trades.reduce((sum, t) => sum + t.pnl, 0) / totalTrades : 0;
  
  // Consecutive wins/losses
  let maxConsecutiveWins = 0, maxConsecutiveLosses = 0, currentStreak = 0, lastWasWin = false;
  for (const t of trades) {
    const isWin = t.pnl > 0;
    if (isWin === lastWasWin) {
      currentStreak++;
    } else {
      currentStreak = 1;
      lastWasWin = isWin;
    }
    if (isWin) maxConsecutiveWins = Math.max(maxConsecutiveWins, currentStreak);
    else maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentStreak);
  }
  
  return {
    totalReturn, totalReturnPct, cagr,
    maxDrawdown, maxDrawdownPct, volatility: annualVol * 100,
    sharpeRatio, sortinoRatio, calmarRatio,
    totalTrades, winningTrades: winningTrades.length, losingTrades: losingTrades.length,
    winRate, avgWin, avgLoss, profitFactor, expectancy, avgTrade,
    maxConsecutiveWins, maxConsecutiveLosses,
    startEquity: initialCapital, endEquity: finalEquity,
    startDate, endDate,
  };
}

/**
 * Generate dummy chart data for testing (when API not available)
 */
export function generateDummyBars(symbol: string, days: number = 365): Bar[] {
  const bars: Bar[] = [];
  let price = symbol.includes('RELIANCE') ? 1278 : symbol.includes('TCS') ? 3500 : 1500;
  const now = Date.now();
  
  for (let i = days; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const change = (Math.random() - 0.5) * 0.04; // ±2% daily
    price *= (1 + change);
    const open = price * (1 + (Math.random() - 0.5) * 0.01);
    const high = Math.max(open, price) * (1 + Math.random() * 0.01);
    const low = Math.min(open, price) * (1 - Math.random() * 0.01);
    const volume = Math.floor(1000000 + Math.random() * 5000000);
    
    bars.push({ timestamp, open, high, low, close: price, volume });
  }
  return bars;
}