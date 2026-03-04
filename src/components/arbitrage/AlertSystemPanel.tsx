/**
 * Alert System Panel Component
 * Configure and manage trading alerts
 * Supports browser notifications, sound, Telegram, and Discord
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Settings,
  Plus,
  Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Alert {
  id: string;
  name: string;
  type: 'opportunity' | 'smc' | 'risk' | 'performance';
  condition: string;
  threshold: number;
  enabled: boolean;
  channels: ('browser' | 'sound' | 'telegram' | 'discord')[];
  lastTriggered?: Date;
  triggerCount: number;
}

interface AlertSystemPanelProps {
  onAlertTriggered?: (alert: Alert) => void;
}

export function AlertSystemPanel({ onAlertTriggered }: AlertSystemPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      name: 'High Profit Opportunity',
      type: 'opportunity',
      condition: 'profit_percent',
      threshold: 2.0,
      enabled: true,
      channels: ['browser', 'sound'],
      triggerCount: 0
    },
    {
      id: '2',
      name: 'Order Block Detected',
      type: 'smc',
      condition: 'order_block_strength',
      threshold: 8,
      enabled: true,
      channels: ['browser'],
      triggerCount: 0
    },
    {
      id: '3',
      name: 'Max Drawdown Warning',
      type: 'risk',
      condition: 'drawdown_percent',
      threshold: 10,
      enabled: true,
      channels: ['browser', 'sound', 'telegram'],
      triggerCount: 0
    }
  ]);

  const [settings, setSettings] = useState({
    browserEnabled: true,
    soundEnabled: true,
    telegramEnabled: false,
    telegramBotToken: '',
    telegramChatId: '',
    discordEnabled: false,
    discordWebhookUrl: ''
  });

  const [showNewAlertForm, setShowNewAlertForm] = useState(false);
  const [newAlert, setNewAlert] = useState({
    name: '',
    type: 'opportunity' as Alert['type'],
    condition: 'profit_percent',
    threshold: 1.0,
    channels: ['browser'] as Alert['channels']
  });

  // Request browser notification permission
  useEffect(() => {
    if (settings.browserEnabled && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [settings.browserEnabled]);

  const toggleAlert = (id: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === id ? { ...alert, enabled: !alert.enabled } : alert
    ));
  };

  const deleteAlert = (id: string) => {
    if (confirm('Delete this alert?')) {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }
  };

  const addAlert = () => {
    const alert: Alert = {
      id: crypto.randomUUID(),
      ...newAlert,
      enabled: true,
      triggerCount: 0
    };

    setAlerts(prev => [...prev, alert]);
    setShowNewAlertForm(false);
    setNewAlert({
      name: '',
      type: 'opportunity',
      condition: 'profit_percent',
      threshold: 1.0,
      channels: ['browser']
    });
  };

  const testAlert = (alert: Alert) => {
    // Browser notification
    if (alert.channels.includes('browser') && settings.browserEnabled && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('🚨 CYPHER Alert', {
          body: `${alert.name} - Threshold: ${alert.threshold}`,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      }
    }

    // Sound notification
    if (alert.channels.includes('sound') && settings.soundEnabled) {
      const audio = new Audio('/sounds/alert.mp3');
      audio.play().catch(err => console.error('Sound play failed:', err));
    }

    window.alert('Test alert sent! Check your browser notifications.');
  };

  const toggleChannel = (channel: Alert['channels'][number]) => {
    setNewAlert(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const saveSettings = async () => {
    try {
      const response = await fetch('/api/arbitrage/alerts/settings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        alert('Settings saved successfully!');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const getAlertTypeColor = (type: Alert['type']) => {
    switch (type) {
      case 'opportunity': return 'bg-cyan-500/20 border-cyan-500 text-cyan-400';
      case 'smc': return 'bg-purple-500/20 border-purple-500 text-purple-400';
      case 'risk': return 'bg-red-500/20 border-red-500 text-red-400';
      case 'performance': return 'bg-orange-500/20 border-orange-500 text-orange-400';
      default: return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  };

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'profit_percent': return 'Profit %';
      case 'spread_percent': return 'Spread %';
      case 'order_block_strength': return 'OB Strength';
      case 'fair_value_gap': return 'FVG Detected';
      case 'drawdown_percent': return 'Drawdown %';
      case 'win_rate': return 'Win Rate %';
      case 'sharpe_ratio': return 'Sharpe Ratio';
      default: return condition;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Settings */}
      <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#00ff88] flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Alert Settings
            </CardTitle>
            <Button
              size="sm"
              onClick={saveSettings}
              className="bg-[#00ff88] hover:bg-[#00ff88]/90 text-black h-7"
            >
              Save Settings
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Browser Notifications */}
            <div className="flex items-center justify-between bg-[#0d0d1a] rounded p-3 border border-[#2a2a3e]">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-cyan-400" />
                <div>
                  <div className="text-sm text-white font-medium">Browser Notifications</div>
                  <div className="text-xs text-gray-500">
                    {Notification?.permission === 'granted' ? 'Enabled' :
                     Notification?.permission === 'denied' ? 'Blocked - check browser settings' :
                     'Click to enable'}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant={settings.browserEnabled ? 'default' : 'outline'}
                className={settings.browserEnabled ? 'bg-green-600 hover:bg-green-700 h-7' : 'border-[#2a2a3e] h-7'}
                onClick={() => setSettings(prev => ({ ...prev, browserEnabled: !prev.browserEnabled }))}
              >
                {settings.browserEnabled ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              </Button>
            </div>

            {/* Sound Alerts */}
            <div className="flex items-center justify-between bg-[#0d0d1a] rounded p-3 border border-[#2a2a3e]">
              <div className="flex items-center gap-3">
                <Volume2 className="h-5 w-5 text-orange-400" />
                <div>
                  <div className="text-sm text-white font-medium">Sound Alerts</div>
                  <div className="text-xs text-gray-500">Play audio notification on alerts</div>
                </div>
              </div>
              <Button
                size="sm"
                variant={settings.soundEnabled ? 'default' : 'outline'}
                className={settings.soundEnabled ? 'bg-green-600 hover:bg-green-700 h-7' : 'border-[#2a2a3e] h-7'}
                onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
              >
                {settings.soundEnabled ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              </Button>
            </div>

            {/* Telegram Integration */}
            <div className="bg-[#0d0d1a] rounded p-3 border border-[#2a2a3e]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-blue-400" />
                  <div>
                    <div className="text-sm text-white font-medium">Telegram Bot</div>
                    <div className="text-xs text-gray-500">Send alerts to Telegram</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={settings.telegramEnabled ? 'default' : 'outline'}
                  className={settings.telegramEnabled ? 'bg-green-600 hover:bg-green-700 h-7' : 'border-[#2a2a3e] h-7'}
                  onClick={() => setSettings(prev => ({ ...prev, telegramEnabled: !prev.telegramEnabled }))}
                >
                  {settings.telegramEnabled ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                </Button>
              </div>
              {settings.telegramEnabled && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Bot Token</label>
                    <Input
                      type="password"
                      placeholder="123456:ABC-DEF..."
                      value={settings.telegramBotToken}
                      onChange={(e) => setSettings(prev => ({ ...prev, telegramBotToken: e.target.value }))}
                      className="bg-[#1a1a2e] border-[#2a2a3e] text-white h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Chat ID</label>
                    <Input
                      placeholder="123456789"
                      value={settings.telegramChatId}
                      onChange={(e) => setSettings(prev => ({ ...prev, telegramChatId: e.target.value }))}
                      className="bg-[#1a1a2e] border-[#2a2a3e] text-white h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Discord Integration */}
            <div className="bg-[#0d0d1a] rounded p-3 border border-[#2a2a3e]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-purple-400" />
                  <div>
                    <div className="text-sm text-white font-medium">Discord Webhook</div>
                    <div className="text-xs text-gray-500">Send alerts to Discord channel</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={settings.discordEnabled ? 'default' : 'outline'}
                  className={settings.discordEnabled ? 'bg-green-600 hover:bg-green-700 h-7' : 'border-[#2a2a3e] h-7'}
                  onClick={() => setSettings(prev => ({ ...prev, discordEnabled: !prev.discordEnabled }))}
                >
                  {settings.discordEnabled ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                </Button>
              </div>
              {settings.discordEnabled && (
                <div className="mt-3">
                  <label className="text-xs text-gray-500 block mb-1">Webhook URL</label>
                  <Input
                    type="password"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={settings.discordWebhookUrl}
                    onChange={(e) => setSettings(prev => ({ ...prev, discordWebhookUrl: e.target.value }))}
                    className="bg-[#1a1a2e] border-[#2a2a3e] text-white h-8 text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card className="bg-[#1a1a2e] border-[#2a2a3e]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#00ff88] flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Active Alerts ({alerts.filter(a => a.enabled).length})
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowNewAlertForm(!showNewAlertForm)}
              className="bg-[#00ff88] hover:bg-[#00ff88]/90 text-black h-7"
            >
              <Plus className="h-3 w-3 mr-1" />
              New Alert
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* New Alert Form */}
          {showNewAlertForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-[#0d0d1a] rounded-lg p-4 border border-[#2a2a3e] mb-4"
            >
              <h3 className="text-sm font-bold text-white mb-3">Create New Alert</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Alert Name</label>
                  <Input
                    placeholder="High Spread Opportunity"
                    value={newAlert.name}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-[#1a1a2e] border-[#2a2a3e] text-white h-8"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Type</label>
                  <select
                    value={newAlert.type}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, type: e.target.value as Alert['type'] }))}
                    className="w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded px-2 py-1.5 text-sm text-white h-8"
                  >
                    <option value="opportunity">Opportunity</option>
                    <option value="smc">SMC Signal</option>
                    <option value="risk">Risk Warning</option>
                    <option value="performance">Performance</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Condition</label>
                  <select
                    value={newAlert.condition}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, condition: e.target.value }))}
                    className="w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded px-2 py-1.5 text-sm text-white h-8"
                  >
                    <option value="profit_percent">Profit %</option>
                    <option value="spread_percent">Spread %</option>
                    <option value="order_block_strength">Order Block Strength</option>
                    <option value="drawdown_percent">Drawdown %</option>
                    <option value="sharpe_ratio">Sharpe Ratio</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Threshold</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="1.0"
                    value={newAlert.threshold}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, threshold: parseFloat(e.target.value) }))}
                    className="bg-[#1a1a2e] border-[#2a2a3e] text-white h-8"
                  />
                </div>
              </div>

              {/* Channels */}
              <div className="mb-3">
                <label className="text-xs text-gray-500 block mb-2">Notification Channels</label>
                <div className="flex gap-2">
                  {(['browser', 'sound', 'telegram', 'discord'] as const).map((channel) => (
                    <Button
                      key={channel}
                      size="sm"
                      variant={newAlert.channels.includes(channel) ? 'default' : 'outline'}
                      className={newAlert.channels.includes(channel) ? 'bg-cyan-600 hover:bg-cyan-700 h-7 text-xs' : 'border-[#2a2a3e] h-7 text-xs'}
                      onClick={() => toggleChannel(channel)}
                    >
                      {channel.charAt(0).toUpperCase() + channel.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={addAlert}
                  disabled={!newAlert.name || !newAlert.threshold}
                  className="flex-1 bg-[#00ff88] hover:bg-[#00ff88]/90 text-black h-8"
                >
                  Create Alert
                </Button>
                <Button
                  onClick={() => setShowNewAlertForm(false)}
                  variant="outline"
                  className="border-[#2a2a3e] h-8"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {/* Alerts List */}
          <div className="space-y-2">
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`bg-[#0d0d1a] rounded p-3 border ${alert.enabled ? 'border-[#2a2a3e]' : 'border-gray-700/30'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Badge className={`${getAlertTypeColor(alert.type)} border text-[10px]`}>
                      {alert.type.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-white font-medium">{alert.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-500 hover:border-blue-400 h-6 text-xs"
                      onClick={() => testAlert(alert)}
                    >
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant={alert.enabled ? 'default' : 'outline'}
                      className={alert.enabled ? 'bg-green-600 hover:bg-green-700 h-6' : 'border-[#2a2a3e] h-6'}
                      onClick={() => toggleAlert(alert.id)}
                    >
                      {alert.enabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500 hover:border-red-400 h-6"
                      onClick={() => deleteAlert(alert.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="text-gray-500">
                    <span className="text-gray-400">{getConditionLabel(alert.condition)}</span> {alert.condition.includes('percent') || alert.condition.includes('ratio') ? '>' : '='} {alert.threshold}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-gray-500">
                      Channels: {alert.channels.join(', ')}
                    </div>
                    <Badge className="bg-gray-500/20 text-gray-400 text-[10px]">
                      {alert.triggerCount} triggers
                    </Badge>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
