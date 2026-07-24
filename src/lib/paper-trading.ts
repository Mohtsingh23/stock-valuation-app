/**
 * Paper Trading Engine
 * Runs strategies in real-time with virtual money
 */

import { Bar, Strategy, builtInStrategies, StrategyParams } from './backtest';

export interface PaperTrade {
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

export interface PaperPosition {
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

export interface PaperTradingState {
  initialCapital: number;
  currentCapital: number;
  availableCapital: number;
  positions: PaperPosition[];
  trades: PaperTrade[];
  equityCurve: { timestamp: number; equity: number }[];
  strategyId: string;
  params: StrategyParams;
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

export function getStrategySignal(
  strategyId: string,
  bars: Bar[],
  params: StrategyParams,
  currentPosition: number
): 'buy' | 'sell' | 'hold' {
  const strategy = builtInStrategies[strategyId];
  if (!strategy) return 'hold';

  const ctx = {
    bars,
    currentIndex: bars.length - 1,
    currentBar: bars[bars.length - 1],
    position: currentPosition,
    equity: 0,
    params,
  };

  return strategy.onBar(ctx);
}

export function applySlippage(price: number, side: 'buy' | 'sell', slippageBps: number): number {
  const factor = slippageBps / 10000;
  return side === 'buy' ? price * (1 + factor) : price * (1 - factor);
}

export function calculatePositionSize(
  equity: number,
  price: number,
  positionSize: 'percent' | 'fixed',
  positionSizeValue: number,
  maxPositionSize: number
): number {
  if (positionSize === 'fixed') return positionSizeValue;
  if (positionSize === 'percent') return Math.floor((equity * positionSizeValue / 100) / price);
  return Math.floor((equity * 0.1) / price);
}

export function createPaperTradingState(config: {
  symbol: string;
  strategyId: string;
  params: StrategyParams;
  initialCapital: number;
  commissionPerTrade: number;
  slippageBps: number;
  positionSize: 'percent' | 'fixed';
  positionSizeValue: number;
  allowShort: boolean;
  maxPositionSize: number;
}): PaperTradingState {
  return {
    initialCapital: config.initialCapital,
    currentCapital: config.initialCapital,
    availableCapital: config.initialCapital,
    positions: [],
    trades: [],
    equityCurve: [{ timestamp: Date.now(), equity: config.initialCapital }],
    strategyId: config.strategyId,
    params: config.params,
    symbol: config.symbol,
    isRunning: false,
    startedAt: 0,
    lastUpdate: 0,
    commissionPerTrade: config.commissionPerTrade,
    slippageBps: config.slippageBps,
    positionSize: config.positionSize,
    positionSizeValue: config.positionSizeValue,
    allowShort: config.allowShort,
    maxPositionSize: config.maxPositionSize,
  };
}

export function processPaperTradingTick(
  state: PaperTradingState,
  newBar: Bar
): PaperTradingState {
  const newState = { ...state };
  newState.lastUpdate = newBar.timestamp;
  
  // Update positions with current price
  newState.positions = newState.positions.map(pos => {
    const currentPrice = newBar.close;
    let unrealizedPnl = 0;
    if (pos.side === 'long') {
      unrealizedPnl = (currentPrice - pos.entryPrice) * pos.quantity;
    } else {
      unrealizedPnl = (pos.entryPrice - currentPrice) * pos.quantity;
    }
    return {
      ...pos,
      currentPrice,
      unrealizedPnl,
      unrealizedPnlPct: (unrealizedPnl / (pos.entryPrice * pos.quantity)) * 100,
    };
  });

  // Calculate current equity
  const unrealizedTotal = newState.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  newState.currentCapital = newState.availableCapital + unrealizedTotal;
  newState.equityCurve.push({ timestamp: newBar.timestamp, equity: newState.currentCapital });

  // Check for exit signals on existing positions
  const barsForSignal = [...state.positions.length > 0 ? [] : []]; // We need full bar history
  
  // Get signal from strategy
  // For paper trading, we need the full bar history - this should come from outside
  // This function just processes a single tick, signal logic is handled externally
  
  return newState;
}

export function executePaperTrade(
  state: PaperTradingState,
  signal: 'buy' | 'sell',
  bar: Bar
): PaperTradingState {
  const newState = { ...state };
  const price = bar.close;
  const slippagePrice = applySlippage(price, signal === 'buy' ? 'buy' : 'sell', newState.slippageBps);
  const commission = newState.commissionPerTrade;

  // Find existing position for this symbol
  const existingPosIndex = newState.positions.findIndex(p => p.symbol === newState.symbol);
  const existingPos = existingPosIndex >= 0 ? newState.positions[existingPosIndex] : null;
  const currentPosition = existingPos ? (existingPos.side === 'long' ? existingPos.quantity : -existingPos.quantity) : 0;

  if (signal === 'buy' && currentPosition <= 0) {
    // Close short if exists
    if (existingPos && existingPos.side === 'short') {
      const exitPrice = applySlippage(price, 'buy', newState.slippageBps);
      const pnl = (existingPos.entryPrice - exitPrice) * existingPos.quantity;
      const slippage = existingPos.quantity * price * newState.slippageBps / 10000;
      newState.availableCapital += pnl - commission - slippage;
      
      const closedTrade: PaperTrade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol: newState.symbol,
        side: 'short',
        entryPrice: existingPos.entryPrice,
        entryTime: existingPos.entryTime,
        quantity: existingPos.quantity,
        strategyId: newState.strategyId,
        status: 'closed',
        exitPrice,
        exitTime: bar.timestamp,
        pnl,
        pnlPct: (pnl / (existingPos.entryPrice * existingPos.quantity)) * 100,
        commission,
        slippage,
      };
      newState.trades.push(closedTrade);
    }

    // Open long
    const maxQty = Math.floor((newState.currentCapital * newState.maxPositionSize / 100) / price);
    const qty = Math.min(
      calculatePositionSize(newState.currentCapital, price, newState.positionSize, newState.positionSizeValue, newState.maxPositionSize),
      maxQty
    );
    
    if (qty > 0 && newState.availableCapital >= qty * slippagePrice + commission) {
      const entryPrice = slippagePrice;
      const cost = qty * entryPrice + commission;
      newState.availableCapital -= cost;
      
      const newPosition: PaperPosition = {
        symbol: newState.symbol,
        side: 'long',
        quantity: qty,
        entryPrice,
        entryTime: bar.timestamp,
        currentPrice: price,
        unrealizedPnl: 0,
        unrealizedPnlPct: 0,
        strategyId: newState.strategyId,
      };
      
      newState.positions = [...newState.positions.filter(p => p.symbol !== newState.symbol), newPosition];
    }
  } else if (signal === 'sell' && currentPosition >= 0) {
    // Close long if exists
    if (existingPos && existingPos.side === 'long') {
      const exitPrice = applySlippage(price, 'sell', newState.slippageBps);
      const pnl = (exitPrice - existingPos.entryPrice) * existingPos.quantity;
      const slippage = existingPos.quantity * price * newState.slippageBps / 10000;
      newState.availableCapital += pnl - commission - slippage;
      
      const closedTrade: PaperTrade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol: newState.symbol,
        side: 'long',
        entryPrice: existingPos.entryPrice,
        entryTime: existingPos.entryTime,
        quantity: existingPos.quantity,
        strategyId: newState.strategyId,
        status: 'closed',
        exitPrice,
        exitTime: bar.timestamp,
        pnl,
        pnlPct: (pnl / (existingPos.entryPrice * existingPos.quantity)) * 100,
        commission,
        slippage,
      };
      newState.trades.push(closedTrade);
    }

