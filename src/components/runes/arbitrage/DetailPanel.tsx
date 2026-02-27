'use client';

import { TrendingUp, DollarSign, Zap, Clock, Shield, ArrowRight, ExternalLink } from 'lucide-react';
import type { ArbitrageOpportunity } from './types';

const safeFixed = (value: any, decimals = 2): string =>
  (typeof value === 'number' && !isNaN(value)) ? value.toFixed(decimals) : '0.00';

function getMarketplaceUrl(marketplace: string, rune: string): string {
  const encoded = encodeURIComponent(rune);
  switch (marketplace) {
    case 'Magic Eden':
      return `https://magiceden.io/runes/${encoded}`;
    case 'OKX':
      return `https://www.okx.com/web3/marketplace/runes/token/${encoded}`;
    case 'UniSat':
      return `https://unisat.io/runes/market?tick=${encoded}`;
    default:
      return `https://ordinals.com/rune/${encoded}`;
  }
}

export function DetailPanel({ opp }: { opp: ArbitrageOpportunity }) {
  const prices = [
    { name: 'Magic Eden', price: opp.magicEdenPrice, color: 'bg-pink-500' },
    { name: 'UniSat', price: opp.uniSatPrice, color: 'bg-yellow-500' },
  ];
  const maxPrice = Math.max(...prices.map((p) => p.price));

  const buyPrice = Math.min(opp.magicEdenPrice, opp.uniSatPrice);
  const sellPrice = Math.max(opp.magicEdenPrice, opp.uniSatPrice);
  const buyFee = buyPrice * 0.02;
  const sellFee = sellPrice * 0.02;
  const networkFee = buyPrice * 0.005;
  const totalFees = buyFee + sellFee + networkFee;

  const riskLevel = opp.confidence >= 70 ? 'Low' : opp.confidence >= 40 ? 'Medium' : 'High';
  const riskColor = riskLevel === 'Low' ? 'text-green-400' : riskLevel === 'Medium' ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="p-4 space-y-4 border-t border-gray-700/50">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Price Comparison */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Price Comparison (sats)
          </h4>
          <div className="space-y-1.5">
            {prices.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-16 truncate">{p.name}</span>
                <div className="flex-1 bg-gray-800 rounded h-4 overflow-hidden">
                  <div
                    className={`${p.color} h-full rounded transition-all`}
                    style={{ width: `${maxPrice > 0 ? (p.price / maxPrice) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-300 font-mono w-14 text-right">
                  {p.price.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fee Breakdown */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Fee Breakdown (sats)
          </h4>
          <div className="bg-gray-800/60 rounded border border-gray-700 text-[11px]">
            {[
              { label: 'Buy Fee (2%)', value: buyFee },
              { label: 'Sell Fee (2%)', value: sellFee },
              { label: 'Network Fee (~0.5%)', value: networkFee },
            ].map((fee) => (
              <div key={fee.label} className="flex justify-between px-3 py-1.5 border-b border-gray-700/50">
                <span className="text-gray-400">{fee.label}</span>
                <span className="text-gray-300 font-mono">{Math.round(fee.value).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between px-3 py-1.5 font-semibold">
              <span className="text-gray-200">Total Fees</span>
              <span className="text-orange-400 font-mono">{Math.round(totalFees).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Execution Steps */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Execution Plan
          </h4>
          <div className="space-y-1.5">
            {[
              { text: `Buy on ${opp.bestBuy} at ${buyPrice.toLocaleString()} sats`, marketplace: opp.bestBuy },
              { text: `Transfer to ${opp.bestSell} wallet`, marketplace: '' },
              { text: `Sell on ${opp.bestSell} at ${sellPrice.toLocaleString()} sats`, marketplace: opp.bestSell },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-orange-900/50 border border-orange-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[9px] text-orange-400 font-bold">{i + 1}</span>
                </div>
                <span className="text-[11px] text-gray-300">
                  {step.text}
                  {step.marketplace && (
                    <a href={getMarketplaceUrl(step.marketplace, opp.spacedName)} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-400 hover:text-blue-300 transition-colors">
                      <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 pt-1 text-[10px]">
            <span className="text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Est. time: ~{opp.estimatedTimeMinutes} min
            </span>
            <span className={`flex items-center gap-1 ${riskColor}`}>
              <Shield className="w-3 h-3" /> Risk: {riskLevel}
            </span>
            <span className="text-gray-400 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Difficulty: {opp.executionDifficulty}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-500 pt-0.5">
            <ArrowRight className="w-3 h-3" />
            <span>
              Net result:{' '}
              <span className={opp.netProfit > 0 ? 'text-green-400' : 'text-red-400'}>
                {opp.netProfit > 0 ? '+' : ''}{safeFixed(opp.netProfit)}% after all fees
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
