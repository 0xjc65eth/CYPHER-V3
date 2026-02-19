'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  RiFileTextLine,
  RiDownloadLine,
  RiInformationLine,
  RiArrowRightLine,
  RiCheckDoubleLine,
  RiAlertLine,
} from 'react-icons/ri';
import {
  calculateTaxReport,
  formatTaxReportForExport,
  type TaxJurisdiction,
  type TaxReportSummary,
  type TaxTransaction,
} from '@/lib/tax/tax-calculator';
import { convertToCSV, downloadCSV, generateFilename, type ExportColumn } from '@/lib/export/csv-exporter';

interface TaxReportGeneratorProps {
  transactions?: TaxTransaction[];
}

export function TaxReportGenerator({ transactions = [] }: TaxReportGeneratorProps) {
  const currentYear = new Date().getFullYear();

  const [taxYear, setTaxYear] = useState<number>(currentYear - 1);
  const [jurisdiction, setJurisdiction] = useState<TaxJurisdiction>('us');
  const [report, setReport] = useState<TaxReportSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateReport = async () => {
    setError('');
    setIsGenerating(true);

    try {
      // If no transactions provided, use mock data
      const txData = transactions.length > 0 ? transactions : getMockTransactions();

      // Calculate tax report
      const taxReport = calculateTaxReport(txData, taxYear, jurisdiction);
      setReport(taxReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tax report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportTXT = () => {
    if (!report) return;

    const content = formatTaxReportForExport(report);
    const filename = generateFilename(`tax_report_${taxYear}_${jurisdiction}`, 'txt');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!report) return;

    const columns: ExportColumn[] = [
      { key: 'saleDate', label: 'Sale Date', format: (v) => new Date(v).toLocaleDateString() },
      { key: 'asset', label: 'Asset' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'salePrice', label: 'Sale Price ($)' },
      { key: 'purchasePrice', label: 'Purchase Price ($)' },
      { key: 'costBasis', label: 'Cost Basis ($)' },
      { key: 'proceeds', label: 'Proceeds ($)' },
      { key: 'gainLoss', label: 'Gain/Loss ($)' },
      { key: 'holdingPeriod', label: 'Holding Period (days)' },
      { key: 'isLongTerm', label: 'Long-Term', format: (v) => (v ? 'Yes' : 'No') },
    ];

    const csv = convertToCSV(report.trades, columns, {
      title: `Tax Report ${taxYear} - ${jurisdiction.toUpperCase()}`,
      exportDate: new Date().toISOString(),
      totalRecords: report.trades.length,
      generatedBy: 'CYPHER V3 Tax Report Generator',
    });

    downloadCSV(csv, generateFilename(`tax_trades_${taxYear}_${jurisdiction}`));
  };

  return (
    <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 rounded-full bg-[#FF6B35]/20 flex items-center justify-center mr-3 border border-[#FF6B35]/30">
          <RiFileTextLine className="w-5 h-5 text-[#FF6B35]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Tax Report Generator</h3>
          <p className="text-sm text-gray-400">Generate capital gains/losses reports for tax filing</p>
        </div>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Tax Year */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tax Year <span className="text-red-500">*</span>
          </label>
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(parseInt(e.target.value))}
            className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
          >
            {Array.from({ length: 5 }, (_, i) => currentYear - i).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Jurisdiction */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tax Jurisdiction <span className="text-red-500">*</span>
          </label>
          <select
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value as TaxJurisdiction)}
            className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
          >
            <option value="us">United States</option>
            <option value="uk">United Kingdom</option>
            <option value="eu">European Union</option>
          </select>
        </div>

        {/* Generate Button */}
        <div className="flex items-end">
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="w-full px-6 py-3 rounded-lg bg-[#FF6B35] text-white hover:bg-[#FF8555] transition-colors font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <RiArrowRightLine className="w-5 h-5 mr-2" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-start">
          <RiAlertLine className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Report Results */}
      {report && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Net Capital Gains */}
            <div className={`rounded-lg p-4 border ${report.netCapitalGains >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <span className="text-xs text-gray-400 uppercase block mb-1">Net Capital Gains</span>
              <span className={`text-2xl font-bold ${report.netCapitalGains >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {report.netCapitalGains >= 0 ? '+' : ''}${report.netCapitalGains.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Total Tax Liability */}
            <div className="bg-[#FF6B35]/10 rounded-lg p-4 border border-[#FF6B35]/20">
              <span className="text-xs text-gray-400 uppercase block mb-1">Total Tax Liability</span>
              <span className="text-2xl font-bold text-[#FF6B35]">
                ${report.totalTaxLiability.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Total Trades */}
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
              <span className="text-xs text-gray-400 uppercase block mb-1">Total Trades</span>
              <span className="text-2xl font-bold text-blue-400">{report.totalTrades}</span>
              <span className="text-xs text-gray-400">Win Rate: {report.winRate.toFixed(1)}%</span>
            </div>

            {/* Total Fees */}
            <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
              <span className="text-xs text-gray-400 uppercase block mb-1">Total Fees Paid</span>
              <span className="text-2xl font-bold text-purple-400">
                ${report.totalFees.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Short-Term */}
            <div className="bg-[#0F1729]/50 rounded-lg p-5 border border-[#FF6B35]/20">
              <h4 className="text-white font-bold mb-4 flex items-center">
                <RiCheckDoubleLine className="w-5 h-5 mr-2 text-yellow-500" />
                Short-Term Capital Gains/Losses
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Gains:</span>
                  <span className="text-green-400 font-medium">
                    +${report.shortTermGains.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Losses:</span>
                  <span className="text-red-400 font-medium">
                    -${report.shortTermLosses.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#FF6B35]/20">
                  <span className="text-white font-medium">Net Short-Term:</span>
                  <span className={`font-bold ${report.netShortTerm >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {report.netShortTerm >= 0 ? '+' : ''}${report.netShortTerm.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tax Liability:</span>
                  <span className="text-[#FF6B35] font-bold">
                    ${report.shortTermTax.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Long-Term */}
            <div className="bg-[#0F1729]/50 rounded-lg p-5 border border-[#FF6B35]/20">
              <h4 className="text-white font-bold mb-4 flex items-center">
                <RiCheckDoubleLine className="w-5 h-5 mr-2 text-green-500" />
                Long-Term Capital Gains/Losses
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Gains:</span>
                  <span className="text-green-400 font-medium">
                    +${report.longTermGains.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Losses:</span>
                  <span className="text-red-400 font-medium">
                    -${report.longTermLosses.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#FF6B35]/20">
                  <span className="text-white font-medium">Net Long-Term:</span>
                  <span className={`font-bold ${report.netLongTerm >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {report.netLongTerm >= 0 ? '+' : ''}${report.netLongTerm.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tax Liability:</span>
                  <span className="text-[#FF6B35] font-bold">
                    ${report.longTermTax.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Loss Harvesting */}
          {report.harvestingOpportunities.length > 0 && (
            <div className="bg-yellow-500/10 rounded-lg p-5 border border-yellow-500/20">
              <h4 className="text-white font-bold mb-4 flex items-center">
                <RiInformationLine className="w-5 h-5 mr-2 text-yellow-500" />
                Tax Loss Harvesting Opportunities
              </h4>
              <div className="space-y-2">
                {report.harvestingOpportunities.slice(0, 3).map((opp, index) => (
                  <div key={index} className="bg-[#0F1729]/50 rounded p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium">{opp.asset}</span>
                      <span className="text-yellow-400 font-bold">
                        Save ${opp.potentialTaxSavings.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs">
                      Unrealized Loss: ${opp.unrealizedLoss.toFixed(2)} • {opp.recommendedAction}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={handleExportTXT}
              className="px-6 py-3 rounded-lg bg-[#FF6B35]/10 text-[#FF6B35] hover:bg-[#FF6B35]/20 transition-colors font-medium flex items-center border border-[#FF6B35]/20"
            >
              <RiDownloadLine className="w-5 h-5 mr-2" />
              Export Summary (TXT)
            </button>
            <button
              onClick={handleExportCSV}
              className="px-6 py-3 rounded-lg bg-[#FF6B35] text-white hover:bg-[#FF8555] transition-colors font-medium flex items-center"
            >
              <RiDownloadLine className="w-5 h-5 mr-2" />
              Export Trades (CSV)
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-[#FF6B35]/10 rounded-lg p-4 border border-[#FF6B35]/20">
        <div className="flex items-center mb-2">
          <RiInformationLine className="w-4 h-4 text-[#FF6B35] mr-2" />
          <span className="text-white font-medium text-sm">Important Tax Information</span>
        </div>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• This report is for informational purposes only - consult a tax professional</li>
          <li>• Uses LIFO (Last In, First Out) accounting method</li>
          <li>• Short-term: Assets held ≤ 1 year (taxed as ordinary income)</li>
          <li>• Long-term: Assets held &gt; 1 year (preferential tax rates)</li>
          <li>• Tax rates shown are top brackets - your actual rate may be lower</li>
          <li>• Always keep detailed transaction records for IRS/HMRC audits</li>
        </ul>
      </div>
    </Card>
  );
}

// Mock transactions for demo
function getMockTransactions(): TaxTransaction[] {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  return [
    // Purchases
    {
      id: 'tx_001',
      type: 'buy',
      asset: 'BTC',
      amount: 0.5,
      price: 40000,
      fee: 50,
      timestamp: now - 400 * oneDay,
    },
    {
      id: 'tx_002',
      type: 'buy',
      asset: 'ETH',
      amount: 5,
      price: 2000,
      fee: 20,
      timestamp: now - 350 * oneDay,
    },
    // Sales (profitable)
    {
      id: 'tx_003',
      type: 'sell',
      asset: 'BTC',
      amount: 0.25,
      price: 50000,
      fee: 30,
      timestamp: now - 50 * oneDay,
    },
    {
      id: 'tx_004',
      type: 'sell',
      asset: 'ETH',
      amount: 2,
      price: 2500,
      fee: 15,
      timestamp: now - 30 * oneDay,
    },
  ];
}
