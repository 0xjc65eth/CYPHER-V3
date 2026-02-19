'use client';

import { useState } from 'react';
import { RiDownloadLine, RiFileExcelLine, RiCheckLine } from 'react-icons/ri';
import {
  exportPortfolioToCSV,
  exportTransactionsToCSV,
  exportMarketDataToCSV,
  exportHistoricalDataToCSV,
  exportWhaleDataToCSV,
  exportHolderDataToCSV,
  exportGenericDataToCSV,
  type ExportColumn,
} from '@/lib/export/csv-exporter';

export type ExportType =
  | 'portfolio'
  | 'transactions'
  | 'market-data'
  | 'historical-data'
  | 'whale-data'
  | 'holder-data'
  | 'custom';

interface ExportButtonProps {
  type: ExportType;
  data: any[];
  filename?: string;
  title?: string;
  columns?: ExportColumn[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  showIcon?: boolean;
  showText?: boolean;
  disabled?: boolean;
  // For historical data
  symbol?: string;
}

export function ExportButton({
  type,
  data,
  filename,
  title,
  columns,
  className = '',
  size = 'md',
  variant = 'primary',
  showIcon = true,
  showText = true,
  disabled = false,
  symbol,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    if (disabled || data.length === 0) {
      return;
    }

    setIsExporting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX

      switch (type) {
        case 'portfolio':
          exportPortfolioToCSV(data);
          break;

        case 'transactions':
          exportTransactionsToCSV(data);
          break;

        case 'market-data':
          exportMarketDataToCSV(data);
          break;

        case 'historical-data':
          if (!symbol) {
            throw new Error('Symbol is required for historical data export');
          }
          exportHistoricalDataToCSV(data, symbol);
          break;

        case 'whale-data':
          exportWhaleDataToCSV(data);
          break;

        case 'holder-data':
          exportHolderDataToCSV(data);
          break;

        case 'custom':
          if (!columns || !title || !filename) {
            throw new Error('Columns, title, and filename are required for custom export');
          }
          exportGenericDataToCSV(data, columns, title, filename);
          break;

        default:
          throw new Error(`Unknown export type: ${type}`);
      }

      // Show success state
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-[#FF6B35] text-white hover:bg-[#FF8555]',
    secondary: 'bg-[#FF6B35]/10 text-[#FF6B35] hover:bg-[#FF6B35]/20',
    outline: 'border border-[#FF6B35]/30 text-[#FF6B35] hover:bg-[#FF6B35]/10',
  };

  // Icon size
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const buttonClasses = `
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${className}
    rounded-lg
    font-medium
    transition-all
    duration-200
    flex
    items-center
    justify-center
    space-x-2
    ${disabled || data.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}
    ${exportSuccess ? 'bg-green-500 hover:bg-green-600' : ''}
  `;

  return (
    <button
      onClick={handleExport}
      disabled={disabled || data.length === 0 || isExporting}
      className={buttonClasses}
      title={
        data.length === 0
          ? 'No data to export'
          : disabled
          ? 'Export disabled'
          : 'Export to CSV'
      }
    >
      {isExporting ? (
        <>
          <div className={`animate-spin rounded-full border-b-2 border-white ${iconSizes[size]}`}></div>
          {showText && <span>Exporting...</span>}
        </>
      ) : exportSuccess ? (
        <>
          {showIcon && <RiCheckLine className={iconSizes[size]} />}
          {showText && <span>Exported!</span>}
        </>
      ) : (
        <>
          {showIcon && <RiDownloadLine className={iconSizes[size]} />}
          {showText && <span>Export CSV</span>}
        </>
      )}
    </button>
  );
}

/**
 * Excel-style export button variant
 */
export function ExportToExcelButton(props: ExportButtonProps) {
  return (
    <ExportButton
      {...props}
      showIcon={true}
      variant="secondary"
      className="border border-green-500/30 text-green-500 hover:bg-green-500/10"
    >
      <RiFileExcelLine className="w-4 h-4 mr-2" />
      <span>Export to Excel</span>
    </ExportButton>
  );
}

/**
 * Compact icon-only export button
 */
export function CompactExportButton(props: ExportButtonProps) {
  return (
    <ExportButton
      {...props}
      size="sm"
      variant="outline"
      showIcon={true}
      showText={false}
    />
  );
}
