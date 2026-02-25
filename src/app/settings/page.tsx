'use client';

import { useState } from 'react';
import {
  Settings,
  Bell,
  Shield,
  Key,
  Moon,
  Sun,
  Globe,
  Monitor,
  Smartphone,
  Laptop,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        enabled ? 'bg-[#F7931A]' : 'bg-white/10'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  // General settings
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('en');
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable');

  // Notification settings
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [tradeNotifs, setTradeNotifs] = useState(true);
  const [newsUpdates, setNewsUpdates] = useState(false);
  const [whaleAlerts, setWhaleAlerts] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(false);

  // Security settings
  const [twoFaEnabled, setTwoFaEnabled] = useState(true);

  // API Keys (empty by default - user creates their own)
  const [apiKeys, setApiKeys] = useState<Array<{ id: number; name: string; key: string; created: string; lastUsed: string; status: string }>>([]);
  const [showKey, setShowKey] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<number | null>(null);

  const handleCopyKey = (id: number, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRevokeKey = (id: number) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
  };

  const connectedDevices = [
    { name: 'Current Browser', type: 'laptop', location: 'Active session', lastActive: 'Now', current: true },
  ];

  return (
    <main className="min-h-screen bg-[#0d0d1a] text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-mono flex items-center gap-3">
            <Settings className="w-6 h-6 text-[#F7931A]" />
            <span className="text-white">SYSTEM</span>
            <span className="text-[#F7931A]">SETTINGS</span>
          </h1>
          <p className="text-sm text-white/40 mt-1 font-mono">Configure your CYPHER experience</p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                <Settings className="w-4 h-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger value="notifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                <Shield className="w-4 h-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="api-keys" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                <Key className="w-4 h-4 mr-2" />
                API Keys
              </TabsTrigger>
            </TabsList>
          </div>

          {/* === GENERAL TAB === */}
          <TabsContent value="general">
            <div className="space-y-6">
              {/* Theme */}
              <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-6">
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider font-mono mb-4">Appearance</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {theme === 'dark' ? <Moon className="w-4 h-4 text-[#F7931A]" /> : <Sun className="w-4 h-4 text-[#F7931A]" />}
                      <div>
                        <p className="text-sm text-white font-mono">Theme</p>
                        <p className="text-xs text-white/40">Switch between dark and light mode</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTheme('dark')}
                        className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors ${
                          theme === 'dark' ? 'bg-[#F7931A]/20 text-[#F7931A] border border-[#F7931A]/30' : 'bg-white/5 text-white/40 border border-white/10'
                        }`}
                      >
                        Dark
                      </button>
                      <button
                        onClick={() => setTheme('light')}
                        className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors ${
                          theme === 'light' ? 'bg-[#F7931A]/20 text-[#F7931A] border border-[#F7931A]/30' : 'bg-white/5 text-white/40 border border-white/10'
                        }`}
                      >
                        Light
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-4 h-4 text-[#F7931A]" />
                      <div>
                        <p className="text-sm text-white font-mono">Display Density</p>
                        <p className="text-xs text-white/40">Adjust spacing and layout density</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(['compact', 'comfortable', 'spacious'] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setDensity(d)}
                          className={`px-3 py-1.5 text-xs font-mono rounded-lg capitalize transition-colors ${
                            density === d ? 'bg-[#F7931A]/20 text-[#F7931A] border border-[#F7931A]/30' : 'bg-white/5 text-white/40 border border-white/10'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Locale */}
              <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-6">
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider font-mono mb-4">Locale</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-[#F7931A]" />
                      <div>
                        <p className="text-sm text-white font-mono">Currency</p>
                        <p className="text-xs text-white/40">Default display currency</p>
                      </div>
                    </div>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-[#F7931A]/50"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                      <option value="BRL">BRL (R$)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-[#F7931A]" />
                      <div>
                        <p className="text-sm text-white font-mono">Language</p>
                        <p className="text-xs text-white/40">Interface language</p>
                      </div>
                    </div>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-[#F7931A]/50"
                    >
                      <option value="en">English</option>
                      <option value="pt">Portuguese</option>
                      <option value="es">Spanish</option>
                      <option value="zh">Chinese</option>
                      <option value="ja">Japanese</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* === NOTIFICATIONS TAB === */}
          <TabsContent value="notifications">
            <div className="space-y-6">
              <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-6">
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider font-mono mb-4">Alert Preferences</h3>
                <div className="space-y-5">
                  {[
                    { label: 'Price Alerts', desc: 'Get notified when assets hit your target prices', value: priceAlerts, toggle: () => setPriceAlerts(!priceAlerts) },
                    { label: 'Trade Notifications', desc: 'Receive updates on swap and trade execution', value: tradeNotifs, toggle: () => setTradeNotifs(!tradeNotifs) },
                    { label: 'News Updates', desc: 'Breaking crypto news and market updates', value: newsUpdates, toggle: () => setNewsUpdates(!newsUpdates) },
                    { label: 'Whale Alerts', desc: 'Large transaction alerts across monitored chains', value: whaleAlerts, toggle: () => setWhaleAlerts(!whaleAlerts) },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white font-mono">{item.label}</p>
                        <p className="text-xs text-white/40">{item.desc}</p>
                      </div>
                      <ToggleSwitch enabled={item.value} onToggle={item.toggle} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-6">
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider font-mono mb-4">Delivery Channels</h3>
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-mono">Email Notifications</p>
                      <p className="text-xs text-white/40">Receive alerts via email</p>
                    </div>
                    <ToggleSwitch enabled={emailNotifs} onToggle={() => setEmailNotifs(!emailNotifs)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-mono">Push Notifications</p>
                      <p className="text-xs text-white/40">Browser push notifications</p>
                    </div>
                    <ToggleSwitch enabled={pushNotifs} onToggle={() => setPushNotifs(!pushNotifs)} />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* === SECURITY TAB === */}
          <TabsContent value="security">
            <div className="space-y-6">
              {/* 2FA */}
              <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-6">
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider font-mono mb-4">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${twoFaEnabled ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      <Shield className={`w-5 h-5 ${twoFaEnabled ? 'text-green-400' : 'text-red-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-white font-mono">
                        2FA Status: <span className={twoFaEnabled ? 'text-green-400' : 'text-red-400'}>{twoFaEnabled ? 'Enabled' : 'Disabled'}</span>
                      </p>
                      <p className="text-xs text-white/40">Authenticator app (TOTP)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTwoFaEnabled(!twoFaEnabled)}
                    className={`px-4 py-2 text-xs font-mono font-medium rounded-lg transition-colors ${
                      twoFaEnabled
                        ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                        : 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20'
                    }`}
                  >
                    {twoFaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </button>
                </div>
              </div>

              {/* Sessions */}
              <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider font-mono">Active Sessions</h3>
                  <button
                    onClick={() => alert('Revoked all other sessions')}
                    className="text-xs text-red-400 font-mono hover:text-red-300 transition-colors"
                  >
                    Revoke All Other Sessions
                  </button>
                </div>
                <div className="space-y-3">
                  {connectedDevices.map((device, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        {device.type === 'laptop' ? <Laptop className="w-5 h-5 text-white/40" /> :
                         device.type === 'mobile' ? <Smartphone className="w-5 h-5 text-white/40" /> :
                         <Monitor className="w-5 h-5 text-white/40" />}
                        <div>
                          <p className="text-sm text-white font-mono flex items-center gap-2">
                            {device.name}
                            {device.current && (
                              <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full">Current</span>
                            )}
                          </p>
                          <p className="text-xs text-white/40">{device.location}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/40 font-mono">{device.lastActive}</p>
                        {!device.current && (
                          <button
                            onClick={() => alert(`Revoked session: ${device.name}`)}
                            className="text-xs text-red-400 font-mono hover:text-red-300 transition-colors mt-1"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Log */}
              <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-6">
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider font-mono mb-4">Recent Security Events</h3>
                <div className="py-6 text-center">
                  <Shield className="w-6 h-6 text-white/20 mx-auto mb-2" />
                  <p className="text-xs text-white/40 font-mono">No security events recorded yet</p>
                  <p className="text-xs text-white/20 mt-1">Events will appear here as you use the platform</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* === API KEYS TAB === */}
          <TabsContent value="api-keys">
            <div className="space-y-6">
              {/* Create Key */}
              <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider font-mono">API Keys</h3>
                    <p className="text-xs text-white/30 mt-1">Manage programmatic access to your account</p>
                  </div>
                  <button
                    onClick={() => alert('Create new API key functionality')}
                    className="flex items-center gap-2 px-4 py-2 bg-[#F7931A] text-black text-xs font-mono font-bold rounded-lg hover:bg-[#F7931A]/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Key
                  </button>
                </div>

                <div className="bg-[#F7931A]/5 border border-[#F7931A]/20 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#F7931A] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[#F7931A]/80">
                      API keys provide full access to your account. Never share your keys or commit them to version control.
                    </p>
                  </div>
                </div>

                {/* Keys List */}
                <div className="space-y-3">
                  {apiKeys.map((apiKey) => (
                    <div key={apiKey.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Key className="w-4 h-4 text-[#F7931A]" />
                          <span className="text-sm font-mono font-medium text-white">{apiKey.name}</span>
                          <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full">
                            {apiKey.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded transition-colors"
                            title={showKey === apiKey.id ? 'Hide key' : 'Show key'}
                          >
                            {showKey === apiKey.id ? <EyeOff className="w-3.5 h-3.5 text-white/50" /> : <Eye className="w-3.5 h-3.5 text-white/50" />}
                          </button>
                          <button
                            onClick={() => handleCopyKey(apiKey.id, apiKey.key)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded transition-colors"
                            title="Copy key"
                          >
                            {copiedKey === apiKey.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white/50" />}
                          </button>
                          <button
                            onClick={() => handleRevokeKey(apiKey.id)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                            title="Revoke key"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-xs font-mono text-white/50 bg-black/30 px-2 py-1 rounded border border-white/5">
                          {showKey === apiKey.id ? apiKey.key : apiKey.key.replace(/[a-z0-9]/gi, '*')}
                        </code>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-white/30 font-mono">
                        <span>Created: {apiKey.created}</span>
                        <span>Last used: {apiKey.lastUsed}</span>
                      </div>
                    </div>
                  ))}

                  {apiKeys.length === 0 && (
                    <div className="py-12 text-center">
                      <Key className="w-8 h-8 text-white/20 mx-auto mb-3" />
                      <p className="text-sm text-white/40 font-mono">No API keys</p>
                      <p className="text-xs text-white/20 mt-1">Create a key to get started with the API</p>
                    </div>
                  )}
                </div>
              </div>

              {/* API Docs link */}
              <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-6">
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider font-mono mb-2">API Documentation</h3>
                <p className="text-xs text-white/40 mb-3">
                  Learn how to integrate with the CYPHER API for automated trading, portfolio management, and market data.
                </p>
                <div className="flex items-center gap-4">
                  <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
                    <span className="text-xs font-mono text-white/50">Base URL: </span>
                    <code className="text-xs font-mono text-[#F7931A]">https://api.cypher.trade/v3</code>
                  </div>
                  <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
                    <span className="text-xs font-mono text-white/50">Rate Limit: </span>
                    <code className="text-xs font-mono text-white/70">100 req/min</code>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
