'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Wifi,
  Database,
  Globe,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Shield,
  AlertOctagon,
  Wrench,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  latency?: number;
  uptime: string;
  description: string;
}

interface ApiEndpoint {
  endpoint: string;
  method: string;
  status: 'healthy' | 'slow' | 'down';
  responseTime: number;
  lastChecked: string;
}

interface Incident {
  id: number;
  title: string;
  status: 'resolved' | 'investigating' | 'monitoring' | 'scheduled';
  severity: 'minor' | 'major' | 'critical' | 'maintenance';
  date: string;
  description: string;
  updates: { time: string; message: string }[];
}

const INITIAL_SERVICES: ServiceStatus[] = [
  { name: 'Trading Platform', status: 'operational', latency: 45, uptime: '99.98%', description: 'Core trading engine and order matching' },
  { name: 'API Gateway', status: 'operational', latency: 12, uptime: '99.99%', description: 'REST and WebSocket API endpoints' },
  { name: 'Market Data Feed', status: 'operational', latency: 8, uptime: '99.97%', description: 'Real-time price and volume data' },
  { name: 'Wallet Services', status: 'operational', latency: 120, uptime: '99.95%', description: 'Deposit, withdrawal, and balance services' },
  { name: 'THORChain Bridge', status: 'operational', latency: 250, uptime: '99.90%', description: 'Cross-chain swap infrastructure' },
  { name: 'Neural Learning Engine', status: 'degraded', latency: 500, uptime: '98.50%', description: 'AI prediction and analysis system' },
  { name: 'Authentication Service', status: 'operational', latency: 35, uptime: '99.99%', description: 'Login, 2FA, and session management' },
  { name: 'Database Cluster', status: 'operational', latency: 5, uptime: '99.99%', description: 'Primary and replica databases' },
];

const INITIAL_ENDPOINTS: ApiEndpoint[] = [
  { endpoint: '/api/market/prices', method: 'GET', status: 'healthy', responseTime: 45, lastChecked: '2 min ago' },
  { endpoint: '/api/market/orderbook', method: 'GET', status: 'healthy', responseTime: 62, lastChecked: '2 min ago' },
  { endpoint: '/api/swap', method: 'GET', status: 'healthy', responseTime: 180, lastChecked: '1 min ago' },
  { endpoint: '/api/portfolio', method: 'GET', status: 'healthy', responseTime: 95, lastChecked: '3 min ago' },
  { endpoint: '/api/neural/predictions', method: 'GET', status: 'slow', responseTime: 850, lastChecked: '1 min ago' },
  { endpoint: '/api/health', method: 'GET', status: 'healthy', responseTime: 8, lastChecked: '30 sec ago' },
  { endpoint: '/api/auth/session', method: 'POST', status: 'healthy', responseTime: 120, lastChecked: '2 min ago' },
  { endpoint: '/api/runes/market', method: 'GET', status: 'healthy', responseTime: 210, lastChecked: '1 min ago' },
  { endpoint: '/api/ordinals/collections', method: 'GET', status: 'healthy', responseTime: 165, lastChecked: '2 min ago' },
  { endpoint: '/api/system/status', method: 'GET', status: 'healthy', responseTime: 12, lastChecked: '30 sec ago' },
];

