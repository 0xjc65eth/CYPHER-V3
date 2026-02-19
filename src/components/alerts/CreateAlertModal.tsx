'use client';

import { useState } from 'react';
import { RiCloseLine, RiAlertLine, RiCheckLine } from 'react-icons/ri';
import { useAlerts } from '@/hooks/useAlerts';

interface CreateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export function CreateAlertModal({ isOpen, onClose, userId }: CreateAlertModalProps) {
  const { createAlert } = useAlerts(userId);

  const [alertType, setAlertType] = useState<string>('price');
  const [name, setName] = useState('');
  const [asset, setAsset] = useState('BTC');
  const [assetType, setAssetType] = useState<'crypto' | 'ordinal' | 'rune'>('crypto');

  // Price alert fields
  const [condition, setCondition] = useState<'above' | 'below' | 'crosses_above' | 'crosses_below'>('above');
  const [targetPrice, setTargetPrice] = useState('');

  // Volume alert fields
  const [multiplier, setMultiplier] = useState('2');
  const [volumeTimeframe, setVolumeTimeframe] = useState<'1h' | '24h' | '7d'>('24h');

  // Whale alert fields
  const [whaleThreshold, setWhaleThreshold] = useState('100000');
  const [whaleDirection, setWhaleDirection] = useState<'buy' | 'sell' | 'both'>('both');

  // Milestone alert fields
  const [milestone, setMilestone] = useState<'ath' | 'atl' | 'new_high' | 'new_low'>('ath');
  const [milestoneTimeframe, setMilestoneTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('all');

  // Trend alert fields
  const [trendType, setTrendType] = useState<'breakout' | 'breakdown' | 'bullish_reversal' | 'bearish_reversal'>('breakout');
  const [sensitivity, setSensitivity] = useState<'low' | 'medium' | 'high'>('medium');

  // Notification settings
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [oneTime, setOneTime] = useState(false);

  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const alertData: any = {
        type: alertType,
        name,
        asset,
        assetType,
        description,
        notifyInApp,
        notifyEmail,
        oneTime,
      };

      // Add type-specific fields
      switch (alertType) {
        case 'price':
          if (!targetPrice) {
            throw new Error('Target price is required');
          }
          alertData.condition = condition;
          alertData.targetPrice = parseFloat(targetPrice);
          break;

        case 'volume':
          alertData.multiplier = parseFloat(multiplier);
          alertData.timeframe = volumeTimeframe;
          break;

        case 'whale':
          alertData.threshold = parseFloat(whaleThreshold);
          alertData.direction = whaleDirection;
          break;

        case 'milestone':
          alertData.milestone = milestone;
          alertData.timeframe = milestoneTimeframe;
          break;

        case 'trend':
          alertData.trendType = trendType;
          alertData.sensitivity = sensitivity;
          break;
      }

      await createAlert.mutateAsync(alertData);

      // Reset form
      setName('');
      setDescription('');
      setTargetPrice('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-[#FF6B35]/20">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-b border-[#FF6B35]/20 p-6 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-[#FF6B35]/20 flex items-center justify-center mr-3 border border-[#FF6B35]/30">
              <RiAlertLine className="w-5 h-5 text-[#FF6B35]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Create New Alert</h3>
              <p className="text-sm text-gray-400">Set up notifications for market events</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#FF6B35]/10 text-gray-400 hover:text-white transition-colors"
          >
            <RiCloseLine className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start">
              <RiAlertLine className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Alert Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Alert Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
              placeholder="e.g., BTC Above $100k"
              required
            />
          </div>

          {/* Alert Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Alert Type <span className="text-red-500">*</span>
            </label>
            <select
              value={alertType}
              onChange={(e) => setAlertType(e.target.value)}
              className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
            >
              <option value="price">Price Alert</option>
              <option value="volume">Volume Spike Alert</option>
              <option value="whale">Whale Movement Alert</option>
              <option value="milestone">Milestone Alert (ATH/ATL)</option>
              <option value="trend">Trend Change Alert</option>
            </select>
          </div>

          {/* Asset Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Asset Type
              </label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as any)}
                className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
              >
                <option value="crypto">Cryptocurrency</option>
                <option value="ordinal">Ordinals Collection</option>
                <option value="rune">Rune</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Asset <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
                placeholder={assetType === 'crypto' ? 'BTC' : assetType === 'ordinal' ? 'NodeMonkes' : 'RUNESTONE'}
                required
              />
            </div>
          </div>

          {/* Type-Specific Fields */}
          {alertType === 'price' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
                >
                  <option value="above">Above</option>
                  <option value="below">Below</option>
                  <option value="crosses_above">Crosses Above</option>
                  <option value="crosses_below">Crosses Below</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Price ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
                  placeholder="100000"
                  step="0.01"
                  required
                />
              </div>
            </div>
          )}

          {alertType === 'volume' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Volume Multiplier
                </label>
                <input
                  type="number"
                  value={multiplier}
                  onChange={(e) => setMultiplier(e.target.value)}
                  className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
                  placeholder="2"
                  step="0.1"
                  min="1"
                />
                <p className="text-xs text-gray-400 mt-1">Alert when volume exceeds {multiplier}x average</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Timeframe
                </label>
                <select
                  value={volumeTimeframe}
                  onChange={(e) => setVolumeTimeframe(e.target.value as any)}
                  className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
                >
                  <option value="1h">1 Hour</option>
                  <option value="24h">24 Hours</option>
                  <option value="7d">7 Days</option>
                </select>
              </div>
            </div>
          )}

