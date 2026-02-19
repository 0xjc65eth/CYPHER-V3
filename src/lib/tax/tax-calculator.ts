/**
 * Tax Calculator for Cryptocurrency Transactions
 * Supports US, UK, and EU tax rules
 */

export type TaxJurisdiction = 'us' | 'uk' | 'eu';
export type TransactionType = 'buy' | 'sell' | 'trade' | 'mint' | 'receive' | 'send';

export interface TaxTransaction {
  id: string;
  type: TransactionType;
  asset: string;
  amount: number;
  price: number; // USD value at time of transaction
  fee: number;
  timestamp: number;
  txHash?: string;
  from?: string;
  to?: string;
}

export interface TaxableTrade {
  saleId: string;
  purchaseId: string;
  asset: string;
  quantity: number;
  salePrice: number;
  purchasePrice: number;
  saleDate: number;
  purchaseDate: number;
  holdingPeriod: number; // in days
  proceeds: number;
  costBasis: number;
  gainLoss: number;
  isLongTerm: boolean;
  saleFee: number;
  purchaseFee: number;
}

export interface TaxReportSummary {
  taxYear: number;
  jurisdiction: TaxJurisdiction;

  // Gains/Losses
  shortTermGains: number;
  shortTermLosses: number;
  longTermGains: number;
  longTermLosses: number;
  netShortTerm: number;
  netLongTerm: number;
  netCapitalGains: number;

  // Tax liability
  shortTermTax: number;
  longTermTax: number;
  totalTaxLiability: number;

  // Trade statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;

  // Other income
  mintIncome: number; // Income from minting
  receiveIncome: number; // Income from receiving crypto (airdrops, gifts)
  stakingIncome: number; // Staking rewards
  otherIncome: number;
  totalIncome: number;

  // Deductions
  totalFees: number;

  // Reporting
  trades: TaxableTrade[];
  harvestingOpportunities: TaxLossHarvestingOpportunity[];
}

export interface TaxLossHarvestingOpportunity {
  asset: string;
  currentPrice: number;
  costBasis: number;
  unrealizedLoss: number;
  potentialTaxSavings: number;
  holdingPeriod: number;
  recommendedAction: string;
}

export interface TaxRates {
  shortTerm: number; // Short-term capital gains rate (ordinary income)
  longTerm: number; // Long-term capital gains rate
}

/**
 * Get tax rates by jurisdiction
 */
export function getTaxRates(jurisdiction: TaxJurisdiction): TaxRates {
  const rates: Record<TaxJurisdiction, TaxRates> = {
    us: {
      shortTerm: 0.37, // Top federal bracket (37%)
      longTerm: 0.20, // Long-term capital gains (20%)
    },
    uk: {
      shortTerm: 0.20, // Capital Gains Tax (20%)
      longTerm: 0.20, // Same rate for all holding periods
    },
    eu: {
      shortTerm: 0.25, // Average EU rate (varies by country)
      longTerm: 0.25, // Average EU rate
    },
  };

  return rates[jurisdiction];
}

/**
 * Calculate tax report for a given year
 */
