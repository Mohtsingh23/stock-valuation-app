import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { 
  createPaperTradingState, 
  executePaperTrade, 
  closeAllPositions,
  getStrategySignal,
  PaperTradingState,
  PaperTrade,
  PaperPosition 
} from '@/lib/paper-trading';

const yahooFinance = new YahooFinance();

// In-memory store for paper trading sessions (use Redis in production)
const paperTradingSessions: Map<string, PaperTradingState> = new Map();

function generateSessionId(): string {
  return `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function fetchLatestBar(symbol: string): Promise<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number } | null> {
  try {
    // Fetch last 30 days to ensure we get the latest available bar
    // Use a fixed recent date range that Yahoo Finance definitely has data for
    const now = Math.floor(Date.now() / 1000);
    const period1 = now - 30 * 24 * 60 * 60; // 30 days ago
    const period2 = now;
    
    const chart = await yahooFinance.chart(symbol.toUpperCase(), {
      period1,
      period2,
      interval: '1d',
    });
    
    if (chart.quotes && chart.quotes.length > 0) {
      // Find the last quote with valid close price
      for (let i = chart.quotes.length - 1; i >= 0; i--) {
        const q = chart.quotes[i];
        if (q.close != null && q.date != null) {
          return {
            timestamp: q.date * 1000,
            open: q.open ?? q.close,
            high: q.high ?? q.close,
            low: q.low ?? q.close,
            close: q.close,
            volume: q.volume || 0,
          };
        }
      }
    }
  } catch (error) {
    console.error('Error fetching latest bar:', error);
  }
  return null;
}

async function fetchRecentBars(symbol: string, days: number = 100): Promise<any[]> {
  try {
    const chart = await yahooFinance.chart(symbol.toUpperCase(), {
      period1: Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000),
      period2: Math.floor(Date.now() / 1000),
      interval: '1d',
    });
    
    if (chart.quotes && chart.quotes.length > 0) {
      return chart.quotes
        .filter((q: any) => q.close != null)
        .map((q: any) => ({
          timestamp: q.date * 1000,
          open: q.open,
          high: q.high,
          low: q.low,
          close: q.close,
          volume: q.volume || 0,
        }));
    }
  } catch (error) {
    console.error('Error fetching recent bars:', error);
  }
  return [];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, ...config } = body;

    switch (action) {
      case 'start': {
        const {
          symbol,
          strategyId,
          params,
          initialCapital = 100000, // 1 Lakh
          commissionPerTrade = 20,
          slippageBps = 5,
          positionSize = 'percent',
          positionSizeValue = 10,
          allowShort = false,
          maxPositionSize = 20,
        } = config;

        if (!symbol || !strategyId) {
          return NextResponse.json({ error: 'Symbol and strategyId required' }, { status: 400 });
        }

        // Fetch initial historical data for signal calculation
        const bars = await fetchRecentBars(symbol, 100);
        if (bars.length < 50) {
          return NextResponse.json({ error: 'Insufficient historical data' }, { status: 400 });
        }

        const sessionId = generateSessionId();
        const state = createPaperTradingState({
          symbol,
          strategyId,
          params: params || {},
          initialCapital,
          commissionPerTrade,
          slippageBps,
          positionSize,
          positionSizeValue,
          allowShort,
          maxPositionSize,
        });

        state.isRunning = true;
        state.startedAt = Date.now();
        
        paperTradingSessions.set(sessionId, state);

        // Get initial signal and execute if needed
        const currentPosition = state.positions.find(p => p.symbol === symbol);
        const positionQty = currentPosition ? (currentPosition.side === 'long' ? currentPosition.quantity : -currentPosition.quantity) : 0;
        const signal = getStrategySignal(strategyId, bars, params || {}, positionQty);
        
        let newState = state;
        if (signal !== 'hold') {
          const latestBar = bars[bars.length - 1];
          newState = executePaperTrade(state, signal, latestBar);
        }
        
        paperTradingSessions.set(sessionId, newState);

        return NextResponse.json({ 
          success: true, 
          sessionId,
          state: serializeState(newState),
        });
      }

      case 'tick': {
        if (!sessionId) {
          return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        const state = paperTradingSessions.get(sessionId);
        if (!state) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        if (!state.isRunning) {
          return NextResponse.json({ error: 'Session not running' }, { status: 400 });
        }

        // Fetch latest bar
        const latestBar = await fetchLatestBar(state.symbol);
        if (!latestBar) {
          return NextResponse.json({ error: 'Failed to fetch latest data' }, { status: 500 });
        }

        // Fetch recent bars for signal calculation
        const bars = await fetchRecentBars(state.symbol, 100);
        if (bars.length < 50) {
          return NextResponse.json({ error: 'Insufficient data for signal' }, { status: 500 });
        }

        // Get signal
        const currentPosition = state.positions.find(p => p.symbol === state.symbol);
        const positionQty = currentPosition ? (currentPosition.side === 'long' ? currentPosition.quantity : -currentPosition.quantity) : 0;
        const signal = getStrategySignal(state.strategyId, bars, state.params, positionQty);

        // Execute if signal
        let newState = state;
        if (signal !== 'hold') {
          newState = executePaperTrade(state, signal, latestBar);
        } else {
          // Just update positions with latest price
          newState = { ...state };
          newState.positions = newState.positions.map(pos => {
            const currentPrice = latestBar.close;
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
          
          const unrealizedTotal = newState.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
          newState.currentCapital = newState.availableCapital + unrealizedTotal;
          newState.equityCurve.push({ timestamp: latestBar.timestamp, equity: newState.currentCapital });
        }

        newState.lastUpdate = Date.now();
        paperTradingSessions.set(sessionId, newState);

        return NextResponse.json({ 
          success: true, 
          state: serializeState(newState),
          signal,
        });
      }

      case 'stop': {
        if (!sessionId) {
          return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        const state = paperTradingSessions.get(sessionId);
        if (!state) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Fetch latest bar to close positions
        const latestBar = await fetchLatestBar(state.symbol);
        if (latestBar) {
          const newState = closeAllPositions(state, latestBar);
          newState.isRunning = false;
          paperTradingSessions.set(sessionId, newState);
          return NextResponse.json({ 
            success: true, 
            state: serializeState(newState),
          });
        }

        return NextResponse.json({ error: 'Failed to fetch latest data for closing' }, { status: 500 });
      }

      case 'get': {
        if (!sessionId) {
          return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        const state = paperTradingSessions.get(sessionId);
        if (!state) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        return NextResponse.json({ 
          success: true, 
          state: serializeState(state),
        });
      }

      case 'list': {
        const sessions = Array.from(paperTradingSessions.entries()).map(([id, state]) => ({
          sessionId: id,
          symbol: state.symbol,
          strategyId: state.strategyId,
          isRunning: state.isRunning,
          initialCapital: state.initialCapital,
          currentCapital: state.currentCapital,
          totalReturn: state.currentCapital - state.initialCapital,
          totalReturnPct: ((state.currentCapital - state.initialCapital) / state.initialCapital) * 100,
          startedAt: state.startedAt,
          lastUpdate: state.lastUpdate,
        }));

        return NextResponse.json({ sessions });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Paper trading error:', error);
    return NextResponse.json({ error: 'Paper trading failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');

  if (sessionId) {
    const state = paperTradingSessions.get(sessionId);
    if (!state) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, state: serializeState(state) });
  }

  // List all sessions
  const sessions = Array.from(paperTradingSessions.entries()).map(([id, state]) => ({
    sessionId: id,
    symbol: state.symbol,
    strategyId: state.strategyId,
    isRunning: state.isRunning,
    initialCapital: state.initialCapital,
    currentCapital: state.currentCapital,
    totalReturn: state.currentCapital - state.initialCapital,
    totalReturnPct: ((state.currentCapital - state.initialCapital) / state.initialCapital) * 100,
    startedAt: state.startedAt,
    lastUpdate: state.lastUpdate,
  }));

  return NextResponse.json({ sessions });
}

function serializeState(state: PaperTradingState) {
  return {
    initialCapital: state.initialCapital,
    currentCapital: state.currentCapital,
    availableCapital: state.availableCapital,
    positions: state.positions,
    trades: state.trades,
    equityCurve: state.equityCurve.slice(-500), // Limit for response size
    strategyId: state.strategyId,
    params: state.params,
    symbol: state.symbol,
    isRunning: state.isRunning,
    startedAt: state.startedAt,
    lastUpdate: state.lastUpdate,
    commissionPerTrade: state.commissionPerTrade,
    slippageBps: state.slippageBps,
    positionSize: state.positionSize,
    positionSizeValue: state.positionSizeValue,
    allowShort: state.allowShort,
    maxPositionSize: state.maxPositionSize,
  };
}