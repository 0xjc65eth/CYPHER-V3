'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  calculatePositionSize,
  calculateKellyCriterion,
  calculateExpectedValue,
  calculateStopLossTakeProfit,
  type PositionSizingInput,
} from '@/lib/calculators/position-sizing';
import { RiCalculatorLine, RiAlertLine, RiCheckLine, RiInformationLine } from 'react-icons/ri';

export function PositionSizingCalculator() {
  const [portfolioValue, setPortfolioValue] = useState<string>('100000');
  const [riskPercentage, setRiskPercentage] = useState<string>('2');
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('');

  // Kelly Criterion inputs
  const [winProbability, setWinProbability] = useState<string>('60');
  const [showKelly, setShowKelly] = useState(false);

  // Calculate position sizing
  const input: PositionSizingInput = {
    portfolioValue: parseFloat(portfolioValue) || 0,
    riskPercentage: parseFloat(riskPercentage) || 0,
    entryPrice: parseFloat(entryPrice) || 0,
    stopLossPrice: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
    takeProfitPrice: takeProfitPrice ? parseFloat(takeProfitPrice) : undefined,
  };

  const result = calculatePositionSize(input);

  // Calculate Kelly Criterion
  let kellyResult: ReturnType<typeof calculateKellyCriterion> | null = null;
  if (showKelly && result.riskPerUnit > 0 && result.expectedProfit !== undefined) {
    const winProb = parseFloat(winProbability) / 100;
    kellyResult = calculateKellyCriterion(
      winProb,
      result.expectedProfit / result.positionSize,
      result.riskPerUnit
    );
  }

  // Calculate EV
  let evResult: ReturnType<typeof calculateExpectedValue> | null = null;
  if (result.expectedProfit !== undefined && result.riskPerUnit > 0) {
    const winProb = parseFloat(winProbability) / 100;
    const lossProb = 1 - winProb;
    evResult = calculateExpectedValue(
      winProb,
      result.expectedProfit / result.positionSize,
      lossProb,
      result.riskPerUnit
    );
  }

  // Quick risk/reward calculator
  const [quickRiskReward, setQuickRiskReward] = useState<string>('2');
  const [quickRiskPercent, setQuickRiskPercent] = useState<string>('5');
  let quickLevels: ReturnType<typeof calculateStopLossTakeProfit> | null = null;
  if (entryPrice && parseFloat(entryPrice) > 0) {
    quickLevels = calculateStopLossTakeProfit(
      parseFloat(entryPrice),
      parseFloat(quickRiskReward) || 2,
      parseFloat(quickRiskPercent) || 5
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 rounded-full bg-[#FF6B35]/20 flex items-center justify-center mr-3 border border-[#FF6B35]/30">
          <RiCalculatorLine className="w-5 h-5 text-[#FF6B35]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Position Sizing Calculator</h3>
          <p className="text-sm text-gray-400">Calculate optimal position sizes based on risk</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-white uppercase border-b border-[#FF6B35]/20 pb-2">
            Portfolio & Risk
          </h4>

          {/* Portfolio Value */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Portfolio Value ($)</label>
            <input
              type="number"
              value={portfolioValue}
              onChange={(e) => setPortfolioValue(e.target.value)}
              className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
              placeholder="100000"
            />
          </div>

          {/* Risk Percentage */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Risk Per Trade (%)
              <span className="ml-2 text-xs text-[#FF6B35]">Recommended: 1-2%</span>
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={riskPercentage}
                onChange={(e) => setRiskPercentage(e.target.value)}
                className="flex-1"
              />
              <input
                type="number"
                value={riskPercentage}
                onChange={(e) => setRiskPercentage(e.target.value)}
                className="w-20 bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF6B35]"
                step="0.5"
              />
            </div>
          </div>

          <h4 className="text-sm font-bold text-white uppercase border-b border-[#FF6B35]/20 pb-2 mt-6">
            Trade Parameters
          </h4>

          {/* Entry Price */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Entry Price ($)</label>
            <input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
              placeholder="50000"
            />
          </div>

          {/* Stop Loss */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Stop Loss Price ($) - Optional</label>
            <input
              type="number"
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(e.target.value)}
              className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
              placeholder="48000"
            />
          </div>

          {/* Take Profit */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Take Profit Price ($) - Optional</label>
            <input
              type="number"
              value={takeProfitPrice}
              onChange={(e) => setTakeProfitPrice(e.target.value)}
              className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
              placeholder="54000"
            />
          </div>

          {/* Quick Stop Loss / Take Profit Calculator */}
          {quickLevels && (
            <div className="bg-[#FF6B35]/10 rounded-lg p-4 border border-[#FF6B35]/20 mt-4">
              <h5 className="text-sm font-bold text-white mb-3">Quick Levels Calculator</h5>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Risk/Reward Ratio</label>
                  <input
                    type="number"
                    value={quickRiskReward}
                    onChange={(e) => setQuickRiskReward(e.target.value)}
                    className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded px-2 py-1 text-sm text-white"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Risk %</label>
                  <input
                    type="number"
                    value={quickRiskPercent}
                    onChange={(e) => setQuickRiskPercent(e.target.value)}
                    className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded px-2 py-1 text-sm text-white"
                    step="0.5"
                  />
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Stop Loss:</span>
                  <span className="text-red-500 font-bold">${quickLevels.stopLossPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Take Profit:</span>
                  <span className="text-green-500 font-bold">${quickLevels.takeProfitPrice.toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setStopLossPrice(quickLevels!.stopLossPrice.toFixed(2));
                  setTakeProfitPrice(quickLevels!.takeProfitPrice.toFixed(2));
                }}
                className="w-full mt-3 px-3 py-2 bg-[#FF6B35] text-white rounded-lg text-xs font-medium hover:bg-[#FF8555] transition-colors"
              >
                Use These Levels
              </button>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-white uppercase border-b border-[#FF6B35]/20 pb-2">
            Calculation Results
          </h4>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start">
                <RiAlertLine className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {result.warnings.map((warning, index) => (
                    <p key={index} className="text-sm text-yellow-300">
                      {warning}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Viability Status */}
          <div
            className={`rounded-lg p-4 border ${
              result.isViable
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center">
              {result.isViable ? (
                <>
                  <RiCheckLine className="w-5 h-5 text-green-500 mr-2" />
                  <span className="text-green-300 font-medium">Trade is viable</span>
                </>
              ) : (
                <>
                  <RiAlertLine className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-red-300 font-medium">Trade is NOT viable - fix warnings</span>
                </>
              )}
            </div>
          </div>

          {/* Position Sizing Results */}
          <div className="space-y-3">
            <div className="bg-[#FF6B35]/10 rounded-lg p-4 border border-[#FF6B35]/20">
              <span className="text-xs text-gray-400 uppercase block mb-1">Position Size</span>
              <span className="text-3xl font-bold text-[#FF6B35]">
                {result.positionSize.toLocaleString('en-US', { maximumFractionDigits: 4 })} units
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#FF6B35]/10 rounded-lg p-3 border border-[#FF6B35]/20">
                <span className="text-xs text-gray-400 uppercase block mb-1">Position Value</span>
                <span className="text-xl font-bold text-white">
                  ${result.positionValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </div>

              <div className="bg-[#FF6B35]/10 rounded-lg p-3 border border-[#FF6B35]/20">
                <span className="text-xs text-gray-400 uppercase block mb-1">Portfolio %</span>
                <span className="text-xl font-bold text-white">
                  {result.portfolioPercentage.toFixed(2)}%
                </span>
              </div>

              <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                <span className="text-xs text-gray-400 uppercase block mb-1">Max Loss</span>
                <span className="text-xl font-bold text-red-500">
                  ${result.maxLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-red-400">
                  ({result.maxLossPercentage.toFixed(2)}% of portfolio)
                </span>
              </div>

              {result.expectedProfit !== undefined && (
                <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                  <span className="text-xs text-gray-400 uppercase block mb-1">Expected Profit</span>
                  <span className="text-xl font-bold text-green-500">
                    ${result.expectedProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs text-green-400">
                    ({result.expectedProfitPercentage?.toFixed(2)}% of portfolio)
                  </span>
                </div>
              )}
            </div>

            {result.riskRewardRatio !== undefined && (
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                <span className="text-xs text-gray-400 uppercase block mb-1">Risk/Reward Ratio</span>
                <span className="text-2xl font-bold text-blue-400">1 : {result.riskRewardRatio.toFixed(2)}</span>
                <p className="text-xs text-gray-400 mt-1">
                  {result.riskRewardRatio >= 2
                    ? '✅ Excellent risk/reward'
                    : result.riskRewardRatio >= 1
                    ? '⚠️ Acceptable but aim for 2:1 or better'
                    : '❌ Poor risk/reward - avoid this trade'}
                </p>
              </div>
            )}
          </div>

          {/* Kelly Criterion */}
          <div>
            <button
              onClick={() => setShowKelly(!showKelly)}
              className="w-full px-4 py-2 bg-[#FF6B35]/10 text-[#FF6B35] rounded-lg text-sm font-medium hover:bg-[#FF6B35]/20 transition-colors border border-[#FF6B35]/20"
            >
              {showKelly ? 'Hide' : 'Show'} Kelly Criterion & EV Calculator
            </button>

            {showKelly && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Win Probability (%)</label>
                  <input
                    type="number"
                    value={winProbability}
                    onChange={(e) => setWinProbability(e.target.value)}
                    className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
                    placeholder="60"
                    min="0"
                    max="100"
                  />
                </div>

                {kellyResult && (
                  <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                    <h5 className="text-sm font-bold text-white mb-2">Kelly Criterion</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Full Kelly:</span>
                        <span className="text-white font-bold">{kellyResult.kellyPercentage.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Half Kelly (Safer):</span>
                        <span className="text-purple-400 font-bold">{kellyResult.halfKellyPercentage.toFixed(2)}%</span>
                      </div>
                      <p className="text-xs text-gray-300 mt-2">{kellyResult.recommendation}</p>
                    </div>
                  </div>
                )}

                {evResult && (
                  <div className={`rounded-lg p-4 border ${evResult.isPositiveEV ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <h5 className="text-sm font-bold text-white mb-2">Expected Value (EV)</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">EV per unit:</span>
                        <span className={`font-bold ${evResult.isPositiveEV ? 'text-green-400' : 'text-red-400'}`}>
                          ${evResult.expectedValue.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">EV %:</span>
                        <span className={`font-bold ${evResult.isPositiveEV ? 'text-green-400' : 'text-red-400'}`}>
                          {evResult.expectedValuePercentage.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 mt-2">{evResult.recommendation}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-[#FF6B35]/10 rounded-lg p-4 border border-[#FF6B35]/20">
            <div className="flex items-center mb-2">
              <RiInformationLine className="w-4 h-4 text-[#FF6B35] mr-2" />
              <span className="text-white font-medium text-sm">How to Use</span>
            </div>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• Enter your portfolio value and risk tolerance (1-2% recommended)</li>
              <li>• Set your entry price and stop loss level</li>
              <li>• Calculator determines optimal position size to match your risk</li>
              <li>• Use Kelly Criterion for optimal bet sizing based on edge</li>
              <li>• Always verify calculations before trading</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
