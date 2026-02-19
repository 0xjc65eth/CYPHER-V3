'use client';

import React, { useState } from 'react';
import { useWhaleTracker } from '@/hooks/useWhaleTracker';
import type { TopHolder, WhaleActivity, WhaleAlert } from '@/types/ordinals-holders';
import { ExportButton } from '@/components/common/ExportButton';

interface WhaleTrackerProps {
  collectionSymbol: string;
  className?: string;
}

export function WhaleTracker({ collectionSymbol, className = '' }: WhaleTrackerProps) {
  const [activeTab, setActiveTab] = useState<'whales' | 'activity' | 'alerts'>('whales');
  const { data, isLoading, error } = useWhaleTracker(collectionSymbol, 20);

  if (isLoading) {
    return (
      <div className={`bg-black/40 border border-[#FF6B00]/20 rounded p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[#FF6B00]/20 rounded w-1/3"></div>
          <div className="h-64 bg-[#FF6B00]/20 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`bg-black/40 border border-red-500/20 rounded p-6 ${className}`}>
        <div className="text-red-400 text-sm">
          Failed to load whale data
        </div>
      </div>
    );
  }

  const { whales, recentActivity, alerts, metadata } = data;

  return (
    <div className={`bg-black/40 border border-[#FF6B00]/20 rounded ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-[#FF6B00]/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#FF6B00] font-semibold text-lg flex items-center gap-2">
            <span>🐋</span>
            Whale Tracker
          </h3>
          <div className="text-xs text-gray-400">
            {metadata.totalWhales} whales holding {metadata.whaleConcentration.toFixed(1)}%
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <TabButton
            label="Top Whales"
            count={whales.length}
            active={activeTab === 'whales'}
            onClick={() => setActiveTab('whales')}
          />
          <TabButton
            label="Activity"
            count={recentActivity.length}
            active={activeTab === 'activity'}
            onClick={() => setActiveTab('activity')}
          />
          <TabButton
            label="Alerts"
            count={alerts.length}
            active={activeTab === 'alerts'}
            onClick={() => setActiveTab('alerts')}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex justify-end mb-4">
          {activeTab === 'whales' && (
            <ExportButton
              type="whale-data"
              data={whales}
              size="sm"
              variant="outline"
            />
          )}
          {activeTab === 'activity' && (
            <ExportButton
              type="custom"
              data={recentActivity}
              columns={[
                { key: 'address', label: 'Address' },
                { key: 'type', label: 'Type' },
                { key: 'inscriptionNumber', label: 'Inscription #' },
                { key: 'price', label: 'Price (BTC)' },
                { key: 'impact', label: 'Impact' },
                { key: 'timestamp', label: 'Timestamp' },
              ]}
              title="Whale Activity"
              filename={`${collectionSymbol}-whale-activity`}
              size="sm"
              variant="outline"
            />
          )}
          {activeTab === 'alerts' && (
            <ExportButton
              type="custom"
              data={alerts}
              columns={[
                { key: 'type', label: 'Alert Type' },
                { key: 'severity', label: 'Severity' },
                { key: 'message', label: 'Message' },
                { key: 'address', label: 'Address' },
                { key: 'quantity', label: 'Quantity' },
                { key: 'totalValue', label: 'Total Value (BTC)' },
                { key: 'timestamp', label: 'Timestamp' },
              ]}
              title="Whale Alerts"
              filename={`${collectionSymbol}-whale-alerts`}
              size="sm"
              variant="outline"
            />
          )}
        </div>
        {activeTab === 'whales' && <WhalesTable whales={whales} floorPrice={metadata.floorPrice} />}
        {activeTab === 'activity' && <ActivityList activity={recentActivity} />}
        {activeTab === 'alerts' && <AlertsList alerts={alerts} />}
      </div>
    </div>
  );
}

interface TabButtonProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function TabButton({ label, count, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded text-sm font-medium transition-all ${
        active
          ? 'bg-[#FF6B00] text-white'
          : 'bg-black/40 text-gray-400 hover:bg-black/60'
      }`}
    >
      {label} <span className="text-xs opacity-70">({count})</span>
    </button>
  );
}

interface WhalesTableProps {
  whales: TopHolder[];
  floorPrice: number;
}

function WhalesTable({ whales, floorPrice }: WhalesTableProps) {
  if (whales.length === 0) {
    return <div className="text-gray-400 text-sm">No whale data available</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-gray-400 border-b border-[#FF6B00]/10">
            <th className="pb-2">Rank</th>
            <th className="pb-2">Address</th>
            <th className="pb-2 text-right">Holdings</th>
            <th className="pb-2 text-right">% Supply</th>
            <th className="pb-2 text-right">Est. Value</th>
            <th className="pb-2">Labels</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {whales.map((whale) => (
            <tr key={whale.address} className="border-b border-gray-800/50 hover:bg-[#FF6B00]/5">
              <td className="py-3">
                <span className="text-[#FF6B00] font-semibold">#{whale.rank}</span>
              </td>
              <td className="py-3">
                <code className="text-xs text-gray-300">
                  {whale.address.slice(0, 6)}...{whale.address.slice(-4)}
                </code>
              </td>
              <td className="py-3 text-right text-white font-semibold">
                {whale.inscriptionCount.toLocaleString()}
              </td>
              <td className="py-3 text-right">
                <span className={whale.percentage >= 10 ? 'text-red-400 font-semibold' : 'text-gray-300'}>
                  {whale.percentage.toFixed(2)}%
                </span>
              </td>
              <td className="py-3 text-right text-white">
                {whale.estimatedValue
                  ? `${whale.estimatedValue.toFixed(4)} BTC`
                  : '-'}
              </td>
              <td className="py-3">
                <div className="flex gap-1 flex-wrap">
                  {whale.labels?.map((label) => (
                    <span
                      key={label}
                      className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded border border-purple-500/30"
                    >
                      {label.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ActivityListProps {
  activity: WhaleActivity[];
}

function ActivityList({ activity }: ActivityListProps) {
  if (activity.length === 0) {
    return <div className="text-gray-400 text-sm">No recent whale activity</div>;
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto">
      {activity.map((act) => (
        <div
          key={act.id}
          className="bg-black/40 border border-gray-800 rounded p-3 hover:border-[#FF6B00]/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <ActivityTypeIcon type={act.type} />
              <code className="text-xs text-gray-400">
                {act.address.slice(0, 6)}...{act.address.slice(-4)}
              </code>
            </div>
            <div className="text-xs text-gray-500">
              {new Date(act.timestamp).toLocaleTimeString()}
            </div>
          </div>
          <div className="text-sm text-white">
            #{act.inscriptionNumber || 'Unknown'}
            {act.price && (
              <span className="ml-2 text-[#FF6B00]">
                {act.price.toFixed(4)} BTC
              </span>
            )}
            <span
              className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                act.impact === 'High'
                  ? 'bg-red-500/20 text-red-400'
                  : act.impact === 'Medium'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-green-500/20 text-green-400'
              }`}
            >
              {act.impact} Impact
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityTypeIcon({ type }: { type: WhaleActivity['type'] }) {
  const config = {
    buy: { icon: '📈', color: 'text-green-400' },
    sell: { icon: '📉', color: 'text-red-400' },
    transfer_in: { icon: '⬇️', color: 'text-blue-400' },
    transfer_out: { icon: '⬆️', color: 'text-orange-400' }
  };

  const { icon, color } = config[type] || { icon: '❓', color: 'text-gray-400' };

  return <span className={color}>{icon}</span>;
}

interface AlertsListProps {
  alerts: WhaleAlert[];
}

function AlertsList({ alerts }: AlertsListProps) {
  if (alerts.length === 0) {
    return <div className="text-gray-400 text-sm">No recent whale alerts</div>;
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`border rounded p-4 ${
            alert.severity === 'critical'
              ? 'bg-red-500/10 border-red-500/30'
              : alert.severity === 'warning'
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-blue-500/10 border-blue-500/30'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertIcon type={alert.type} />
              <span
                className={`text-sm font-semibold ${
                  alert.severity === 'critical'
                    ? 'text-red-400'
                    : alert.severity === 'warning'
                    ? 'text-yellow-400'
                    : 'text-blue-400'
                }`}
              >
                {alert.type.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </div>
          </div>
          <div className="text-sm text-white mb-1">{alert.message}</div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>Qty: {alert.quantity}</span>
            {alert.totalValue && (
              <span>Value: {alert.totalValue.toFixed(4)} BTC</span>
            )}
            <code className="text-gray-500">
              {alert.address.slice(0, 8)}...{alert.address.slice(-4)}
            </code>
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertIcon({ type }: { type: WhaleAlert['type'] }) {
  const icons = {
    accumulation: '📥',
    distribution: '📤',
    entry: '🚪',
    exit: '🚶',
    large_buy: '💰',
    large_sell: '💸'
  };

  return <span>{icons[type] || '⚠️'}</span>;
}