export function calculateTaxReport(
  transactions: TaxTransaction[],
  taxYear: number,
  jurisdiction: TaxJurisdiction = 'us'
): TaxReportSummary {
  const rates = getTaxRates(jurisdiction);
  const oneYear = 365 * 24 * 60 * 60 * 1000; // One year in milliseconds

  // Filter transactions for the tax year
  const yearStart = new Date(taxYear, 0, 1).getTime();
  const yearEnd = new Date(taxYear, 11, 31, 23, 59, 59).getTime();

  const yearTransactions = transactions.filter(
    tx => tx.timestamp >= yearStart && tx.timestamp <= yearEnd
  );

  // Separate sales from purchases
  const sales = yearTransactions.filter(tx => tx.type === 'sell' || tx.type === 'trade');
  const purchases = transactions.filter(tx => tx.type === 'buy' || tx.type === 'mint' || tx.type === 'receive');

  // Calculate taxable trades using LIFO (Last In, First Out)
  const trades: TaxableTrade[] = [];

  sales.forEach(sale => {
    // Find matching purchases (LIFO - most recent first)
    const matchingPurchases = purchases
      .filter(p => p.asset === sale.asset && p.timestamp < sale.timestamp)
      .sort((a, b) => b.timestamp - a.timestamp); // LIFO

    let remainingQty = sale.amount;

    for (const purchase of matchingPurchases) {
      if (remainingQty <= 0) break;

      const qty = Math.min(remainingQty, purchase.amount);
      const holdingPeriod = sale.timestamp - purchase.timestamp;
      const isLongTerm = holdingPeriod > oneYear;

      const proceeds = qty * sale.price;
      const costBasis = qty * purchase.price;
      const gainLoss = proceeds - costBasis - sale.fee - purchase.fee;

      trades.push({
        saleId: sale.id,
        purchaseId: purchase.id,
        asset: sale.asset,
        quantity: qty,
        salePrice: sale.price,
        purchasePrice: purchase.price,
        saleDate: sale.timestamp,
        purchaseDate: purchase.timestamp,
        holdingPeriod: Math.floor(holdingPeriod / (24 * 60 * 60 * 1000)), // days
        proceeds,
        costBasis,
        gainLoss,
        isLongTerm,
        saleFee: (sale.fee / sale.amount) * qty,
        purchaseFee: (purchase.fee / purchase.amount) * qty,
      });

      remainingQty -= qty;
      purchase.amount -= qty; // Reduce available quantity
    }
  });

  // Calculate totals
  let shortTermGains = 0;
  let shortTermLosses = 0;
  let longTermGains = 0;
  let longTermLosses = 0;

  trades.forEach(trade => {
    if (trade.isLongTerm) {
      if (trade.gainLoss > 0) {
        longTermGains += trade.gainLoss;
      } else {
        longTermLosses += Math.abs(trade.gainLoss);
      }
    } else {
      if (trade.gainLoss > 0) {
        shortTermGains += trade.gainLoss;
      } else {
        shortTermLosses += Math.abs(trade.gainLoss);
      }
    }
  });

  const netShortTerm = shortTermGains - shortTermLosses;
  const netLongTerm = longTermGains - longTermLosses;
  const netCapitalGains = netShortTerm + netLongTerm;

  // Calculate tax liability
  const shortTermTax = Math.max(0, netShortTerm) * rates.shortTerm;
  const longTermTax = Math.max(0, netLongTerm) * rates.longTerm;
  const totalTaxLiability = shortTermTax + longTermTax;

  // Calculate other income
  const mints = yearTransactions.filter(tx => tx.type === 'mint');
  const receives = yearTransactions.filter(tx => tx.type === 'receive');

  const mintIncome = mints.reduce((sum, tx) => sum + (tx.amount * tx.price), 0);
  const receiveIncome = receives.reduce((sum, tx) => sum + (tx.amount * tx.price), 0);
  const totalIncome = mintIncome + receiveIncome;

  // Calculate total fees
  const totalFees = yearTransactions.reduce((sum, tx) => sum + tx.fee, 0);

  // Calculate trade statistics
  const winningTrades = trades.filter(t => t.gainLoss > 0).length;
  const losingTrades = trades.filter(t => t.gainLoss < 0).length;
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

  // Find tax loss harvesting opportunities (from unrealized losses)
  const harvestingOpportunities = findTaxLossHarvestingOpportunities(
    transactions,
    jurisdiction,
    yearEnd
  );

  return {
    taxYear,
    jurisdiction,
    shortTermGains,
    shortTermLosses,
    longTermGains,
    longTermLosses,
    netShortTerm,
    netLongTerm,
    netCapitalGains,
    shortTermTax,
    longTermTax,
    totalTaxLiability,
    totalTrades: trades.length,
    winningTrades,
    losingTrades,
    winRate,
    mintIncome,
    receiveIncome,
    stakingIncome: 0, // Would require staking data
    otherIncome: 0,
    totalIncome,
    totalFees,
    trades,
    harvestingOpportunities,
  };
}

/**
 * Find tax loss harvesting opportunities
 */
