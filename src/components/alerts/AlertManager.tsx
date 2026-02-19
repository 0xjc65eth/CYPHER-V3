'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useAlerts } from '@/hooks/useAlerts';
import { CreateAlertModal } from './CreateAlertModal';
import {
  RiAlertLine,
  RiAddLine,
  RiDeleteBinLine,
  RiToggleLine,
  RiToggleFill,
  RiTimeLine,
  RiCheckDoubleLine,
  RiInformationLine,
} from 'react-icons/ri';

interface AlertManagerProps {
  userId?: string;
}

export function AlertManager({ userId }: AlertManagerProps) {
  const { alerts, alertCount, isLoading, deleteAlert, toggleAlert } = useAlerts(userId);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'triggered'>('all');

  const filteredAlerts =
    filter === 'all' ? alerts : alerts.filter((alert) => alert.status === filter);

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      price: 'Price Alert',
      volume: 'Volume Spike',
      whale: 'Whale Movement',
      milestone: 'Milestone',
      trend: 'Trend Change',
    };
    return labels[type] || type;
  };

  const getAlertTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      price: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      volume: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      whale: 'bg-green-500/20 text-green-400 border-green-500/30',
      milestone: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      trend: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getConditionText = (alert: any) => {
    switch (alert.type) {
      case 'price':
        return `${alert.condition.replace('_', ' ')} $${alert.targetPrice?.toLocaleString()}`;
      case 'volume':
        return `${alert.multiplier}x baseline (${alert.timeframe})`;
      case 'whale':
        return `${alert.direction} ≥ $${alert.threshold?.toLocaleString()}`;
      case 'milestone':
        return `${alert.milestone.toUpperCase()} (${alert.timeframe})`;
      case 'trend':
        return `${alert.trendType.replace('_', ' ')} - ${alert.sensitivity} sensitivity`;
      default:
        return 'N/A';
    }
  };

  const handleToggleAlert = async (alertId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await toggleAlert.mutateAsync({ id: alertId, status: newStatus as any });
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (confirm('Are you sure you want to delete this alert?')) {
      await deleteAlert.mutateAsync(alertId);
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-[#181F3A] to-[#2A3A5A] border-none shadow-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-[#FF6B35]/20 flex items-center justify-center mr-3 border border-[#FF6B35]/30">
              <RiAlertLine className="w-5 h-5 text-[#FF6B35]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Alert Management</h3>
              <p className="text-sm text-gray-400">
                {alertCount} alert{alertCount !== 1 ? 's' : ''} configured
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#FF6B35] text-white hover:bg-[#FF8555] transition-colors font-medium flex items-center"
          >
            <RiAddLine className="w-5 h-5 mr-2" />
            Create Alert
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-2 mb-6">
          {(['all', 'active', 'inactive', 'triggered'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === status
                  ? 'bg-[#FF6B35] text-white'
                  : 'bg-[#FF6B35]/10 text-gray-400 hover:bg-[#FF6B35]/20'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status === 'all' && ` (${alertCount})`}
              {status !== 'all' &&
                ` (${alerts.filter((a) => a.status === status).length})`}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35]"></div>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <RiAlertLine className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">
              {filter === 'all'
                ? 'No alerts configured yet'
                : `No ${filter} alerts`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-3 rounded-lg bg-[#FF6B35] text-white hover:bg-[#FF8555] transition-colors font-medium"
              >
                Create Your First Alert
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-[#0F1729]/50 rounded-lg p-4 border border-[#FF6B35]/20 hover:border-[#FF6B35]/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Alert Name & Status */}
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-bold text-white">{alert.name}</h4>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${getAlertTypeColor(
                          alert.type
                        )}`}
                      >
                        {getAlertTypeLabel(alert.type)}
                      </span>
                      {alert.status === 'active' && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                          Active
                        </span>
                      )}
                      {alert.status === 'triggered' && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center">
                          <RiCheckDoubleLine className="w-3 h-3 mr-1" />
                          Triggered
                        </span>
                      )}
                      {alert.status === 'inactive' && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Asset & Condition */}
                    <div className="flex items-center space-x-4 text-sm text-gray-300 mb-2">
                      <div>
                        <span className="text-gray-400">Asset:</span>{' '}
                        <span className="font-medium text-white">{alert.asset}</span>
                        <span className="text-gray-500 ml-1">({alert.assetType})</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Condition:</span>{' '}
                        <span className="font-medium text-white">
                          {getConditionText(alert)}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {alert.description && (
                      <p className="text-sm text-gray-400 mb-2">{alert.description}</p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center">
                        <RiTimeLine className="w-3 h-3 mr-1" />
                        Created {new Date(alert.createdAt).toLocaleDateString()}
                      </div>
                      {alert.triggerCount > 0 && (
                        <div className="flex items-center">
                          <RiCheckDoubleLine className="w-3 h-3 mr-1" />
                          Triggered {alert.triggerCount} time{alert.triggerCount !== 1 ? 's' : ''}
                        </div>
                      )}
                      {alert.triggeredAt && (
                        <div className="flex items-center">
                          Last: {new Date(alert.triggeredAt).toLocaleString()}
                        </div>
                      )}
                      {alert.oneTime && (
                        <div className="flex items-center text-yellow-500">
                          <RiInformationLine className="w-3 h-3 mr-1" />
                          One-time alert
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleAlert(alert.id, alert.status)}
                      className={`p-2 rounded-lg transition-colors ${
                        alert.status === 'active'
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      }`}
                      title={alert.status === 'active' ? 'Disable alert' : 'Enable alert'}
                    >
                      {alert.status === 'active' ? (
                        <RiToggleFill className="w-5 h-5" />
                      ) : (
                        <RiToggleLine className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      title="Delete alert"
                    >
                      <RiDeleteBinLine className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-[#FF6B35]/10 rounded-lg p-4 border border-[#FF6B35]/20">
          <div className="flex items-center mb-2">
            <RiInformationLine className="w-4 h-4 text-[#FF6B35] mr-2" />
            <span className="text-white font-medium text-sm">About Alerts</span>
          </div>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• Alerts are checked every minute for real-time monitoring</li>
            <li>• One-time alerts automatically disable after triggering</li>
            <li>• In-app notifications appear instantly when alerts trigger</li>
            <li>• Email notifications require email configuration (coming soon)</li>
            <li>
              • Price alerts use "crosses" for one-time triggers, "above/below" for continuous
              monitoring
            </li>
          </ul>
        </div>
      </Card>

      {/* Create Alert Modal */}
      <CreateAlertModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        userId={userId}
      />
    </>
  );
}
