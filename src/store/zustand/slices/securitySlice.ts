import { StateCreator } from 'zustand'
import { RootState } from '../index'

export type SecurityLevel = 'low' | 'medium' | 'high' | 'critical'
export type ThreatType = 'phishing' | 'malware' | 'unauthorized_access' | 'data_breach' | 'network_attack' | 'suspicious_activity'
export type SecurityEventSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface SecurityEvent {
  id: string
  type: ThreatType
  severity: SecurityEventSeverity
  title: string
  description: string
  timestamp: number
  resolved: boolean
  metadata?: Record<string, any>
}

export interface SecurityAnalysis {
  overallScore: number
  riskLevel: SecurityLevel
  threats: ThreatType[]
  recommendations: string[]
  lastAnalysis: number
}

export interface SecurityState {
  // Current security status
  currentLevel: SecurityLevel
  threatDetectionEnabled: boolean
  realTimeMonitoring: boolean
  
  // Security events and logs
  events: SecurityEvent[]
  recentThreats: ThreatType[]
  threatHistory: Record<string, number>
  
  // Security analysis
  analysis: SecurityAnalysis
  
  // Session security
  sessionSecurity: {
    authenticated: boolean
    sessionId: string | null
    sessionStartTime: number | null
    sessionTimeout: number
    lastActivity: number | null
    securityChecks: {
      walletIntegrity: boolean
      networkSecurity: boolean
      dataIntegrity: boolean
      accessControl: boolean
    }
  }
  
  // Wallet security
  walletSecurity: {
    encryptionEnabled: boolean
    multiFactorEnabled: boolean
    hardwareWalletDetected: boolean
    suspiciousActivityDetected: boolean
    lastSecurityCheck: number | null
    trustedAddresses: string[]
    blockedAddresses: string[]
  }
  
  // Network security
  networkSecurity: {
    vpnDetected: boolean
    torDetected: boolean
    proxyDetected: boolean
    suspiciousGeoLocation: boolean
    ipReputation: 'good' | 'neutral' | 'suspicious' | 'malicious'
    rateLimitStatus: 'normal' | 'warning' | 'throttled' | 'blocked'
  }
  
  // Configuration
  config: {
    alertThreshold: SecurityLevel
    autoBlockThreats: boolean
    logRetentionDays: number
    securityCheckInterval: number
    enableRealTimeAlerts: boolean
    enablePhishingProtection: boolean
    enableMalwareScanning: boolean
  }
  
  // Alerts and notifications
  alerts: Array<{
    id: string
    type: ThreatType
    message: string
    timestamp: number
    dismissed: boolean
    priority: 'low' | 'medium' | 'high' | 'urgent'
  }>
  
  // Performance metrics
  metrics: {
    threatsBlocked: number
    falsePositives: number
    scansDone: number
    averageResponseTime: number
    systemHealth: number
  }
  
  // Error handling
  error: string | null
  lastError: number | null
}

export interface SecurityActions {
  // Security level management
  updateSecurityStatus: (level: SecurityLevel) => void
  enableThreatDetection: (enabled: boolean) => void
  enableRealTimeMonitoring: (enabled: boolean) => void
  
  // Event management
  logSecurityEvent: (event: Omit<SecurityEvent, 'id' | 'timestamp'>) => void
  resolveSecurityEvent: (eventId: string) => void
  clearSecurityEvents: () => void
  
  // Threat management
  addThreat: (threat: ThreatType) => void
  clearThreats: () => void
  blockAddress: (address: string) => void
  unblockAddress: (address: string) => void
  addTrustedAddress: (address: string) => void
  removeTrustedAddress: (address: string) => void
  
  // Analysis
  runSecurityAnalysis: () => Promise<void>
  updateAnalysis: (analysis: Partial<SecurityAnalysis>) => void
  
  // Session security
  startSecuritySession: (sessionId: string) => void
  endSecuritySession: () => void
  updateSessionActivity: () => void
  updateSessionSecurityChecks: (checks: Partial<SecurityState['sessionSecurity']['securityChecks']>) => void
  
  // Wallet security
  updateWalletSecurity: (security: Partial<SecurityState['walletSecurity']>) => void
  runWalletSecurityCheck: () => Promise<void>
  
  // Network security
  updateNetworkSecurity: (security: Partial<SecurityState['networkSecurity']>) => void
  checkNetworkSecurity: () => Promise<void>
  
