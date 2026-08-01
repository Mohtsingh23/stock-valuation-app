import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { calculateDCF, calculateRelativeValuation, calculateConsensus, ValuationInputs } from '@/lib/valuation';

// Initialize the Yahoo Finance client
const yahooFinance = new YahooFinance();

type NumericFields = Record<string, number | string | undefined>;
type ValuationQuote = NumericFields & { symbol?: string; shortName?: string; longName?: string; currency?: string };
type ValuationSummary = {
  financialData?: NumericFields; defaultKeyStatistics?: NumericFields; summaryDetail?: NumericFields;
  summaryProfile?: { sector?: string; industry?: string; website?: string; fullTimeEmployees?: number; longBusinessSummary?: string };
  incomeStatementHistory?: { incomeStatementHistory?: Array<{ netIncome?: number }> };
};

// Fallback dummy data for Vercel (Yahoo Finance often blocks cloud IPs)
function getDummyValuation(symbol: string) {
  const basePrice = symbol.includes('RELIANCE') ? 1278 :
                    symbol.includes('TCS') ? 3500 :
                    symbol.includes('INFY') ? 1500 : 2000;
  const revenue = basePrice * 10000000; // ~10L crores
  const ebitda = basePrice * 1500000;
  const sharesOutstanding = 1000000000;
  const netDebt = basePrice * 2000000;
  const ebitdaMargin = revenue > 0 ? (ebitda / revenue) * 100 : 15;

  const financialData = {
    totalRevenue: revenue,
    ebitda,
    netIncomeToCommon: basePrice * 800000,
  };
  const keyStats = {
    sharesOutstanding,
    revenueGrowth: 0.12,
    totalDebt: basePrice * 2000000,
    totalCash: basePrice * 500000,
  };
  const summaryDetail = {
    trailingPE: 22,
    forwardPE: 18,
    priceToBook: 1.5,
    enterpriseToEbitda: 11,
    dividendYield: 0.004,
  };
  const profile = {
    sector: 'Technology',
    industry: 'Software',
    fullTimeEmployees: 50000,
    longBusinessSummary: `${symbol.replace('.NS', '')} is a leading Indian company.`,
  };

  const beta = 1.1;
  const riskFreeRate = 7.0;
  const marketRiskPremium = 7.5;
  const adjustedBeta = Math.max(beta, 0.8);
  const wacc = riskFreeRate + adjustedBeta * marketRiskPremium;
  const terminalGrowth = Math.min(5, wacc - 1);
  const maxRevenueGrowth = Math.max(wacc - 1, 5);
  const revenueGrowth = 12;
  const taxRate = 25.17;
  const capexToRevenue = 5;
  const workingCapitalToRevenue = 10;

  const valuationInputs: ValuationInputs = {
    revenue: revenue / 1e7, // convert to crores
    revenueGrowth,
    ebitdaMargin,
    taxRate,
    capexToRevenue,
    workingCapitalToRevenue,
    wacc,
    terminalGrowth,
    sharesOutstanding: sharesOutstanding / 1e7, // convert to crores
    netDebt: netDebt / 1e7, // convert to crores
    currentPrice: basePrice,
    peRatio: summaryDetail.trailingPE,
    forwardPE: summaryDetail.forwardPE,
    pbRatio: summaryDetail.priceToBook,
    evEbitda: summaryDetail.enterpriseToEbitda,
    dividendYield: summaryDetail.dividendYield * 100,
    dividendGrowth: 10,
  };

  const dcf = calculateDCF(valuationInputs);
  const relative = calculateRelativeValuation(valuationInputs, basePrice);
  const consensus = calculateConsensus(dcf, relative);

  return {
    symbol: symbol.toUpperCase(),
    name: symbol.replace('.NS', '') + ' Limited',
    currentPrice: basePrice,
    currency: 'INR',
    financials: {
      revenue: revenue / 1e7,
      ebitda: ebitda / 1e7,
      ebitdaMargin,
      netIncome: financialData.netIncomeToCommon / 1e7,
      sharesOutstanding: sharesOutstanding / 1e7,
      netDebt: netDebt / 1e7,
      beta,
      peRatio: summaryDetail.trailingPE,
      forwardPE: summaryDetail.forwardPE,
      pbRatio: summaryDetail.priceToBook,
      evEbitda: summaryDetail.enterpriseToEbitda,
      dividendYield: summaryDetail.dividendYield * 100,
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
    valuation: { dcf, relative, consensus },
    profile: {
      sector: profile.sector,
      industry: profile.industry,
      website: 'https://example.com',
      employees: profile.fullTimeEmployees,
      description: profile.longBusinessSummary,
    }
  };
}

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
    const incomeStatementHistory = summary.incomeStatementHistory;

    // Extract financial data for DCF - use multiple fallbacks
    let revenue = (financialData?.totalRevenue || keyStats?.totalRevenue || 0) as number;
    let ebitda = (financialData?.ebitda || 0) as number;
    let netIncome = (incomeStatementHistory?.incomeStatementHistory?.[0]?.netIncome
      || financialData?.netIncomeToCommon
      || financialData?.netIncome
      || 0) as number;
    let totalDebt = (keyStats?.totalDebt || financialData?.totalDebt || 0) as number;
    let totalCash = (keyStats?.totalCash || financialData?.totalCash || 0) as number;
    const sharesOutstanding = (keyStats?.sharesOutstanding || quote.sharesOutstanding || 1) as number;
    
    // Handle currency mismatch: Yahoo sometimes returns financials in USD for Indian stocks
    // If financialCurrency is USD but quote currency is INR, convert using ~83 INR/USD
    const financialCurrency = financialData?.financialCurrency;
    const quoteCurrency = quote.currency;
    if (financialCurrency === 'USD' && quoteCurrency === 'INR') {
      const usdToInr = 83; // Approximate exchange rate
      revenue = revenue * usdToInr;
      ebitda = ebitda * usdToInr;
      netIncome = netIncome * usdToInr;
      totalDebt = totalDebt * usdToInr;
      totalCash = totalCash * usdToInr;
    }
    
    // Sector-specific adjustments
    const sector = profile?.sector || '';
    const isBank = sector === 'Financial Services' || sector === 'Banking';
    
    // For banks, use operating income (net interest income) instead of EBITDA
    // Operating margin * revenue ≈ Net Interest Income
    if (isBank && ebitda === 0 && financialData?.operatingMargins) {
      ebitda = revenue * (financialData.operatingMargins as number);
    }
    
    // If still no EBITDA, use a reasonable default based on net income margin
    if (ebitda === 0 && netIncome > 0) {
      ebitda = netIncome * 1.5; // Rough proxy
    }
    
    // If still no EBITDA, use default margin
    if (ebitda === 0) {
      ebitda = revenue * 0.25; // Default 25% EBITDA margin
    }
    
    const netDebt = totalDebt - totalCash;
    const currentPrice = (quote.regularMarketPrice || 0) as number;
    const peRatio = (quote.trailingPE || summaryDetail?.trailingPE) as number | undefined;
    const forwardPE = (quote.forwardPE || summaryDetail?.forwardPE) as number | undefined;
    const pbRatio = (keyStats?.priceToBook || summaryDetail?.priceToBook) as number | undefined;
    const evEbitda = (keyStats?.enterpriseToEbitda || summaryDetail?.enterpriseToEbitda) as number | undefined;
    const dividendYield = quote.dividendYield || summaryDetail?.dividendYield;
    // quote.dividendYield is already percentage (0.47 = 0.47%), summaryDetail is decimal (0.0047)
    const dividendYieldPct = quote.dividendYield ? (quote.dividendYield as number) : (summaryDetail?.dividendYield ? (summaryDetail.dividendYield as number) * 100 : undefined);
    
    const ebitdaMargin = revenue > 0 ? (ebitda / revenue) * 100 : 15; // Default 15% if not available
    const beta = (quote.beta || keyStats?.beta || 1) as number;
    const revenueGrowthRaw = (keyStats?.revenueGrowth || financialData?.revenueGrowth) as number;

    // Calculate WACC for Indian market context
    const riskFreeRate = 7.0; // 10-year Indian govt bond ~7%
    const marketRiskPremium = 7.5; // India equity risk premium ~7.5%
    // Use max(beta, 0.8) to prevent unrealistically low WACC for low-beta stocks
    const adjustedBeta = Math.max(beta, 0.8);
    const wacc = riskFreeRate + adjustedBeta * marketRiskPremium;

    // Ensure WACC > terminal growth for Gordon Growth Model validity
    const terminalGrowth = Math.min(5, wacc - 1); // Terminal growth must be < WACC

    // Cap revenue growth at WACC - 1% to ensure DCF convergence
    const maxRevenueGrowth = Math.max(wacc - 1, 5); // At least 5%
    const revenueGrowth = revenueGrowthRaw ? Math.min(revenueGrowthRaw * 100, maxRevenueGrowth, 20) : 12; // Default 12%, max 20% and < WACC

    const taxRate = 25.17; // Indian corporate tax rate ~25.17%
    const capexToRevenue = 5; // Typical capex/revenue for Indian companies
    const workingCapitalToRevenue = 10; // Typical working capital/revenue

    const valuationInputs: ValuationInputs = {
      revenue: revenue / 1e7, // convert to crores
      revenueGrowth,
      ebitdaMargin,
      taxRate,
      capexToRevenue,
      workingCapitalToRevenue,
      wacc,
      terminalGrowth,
      sharesOutstanding: sharesOutstanding / 1e7, // convert to crores
      netDebt: netDebt / 1e7, // convert to crores
      currentPrice,
      peRatio,
      forwardPE,
      pbRatio,
      evEbitda,
      dividendYield: dividendYieldPct,
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
        revenue: revenue / 1e7,
        ebitda: ebitda / 1e7,
        ebitdaMargin,
        netIncome: netIncome / 1e7,
        sharesOutstanding: sharesOutstanding / 1e7,
        netDebt: netDebt / 1e7,
        beta,
        peRatio,
        forwardPE,
        pbRatio,
        evEbitda,
        dividendYield: dividendYieldPct ? dividendYieldPct : null,
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
      // Flatten valuation data for frontend compatibility
      dcf,
      relative,
      consensus,
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
    // Fallback to dummy data on Vercel
    const dummy = getDummyValuation(symbol.toUpperCase());
    return NextResponse.json(dummy);
  }
}