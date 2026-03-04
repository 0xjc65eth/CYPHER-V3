/**
 * CYPHER V3 - Default Background Jobs
 * Registers all standard background jobs for the application.
 * These replace the fragile setInterval() calls scattered across services.
 */

import { jobScheduler } from './job-scheduler'
import { dbService } from '@/lib/database/db-service'

/**
 * Register all default background jobs
 */
export function registerDefaultJobs(): void {
  // ========================================================================
  // Session Cleanup - Clean expired admin sessions every 15 minutes
  // ========================================================================
  jobScheduler.register({
    name: 'session-cleanup',
    type: 'recurring',
    intervalMs: 15 * 60 * 1000, // 15 minutes
    handler: async () => {
      const cleaned = await dbService.cleanExpiredSessions()
      if (cleaned > 0) {
      }
    },
  })

  // ========================================================================
  // Health Check - Monitor system health every 30 seconds
  // ========================================================================
  jobScheduler.register({
    name: 'health-check',
    type: 'recurring',
    intervalMs: 30 * 1000, // 30 seconds
    handler: async () => {
      const dbConnected = await dbService.testConnection()
      if (!dbConnected) {
      }
    },
  })

  // ========================================================================
  // Fee Reconciliation - Check pending fees every 5 minutes
  // ========================================================================
  jobScheduler.register({
    name: 'fee-reconciliation',
    type: 'recurring',
    intervalMs: 5 * 60 * 1000, // 5 minutes
    handler: async () => {
      const stats = await dbService.getFeeStats()
      if (stats.totalPending > 0) {
      }
    },
  })

  // ========================================================================
  // Signal Expiry - Expire old trading signals every 10 minutes
  // ========================================================================
  jobScheduler.register({
    name: 'signal-expiry',
    type: 'recurring',
    intervalMs: 10 * 60 * 1000, // 10 minutes
    handler: async () => {
      // Signals older than 24h should be deactivated
      // This would be done via a direct DB query in production
    },
  })

  // ========================================================================
  // DB Connection Init - Test database on startup
  // ========================================================================
  jobScheduler.register({
    name: 'db-init',
    type: 'once',
    handler: async () => {
      const connected = await dbService.testConnection()
    },
  })

  // ========================================================================
  // Agent: Equity Snapshot - Save agent PnL snapshot every 5 minutes
  // ========================================================================
  jobScheduler.register({
    name: 'agent-equity-snapshot',
    type: 'recurring',
    intervalMs: 5 * 60 * 1000, // 5 minutes
    handler: async () => {
      try {
        const { getOrchestrator } = await import('@/agent/core/AgentOrchestrator')
        const orchestrator = getOrchestrator('system')
        const state = orchestrator.getState()
        if (state.status !== 'active') return

        const { getAgentPersistence } = await import('@/agent/persistence')
        const persistence = getAgentPersistence()
        const configId = (orchestrator as any).configId
        if (!configId) return

        const perf = orchestrator.getPerformance()
        await persistence.saveEquitySnapshot(configId, {
          equity: perf.totalPnl + 10000, // base capital + PnL
          realized_pnl: perf.totalPnl,
          unrealized_pnl: state.positions.reduce((sum: number, p: any) => sum + p.unrealizedPnl, 0),
          positions_count: state.positions.length,
          drawdown: perf.currentDrawdown,
        })
      } catch (error) {
      }
    },
  })

  // ========================================================================
  // Agent: Auto-Compound - Reinvest profits every 4 hours
  // ========================================================================
  jobScheduler.register({
    name: 'agent-auto-compound',
    type: 'recurring',
    intervalMs: 4 * 60 * 60 * 1000, // 4 hours
    handler: async () => {
      try {
        const { getOrchestrator } = await import('@/agent/core/AgentOrchestrator')
        const orchestrator = getOrchestrator('system')
        const state = orchestrator.getState()
        if (state.status !== 'active') return

        // Auto-compound is handled by the orchestrator's compound interval
        // This job serves as a backup trigger
      } catch (error) {
      }
    },
  })

  // ========================================================================
  // Agent: Session Key Cleanup - Revoke expired keys every hour
  // ========================================================================
  jobScheduler.register({
    name: 'agent-session-key-cleanup',
    type: 'recurring',
    intervalMs: 60 * 60 * 1000, // 1 hour
    handler: async () => {
      try {
        const { getSessionKeyManager } = await import('@/agent/wallet')
        const manager = getSessionKeyManager()
        const revoked = await manager.revokeExpiredKeys()
        if (revoked > 0) {
        }
      } catch (error) {
      }
    },
  })

  // ========================================================================
  // Agent: LP Rebalance Check - Monitor LP positions every 15 minutes
  // ========================================================================
  jobScheduler.register({
    name: 'agent-lp-rebalance-check',
    type: 'recurring',
    intervalMs: 15 * 60 * 1000, // 15 minutes
    handler: async () => {
      try {
        const { getOrchestrator } = await import('@/agent/core/AgentOrchestrator')
        const orchestrator = getOrchestrator('system')
        const state = orchestrator.getState()
        if (state.status !== 'active') return

        const outOfRange = state.lpPositions.filter((lp: any) => !lp.inRange)
        if (outOfRange.length > 0) {
        }
      } catch (error) {
      }
    },
  })

  // ========================================================================
  // Agent: Daily Performance Report - Log daily stats at midnight
  // ========================================================================
  jobScheduler.register({
    name: 'agent-performance-report',
    type: 'recurring',
    intervalMs: 24 * 60 * 60 * 1000, // 24 hours
    handler: async () => {
      try {
        const { getOrchestrator } = await import('@/agent/core/AgentOrchestrator')
        const orchestrator = getOrchestrator('system')
        const perf = orchestrator.getPerformance()
        const config = orchestrator.getConfig()

      } catch (error) {
      }
    },
  })

}