    // Open short if allowed
    if (newState.allowShort) {
      const maxQty = Math.floor((newState.currentCapital * newState.maxPositionSize / 100) / price);
      const qty = Math.min(
        calculatePositionSize(newState.currentCapital, price, newState.positionSize, newState.positionSizeValue, newState.maxPositionSize),
        maxQty
      );
      
      if (qty > 0 && newState.availableCapital >= commission) {
        const entryPrice = slippagePrice;
        newState.availableCapital -= commission;
        
        const newPosition: PaperPosition = {
          symbol: newState.symbol,
          side: 'short',
          quantity: qty,
          entryPrice,
          entryTime: bar.timestamp,
          currentPrice: price,
          unrealizedPnl: 0,
          unrealizedPnlPct: 0,
          strategyId: newState.strategyId,
        };
        
        newState.positions = [...newState.positions.filter(p => p.symbol !== newState.symbol), newPosition];
      }
    } else {
      // Just close long, don't open short
      newState.positions = newState.positions.filter(p => p.symbol !== newState.symbol);
    }
  }

  // Recalculate equity
  const unrealizedTotal = newState.positions.reduce((sum, p) => {
    if (p.side === 'long') return sum + (p.currentPrice - p.entryPrice) * p.quantity;
    return sum + (p.entryPrice - p.currentPrice) * p.quantity;
  }, 0);
  newState.currentCapital = newState.availableCapital + unrealizedTotal;

  return newState;
}

export function closeAllPositions(state: PaperTradingState, bar: Bar): PaperTradingState {
  let newState = { ...state };
  
  for (const pos of newState.positions) {
    const exitPrice = applySlippage(bar.close, pos.side === 'long' ? 'sell' : 'buy', newState.slippageBps);
    const pnl = pos.side === 'long' 
      ? (exitPrice - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - exitPrice) * pos.quantity;
    const slippage = pos.quantity * bar.close * newState.slippageBps / 10000;
    newState.availableCapital += pnl - newState.commissionPerTrade - slippage;
    
    const closedTrade: PaperTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: newState.symbol,
      side: pos.side,
      entryPrice: pos.entryPrice,
      entryTime: pos.entryTime,
      quantity: pos.quantity,
      strategyId: newState.strategyId,
      status: 'closed',
      exitPrice,
      exitTime: bar.timestamp,
      pnl,
      pnlPct: (pnl / (pos.entryPrice * pos.quantity)) * 100,
      commission: newState.commissionPerTrade,
      slippage,
    };
    newState.trades.push(closedTrade);
  }
  
  newState.positions = [];
  newState.currentCapital = newState.availableCapital;
  newState.equityCurve.push({ timestamp: bar.timestamp, equity: newState.currentCapital });
  
  return newState;
}