  // Configuration
  updateSecurityConfig: (config: Partial<SecurityState['config']>) => void
  
  // Alerts
  addSecurityAlert: (alert: Omit<SecurityState['alerts'][0], 'id' | 'timestamp' | 'dismissed'>) => void
  dismissAlert: (alertId: string) => void
  clearAlerts: () => void
  
  // Metrics
  updateSecurityMetrics: (metrics: Partial<SecurityState['metrics']>) => void
  resetSecurityMetrics: () => void
  
  // Error handling
  setSecurityError: (error: string | null) => void
  clearSecurityError: () => void
}

export interface SecuritySlice {
  security: SecurityState
  updateSecurityStatus: SecurityActions['updateSecurityStatus']
  enableThreatDetection: SecurityActions['enableThreatDetection']
  enableRealTimeMonitoring: SecurityActions['enableRealTimeMonitoring']
  logSecurityEvent: SecurityActions['logSecurityEvent']
  resolveSecurityEvent: SecurityActions['resolveSecurityEvent']
  clearSecurityEvents: SecurityActions['clearSecurityEvents']
  addThreat: SecurityActions['addThreat']
  clearThreats: SecurityActions['clearThreats']
  blockAddress: SecurityActions['blockAddress']
  unblockAddress: SecurityActions['unblockAddress']
  addTrustedAddress: SecurityActions['addTrustedAddress']
  removeTrustedAddress: SecurityActions['removeTrustedAddress']
  runSecurityAnalysis: SecurityActions['runSecurityAnalysis']
  updateAnalysis: SecurityActions['updateAnalysis']
  startSecuritySession: SecurityActions['startSecuritySession']
  endSecuritySession: SecurityActions['endSecuritySession']
  updateSessionActivity: SecurityActions['updateSessionActivity']
  updateSessionSecurityChecks: SecurityActions['updateSessionSecurityChecks']
  updateWalletSecurity: SecurityActions['updateWalletSecurity']
  runWalletSecurityCheck: SecurityActions['runWalletSecurityCheck']
  updateNetworkSecurity: SecurityActions['updateNetworkSecurity']
  checkNetworkSecurity: SecurityActions['checkNetworkSecurity']
  updateSecurityConfig: SecurityActions['updateSecurityConfig']
  addSecurityAlert: SecurityActions['addSecurityAlert']
  dismissAlert: SecurityActions['dismissAlert']
  clearAlerts: SecurityActions['clearAlerts']
  updateSecurityMetrics: SecurityActions['updateSecurityMetrics']
  resetSecurityMetrics: SecurityActions['resetSecurityMetrics']
  setSecurityError: SecurityActions['setSecurityError']
  clearSecurityError: SecurityActions['clearSecurityError']
}

const initialSecurityState: SecurityState = {
  currentLevel: 'medium',
  threatDetectionEnabled: true,
  realTimeMonitoring: true,
  events: [],
  recentThreats: [],
  threatHistory: {},
  analysis: {
    overallScore: 85,
    riskLevel: 'medium',
    threats: [],
    recommendations: [],
    lastAnalysis: 0,
  },
  sessionSecurity: {
    authenticated: false,
    sessionId: null,
    sessionStartTime: null,
    sessionTimeout: 3600000, // 1 hour
    lastActivity: null,
    securityChecks: {
      walletIntegrity: true,
      networkSecurity: true,
      dataIntegrity: true,
      accessControl: true,
    },
  },
  walletSecurity: {
    encryptionEnabled: true,
    multiFactorEnabled: false,
    hardwareWalletDetected: false,
    suspiciousActivityDetected: false,
    lastSecurityCheck: null,
    trustedAddresses: [],
    blockedAddresses: [],
  },
  networkSecurity: {
    vpnDetected: false,
    torDetected: false,
    proxyDetected: false,
    suspiciousGeoLocation: false,
    ipReputation: 'good',
    rateLimitStatus: 'normal',
  },
  config: {
    alertThreshold: 'medium',
    autoBlockThreats: true,
    logRetentionDays: 30,
    securityCheckInterval: 300000, // 5 minutes
    enableRealTimeAlerts: true,
    enablePhishingProtection: true,
    enableMalwareScanning: true,
  },
  alerts: [],
  metrics: {
    threatsBlocked: 0,
    falsePositives: 0,
    scansDone: 0,
    averageResponseTime: 0,
    systemHealth: 100,
  },
  error: null,
  lastError: null,
}

