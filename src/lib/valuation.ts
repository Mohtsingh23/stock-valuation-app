export interface ValuationInputs {
  // Company fundamentals
  revenue: number; // in crores INR
  revenueGrowth: number; // annual %
  ebitdaMargin: number; // %
  taxRate: number; // %
  capexToRevenue: number; // %
  workingCapitalToRevenue: number; // %
  wacc: number; // %
  terminalGrowth: number; // %
  sharesOutstanding: number; // in crores
  netDebt: number; // in crores INR
  currentPrice: number; // INR per share
  
  // For relative valuation
  peRatio?: number;
  forwardPE?: number;
  pbRatio?: number;
  evEbitda?: number;
  dividendYield?: number; // %
  dividendGrowth?: number; // %
}

export interface DCFResult {
  enterpriseValue: number; // in crores
  equityValue: number; // in crores
  fairValuePerShare: number; // INR
  upside: number; // %
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  projectionYears: number[];
  freeCashFlows: number[]; // in crores
  terminalValue: number; // in crores
  presentValueOfFCF: number; // in crores
  presentValueOfTerminal: number; // in crores;
  yearByYear: YearlyProjection[];
}

export interface YearlyProjection {
  year: number;
  revenue: number;
  ebitda: number;
  ebit: number;
  nopat: number;
  capex: number;
  workingCapitalChange: number;
  freeCashFlow: number;
  presentValue: number;
}

export interface RelativeValuationResult {
  peValuation: number;
  forwardPEValuation: number;
  pbValuation: number;
  evEbitdaValuation: number;
  dividendDiscountValuation: number;
  averageFairValue: number;
  upside: number;
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  methodCount: number;
}