function findTaxLossHarvestingOpportunities(
  transactions: TaxTransaction[],
  jurisdiction: TaxJurisdiction,
  asOfDate: number
): TaxLossHarvestingOpportunity[] {
  const rates = getTaxRates(jurisdiction);
  const opportunities: TaxLossHarvestingOpportunity[] = [];

  // Group purchases by asset
  const purchases = transactions.filter(tx => tx.type === 'buy' || tx.type === 'mint');
  const assetPurchases = new Map<string, TaxTransaction[]>();

  purchases.forEach(purchase => {
    if (!assetPurchases.has(purchase.asset)) {
      assetPurchases.set(purchase.asset, []);
    }
    assetPurchases.get(purchase.asset)!.push(purchase);
  });

  // For each asset, find unrealized losses
  assetPurchases.forEach((purchases, asset) => {
    purchases.forEach(purchase => {
      // Simulate current price as 80% of purchase price (would use real current price)
      const currentPrice = purchase.price * 0.8;
      const unrealizedLoss = (purchase.price - currentPrice) * purchase.amount;

      if (unrealizedLoss > 0) {
        const potentialTaxSavings = unrealizedLoss * rates.shortTerm;
        const holdingPeriod = Math.floor((asOfDate - purchase.timestamp) / (24 * 60 * 60 * 1000));

        opportunities.push({
          asset,
          currentPrice,
          costBasis: purchase.price,
          unrealizedLoss,
          potentialTaxSavings,
          holdingPeriod,
          recommendedAction: potentialTaxSavings > 100
            ? 'Sell to harvest loss and reduce tax liability'
            : 'Loss too small to justify transaction fees',
        });
      }
    });
  });

  // Sort by potential tax savings (highest first)
  return opportunities
    .sort((a, b) => b.potentialTaxSavings - a.potentialTaxSavings)
    .slice(0, 10); // Top 10 opportunities
}

/**
 * Format tax report for export
 */
export function formatTaxReportForExport(report: TaxReportSummary): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push(`TAX REPORT - ${report.taxYear}`);
  lines.push(`Jurisdiction: ${report.jurisdiction.toUpperCase()}`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('='.repeat(80));
  lines.push('');

  lines.push('CAPITAL GAINS/LOSSES SUMMARY');
  lines.push('-'.repeat(80));
  lines.push(`Short-Term Gains:    $${report.shortTermGains.toFixed(2)}`);
  lines.push(`Short-Term Losses:   $${report.shortTermLosses.toFixed(2)}`);
  lines.push(`Net Short-Term:      $${report.netShortTerm.toFixed(2)}`);
  lines.push('');
  lines.push(`Long-Term Gains:     $${report.longTermGains.toFixed(2)}`);
  lines.push(`Long-Term Losses:    $${report.longTermLosses.toFixed(2)}`);
  lines.push(`Net Long-Term:       $${report.netLongTerm.toFixed(2)}`);
  lines.push('');
  lines.push(`NET CAPITAL GAINS:   $${report.netCapitalGains.toFixed(2)}`);
  lines.push('');

  lines.push('TAX LIABILITY');
  lines.push('-'.repeat(80));
  lines.push(`Short-Term Tax:      $${report.shortTermTax.toFixed(2)}`);
  lines.push(`Long-Term Tax:       $${report.longTermTax.toFixed(2)}`);
  lines.push(`TOTAL TAX:           $${report.totalTaxLiability.toFixed(2)}`);
  lines.push('');

  lines.push('OTHER INCOME');
  lines.push('-'.repeat(80));
  lines.push(`Minting Income:      $${report.mintIncome.toFixed(2)}`);
  lines.push(`Received Income:     $${report.receiveIncome.toFixed(2)}`);
  lines.push(`Total Other Income:  $${report.totalIncome.toFixed(2)}`);
  lines.push('');

  lines.push('STATISTICS');
  lines.push('-'.repeat(80));
  lines.push(`Total Trades:        ${report.totalTrades}`);
  lines.push(`Winning Trades:      ${report.winningTrades}`);
  lines.push(`Losing Trades:       ${report.losingTrades}`);
  lines.push(`Win Rate:            ${report.winRate.toFixed(1)}%`);
  lines.push(`Total Fees Paid:     $${report.totalFees.toFixed(2)}`);
  lines.push('');

  return lines.join('\n');
}