export const createSecuritySlice: StateCreator<
  RootState,
  [['zustand/immer', never]],
  [],
  SecuritySlice
> = (set, get) => ({
  security: initialSecurityState,
  
  updateSecurityStatus: (level: SecurityLevel) => {
    set((state) => {
      state.security.currentLevel = level
    })
  },
  
  enableThreatDetection: (enabled: boolean) => {
    set((state) => {
      state.security.threatDetectionEnabled = enabled
    })
  },
  
  enableRealTimeMonitoring: (enabled: boolean) => {
    set((state) => {
      state.security.realTimeMonitoring = enabled
    })
  },
  
  logSecurityEvent: (event: Omit<SecurityEvent, 'id' | 'timestamp'>) => {
    set((state) => {
      const newEvent: SecurityEvent = {
        ...event,
        id: `event_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
        timestamp: Date.now(),
      }
      state.security.events.unshift(newEvent)
      
      // Keep only recent events (based on retention policy)
      const retentionLimit = Date.now() - (state.security.config.logRetentionDays * 24 * 60 * 60 * 1000)
      state.security.events = state.security.events.filter(e => e.timestamp > retentionLimit)
    })
  },
  
  resolveSecurityEvent: (eventId: string) => {
    set((state) => {
      const event = state.security.events.find(e => e.id === eventId)
      if (event) {
        event.resolved = true
      }
    })
  },
  
  clearSecurityEvents: () => {
    set((state) => {
      state.security.events = []
    })
  },
  
  addThreat: (threat: ThreatType) => {
    set((state) => {
      if (!state.security.recentThreats.includes(threat)) {
        state.security.recentThreats.push(threat)
      }
      
      // Update threat history
      state.security.threatHistory[threat] = (state.security.threatHistory[threat] || 0) + 1
      
      // Update metrics
      state.security.metrics.threatsBlocked += 1
    })
  },
  
  clearThreats: () => {
    set((state) => {
      state.security.recentThreats = []
    })
  },
  
  blockAddress: (address: string) => {
    set((state) => {
      if (!state.security.walletSecurity.blockedAddresses.includes(address)) {
        state.security.walletSecurity.blockedAddresses.push(address)
      }
      
      // Remove from trusted if it was there
      state.security.walletSecurity.trustedAddresses = 
        state.security.walletSecurity.trustedAddresses.filter(addr => addr !== address)
    })
  },
  
  unblockAddress: (address: string) => {
    set((state) => {
      state.security.walletSecurity.blockedAddresses = 
        state.security.walletSecurity.blockedAddresses.filter(addr => addr !== address)
    })
  },
  
  addTrustedAddress: (address: string) => {
    set((state) => {
      if (!state.security.walletSecurity.trustedAddresses.includes(address)) {
        state.security.walletSecurity.trustedAddresses.push(address)
      }
      
      // Remove from blocked if it was there
      state.security.walletSecurity.blockedAddresses = 
        state.security.walletSecurity.blockedAddresses.filter(addr => addr !== address)
    })
  },
  
  removeTrustedAddress: (address: string) => {
    set((state) => {
      state.security.walletSecurity.trustedAddresses = 
        state.security.walletSecurity.trustedAddresses.filter(addr => addr !== address)
    })
  },
  
  runSecurityAnalysis: async () => {
    try {
      // Mock security analysis - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const { security } = get()
      const threatCount = security.recentThreats.length
      const eventCount = security.events.filter(e => !e.resolved).length
      
      // Calculate security score
      let score = 100
      score -= threatCount * 10
      score -= eventCount * 5
      
      const riskLevel: SecurityLevel = 
        score >= 90 ? 'low' :
        score >= 70 ? 'medium' :
        score >= 50 ? 'high' : 'critical'
      
      const recommendations: string[] = []
      if (threatCount > 0) {
        recommendations.push('Review and resolve recent security threats')
      }
      if (eventCount > 0) {
        recommendations.push('Address unresolved security events')
      }
      if (!security.walletSecurity.multiFactorEnabled) {
        recommendations.push('Enable multi-factor authentication for enhanced security')
      }
      
      set((state) => {
        state.security.analysis = {
          overallScore: Math.max(0, score),
          riskLevel,
          threats: [...state.security.recentThreats],
          recommendations,
          lastAnalysis: Date.now(),
        }
        state.security.metrics.scansDone += 1
      })
      
    } catch (error: any) {
      set((state) => {
        state.security.error = error.message || 'Security analysis failed'
        state.security.lastError = Date.now()
      })
    }
  },
  
  updateAnalysis: (analysis: Partial<SecurityAnalysis>) => {
    set((state) => {
      state.security.analysis = { ...state.security.analysis, ...analysis }
    })
  },
  
  startSecuritySession: (sessionId: string) => {
    set((state) => {
      state.security.sessionSecurity = {
        ...state.security.sessionSecurity,
        authenticated: true,
        sessionId,
        sessionStartTime: Date.now(),
        lastActivity: Date.now(),
      }
    })
  },
  
  endSecuritySession: () => {
    set((state) => {
      state.security.sessionSecurity = {
        ...initialSecurityState.sessionSecurity,
      }
    })
  },
  
  updateSessionActivity: () => {
    set((state) => {
      state.security.sessionSecurity.lastActivity = Date.now()
    })
  },
  
  updateSessionSecurityChecks: (checks: Partial<SecurityState['sessionSecurity']['securityChecks']>) => {
    set((state) => {
      state.security.sessionSecurity.securityChecks = {
        ...state.security.sessionSecurity.securityChecks,
        ...checks,
      }
    })
  },
  
  updateWalletSecurity: (security: Partial<SecurityState['walletSecurity']>) => {
    set((state) => {
      state.security.walletSecurity = { ...state.security.walletSecurity, ...security }
    })
  },
  
  runWalletSecurityCheck: async () => {
    try {
      // Mock wallet security check - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set((state) => {
        state.security.walletSecurity.lastSecurityCheck = Date.now()
        state.security.walletSecurity.suspiciousActivityDetected = false
        state.security.sessionSecurity.securityChecks.walletIntegrity = true
      })
      
    } catch (error: any) {
      set((state) => {
        state.security.error = error.message || 'Wallet security check failed'
        state.security.lastError = Date.now()
      })
    }
  },
  
  updateNetworkSecurity: (security: Partial<SecurityState['networkSecurity']>) => {
    set((state) => {
      state.security.networkSecurity = { ...state.security.networkSecurity, ...security }
    })
  },
  
  checkNetworkSecurity: async () => {
    try {
      // Mock network security check - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set((state) => {
        state.security.networkSecurity.ipReputation = 'good'
        state.security.networkSecurity.rateLimitStatus = 'normal'
        state.security.sessionSecurity.securityChecks.networkSecurity = true
      })
      
    } catch (error: any) {
      set((state) => {
        state.security.error = error.message || 'Network security check failed'
        state.security.lastError = Date.now()
      })
    }
  },
  
  updateSecurityConfig: (config: Partial<SecurityState['config']>) => {
    set((state) => {
      state.security.config = { ...state.security.config, ...config }
    })
  },
  
  addSecurityAlert: (alert: Omit<SecurityState['alerts'][0], 'id' | 'timestamp' | 'dismissed'>) => {
    set((state) => {
      const newAlert = {
        ...alert,
        id: `alert_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
        timestamp: Date.now(),
        dismissed: false,
      }
      state.security.alerts.unshift(newAlert)
      
      // Keep only recent alerts (last 100)
      if (state.security.alerts.length > 100) {
        state.security.alerts = state.security.alerts.slice(0, 100)
      }
    })
  },
  
  dismissAlert: (alertId: string) => {
    set((state) => {
      const alert = state.security.alerts.find(a => a.id === alertId)
      if (alert) {
        alert.dismissed = true
      }
    })
  },
  
  clearAlerts: () => {
    set((state) => {
      state.security.alerts = []
    })
  },
  
  updateSecurityMetrics: (metrics: Partial<SecurityState['metrics']>) => {
    set((state) => {
      state.security.metrics = { ...state.security.metrics, ...metrics }
    })
  },
  
  resetSecurityMetrics: () => {
    set((state) => {
      state.security.metrics = {
        threatsBlocked: 0,
        falsePositives: 0,
        scansDone: 0,
        averageResponseTime: 0,
        systemHealth: 100,
      }
    })
  },
  
  setSecurityError: (error: string | null) => {
    set((state) => {
      state.security.error = error
      if (error) {
        state.security.lastError = Date.now()
      }
    })
  },
  
  clearSecurityError: () => {
    set((state) => {
      state.security.error = null
    })
  },
})