import { NextRequest, NextResponse } from 'next/server';
import { POPULAR_INDIAN_STOCKS } from '@/lib/stock-api';

function generateMockData(symbol: string) {
  const stock = POPULAR_INDIAN_STOCKS.find(s => s.symbol === symbol);
  const basePrice = symbol.includes('RELIANCE') ? 1307.8 :
                   symbol.includes('TCS') ? 2365.6 :
                   symbol.includes('HDFC') ? 748.15 :
                   symbol.includes('INFY') ? 1130.1 :
                   symbol.includes('ICICI') ? 1435.4 :
                   100 + Math.random() * 2000;

  return {
    symbol,
    name: stock?.name || symbol.replace('.NS', ''),
    sector: stock?.sector || 'Unknown',
    currentPrice: basePrice,
    change: (Math.random() - 0.5) * 50,
    changePercent: (Math.random() - 0.5) * 5,
    marketCap: basePrice * (100 + Math.random() * 1000) * 1e5,
    peRatio: 5 + Math.random() * 50,
    pbRatio: 0.5 + Math.random() * 10,
    roe: -20 + Math.random() * 80,
    roce: -10 + Math.random() * 60,
    debtToEquity: Math.random() * 5,
    revenueGrowth: -30 + Math.random() * 80,
    profitGrowth: -50 + Math.random() * 150,
    dividendYield: Math.random() * 5,
    dividendYieldPct: Math.random() * 5,
    fiftyTwoWeekHigh: basePrice * (1 + Math.random() * 0.5),
    fiftyTwoWeekLow: basePrice * (1 - Math.random() * 0.5),
    volume: Math.random() * 50000000,
    avgVolume: Math.random() * 30000000,
    beta: -0.5 + Math.random() * 2.5,
    evToEbitda: 5 + Math.random() * 40,
    promoterHolding: 10 + Math.random() * 70,
    fiiHolding: 5 + Math.random() * 40,
    diiHolding: 5 + Math.random() * 30,
    promoterPledge: Math.random() * 40,
    profitMargin: -20 + Math.random() * 80,
    operatingMargin: -10 + Math.random() * 60,
    faceValue: [1, 2, 5, 10][Math.floor(Math.random() * 4)],
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filters, page = 1, pageSize = 20, sortKey = 'marketCap', sortDirection = 'desc' } = body;

    // Generate mock data for all stocks
    let results = POPULAR_INDIAN_STOCKS.map(s => generateMockData(s.symbol));

    // Apply filters
    if (filters) {
      results = results.filter(stock => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value) return true;
          const stockValue = (stock as any)[key];
          if (stockValue === undefined || stockValue === null) return false;
          
          if (typeof value === 'object' && value !== null) {
            const v = value as { min?: number; max?: number };
            if (v.min !== undefined && stockValue < v.min) return false;
            if (v.max !== undefined && stockValue > v.max) return false;
            return true;
          }
          return stockValue === value;
        });
      });
    }

    // Sort
    results.sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];
      if (aVal === undefined || bVal === undefined) return 0;
      const dir = sortDirection === 'asc' ? 1 : -1;
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });

    // Paginate
    const start = (page - 1) * pageSize;
    const paginated = results.slice(start, start + pageSize);

    return Response.json({
      results: paginated,
      total: results.length,
      page,
      pageSize,
      totalPages: Math.ceil(results.length / pageSize),
    });
  } catch (error) {
    console.error('Screener error:', error);
    return Response.json({ error: 'Failed to screen stocks' }, { status: 500 });
  }
}