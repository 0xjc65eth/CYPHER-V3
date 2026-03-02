'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  CreditCard,
  ExternalLink,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubscription } from '@/hooks/useSubscription';
import { useLaserEyes } from '@/providers/SimpleLaserEyesProvider';
import { TierBadge } from '@/components/subscription/TierBadge';
import { SUBSCRIPTION_TIERS } from '@/lib/stripe/config';

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

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tier, status, isActive, endDate } = useSubscription();
  const { connected, address } = useLaserEyes();
  const [cancelLoading, setCancelLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const tierConfig = SUBSCRIPTION_TIERS[tier];

  // Read query params for tab selection and checkout status
  const defaultTab = searchParams.get('tab') || 'general';
  const checkoutParam = searchParams.get('checkout');

  // Show success banner after Stripe checkout redirect
  useEffect(() => {
    if (checkoutParam === 'success') {
      setCheckoutSuccess(true);
      // Clear subscription cache so fresh data is fetched from API
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cypher_subscription_cache');
        // Trigger subscription re-fetch by dispatching wallet event
        // This causes PremiumContext to call fetchSubscriptionStatus again
        const walletAddr = address
          || (() => { try { return JSON.parse(localStorage.getItem('cypher_eth_wallet') || '{}').address } catch { return null } })();
        if (walletAddr) {
          window.dispatchEvent(new CustomEvent('walletConnected', {
            detail: { address: walletAddr },
          }));
        }
      }
      // Clean up URL params without triggering navigation
      const url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      window.history.replaceState({}, '', url.toString());
    }
  }, [checkoutParam, address]);

  const handleManageBilling = async () => {
    if (!address) return;
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        setPortalError(data.error);
      }
    } catch {
      setPortalError('Failed to open billing portal. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!address) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await res.json();
      if (data.error) {
        setCancelError(data.error);
        return;
      }
      setShowCancelConfirm(false);
      // Clear subscription cache and reload to reflect changes
      localStorage.removeItem('cypher_subscription_cache');
      window.location.reload();
    } catch {
      setCancelError('Failed to cancel subscription. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

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

        <Tabs defaultValue={defaultTab} className="w-full">
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
              <TabsTrigger value="subscription" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#F7931A] data-[state=active]:bg-transparent data-[state=active]:text-[#F7931A] text-gray-500 px-4 py-2 text-sm font-mono">
                <CreditCard className="w-4 h-4 mr-2" />
                Subscription
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

          {/* === SUBSCRIPTION TAB === */}
          <TabsContent value="subscription">
            <div className="space-y-6">
              {/* Checkout Success Banner */}
              {checkoutSuccess && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-green-400 font-mono font-medium">Subscription activated successfully!</p>
                    <p className="text-xs text-green-400/60 font-mono mt-0.5">Your plan is now active. It may take a moment to update.</p>
                  </div>
                  <button
                    onClick={() => setCheckoutSuccess(false)}
                    className="text-xs text-green-400/40 hover:text-green-400 font-mono"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Current Plan */}
              <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-6">
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider font-mono mb-4">Current Plan</h3>

                {tier === 'free' && !isActive ? (
                  <div className="text-center py-8">
                    <CreditCard className="w-8 h-8 text-white/20 mx-auto mb-3" />
                    <p className="text-sm text-white/40 font-mono mb-1">No active subscription</p>
                    <p className="text-xs text-white/20 mb-4">Upgrade to unlock advanced trading tools and AI analytics</p>
                    <button
                      onClick={() => router.push('/pricing')}
                      className="px-6 py-2.5 bg-[#F7931A] text-black text-sm font-mono font-bold rounded-lg hover:bg-[#F7931A]/90 transition-colors"
                    >
                      View Plans
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Tier & Status */}
                    <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-[#F7931A]" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-white font-mono font-medium">Plan:</span>
                            <TierBadge tier={tier} size="md" />
                          </div>
                          <p className="text-xs text-white/40 font-mono">{tierConfig.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold font-mono text-[#F7931A]">${tierConfig.price}<span className="text-xs text-white/40 font-normal">/mo</span></p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                      <span className="text-xs text-white/50 font-mono">Status</span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                        status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        status === 'canceled' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                        status === 'past_due' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-white/5 text-white/40 border border-white/10'
                      }`}>
                        {status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>

                    {/* Period End */}
                    {endDate && (
                      <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                        <span className="text-xs text-white/50 font-mono">Current period ends</span>
                        <span className="text-xs text-white/70 font-mono">
                          {new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Features List */}
              {tier !== 'free' && (
                <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-6">
                  <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider font-mono mb-4">Included Features</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {tierConfig.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg">
                        <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        <span className="text-xs text-white/60 font-mono">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {tier !== 'free' && isActive && (
                <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-6">
                  <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider font-mono mb-4">Manage Subscription</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => router.push('/pricing')}
                      className="flex items-center gap-2 px-4 py-2 bg-[#F7931A] text-black text-xs font-mono font-bold rounded-lg hover:bg-[#F7931A]/90 transition-colors"
                    >
                      Upgrade
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 text-xs font-mono font-medium rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                      Manage Billing
                    </button>

                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono font-medium rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      Cancel Subscription
                    </button>
                  </div>

                  {/* Error messages */}
                  {portalError && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-xs text-red-400 font-mono">{portalError}</p>
                    </div>
                  )}
                  {cancelError && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-xs text-red-400 font-mono">{cancelError}</p>
                    </div>
                  )}

                  {/* Cancel Confirmation Modal */}
                  {showCancelConfirm && (
                    <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                      <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-red-400 font-mono font-medium">Are you sure?</p>
                          <p className="text-xs text-white/40 mt-1">
                            Your subscription will remain active until the end of the current billing period.
                            You will lose access to {tierConfig.name} features after that date.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCancelSubscription}
                          disabled={cancelLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-xs font-mono font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          {cancelLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Yes, Cancel
                        </button>
                        <button
                          onClick={() => setShowCancelConfirm(false)}
                          className="px-4 py-2 bg-white/5 border border-white/10 text-white/50 text-xs font-mono rounded-lg hover:bg-white/10 transition-colors"
                        >
                          Keep Subscription
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0d0d1a] text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-white/5 rounded" />
            <div className="h-4 w-64 bg-white/5 rounded" />
          </div>
        </div>
      </main>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}
