import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

// Initialize the Yahoo Finance client
const yahooFinance = new YahooFinance();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const summary = await yahooFinance.quoteSummary(symbol.toUpperCase(), {
      modules: [
        'summaryDetail',
        'financialData',
        'defaultKeyStatistics',
        'summaryProfile',
        'incomeStatementHistory',
        'balanceSheetHistory',
        'cashflowStatementHistory'
      ]
    }) as unknown as Record<string, unknown>;

    return NextResponse.json({
      financialData: summary.financialData,
      keyStats: summary.defaultKeyStatistics,
      summaryDetail: summary.summaryDetail,
      profile: summary.summaryProfile,
      incomeStatement: summary.incomeStatementHistory,
      balanceSheet: summary.balanceSheetHistory,
      cashFlow: summary.cashflowStatementHistory,
    });
  } catch (error) {
    console.error('Error fetching stock details:', error);
    return NextResponse.json({ error: 'Failed to fetch stock details' }, { status: 500 });
  }
}