export interface ValuationResult {
  dcf: DCFResult;
  relative: RelativeValuationResult;
  consensus: {
    fairValue: number;
    upside: number;
    recommendation: 'BUY' | 'HOLD' | 'SELL';
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}

/**
 * Calculate Discounted Cash Flow (DCF) Valuation
 */
export function calculateDCF(inputs: ValuationInputs, projectionYears: number = 5): DCFResult {
  const {
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
  } = inputs;

  const projectionYearsArray = Array.from({ length: projectionYears }, (_, i) => i + 1);
  const yearlyProjections: YearlyProjection[] = [];
  const freeCashFlows: number[] = [];
  let currentRevenue = revenue;

  for (let year = 1; year <= projectionYears; year++) {
    // Project revenue
    currentRevenue = currentRevenue * (1 + revenueGrowth / 100);
    
    // Calculate EBITDA
    const ebitda = currentRevenue * (ebitdaMargin / 100);
    
    // Estimate EBIT (EBITDA - Depreciation)
    // Assume depreciation is roughly 20-30% of EBITDA for mature companies
    const depreciationRate = 0.25;
    const ebit = ebitda * (1 - depreciationRate);
    
    // Calculate NOPAT
    const tax = ebit * (taxRate / 100);
    const nopat = ebit - tax;
    
    // Capital Expenditure
    const capex = currentRevenue * (capexToRevenue / 100);
    
    // Change in Working Capital
    const workingCapitalChange = currentRevenue * (workingCapitalToRevenue / 100) * (revenueGrowth / 100);
    
    // Free Cash Flow = NOPAT + Depreciation - Capex - Change in Working Capital
    const depreciation = ebitda * depreciationRate;
    const freeCashFlow = nopat + depreciation - capex - workingCapitalChange;
    
    // Present Value of FCF
    const presentValue = freeCashFlow / Math.pow(1 + wacc / 100, year);
    
    yearlyProjections.push({
      year,
      revenue: currentRevenue,
      ebitda,
      ebit,
      nopat,
      capex,
      workingCapitalChange,
      freeCashFlow,
      presentValue,
    });
    
    freeCashFlows.push(freeCashFlow);
  }

  // Terminal Value using Gordon Growth Model
  const lastFCF = freeCashFlows[freeCashFlows.length - 1];
  const terminalValue = (lastFCF * (1 + terminalGrowth / 100)) / (wacc / 100 - terminalGrowth / 100);
  
  // Present Value of Terminal Value
  const presentValueOfTerminal = terminalValue / Math.pow(1 + wacc / 100, projectionYears);
  
  // Present Value of all FCFs
  const presentValueOfFCF = yearlyProjections.reduce((sum, proj) => sum + proj.presentValue, 0);
  
  // Enterprise Value = PV of FCFs + PV of Terminal Value
  const enterpriseValue = presentValueOfFCF + presentValueOfTerminal;
  
  // Equity Value = Enterprise Value - Net Debt
  const equityValue = enterpriseValue - netDebt;
  
  // Fair Value per Share
  const fairValuePerShare = equityValue / sharesOutstanding;
  
  // Upside/Downside
  const upside = ((fairValuePerShare - currentPrice) / currentPrice) * 100;
  
  // Recommendation
  let recommendation: 'BUY' | 'HOLD' | 'SELL';
  if (upside > 15) recommendation = 'BUY';
  else if (upside > -5) recommendation = 'HOLD';
  else recommendation = 'SELL';

  return {
    enterpriseValue,
    equityValue,
    fairValuePerShare,
    upside,
    recommendation,
    projectionYears: projectionYearsArray,
    freeCashFlows,
    terminalValue,
    presentValueOfFCF,
    presentValueOfTerminal,
    yearByYear: yearlyProjections,
  };
}

/**
 * Calculate Relative Valuation using multiple methods
 */
export function calculateRelativeValuation(inputs: ValuationInputs, currentPrice: number): RelativeValuationResult {
  const { 
    peRatio, 
    forwardPE, 
    pbRatio, 
    evEbitda, 
    dividendYield, 
    dividendGrowth,
    sharesOutstanding,
    netDebt,
    revenue,
    ebitdaMargin,
  } = inputs;

  const valuations: number[] = [];
  let methodCount = 0;

  // 1. P/E Valuation
  let peValuation = 0;
  if (peRatio && peRatio > 0) {
    // Use industry median P/E or historical average as fair P/E
    const fairPE = Math.min(Math.max(peRatio, 12), 25); // Cap between 12-25
    const eps = (revenue * (ebitdaMargin / 100) * 0.6 * (1 - 0.25)) / sharesOutstanding; // Rough EPS estimate
    peValuation = eps * fairPE;
    valuations.push(peValuation);
    methodCount++;
  }

  // 2. Forward P/E Valuation
  let forwardPEValuation = 0;
  if (forwardPE && forwardPE > 0 && peRatio && peRatio > 0) {
    const fairForwardPE = Math.min(Math.max(forwardPE, 12), 22);
    forwardPEValuation = peValuation * (fairForwardPE / peRatio); // Adjust based on forward vs trailing
    valuations.push(forwardPEValuation);
    methodCount++;
  }

  // 3. P/B Valuation
  let pbValuation = 0;
  if (pbRatio && pbRatio > 0) {
    // Estimate book value per share
    const bookValuePerShare = currentPrice / pbRatio;
    const fairPB = Math.min(Math.max(pbRatio, 1.5), 4); // Fair P/B between 1.5-4
    pbValuation = bookValuePerShare * fairPB;
    valuations.push(pbValuation);
    methodCount++;
  }

  // 4. EV/EBITDA Valuation
  let evEbitdaValuation = 0;
  if (evEbitda && evEbitda > 0) {
    const ebitda = revenue * (ebitdaMargin / 100);
    const fairEVEbitda = Math.min(Math.max(evEbitda, 8), 15); // Fair EV/EBITDA 8-15x
    const enterpriseValue = ebitda * fairEVEbitda;
    const equityValue = enterpriseValue - netDebt;
    evEbitdaValuation = equityValue / sharesOutstanding;
    valuations.push(evEbitdaValuation);
    methodCount++;
  }

  // 5. Dividend Discount Model (Gordon Growth)
  let dividendDiscountValuation = 0;
  if (dividendYield && dividendYield > 0 && dividendGrowth !== undefined) {
    const dividendPerShare = currentPrice * (dividendYield / 100);
    const costOfEquity = 0.12; // Assume 12% cost of equity for Indian stocks
    const terminalDividendGrowth = Math.min(Math.max(dividendGrowth, 0), 6); // Cap at 6%
    
    if (costOfEquity > terminalDividendGrowth / 100) {
      dividendDiscountValuation = dividendPerShare * (1 + terminalDividendGrowth / 100) / (costOfEquity - terminalDividendGrowth / 100);
      valuations.push(dividendDiscountValuation);
      methodCount++;
    }
  }

  // Average Fair Value
  const averageFairValue = methodCount > 0 
    ? valuations.reduce((sum, v) => sum + v, 0) / methodCount 
    : currentPrice;
  
  const upside = ((averageFairValue - currentPrice) / currentPrice) * 100;
  
  let recommendation: 'BUY' | 'HOLD' | 'SELL';
  if (upside > 15) recommendation = 'BUY';
  else if (upside > -5) recommendation = 'HOLD';
  else recommendation = 'SELL';

  return {
    peValuation,
    forwardPEValuation,
    pbValuation,
    evEbitdaValuation,
    dividendDiscountValuation,
    averageFairValue,
    upside,
    recommendation,
    methodCount,
  };
}

/**
 * Calculate consensus valuation combining DCF and Relative
 */
export function calculateConsensus(dcfResult: DCFResult, relativeResult: RelativeValuationResult): ValuationResult['consensus'] {
  const dcfWeight = 0.6; // DCF gets 60% weight
  const relativeWeight = 0.4; // Relative gets 40% weight
  
  const fairValue = (dcfResult.fairValuePerShare * dcfWeight) + (relativeResult.averageFairValue * relativeWeight);
  const upside = ((fairValue - dcfResult.fairValuePerShare * 0 + relativeResult.averageFairValue * 0) / fairValue) * 100;
  // Use current price from DCF inputs for upside calculation
  const currentPrice = dcfResult.fairValuePerShare / (1 + dcfResult.upside / 100);
  const actualUpside = ((fairValue - currentPrice) / currentPrice) * 100;
  
  let recommendation: 'BUY' | 'HOLD' | 'SELL';
  if (actualUpside > 15) recommendation = 'BUY';
  else if (actualUpside > -5) recommendation = 'HOLD';
  else recommendation = 'SELL';

  // Confidence based on agreement between methods
  const dcfRecommendation = dcfResult.recommendation;
  const relativeRecommendation = relativeResult.recommendation;
  
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  if (dcfRecommendation === relativeRecommendation) {
    confidence = 'HIGH';
  } else if (
    (dcfRecommendation === 'BUY' && relativeRecommendation === 'HOLD') ||
    (dcfRecommendation === 'HOLD' && relativeRecommendation === 'BUY') ||
    (dcfRecommendation === 'SELL' && relativeRecommendation === 'HOLD') ||
    (dcfRecommendation === 'HOLD' && relativeRecommendation === 'SELL')
  ) {
    confidence = 'MEDIUM';
  } else {
    confidence = 'LOW';
  }

  return {
    fairValue,
    upside: actualUpside,
    recommendation,
    confidence,
  };
}

/**
 * Default assumptions for Indian companies by sector
 */
export const SECTOR_DEFAULTS: Record<string, Partial<ValuationInputs>> = {
  'IT Services': {
    revenueGrowth: 12,
    ebitdaMargin: 25,
    taxRate: 25,
    capexToRevenue: 4,
    workingCapitalToRevenue: 10,
    wacc: 12,
    terminalGrowth: 5,
  },
  'Banking': {
    revenueGrowth: 15,
    ebitdaMargin: 40, // Net interest margin equivalent
    taxRate: 25,
    capexToRevenue: 2,
    workingCapitalToRevenue: 5,
    wacc: 13,
    terminalGrowth: 5,
  },
  'FMCG': {
    revenueGrowth: 10,
    ebitdaMargin: 22,
    taxRate: 25,
    capexToRevenue: 5,
    workingCapitalToRevenue: 8,
    wacc: 11,
    terminalGrowth: 5,
  },
  'Automobile': {
    revenueGrowth: 8,
    ebitdaMargin: 12,
    taxRate: 25,
    capexToRevenue: 8,
    workingCapitalToRevenue: 12,
    wacc: 13,
    terminalGrowth: 4,
  },
  'Pharma': {
    revenueGrowth: 12,
    ebitdaMargin: 20,
    taxRate: 25,
    capexToRevenue: 6,
    workingCapitalToRevenue: 15,
    wacc: 12,
    terminalGrowth: 5,
  },
  'Oil & Gas': {
    revenueGrowth: 5,
    ebitdaMargin: 15,
    taxRate: 25,
    capexToRevenue: 10,
    workingCapitalToRevenue: 5,
    wacc: 12,
    terminalGrowth: 3,
  },
  'Cement': {
    revenueGrowth: 7,
    ebitdaMargin: 18,
    taxRate: 25,
    capexToRevenue: 8,
    workingCapitalToRevenue: 10,
    wacc: 12,
    terminalGrowth: 4,
  },
  'Metals': {
    revenueGrowth: 6,
    ebitdaMargin: 16,
    taxRate: 25,
    capexToRevenue: 10,
    workingCapitalToRevenue: 12,
    wacc: 13,
    terminalGrowth: 3,
  },
  'Telecom': {
    revenueGrowth: 8,
    ebitdaMargin: 35,
    taxRate: 25,
    capexToRevenue: 15,
    workingCapitalToRevenue: 5,
    wacc: 12,
    terminalGrowth: 3,
  },
  'Power': {
    revenueGrowth: 6,
    ebitdaMargin: 30,
    taxRate: 25,
    capexToRevenue: 12,
    workingCapitalToRevenue: 8,
    wacc: 11,
    terminalGrowth: 3,
  },
  'Default': {
    revenueGrowth: 10,
    ebitdaMargin: 18,
    taxRate: 25,
    capexToRevenue: 6,
    workingCapitalToRevenue: 10,
    wacc: 12,
    terminalGrowth: 4,
  },
};

/**
 * Get sector-specific default assumptions
 */
export function getSectorDefaults(sector: string): Partial<ValuationInputs> {
  return SECTOR_DEFAULTS[sector] || SECTOR_DEFAULTS['Default'];
}

/**
 * Format numbers for Indian numbering system (lakhs, crores)
 */
export function formatIndianNumber(num: number): string {
  if (num === undefined || num === null || isNaN(num)) {
    return '₹0';
  }
  if (num >= 1e7) {
    return `₹${(num / 1e7).toFixed(2)} Cr`;
  } else if (num >= 1e5) {
    return `₹${(num / 1e5).toFixed(2)} L`;
  } else {
    return `₹${num.toLocaleString('en-IN')}`;
  }
}

export function formatPercent(num: number): string {
  if (num === undefined || num === null || isNaN(num)) {
    return '0.00%';
  }
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
}

export function formatPrice(num: number): string {
  if (num === undefined || num === null || isNaN(num)) {
    return '₹0.00';
  }
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
