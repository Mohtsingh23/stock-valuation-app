import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { runBacktest, BacktestConfig, builtInStrategies, generateDummyBars } from '@/lib/backtest';

const yahooFinance = new YahooFinance();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      symbol,
      strategyId,
      params,
      from,
      to,
      initialCapital = 1000000, // 10L INR
      commissionPerTrade = 20, // ₹20 per trade
      slippageBps = 5, // 5 basis points
      positionSize = 'percent',
      positionSizeValue = 10, // 10% of equity per trade
      allowShort = false,
      maxPositionSize = 20,
    } = body;

    if (!symbol || !strategyId) {
      return NextResponse.json({ error: 'Symbol and strategyId are required' }, { status: 400 });
    }

    const strategy = builtInStrategies[strategyId];
    if (!strategy) {
      return NextResponse.json({ error: 'Invalid strategy' }, { status: 400 });
    }

    // Merge params with defaults
    const mergedParams = { ...strategy.params, ...params };
    const strategyWithParams = { ...strategy, params: mergedParams };

    // Fetch historical data
    let bars: any[] = [];
    const period1 = from ? Math.floor(new Date(from).getTime() / 1000) : Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000);
    const period2 = to ? Math.floor(new Date(to).getTime() / 1000) : Math.floor(Date.now() / 1000);

    try {
      const chart = await yahooFinance.chart(symbol.toUpperCase(), {
        period1,
        period2,
        interval: '1d',
      });

      if (chart.quotes && chart.quotes.length > 0) {
        bars = chart.quotes
          .filter((q: any) => q.close != null && q.volume != null)
          .map((q: any) => ({
            timestamp: q.date * 1000,
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume,
          }));
      }
    } catch (apiError) {
      console.warn('Yahoo Finance API failed, using dummy data:', apiError);
      // Fallback to dummy data for development
      bars = generateDummyBars(symbol, Math.floor((period2 - period1) / (24 * 60 * 60)));
    }

    if (bars.length < 50) {
      return NextResponse.json({ error: 'Insufficient historical data' }, { status: 400 });
    }

    // Run backtest
    const config: BacktestConfig = {
      symbol,
      bars,
      strategy: strategyWithParams,
      initialCapital,
      commissionPerTrade,
      slippageBps,
      positionSize,
      positionSizeValue,
      allowShort,
      maxPositionSize,
    };

    const result = runBacktest(config);

    return NextResponse.json({
      success: true,
      symbol,
      strategy: strategyId,
      params: mergedParams,
      dataPoints: bars.length,
      dateRange: {
        from: bars[0].timestamp,
        to: bars[bars.length - 1].timestamp,
      },
      ...result,
    });
  } catch (error) {
    console.error('Backtest error:', error);
    return NextResponse.json({ error: 'Backtest failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Return available strategies
  const strategies = Object.entries(builtInStrategies).map(([id, s]) => ({
    id,
    name: s.name,
    description: s.description,
    params: s.params,
    paramSchema: s.paramSchema,
  }));

  return NextResponse.json({ strategies });
}