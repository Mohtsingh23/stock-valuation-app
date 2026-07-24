import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { calculateDCF, calculateRelativeValuation, calculateConsensus, ValuationInputs } from '@/lib/valuation';

// Initialize the Yahoo Finance client
const yahooFinance = new YahooFinance();

type NumericFields = Record<string, number | undefined>;
type ValuationQuote = NumericFields & { symbol?: string; shortName?: string; longName?: string; currency?: string };
type ValuationSummary = {
  financialData?: NumericFields; defaultKeyStatistics?: NumericFields; summaryDetail?: NumericFields;
  summaryProfile?: { sector?: string; industry?: string; website?: string; fullTimeEmployees?: number; longBusinessSummary?: string };
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    // Fetch quote and financial data
    const [quoteResult, summaryResult] = await Promise.all([
      yahooFinance.quote(symbol.toUpperCase()),
      yahooFinance.quoteSummary(symbol.toUpperCase(), {
        modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics', 'summaryProfile', 'incomeStatementHistory', 'balanceSheetHistory', 'cashflowStatementHistory']
      })
    ]);
    const quote = quoteResult as unknown as ValuationQuote;
    const summary = summaryResult as unknown as ValuationSummary;

    const financialData = summary.financialData;
    const keyStats = summary.defaultKeyStatistics;
    const summaryDetail = summary.summaryDetail;
    const profile = summary.summaryProfile;

    // Extract financial data for DCF
    const revenue = financialData?.totalRevenue || keyStats?.totalRevenue || 0;
    const ebitda = financialData?.ebitda || 0;
    const ebitdaMargin = revenue > 0 ? (ebitda / revenue) * 100 : 15; // Default 15% if not available
    const netIncome = financialData?.netIncomeToCommon || 0;
    const sharesOutstanding = keyStats?.sharesOutstanding || quote.sharesOutstanding || 1;
    const netDebt = (keyStats?.totalDebt || 0) - (keyStats?.totalCash || 0);
    const currentPrice = quote.regularMarketPrice || 0;
    const peRatio = quote.trailingPE || summaryDetail?.trailingPE;
    const forwardPE = quote.forwardPE || summaryDetail?.forwardPE;
    const pbRatio = keyStats?.priceToBook || summaryDetail?.priceToBook;
    const evEbitda = keyStats?.enterpriseToEbitda || summaryDetail?.enterpriseToEbitda;
    const dividendYield = quote.dividendYield || summaryDetail?.dividendYield;
    const beta = quote.beta || 1;

    // Calculate WACC for Indian market context
    const riskFreeRate = 7.0; // 10-year Indian govt bond ~7%
    const marketRiskPremium = 7.5; // India equity risk premium ~7.5%
    const wacc = riskFreeRate + beta * marketRiskPremium;

    // Default assumptions for Indian market
    const revenueGrowth = keyStats?.revenueGrowth ? keyStats.revenueGrowth * 100 : 12; // Default 12% for Indian growth companies
    const taxRate = 25.17; // Indian corporate tax rate ~25.17%
    const capexToRevenue = 5; // Typical capex/revenue for Indian companies
    const workingCapitalToRevenue = 10; // Typical working capital/revenue
    const terminalGrowth = 5; // Long-term GDP growth for India

    const valuationInputs: ValuationInputs = {
      revenue,
      revenueGrowth,
      ebitdaMargin,
      taxRate,
      capexToRevenue,
      workingCapitalToRevenue,
      wacc,
      terminalGrowth,
      sharesOutstanding,
      netDebt,
      currentPrice,
      peRatio,
      forwardPE,
      pbRatio,
      evEbitda,
      dividendYield: dividendYield ? dividendYield * 100 : undefined,
      dividendGrowth: 10, // Assume 10% dividend growth for Indian companies
    };

    // Calculate valuations
    const dcf = calculateDCF(valuationInputs);
    const relative = calculateRelativeValuation(valuationInputs, currentPrice);
    const consensus = calculateConsensus(dcf, relative);

    return NextResponse.json({
      symbol: quote.symbol,
      name: quote.shortName || quote.longName,
      currentPrice,
      currency: quote.currency,
      financials: {
        revenue,
        ebitda,
        ebitdaMargin,
        netIncome,
        sharesOutstanding,
        netDebt,
        beta,
        peRatio,
        forwardPE,
        pbRatio,
        evEbitda,
        dividendYield: dividendYield ? dividendYield * 100 : null,
      },
      assumptions: {
        revenueGrowth,
        wacc,
        terminalGrowth,
        taxRate,
        capexToRevenue,
        workingCapitalToRevenue,
        riskFreeRate,
        marketRiskPremium,
      },
      valuation: {
        dcf,
        relative,
        consensus,
      },
      profile: {
        sector: profile?.sector,
        industry: profile?.industry,
        website: profile?.website,
        employees: profile?.fullTimeEmployees,
        description: profile?.longBusinessSummary,
      }
    });
  } catch (error) {
    console.error('Error calculating valuation:', error);
    return NextResponse.json({ error: 'Failed to calculate valuation' }, { status: 500 });
  }
}
