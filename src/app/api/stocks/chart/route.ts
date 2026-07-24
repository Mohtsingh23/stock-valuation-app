import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

// Initialize the Yahoo Finance client
const yahooFinance = new YahooFinance();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const period1 = searchParams.get('period1');
  const period2 = searchParams.get('period2');
  const interval = searchParams.get('interval') || '1d';

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const queryOptions: any = {
      interval: interval as any,
    };

    if (period1) queryOptions.period1 = parseInt(period1);
    if (period2) queryOptions.period2 = parseInt(period2);

    const chart = await yahooFinance.chart(symbol.toUpperCase(), queryOptions);

    return NextResponse.json({ chart });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
  }
}