const INCIDENTS: Incident[] = [
  {
    id: 1,
    title: 'Neural Learning Engine Degraded Performance',
    status: 'monitoring',
    severity: 'minor',
    date: '2026-02-11 08:30 UTC',
    description: 'Increased response times observed on the Neural Learning prediction endpoints.',
    updates: [
      { time: '10:15 UTC', message: 'Performance is improving. Continuing to monitor.' },
      { time: '09:00 UTC', message: 'Root cause identified: increased training batch size causing memory pressure.' },
      { time: '08:30 UTC', message: 'Investigating elevated latency on neural prediction endpoints.' },
    ],
  },
  {
    id: 2,
    title: 'Scheduled Maintenance: Database Migration',
    status: 'scheduled',
    severity: 'maintenance',
    date: '2026-02-15 02:00 UTC',
    description: 'Planned database schema migration for improved query performance. Expected duration: 30 minutes.',
    updates: [
      { time: 'Scheduled', message: 'Maintenance window: Feb 15, 02:00-02:30 UTC. Minimal service interruption expected.' },
    ],
  },
  {
    id: 3,
    title: 'API Gateway Intermittent Errors',
    status: 'resolved',
    severity: 'major',
    date: '2026-02-05 14:20 UTC',
    description: 'Some API requests returned 502 errors due to upstream configuration issue.',
    updates: [
      { time: '15:45 UTC', message: 'Issue fully resolved. All systems operational.' },
      { time: '15:10 UTC', message: 'Fix deployed. Monitoring for recurrence.' },
      { time: '14:45 UTC', message: 'Root cause identified: misconfigured load balancer health checks.' },
      { time: '14:20 UTC', message: 'Investigating reports of intermittent API errors.' },
    ],
  },
  {
    id: 4,
    title: 'THORChain Bridge Temporary Halt',
    status: 'resolved',
    severity: 'critical',
    date: '2026-01-28 11:00 UTC',
    description: 'Cross-chain swaps temporarily halted due to THORChain network upgrade.',
    updates: [
      { time: '16:00 UTC', message: 'THORChain bridge fully operational. Swaps resumed.' },
      { time: '14:30 UTC', message: 'THORChain network upgrade complete. Reconnecting bridge.' },
      { time: '11:00 UTC', message: 'THORChain network undergoing scheduled upgrade. Swaps paused.' },
    ],
  },
];