          {alertType === 'whale' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Transaction ($)
                </label>
                <input
                  type="number"
                  value={whaleThreshold}
                  onChange={(e) => setWhaleThreshold(e.target.value)}
                  className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
                  placeholder="100000"
                  step="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Direction
                </label>
                <select
                  value={whaleDirection}
                  onChange={(e) => setWhaleDirection(e.target.value as any)}
                  className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
                >
                  <option value="both">Both Buy & Sell</option>
                  <option value="buy">Buy Only</option>
                  <option value="sell">Sell Only</option>
                </select>
              </div>
            </div>
          )}

          {alertType === 'milestone' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Milestone Type
                </label>
                <select
                  value={milestone}
                  onChange={(e) => setMilestone(e.target.value as any)}
                  className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
                >
                  <option value="ath">All-Time High</option>
                  <option value="atl">All-Time Low</option>
                  <option value="new_high">New Period High</option>
                  <option value="new_low">New Period Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Timeframe
                </label>
                <select
                  value={milestoneTimeframe}
                  onChange={(e) => setMilestoneTimeframe(e.target.value as any)}
                  className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
                >
                  <option value="24h">24 Hours</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
          )}

          {alertType === 'trend' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Trend Type
                </label>
                <select
                  value={trendType}
                  onChange={(e) => setTrendType(e.target.value as any)}
                  className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
                >
                  <option value="breakout">Breakout (Upward)</option>
                  <option value="breakdown">Breakdown (Downward)</option>
                  <option value="bullish_reversal">Bullish Reversal</option>
                  <option value="bearish_reversal">Bearish Reversal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sensitivity
                </label>
                <select
                  value={sensitivity}
                  onChange={(e) => setSensitivity(e.target.value as any)}
                  className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35]"
                >
                  <option value="low">Low (5% change)</option>
                  <option value="medium">Medium (3% change)</option>
                  <option value="high">High (2% change)</option>
                </select>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0F1729] border border-[#FF6B35]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF6B35] resize-none"
              rows={2}
              placeholder="Additional notes about this alert..."
            />
          </div>

          {/* Notification Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Notification Settings
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={notifyInApp}
                  onChange={(e) => setNotifyInApp(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                />
                <span className="ml-2 text-sm text-gray-300">In-App Notification</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                />
                <span className="ml-2 text-sm text-gray-300">Email Notification</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={oneTime}
                  onChange={(e) => setOneTime(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                />
                <span className="ml-2 text-sm text-gray-300">One-Time Alert (disable after trigger)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#FF6B35]/20">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-lg bg-[#FF6B35]/10 text-gray-300 hover:bg-[#FF6B35]/20 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-lg bg-[#FF6B35] text-white hover:bg-[#FF8555] transition-colors font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <RiCheckLine className="w-5 h-5 mr-2" />
                  Create Alert
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
