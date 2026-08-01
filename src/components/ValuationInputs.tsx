'use client';

import { useState, useEffect, type FormEvent } from 'react';
import type { ValuationInputs } from '@/lib/valuation';
import { getSectorDefaults, SECTOR_DEFAULTS } from '@/lib/valuation';
import { TouchNumberInput, TouchSelect } from '@/components/ui/MobileComponents';

interface ValuationInputsProps {
  initialInputs: Partial<ValuationInputs>;
  onCalculate: (inputs: ValuationInputs) => void;
  onChange?: (inputs: Partial<ValuationInputs>) => void;
  isLoading?: boolean;
}

export default function ValuationInputs({
  initialInputs,
  onCalculate,
  onChange,
  isLoading = false,
}: ValuationInputsProps) {
  const [inputs, setInputs] = useState<Partial<ValuationInputs>>(initialInputs);
  const [activeTab, setActiveTab] = useState<'financials' | 'valuation' | 'advanced'>('financials');
  const [sector, setSector] = useState<string>('Default');

  useEffect(() => {
    if (onChange) onChange(inputs);
  }, [inputs, onChange]);

  const handleChange = (field: keyof ValuationInputs, value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (!isNaN(numValue)) {
      setInputs(prev => ({ ...prev, [field]: numValue }));
    }
  };

  const handleSectorChange = (newSector: string) => {
    setSector(newSector);
    const defaults = getSectorDefaults(newSector);
    setInputs(prev => ({ ...prev, ...defaults }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Fill in any missing required fields with defaults
    const defaults = getSectorDefaults(sector);
    const completeInputs: ValuationInputs = {
      revenue: inputs.revenue ?? defaults.revenue ?? 0,
      revenueGrowth: inputs.revenueGrowth ?? defaults.revenueGrowth ?? 10,
      ebitdaMargin: inputs.ebitdaMargin ?? defaults.ebitdaMargin ?? 18,
      taxRate: inputs.taxRate ?? defaults.taxRate ?? 25,
      capexToRevenue: inputs.capexToRevenue ?? defaults.capexToRevenue ?? 6,
      workingCapitalToRevenue: inputs.workingCapitalToRevenue ?? defaults.workingCapitalToRevenue ?? 10,
      wacc: inputs.wacc ?? defaults.wacc ?? 12,
      terminalGrowth: inputs.terminalGrowth ?? defaults.terminalGrowth ?? 4,
      sharesOutstanding: inputs.sharesOutstanding ?? 1,
      netDebt: inputs.netDebt ?? 0,
      currentPrice: inputs.currentPrice ?? 0,
      peRatio: inputs.peRatio,
      forwardPE: inputs.forwardPE,
      pbRatio: inputs.pbRatio,
      evEbitda: inputs.evEbitda,
      dividendYield: inputs.dividendYield,
      dividendGrowth: inputs.dividendGrowth ?? 10,
    };
    onCalculate(completeInputs);
  };

  const resetToDefaults = () => {
    const defaults = getSectorDefaults(sector);
    setInputs(defaults);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sector Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Sector (Auto-fills defaults)
        </label>
        <select
          value={sector}
          onChange={(e) => handleSectorChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.keys(SECTOR_DEFAULTS).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Select a sector to auto-fill typical Indian market assumptions
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(['financials', 'valuation', 'advanced'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Financials Tab */}
      {activeTab === 'financials' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Income Statement & Cash Flow</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TouchNumberInput
              label="Revenue (₹ Crores)"
              value={inputs.revenue || 0}
              onChange={(v) => handleChange('revenue', v)}
              placeholder="10000"
              help="Annual revenue in crores"
              min={0}
              step={100}
            />
            <TouchNumberInput
              label="Revenue Growth (% p.a.)"
              value={inputs.revenueGrowth || 0}
              onChange={(v) => handleChange('revenueGrowth', v)}
              placeholder="12"
              step={0.1}
              help="Expected annual revenue growth"
              min={-50}
              max={100}
            />
            <TouchNumberInput
              label="EBITDA Margin (%)"
              value={inputs.ebitdaMargin || 0}
              onChange={(v) => handleChange('ebitdaMargin', v)}
              placeholder="18"
              step={0.1}
              help="EBITDA as % of revenue"
              min={0}
              max={100}
            />
            <TouchNumberInput
              label="Tax Rate (%)"
              value={inputs.taxRate || 25.17}
              onChange={(v) => handleChange('taxRate', v)}
              placeholder="25.17"
              step={0.1}
              help="Indian corporate tax rate"
              min={0}
              max={50}
            />
            <TouchNumberInput
              label="Capex / Revenue (%)"
              value={inputs.capexToRevenue || 0}
              onChange={(v) => handleChange('capexToRevenue', v)}
              placeholder="6"
              step={0.1}
              help="Capital expenditure as % of revenue"
              min={0}
              max={50}
            />
            <TouchNumberInput
              label="Working Capital / Revenue (%)"
              value={inputs.workingCapitalToRevenue || 0}
              onChange={(v) => handleChange('workingCapitalToRevenue', v)}
              placeholder="10"
              step={0.1}
              help="Net working capital as % of revenue"
              min={0}
              max={100}
            />
          </div>
        </div>
      )}

      {/* Valuation Tab */}
      {activeTab === 'valuation' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">DCF Assumptions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TouchNumberInput
              label="WACC / Discount Rate (%)"
              value={inputs.wacc || 0}
              onChange={(v) => handleChange('wacc', v)}
              placeholder="12"
              step={0.1}
              help="Weighted Average Cost of Capital"
              min={0}
              max={30}
            />
            <TouchNumberInput
              label="Terminal Growth Rate (%)"
              value={inputs.terminalGrowth || 0}
              onChange={(v) => handleChange('terminalGrowth', v)}
              placeholder="4"
              step={0.1}
              help="Long-term growth (GDP ~5-6% for India)"
              min={0}
              max={10}
            />
            <TouchNumberInput
              label="Shares Outstanding (Crores)"
              value={inputs.sharesOutstanding || 0}
              onChange={(v) => handleChange('sharesOutstanding', v)}
              placeholder="100"
              step={0.01}
              help="Diluted shares in crores"
              min={0}
            />
            <TouchNumberInput
              label="Net Debt (₹ Crores)"
              value={inputs.netDebt || 0}
              onChange={(v) => handleChange('netDebt', v)}
              placeholder="0"
              help="Total Debt - Cash (negative = net cash)"
            />
            <TouchNumberInput
              label="Current Stock Price (₹)"
              value={inputs.currentPrice || 0}
              onChange={(v) => handleChange('currentPrice', v)}
              placeholder="2500"
              step={0.01}
              help="Current market price per share"
              min={0}
            />
          </div>
        </div>
      )}

      {/* Advanced Tab - Relative Valuation Inputs */}
      {activeTab === 'advanced' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Relative Valuation Multiples (Optional)</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Leave blank to skip. These improve relative valuation accuracy.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TouchNumberInput
              label="Trailing P/E"
              value={inputs.peRatio || 0}
              onChange={(v) => handleChange('peRatio', v)}
              placeholder="20"
              step={0.1}
              min={0}
              max={100}
            />
            <TouchNumberInput
              label="Forward P/E"
              value={inputs.forwardPE || 0}
              onChange={(v) => handleChange('forwardPE', v)}
              placeholder="18"
              step={0.1}
              min={0}
              max={100}
            />
            <TouchNumberInput
              label="P/B Ratio"
              value={inputs.pbRatio || 0}
              onChange={(v) => handleChange('pbRatio', v)}
              placeholder="3"
              step={0.1}
              min={0}
              max={20}
            />
            <TouchNumberInput
              label="EV/EBITDA"
              value={inputs.evEbitda || 0}
              onChange={(v) => handleChange('evEbitda', v)}
              placeholder="12"
              step={0.1}
              min={0}
              max={50}
            />
            <TouchNumberInput
              label="Dividend Yield (%)"
              value={inputs.dividendYield || 0}
              onChange={(v) => handleChange('dividendYield', v)}
              placeholder="1.5"
              step={0.1}
              min={0}
              max={20}
            />
            <TouchNumberInput
              label="Dividend Growth (%)"
              value={inputs.dividendGrowth || 10}
              onChange={(v) => handleChange('dividendGrowth', v)}
              placeholder="10"
              step={0.1}
              help="Expected annual dividend growth"
              min={0}
              max={50}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          {isLoading ? 'Calculating...' : 'Calculate Valuation'}
        </button>
        <button
          type="button"
          onClick={resetToDefaults}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Reset Defaults
        </button>
      </div>
    </form>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  step = "1",
  type = "number",
  help,
}: {
  label: string;
  value: number | string;
  onChange: (value: number | string) => void;
  placeholder?: string;
  step?: string;
  type?: string;
  help?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {help && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{help}</p>}
    </div>
  );
}