function StatusBadge({ status }: { status: 'operational' | 'degraded' | 'outage' | 'healthy' | 'slow' | 'down' }) {
  const config = {
    operational: { color: 'bg-[#00ff88]', text: 'text-[#00ff88]', bg: 'bg-[#00ff88]/10', border: 'border-[#00ff88]/20', label: 'Operational' },
    healthy: { color: 'bg-[#00ff88]', text: 'text-[#00ff88]', bg: 'bg-[#00ff88]/10', border: 'border-[#00ff88]/20', label: 'Healthy' },
    degraded: { color: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', label: 'Degraded' },
    slow: { color: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', label: 'Slow' },
    outage: { color: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Outage' },
    down: { color: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Down' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-mono font-medium ${c.bg} ${c.text} border ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.color} ${status === 'degraded' || status === 'slow' ? 'animate-pulse' : ''}`} />
      {c.label}
    </span>
  );
}

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>(INITIAL_SERVICES);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>(INITIAL_ENDPOINTS);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  useEffect(() => {
    // Simulate initial data fetch
    const timer = setTimeout(() => {
      setLoading(false);
      setLastRefresh(new Date().toLocaleTimeString());
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setLastRefresh(new Date().toLocaleTimeString());
    }, 600);
  };

  const operationalCount = services.filter(s => s.status === 'operational').length;
  const degradedCount = services.filter(s => s.status === 'degraded').length;
  const outageCount = services.filter(s => s.status === 'outage').length;

  const overallStatus = outageCount > 0 ? 'outage' : degradedCount > 0 ? 'degraded' : 'operational';

  return (
    <main className="min-h-screen bg-[#0d0d1a] text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold font-mono flex items-center gap-3">
                <Activity className="w-6 h-6 text-[#00ff88]" />
                <span className="text-white">SYSTEM</span>
                <span className="text-[#00ff88]">STATUS</span>
              </h1>
              <p className="text-sm text-white/40 mt-1 font-mono">Real-time infrastructure monitoring</p>
            </div>
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <span className="text-xs text-white/30 font-mono">Last updated: {lastRefresh}</span>
              )}
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/50 font-mono hover:bg-white/10 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Overall Status Banner */}
          <div className={`mt-4 p-4 rounded-xl border flex items-center gap-3 ${
            overallStatus === 'operational' ? 'bg-[#00ff88]/5 border-[#00ff88]/20' :
            overallStatus === 'degraded' ? 'bg-yellow-400/5 border-yellow-400/20' :
            'bg-red-500/5 border-red-500/20'
          }`}>
            {overallStatus === 'operational' ? <CheckCircle className="w-5 h-5 text-[#00ff88]" /> :
             overallStatus === 'degraded' ? <AlertTriangle className="w-5 h-5 text-yellow-400" /> :
             <XCircle className="w-5 h-5 text-red-500" />}
            <div>
              <p className={`text-sm font-mono font-medium ${
                overallStatus === 'operational' ? 'text-[#00ff88]' :
                overallStatus === 'degraded' ? 'text-yellow-400' : 'text-red-500'
              }`}>
                {overallStatus === 'operational' ? 'All Systems Operational' :
                 overallStatus === 'degraded' ? 'Some Systems Degraded' : 'System Outage Detected'}
              </p>
              <p className="text-xs text-white/40 font-mono">
                {operationalCount}/{services.length} services operational
                {degradedCount > 0 && ` | ${degradedCount} degraded`}
                {outageCount > 0 && ` | ${outageCount} outage`}
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="services" className="w-full">
          <div className="border-b border-[#1a1a2e] mb-6">
            <TabsList className="bg-transparent border-0 p-0 h-auto">
              <TabsTrigger value="services" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                <Server className="w-4 h-4 mr-2" />
                Services
              </TabsTrigger>
              <TabsTrigger value="api-health" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                <Wifi className="w-4 h-4 mr-2" />
                API Health
              </TabsTrigger>
              <TabsTrigger value="incidents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#00ff88] data-[state=active]:bg-transparent data-[state=active]:text-[#00ff88] text-gray-500 px-4 py-2 text-sm font-mono">
                <AlertOctagon className="w-4 h-4 mr-2" />
                Incidents
              </TabsTrigger>
            </TabsList>
          </div>

          {/* === SERVICES TAB === */}
          <TabsContent value="services">
            <div className="space-y-4">
              {loading ? (
                // Loading skeletons
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-5 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-lg" />
                        <div>
                          <div className="h-4 w-32 bg-white/5 rounded mb-2" />
                          <div className="h-3 w-48 bg-white/5 rounded" />
                        </div>
                      </div>
                      <div className="h-6 w-24 bg-white/5 rounded-full" />
                    </div>
                  </div>
                ))
              ) : (
                services.map((service) => (
                  <div key={service.name} className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-5 hover:border-[#1a1a2e]/80 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          service.status === 'operational' ? 'bg-[#00ff88]/10 border border-[#00ff88]/20' :
                          service.status === 'degraded' ? 'bg-yellow-400/10 border border-yellow-400/20' :
                          'bg-red-500/10 border border-red-500/20'
                        }`}>
                          {service.status === 'operational' ? <CheckCircle className="w-5 h-5 text-[#00ff88]" /> :
                           service.status === 'degraded' ? <AlertTriangle className="w-5 h-5 text-yellow-400" /> :
                           <XCircle className="w-5 h-5 text-red-500" />}
                        </div>
                        <div>
                          <p className="text-sm font-mono font-medium text-white">{service.name}</p>
                          <p className="text-xs text-white/40">{service.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-white/40 font-mono">Latency: <span className="text-white/60">{service.latency}ms</span></p>
                          <p className="text-xs text-white/40 font-mono">Uptime: <span className="text-white/60">{service.uptime}</span></p>
                        </div>
                        <StatusBadge status={service.status} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* === API HEALTH TAB === */}
          <TabsContent value="api-health">
            <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1a1a2e] flex items-center justify-between">
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider font-mono">API Endpoint Health</h3>
                <div className="flex items-center gap-4 text-xs text-white/30 font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00ff88]" /> Healthy
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" /> Slow
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Down
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-12 bg-white/[0.02] rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1a1a2e]">
                        <th className="px-6 py-3 text-left text-xs text-white/40 uppercase tracking-wider font-mono font-medium">Endpoint</th>
                        <th className="px-6 py-3 text-left text-xs text-white/40 uppercase tracking-wider font-mono font-medium">Method</th>
                        <th className="px-6 py-3 text-right text-xs text-white/40 uppercase tracking-wider font-mono font-medium">Response Time</th>
                        <th className="px-6 py-3 text-center text-xs text-white/40 uppercase tracking-wider font-mono font-medium">Status</th>
                        <th className="px-6 py-3 text-right text-xs text-white/40 uppercase tracking-wider font-mono font-medium">Last Checked</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a1a2e]/50">
                      {endpoints.map((ep, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-3">
                            <code className="text-xs font-mono text-white/80">{ep.endpoint}</code>
                          </td>
                          <td className="px-6 py-3">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {ep.method}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className={`text-xs font-mono ${
                              ep.responseTime < 100 ? 'text-[#00ff88]' :
                              ep.responseTime < 300 ? 'text-white/60' :
                              ep.responseTime < 500 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {ep.responseTime}ms
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <StatusBadge status={ep.status} />
                          </td>
                          <td className="px-6 py-3 text-right text-xs text-white/30 font-mono">{ep.lastChecked}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Response Time Summary */}
            {!loading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-[#00ff88]" />
                    <span className="text-xs text-white/40 uppercase tracking-wider font-mono">Avg Response</span>
                  </div>
                  <p className="text-2xl font-mono font-bold text-[#00ff88]">
                    {Math.round(endpoints.reduce((sum, e) => sum + e.responseTime, 0) / endpoints.length)}ms
                  </p>
                </div>
                <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-[#00ff88]" />
                    <span className="text-xs text-white/40 uppercase tracking-wider font-mono">Fastest</span>
                  </div>
                  <p className="text-2xl font-mono font-bold text-white">
                    {Math.min(...endpoints.map(e => e.responseTime))}ms
                  </p>
                  <p className="text-xs text-white/30 font-mono mt-1">
                    {endpoints.find(e => e.responseTime === Math.min(...endpoints.map(ep => ep.responseTime)))?.endpoint}
                  </p>
                </div>
                <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-white/40 uppercase tracking-wider font-mono">Slowest</span>
                  </div>
                  <p className="text-2xl font-mono font-bold text-yellow-400">
                    {Math.max(...endpoints.map(e => e.responseTime))}ms
                  </p>
                  <p className="text-xs text-white/30 font-mono mt-1">
                    {endpoints.find(e => e.responseTime === Math.max(...endpoints.map(ep => ep.responseTime)))?.endpoint}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* === INCIDENTS TAB === */}
          <TabsContent value="incidents">
            <div className="space-y-4">
              {INCIDENTS.map((incident) => (
                <div key={incident.id} className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#1a1a2e]">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {incident.severity === 'critical' ? <XCircle className="w-5 h-5 text-red-500 mt-0.5" /> :
                         incident.severity === 'major' ? <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" /> :
                         incident.severity === 'maintenance' ? <Wrench className="w-5 h-5 text-blue-400 mt-0.5" /> :
                         <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />}
                        <div>
                          <p className="text-sm font-mono font-medium text-white">{incident.title}</p>
                          <p className="text-xs text-white/40 mt-1">{incident.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-mono font-medium ${
                          incident.status === 'resolved' ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20' :
                          incident.status === 'investigating' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          incident.status === 'monitoring' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' :
                          'bg-blue-400/10 text-blue-400 border border-blue-400/20'
                        }`}>
                          {incident.status}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-mono font-medium ${
                          incident.severity === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          incident.severity === 'major' ? 'bg-orange-400/10 text-orange-400 border border-orange-400/20' :
                          incident.severity === 'maintenance' ? 'bg-blue-400/10 text-blue-400 border border-blue-400/20' :
                          'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                        }`}>
                          {incident.severity}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/30 font-mono mt-2">{incident.date}</p>
                  </div>
                  <div className="px-6 py-3">
                    <div className="space-y-2">
                      {incident.updates.map((update, i) => (
                        <div key={i} className="flex items-start gap-3 py-2 border-b border-[#1a1a2e]/50 last:border-0">
                          <span className="text-[10px] text-white/30 font-mono w-20 flex-shrink-0 pt-0.5">{update.time}</span>
                          <span className="text-xs text-white/60 font-mono">{update.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {INCIDENTS.length === 0 && (
                <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-xl p-12 text-center">
                  <CheckCircle className="w-8 h-8 text-[#00ff88]/30 mx-auto mb-3" />
                  <p className="text-sm text-white/40 font-mono">No incidents reported</p>
                  <p className="text-xs text-white/20 mt-1">All systems have been running smoothly</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
