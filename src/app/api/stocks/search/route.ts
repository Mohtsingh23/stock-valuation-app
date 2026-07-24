import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

type SearchQuote = { symbol?: string; shortname?: string; longname?: string; exchange?: string; quoteType?: string };
type SearchResult = { quotes: SearchQuote[] };

// Initialize the Yahoo Finance client
const yahooFinance = new YahooFinance();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const results = await yahooFinance.search(q, {
      quotesCount: 15,
      newsCount: 0,
    }) as unknown as SearchResult;

    const indianStocks = results.quotes
      .filter((quote) => 
        quote.symbol && (
          quote.symbol.endsWith('.NS') || 
          quote.symbol.endsWith('.BO') ||
          quote.exchange === 'NSE' || 
          quote.exchange === 'BSE' ||
          quote.exchange === 'NSEI'
        )
      )
      .map((quote) => ({
        symbol: quote.symbol,
        name: quote.shortname || quote.longname || quote.symbol,
        exchange: quote.exchange || 'NSE',
        type: quote.quoteType || 'EQUITY',
      }))
      .slice(0, 10);

    return NextResponse.json({ results: indianStocks });
  } catch (error) {
    console.error('Error searching stocks:', error);
    return NextResponse.json({ error: 'Failed to search stocks' }, { status: 500 });
  }
}
