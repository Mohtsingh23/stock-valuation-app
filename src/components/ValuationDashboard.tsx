'use client';

import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { ValuationResult, formatIndianNumber, formatPercent, formatPrice } from '@/lib/valuation';
import { ResponsiveTable, MobileMetricCard } from '@/components/ui/MobileComponents';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface ValuationDashboardProps {
  result: ValuationResult;
  stockData: any;
  details: any;
  inputs: any;
}

export default function ValuationDashboard({ result, stockData, details, inputs }: ValuationDashboardProps) {
  // Guard against undefined result
  if (!result || !result.dcf || !result.relative || !result.consensus) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p>Loading valuation...</p>
        </div>
      </div>
    );
  }

  const { dcf, relative, consensus } = result;
  const [activeTab, setActiveTab] = useState<'overview' | 'dcf' | 'relative' | 'details'>('overview');

  const recommendationColors = {
    BUY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    HOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    SELL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const confidenceColors = {
    HIGH: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    LOW: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'dcf', label: 'DCF Analysis', icon: '📈' },
    { id: 'relative', label: 'Relative Valuation', icon: '📉' },
    { id: 'details', label: 'Year-by-Year', icon: '📋' },
  ];

  return (
    <div className="space-y-6">
      {/* Consensus Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-blue-100 text-sm">Consensus Fair Value</p>
            <p className="text-3xl font-bold">{formatPrice(consensus.fairValue)}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Upside / Downside</p>
            <p className={`text-3xl font-bold ${consensus.upside >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {consensus.upside >= 0 ? '+' : ''}{consensus.upside.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Recommendation</p>
            <span className={`inline-block px-4 py-1 rounded-full text-lg font-bold ${recommendationColors[consensus.recommendation]}`}>
              {consensus.recommendation}
            </span>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Confidence</p>
            <span className={`inline-block px-4 py-1 rounded-full text-lg font-bold ${confidenceColors[consensus.confidence]}`}>
              {consensus.confidence}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-1">{tab.icon} {tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* DCF vs Relative Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ValuationMethodCard
              title="DCF Valuation"
              icon="📈"
              fairValue={dcf.fairValuePerShare}
              upside={dcf.upside}
              recommendation={dcf.recommendation}
              details={[
                { label: 'Enterprise Value', value: formatIndianNumber(dcf.enterpriseValue) },
                { label: 'Equity Value', value: formatIndianNumber(dcf.equityValue) },
                { label: 'PV of FCFs', value: formatIndianNumber(dcf.presentValueOfFCF) },
                { label: 'PV of Terminal Value', value: formatIndianNumber(dcf.presentValueOfTerminal) },
                { label: 'Terminal Value', value: formatIndianNumber(dcf.terminalValue) },
              ]}
            />
            <ValuationMethodCard
              title="Relative Valuation"
              icon="📉"
              fairValue={relative.averageFairValue}
              upside={relative.upside}
              recommendation={relative.recommendation}
              details={[
                { label: 'Methods Used', value: `${relative.methodCount} methods` },
                { label: 'P/E Valuation', value: relative.peValuation > 0 ? formatPrice(relative.peValuation) : 'N/A' },
                { label: 'Forward P/E Valuation', value: relative.forwardPEValuation > 0 ? formatPrice(relative.forwardPEValuation) : 'N/A' },
                { label: 'P/B Valuation', value: relative.pbValuation > 0 ? formatPrice(relative.pbValuation) : 'N/A' },
                { label: 'EV/EBITDA Valuation', value: relative.evEbitdaValuation > 0 ? formatPrice(relative.evEbitdaValuation) : 'N/A' },
                { label: 'DDM Valuation', value: relative.dividendDiscountValuation > 0 ? formatPrice(relative.dividendDiscountValuation) : 'N/A' },
              ]}
            />
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MobileMetricCard
              label="Current Price"
              value={formatPrice(stockData.price || inputs.currentPrice)}
              subValue="Market Price"
              color="blue"
            />
            <MobileMetricCard
              label="DCF Fair Value"
              value={formatPrice(dcf.fairValuePerShare)}
              subValue={formatPercent(dcf.upside)}
              color={dcf.upside >= 0 ? 'green' : 'red'}
              trend={dcf.upside >= 0 ? 'up' : 'down'}
            />
            <MobileMetricCard
              label="Relative Fair Value"
              value={formatPrice(relative.averageFairValue)}
              subValue={formatPercent(relative.upside)}
              color={relative.upside >= 0 ? 'green' : 'red'}
              trend={relative.upside >= 0 ? 'up' : 'down'}
            />
            <MobileMetricCard
              label="Consensus Fair Value"
              value={formatPrice(consensus.fairValue)}
              subValue={formatPercent(consensus.upside)}
              color={consensus.upside >= 0 ? 'green' : 'red'}
              trend={consensus.upside >= 0 ? 'up' : 'down'}
            />
          </div>

          {/* Price Target Range Visualization */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Price Target Range</h3>
            <PriceTargetChart
              currentPrice={stockData.price || inputs.currentPrice}
              dcfValue={dcf.fairValuePerShare}
              relativeValue={relative.averageFairValue}
              consensusValue={consensus.fairValue}
            />
          </div>

          {/* Assumptions Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AssumptionsCard
              title="DCF Assumptions"
              items={[
                { label: 'Revenue Growth', value: formatPercent(inputs.revenueGrowth) },
                { label: 'EBITDA Margin', value: formatPercent(inputs.ebitdaMargin) },
                { label: 'WACC', value: formatPercent(inputs.wacc) },
                { label: 'Terminal Growth', value: formatPercent(inputs.terminalGrowth) },
                { label: 'Tax Rate', value: formatPercent(inputs.taxRate) },
                { label: 'Capex/Revenue', value: formatPercent(inputs.capexToRevenue) },
              ]}
            />
            <AssumptionsCard
              title="Capital Structure"
              items={[
                { label: 'Shares Outstanding', value: `${(inputs.sharesOutstanding || 0).toFixed(2)} Cr` },
                { label: 'Net Debt', value: formatIndianNumber((inputs.netDebt || 0) * 1e7) },
                { label: 'Total Debt', value: formatIndianNumber(details?.defaultKeyStatistics?.totalDebt || 0) },
                { label: 'Total Cash', value: formatIndianNumber(details?.defaultKeyStatistics?.totalCash || 0) },
                { label: 'Current Price', value: formatPrice(inputs.currentPrice || 0) },
                { label: 'Market Cap', value: formatIndianNumber(details?.financialData?.marketCap || stockData.marketCap || inputs.currentPrice * inputs.sharesOutstanding * 1e7) },
                { label: 'Enterprise Value', value: formatIndianNumber(details?.defaultKeyStatistics?.enterpriseValue || 0) },
                { label: 'Book Value / Share', value: details?.defaultKeyStatistics?.bookValue ? formatPrice(details.defaultKeyStatistics.bookValue) : 'N/A' },
                { label: 'Face Value', value: '₹10 (typical for NSE)' },
              ]}
            />
            <AssumptionsCard
              title="Valuation Multiples"
              items={[
                { label: 'Trailing P/E', value: inputs.peRatio ? inputs.peRatio.toFixed(1) + 'x' : 'N/A' },
                { label: 'Forward P/E', value: inputs.forwardPE ? inputs.forwardPE.toFixed(1) + 'x' : 'N/A' },
                { label: 'P/B Ratio', value: inputs.pbRatio ? inputs.pbRatio.toFixed(1) + 'x' : 'N/A' },
                { label: 'EV/EBITDA', value: inputs.evEbitda ? inputs.evEbitda.toFixed(1) + 'x' : 'N/A' },
                { label: 'Dividend Yield', value: inputs.dividendYield ? formatPercent(inputs.dividendYield) : 'N/A' },
                { label: 'Beta', value: details?.defaultKeyStatistics?.beta ? details.defaultKeyStatistics.beta.toFixed(2) : (stockData.beta ? stockData.beta.toFixed(2) : 'N/A') },
              ]}
            />
          </div>
        </div>
      )}

      {activeTab === 'dcf' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Free Cash Flow Projections</h3>
              <FCFChart
                years={dcf.projectionYears}
                fcf={dcf.freeCashFlows}
                pv={dcf.freeCashFlows.map((_, i) => dcf.freeCashFlows[i] / Math.pow(1 + inputs.wacc / 100, i + 1))}
              />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">DCF Value Breakdown</h3>
              <Doughnut
                data={{
                  labels: ['PV of FCFs', 'PV of Terminal Value', 'Net Debt'],
                  datasets: [{
                    data: [
                      dcf.presentValueOfFCF,
                      dcf.presentValueOfTerminal,
                      -inputs.netDebt * 1e7,
                    ],
                    backgroundColor: ['#3b82f6', '#8b5cf6', '#ef4444'],
                    borderWidth: 0,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => `${context.label}: ${formatIndianNumber(context.raw)}`,
                      },
                    },
                  },
                }}
              />
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">PV of FCFs (Years 1-5)</span>
                  <span className="font-medium">{formatIndianNumber(dcf.presentValueOfFCF)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">PV of Terminal Value</span>
                  <span className="font-medium">{formatIndianNumber(dcf.presentValueOfTerminal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Enterprise Value</span>
                  <span className="font-medium">{formatIndianNumber(dcf.enterpriseValue)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span className="text-gray-600 dark:text-gray-400">Less: Net Debt</span>
                  <span className="font-medium text-red-600">({formatIndianNumber(inputs.netDebt * 1e7)})</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span>Equity Value</span>
                  <span>{formatIndianNumber(dcf.equityValue)}</span>
                </div>
                <div className="flex justify-between font-medium text-blue-600">
                  <span>Fair Value per Share</span>
                  <span>{formatPrice(dcf.fairValuePerShare)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sensitivity Analysis */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sensitivity Analysis (Fair Value per Share)</h3>
            <SensitivityTable
              baseWacc={inputs.wacc}
              baseTerminalGrowth={inputs.terminalGrowth}
              baseFairValue={dcf.fairValuePerShare}
              calculateFairValue={(wacc: number, tg: number) => calculateSensitivityFairValue(inputs, wacc, tg)}
            />
          </div>
        </div>
      )}

      {activeTab === 'relative' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Relative Valuation Methods</h3>
            <ResponsiveTable
              data={[
                { method: 'P/E Ratio', fairValue: relative.peValuation, weight: '25%' },
                { method: 'Forward P/E', fairValue: relative.forwardPEValuation, weight: '20%' },
                { method: 'P/B Ratio', fairValue: relative.pbValuation, weight: '15%' },
                { method: 'EV/EBITDA', fairValue: relative.evEbitdaValuation, weight: '25%' },
                { method: 'DDM', fairValue: relative.dividendDiscountValuation, weight: '15%' },
              ].filter(m => m.fairValue > 0)}
              columns={[
                { key: 'method', header: 'Method' },
                { 
                  key: 'fairValue', 
                  header: 'Fair Value',
                  render: (row) => formatPrice(row.fairValue),
                  className: 'text-right font-medium',
                },
                { 
                  key: 'fairValue', 
                  header: 'vs Current',
                  render: (row) => {
                    const pct = ((row.fairValue - inputs.currentPrice) / inputs.currentPrice) * 100;
                    return (
                      <span style={{ color: pct >= 0 ? 'green' : 'red' }}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                      </span>
                    );
                  },
                  className: 'text-right',
                },
                { key: 'weight', header: 'Weight', className: 'text-right text-gray-500 dark:text-gray-400' },
              ]}
              keyExtractor={(row) => row.method}
              emptyMessage="No relative valuation methods available"
            />
          </div>

          {/* Relative Valuation Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Valuation Range</h3>
            <RelativeValuationChart
              methods={[
                { name: 'P/E', value: relative.peValuation },
                { name: 'Fwd P/E', value: relative.forwardPEValuation },
                { name: 'P/B', value: relative.pbValuation },
                { name: 'EV/EBITDA', value: relative.evEbitdaValuation },
                { name: 'DDM', value: relative.dividendDiscountValuation },
              ].filter(m => m.value > 0)}
              currentPrice={inputs.currentPrice}
              average={relative.averageFairValue}
            />
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Year-by-Year Projections</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Year</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Revenue (₹ Cr)</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">EBITDA (₹ Cr)</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">EBIT (₹ Cr)</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">NOPAT (₹ Cr)</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Capex (₹ Cr)</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Δ WC (₹ Cr)</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">FCF (₹ Cr)</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">PV of FCF (₹ Cr)</th>
                  </tr>
                </thead>
                <tbody>
                  {dcf.yearByYear?.map((year: any, i: number) => (
                    <tr key={year.year} className={`border-b border-gray-100 dark:border-gray-800 ${i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700/30' : ''}`}>
                      <td className="py-3 px-4 font-medium">Year {year.year}</td>
                      <td className="text-right py-3 px-4">{year.revenue.toFixed(0)}</td>
                      <td className="text-right py-3 px-4">{year.ebitda.toFixed(0)}</td>
                      <td className="text-right py-3 px-4">{year.ebit.toFixed(0)}</td>
                      <td className="text-right py-3 px-4">{year.nopat.toFixed(0)}</td>
                      <td className="text-right py-3 px-4 text-red-600">({year.capex.toFixed(0)})</td>
                      <td className="text-right py-3 px-4 text-red-600">({year.workingCapitalChange.toFixed(0)})</td>
                      <td className="text-right py-3 px-4 font-medium text-green-600">{year.freeCashFlow.toFixed(0)}</td>
                      <td className="text-right py-3 px-4 font-medium text-blue-600">{year.presentValue.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Terminal Value Calculation</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Year 5 FCF</span><span className="font-medium">{formatIndianNumber(dcf.freeCashFlows[dcf.freeCashFlows.length - 1] * 1e7)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Terminal Growth Rate</span><span className="font-medium">{formatPercent(inputs.terminalGrowth)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">WACC</span><span className="font-medium">{formatPercent(inputs.wacc)}</span></div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2"><span className="text-gray-600 dark:text-gray-400">Terminal Value</span><span className="font-medium">{formatIndianNumber(dcf.terminalValue * 1e7)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">PV of Terminal Value</span><span className="font-medium text-blue-600">{formatIndianNumber(dcf.presentValueOfTerminal * 1e7)}</span></div>
                <div className="flex justify-between font-bold text-lg border-t border-gray-200 dark:border-gray-700 pt-2"><span>% of Enterprise Value</span><span>{((dcf.presentValueOfTerminal / dcf.enterpriseValue) * 100).toFixed(1)}%</span></div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Ratios & Metrics</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">EV/Revenue</p>
                  <p className="font-bold text-lg">{inputs.revenue > 0 ? (dcf.enterpriseValue / (inputs.revenue * 1e7)).toFixed(2) + 'x' : 'N/A'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">EV/EBITDA</p>
                  <p className="font-bold text-lg">{inputs.revenue > 0 && inputs.ebitdaMargin > 0 ? (dcf.enterpriseValue / (inputs.revenue * 1e7 * inputs.ebitdaMargin / 100)).toFixed(2) + 'x' : 'N/A'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">P/FCF (Year 1)</p>
                  <p className="font-bold text-lg">{dcf.freeCashFlows[0] > 0 ? (dcf.equityValue / dcf.freeCashFlows[0]).toFixed(2) + 'x' : 'N/A'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">FCF Yield (Year 1)</p>
                  <p className="font-bold text-lg">{dcf.freeCashFlows[0] > 0 && inputs.currentPrice > 0 ? ((dcf.freeCashFlows[0] * 1e7 / inputs.sharesOutstanding / 1e7) / inputs.currentPrice * 100).toFixed(1) + '%' : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function ValuationMethodCard({ title, icon, fairValue, upside, recommendation, details }: any) {
  const recommendationColors = {
    BUY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    HOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    SELL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          {title}
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${recommendationColors[recommendation as keyof typeof recommendationColors]}`}>
          {recommendation}
        </span>
      </div>
      <div className="mb-4">
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatPrice(fairValue)}</p>
        <p className={`text-sm font-medium ${upside >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {upside >= 0 ? '+' : ''}{upside.toFixed(1)}% vs Current
        </p>
      </div>
      <div className="space-y-2 text-sm">
        {details.map((d: any) => (
          <div key={d.label} className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
            <span className="text-gray-600 dark:text-gray-400">{d.label}</span>
            <span className="font-medium text-gray-900 dark:text-white">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, subtitle, subtitleColor }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      {subtitle && (
        <p className={`text-sm font-medium mt-1 ${subtitleColor || ''}`}>{subtitle}</p>
      )}
    </div>
  );
}

function AssumptionsCard({ title, items }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{title}</h4>
      <div className="space-y-2">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <span className="text-gray-600 dark:text-gray-400 text-sm">{item.label}</span>
            <span className="font-medium text-gray-900 dark:text-white text-sm">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceTargetChart({ currentPrice, dcfValue, relativeValue, consensusValue }: any) {
  const minPrice = Math.min(currentPrice, dcfValue, relativeValue, consensusValue) * 0.8;
  const maxPrice = Math.max(currentPrice, dcfValue, relativeValue, consensusValue) * 1.2;

  const getPosition = (price: number) => ((price - minPrice) / (maxPrice - minPrice)) * 100;

  return (
    <div className="relative h-20">
      {/* Track */}
      <div className="absolute top-1/2 left-10 right-10 -translate-y-1/2 h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-full" />
      
      {/* Fair Value Range */}
      <div className="absolute top-1/2 -translate-y-1/2 h-2 bg-blue-100 dark:bg-blue-900/30 rounded-full"
        style={{
          left: `${getPosition(Math.min(dcfValue, relativeValue, consensusValue))}%`,
          width: `${getPosition(Math.max(dcfValue, relativeValue, consensusValue)) - getPosition(Math.min(dcfValue, relativeValue, consensusValue))}%`,
        }}
      />
      
      {/* Markers */}
      <div className="absolute top-1/2 -translate-y-1/2 left-10 right-10 flex justify-between -ml-10 -mr-10">
        {[
          { price: currentPrice, label: 'Current', color: 'gray' },
          { price: dcfValue, label: 'DCF', color: 'blue' },
          { price: relativeValue, label: 'Relative', color: 'purple' },
          { price: consensusValue, label: 'Consensus', color: 'indigo' },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center" style={{ left: `${getPosition(item.price)}%`, transform: 'translateX(-50%)' }}>
            <div className={`w-3 h-3 rounded-full border-2 border-white shadow-lg`} style={{ backgroundColor: item.color }} />
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 whitespace-nowrap">{item.label}</span>
            <span className="text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">{formatPrice(item.price)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FCFChart({ years, fcf, pv }: any) {
  const data = {
    labels: years.map((y: number) => `Year ${y}`),
    datasets: [
      {
        label: 'Free Cash Flow (₹ Cr)',
        data: fcf,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: 'PV of FCF (₹ Cr)',
        data: pv,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y',
      },
    ],
  };

  return (
    <Line
      data={data as never}
      options={{
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: '₹ Crores' } },
        },
      }}
    />
  );
}

function RelativeValuationChart({ methods, currentPrice, average }: any) {
  const data = {
    labels: [...methods.map((m: any) => m.name), 'Average'],
    datasets: [
      {
        label: 'Fair Value (₹)',
        data: [...methods.map((m: any) => m.value), average],
        backgroundColor: [...methods.map(() => '#3b82f6'), '#8b5cf6'],
        borderColor: [...methods.map(() => '#2563eb'), '#7c3aed'],
        borderWidth: 1,
      },
      {
        label: 'Current Price (₹)',
        data: methods.map(() => currentPrice),
        type: 'line',
        borderColor: '#ef4444',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  return (
    <Bar
      data={data as never}
      options={{
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Price (₹)' } } },
      }}
    />
  );
}

function SensitivityTable({ baseWacc, baseTerminalGrowth, baseFairValue, calculateFairValue }: any) {
  const waccRange = [baseWacc - 2, baseWacc - 1, baseWacc, baseWacc + 1, baseWacc + 2];
  const tgRange = [baseTerminalGrowth - 1, baseTerminalGrowth - 0.5, baseTerminalGrowth, baseTerminalGrowth + 0.5, baseTerminalGrowth + 1];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700/50">
            <th className="p-3 text-left font-medium text-gray-500 dark:text-gray-400">WACC \\ Terminal Growth</th>
            {tgRange.map(tg => (
              <th key={tg} className="p-3 text-center font-medium text-gray-900 dark:text-white">
                {formatPercent(tg)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {waccRange.map(wacc => (
            <tr key={wacc} className="border-b border-gray-100 dark:border-gray-800">
              <td className="p-3 font-medium text-gray-900 dark:text-white">{formatPercent(wacc)}</td>
              {tgRange.map(tg => {
                const fairValue = calculateFairValue(wacc, tg);
                const diff = fairValue - baseFairValue;
                return (
                  <td key={tg} className="p-3 text-center font-mono font-medium" 
                    style={{ 
                      color: diff > 0 ? 'green' : diff < 0 ? 'red' : 'inherit',
                      backgroundColor: wacc === baseWacc && tg === baseTerminalGrowth ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                    }}>
                    {formatPrice(fairValue)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Simplified sensitivity calculation (in reality, would recalculate full DCF)
function calculateSensitivityFairValue(inputs: any, wacc: number, terminalGrowth: number): number {
  // Simplified: adjust fair value based on WACC and terminal growth changes
  const baseWacc = inputs.wacc;
  const baseTg = inputs.terminalGrowth;
  
  // Rough approximation: fair value is inversely related to (WACC - terminal growth)
  const baseSpread = baseWacc - baseTg;
  const newSpread = wacc - terminalGrowth;
  const multiplier = baseSpread / newSpread;
  
  return inputs.currentPrice * (1 + (inputs.currentPrice * 0.5 - inputs.currentPrice) * 0.01) * multiplier;
}
