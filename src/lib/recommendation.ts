export type Recommendation = {
  score: number;
  action: 'BUY' | 'WATCH' | 'AVOID';
  confidence: 'High' | 'Moderate' | 'Low';
  entry: number;
  stopLoss: number;
  target: number;
  riskReward: string;
  reasons: string[];
};

export type FinancialMetrics = { returnOnEquity?: number; profitMargins?: number; debtToEquity?: number };
export type QuoteMetrics = { peRatio?: number };

const average = (items: number[]) => items.reduce((sum, value) => sum + value, 0) / items.length;

export function calculateRsi(closes: number[], period = 14) {
  if (closes.length <= period) return 50;
  const changes = closes.slice(-period - 1).map((price, index, list) => index ? price - list[index - 1] : 0).slice(1);
  const gains = changes.map(change => Math.max(change, 0));
  const losses = changes.map(change => Math.max(-change, 0));
  const avgGain = average(gains);
  const avgLoss = average(losses);
  if (!avgLoss) return 100;
  return Math.round(100 - (100 / (1 + avgGain / avgLoss)));
}

export function technicalSnapshot(closes: number[], volumes: number[] = []) {
  const price = closes.at(-1) || 0;
  const sma20 = closes.length >= 20 ? average(closes.slice(-20)) : price;
  const sma50 = closes.length >= 50 ? average(closes.slice(-50)) : sma20;
  const rsi = calculateRsi(closes);
  const recentHigh = Math.max(...closes.slice(-20));
  const recentLow = Math.min(...closes.slice(-20));
  const avgVolume = volumes.length >= 20 ? average(volumes.slice(-20)) : 0;
  const volumeRatio = avgVolume && volumes.at(-1) ? volumes.at(-1)! / avgVolume : 1;
  return { price, sma20, sma50, rsi, recentHigh, recentLow, volumeRatio };
}

export function makeIntradayRecommendation(t: ReturnType<typeof technicalSnapshot>): Recommendation {
  let score = 50;
  const reasons: string[] = [];
  if (t.price > t.sma20) { score += 14; reasons.push('Price is trading above its 20-period trend.'); }
  else { score -= 12; reasons.push('Price is below its 20-period trend.'); }
  if (t.sma20 > t.sma50) { score += 12; reasons.push('Short trend is above the medium trend.'); }
  if (t.rsi >= 52 && t.rsi <= 68) { score += 13; reasons.push(`RSI at ${t.rsi} supports momentum without being extended.`); }
  else if (t.rsi > 75) { score -= 15; reasons.push(`RSI at ${t.rsi} is stretched; avoid chasing.`); }
  else if (t.rsi < 38) { score -= 8; reasons.push(`RSI at ${t.rsi} shows weak momentum.`); }
  if (t.volumeRatio >= 1.2) { score += 11; reasons.push(`${t.volumeRatio.toFixed(1)}× average volume confirms participation.`); }
  const action = score >= 70 ? 'BUY' : score >= 52 ? 'WATCH' : 'AVOID';
  const entry = t.price;
  const stopLoss = Math.min(t.sma20, t.recentLow) * 0.995;
  const target = entry + (entry - stopLoss) * 2;
  return { score: Math.max(0, Math.min(100, score)), action, confidence: score >= 75 ? 'High' : score >= 58 ? 'Moderate' : 'Low', entry, stopLoss, target, riskReward: '1 : 2.0', reasons };
}

export function makePositionalRecommendation(t: ReturnType<typeof technicalSnapshot>, financial: FinancialMetrics | undefined, quote: QuoteMetrics | undefined): Recommendation {
  let score = 48;
  const reasons: string[] = [];
  const roe = Number(financial?.returnOnEquity || 0) * 100;
  const margin = Number(financial?.profitMargins || 0) * 100;
  const debtToEquity = Number(financial?.debtToEquity || 0);
  const pe = Number(quote?.peRatio || 0);
  if (t.price > t.sma50) { score += 14; reasons.push('Price is above the 50-day trend.'); }
  else { score -= 10; reasons.push('Price remains below the 50-day trend.'); }
  if (roe >= 15) { score += 14; reasons.push(`ROE of ${roe.toFixed(1)}% indicates quality capital efficiency.`); }
  else if (roe > 0) { score -= 5; reasons.push(`ROE of ${roe.toFixed(1)}% is modest.`); }
  if (margin >= 10) { score += 10; reasons.push(`Net margin of ${margin.toFixed(1)}% supports earnings quality.`); }
  if (debtToEquity && debtToEquity < 100) { score += 8; reasons.push('Debt-to-equity is within a conservative range.'); }
  else if (debtToEquity >= 180) { score -= 12; reasons.push('Leverage is elevated; size risk carefully.'); }
  if (pe > 0 && pe < 35) { score += 6; reasons.push(`P/E of ${pe.toFixed(1)} is within the screening range.`); }
  const action = score >= 72 ? 'BUY' : score >= 54 ? 'WATCH' : 'AVOID';
  const entry = t.price;
  const stopLoss = Math.min(t.sma50, t.recentLow) * 0.97;
  const target = entry + (entry - stopLoss) * 2.4;
  return { score: Math.max(0, Math.min(100, score)), action, confidence: score >= 76 ? 'High' : score >= 60 ? 'Moderate' : 'Low', entry, stopLoss, target, riskReward: '1 : 2.4', reasons };
}
