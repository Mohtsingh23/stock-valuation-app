'use client';

import { useState, useEffect } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T, index: number) => string;
  emptyMessage?: string;
  className?: string;
  stickyHeader?: boolean;
  onRowClick?: (row: T) => void;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'No data available',
  className = '',
  stickyHeader = true,
  onRowClick,
}: ResponsiveTableProps<T>) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const visibleColumns = columns.filter(c => !c.hideOnMobile || !isMobile);

  if (data.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 dark:text-gray-400 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  if (isMobile) {
    // Card-based layout for mobile
    return (
      <div className={`space-y-3 ${className}`} role="list">
        {data.map((row, index) => (
          <div
            key={keyExtractor(row, index)}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
            role="listitem"
            onClick={() => onRowClick?.(row)}
            style={onRowClick ? { cursor: 'pointer' } : undefined}
          >
            {visibleColumns.map((col, colIndex) => (
              <div key={col.key} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-sm text-gray-500 dark:text-gray-400">{col.header}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-[60%] truncate">
                  {col.render ? col.render(row, index) : String((row as any)[col.key] ?? '')}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Desktop table layout
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm" role="table">
        <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            {visibleColumns.map((col, i) => (
              <th key={col.key} className={`px-4 py-3 font-medium ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={keyExtractor(row, index)}
              className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              onClick={() => onRowClick?.(row)}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {visibleColumns.map((col, colIndex) => (
                <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                  {col.render ? col.render(row, index) : String((row as any)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Touch-friendly number input with increment/decrement buttons
interface TouchNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  help?: string;
  className?: string;
  disabled?: boolean;
}

export function TouchNumberInput({
  value,
  onChange,
  label,
  min,
  max,
  step = 1,
  placeholder,
  help,
  className = '',
  disabled = false,
}: TouchNumberInputProps) {
  const handleIncrement = () => {
    const newVal = value + step;
    if (max === undefined || newVal <= max) onChange(newVal);
  };
  const handleDecrement = () => {
    const newVal = value - step;
    if (min === undefined || newVal >= min) onChange(newVal);
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || (min !== undefined && value <= min)}
          className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xl hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          aria-label="Decrease"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const num = parseFloat(e.target.value);
            if (!isNaN(num)) {
              if ((min === undefined || num >= min) && (max === undefined || num <= max)) {
                onChange(num);
              }
            }
          }}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className="flex-1 px-4 py-3 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={disabled}
          inputMode="decimal"
        />
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && value >= max)}
          className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xl hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          aria-label="Increase"
        >
          +
        </button>
      </div>
      {help && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{help}</p>}
    </div>
  );
}

// Touch-friendly select with larger tap targets
interface TouchSelectProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  className?: string;
  disabled?: boolean;
}

export function TouchSelect({
  value,
  onChange,
  label,
  options,
  placeholder,
  help,
  className = '',
  disabled = false,
}: TouchSelectProps) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
        disabled={disabled}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {help && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{help}</p>}
    </div>
  );
}

// Mobile-friendly card grid
export function CardGrid({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 ${className}`}>
      {children}
    </div>
  );
}

// Metric card that works well on mobile
export function MobileMetricCard({
  label,
  value,
  subValue,
  color = 'gray',
  trend,
  className = '',
}: {
  label: string;
  value: string;
  subValue?: string;
  color?: 'green' | 'red' | 'blue' | 'purple' | 'gray';
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  const colors = {
    green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    gray: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <div className="flex items-baseline justify-between gap-2">
        <p className={`text-xl font-bold ${colors[color]}`}>{value}</p>
        {trend && (
          <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
            {trendIcons[trend]}
          </span>
        )}
      </div>
      {subValue && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subValue}</p>}
    </div>
  );
}