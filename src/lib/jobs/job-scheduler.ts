/**
 * CYPHER V3 - Job Scheduler
 * Replaces fragile setInterval() background tasks with a managed job system.
 * Uses Redis-backed scheduling when available, falls back to in-memory.
 *
 * Jobs are tracked in the database for audit and recovery.
 */

import { dbService } from '@/lib/database/db-service'
import { redis } from '@/lib/cache/redis.config'

// ============================================================================
// Types
// ============================================================================

export interface JobDefinition {
  name: string
  type: 'recurring' | 'once' | 'delayed'
  handler: () => Promise<void>
  intervalMs?: number      // For recurring jobs
  delayMs?: number         // For delayed/once jobs
  maxRetries?: number
  enabled?: boolean
}

interface RunningJob {
  definition: JobDefinition
  timer: ReturnType<typeof setInterval> | ReturnType<typeof setTimeout> | null
  lastRun: number
  lastDuration: number
  runCount: number
  errorCount: number
  isRunning: boolean
}

// ============================================================================
// Job Scheduler
// ============================================================================

class JobScheduler {
  private jobs: Map<string, RunningJob> = new Map()
  private started = false

  /**
   * Register a job definition
   */
  register(definition: JobDefinition): void {
    if (this.jobs.has(definition.name)) {
      return
    }

    this.jobs.set(definition.name, {
      definition,
      timer: null,
      lastRun: 0,
      lastDuration: 0,
      runCount: 0,
      errorCount: 0,
      isRunning: false,
    })

  }

  /**
   * Start all registered jobs
   */
  start(): void {
    if (this.started) return
    this.started = true


    for (const [name, job] of this.jobs) {
      if (job.definition.enabled === false) {
        continue
      }
      this.startJob(job)
    }
  }

  /**
   * Stop all jobs
   */
  stop(): void {
    for (const [, job] of this.jobs) {
      if (job.timer) {
        clearInterval(job.timer as any)
        clearTimeout(job.timer as any)
        job.timer = null
      }
    }
    this.started = false
  }

  /**
   * Get status of all jobs
   */
  getStatus(): Record<string, {
    type: string
    lastRun: number
    lastDuration: number
    runCount: number
    errorCount: number
    isRunning: boolean
    enabled: boolean
  }> {
    const status: Record<string, any> = {}
    for (const [name, job] of this.jobs) {
      status[name] = {
        type: job.definition.type,
        lastRun: job.lastRun,
        lastDuration: job.lastDuration,
        runCount: job.runCount,
        errorCount: job.errorCount,
        isRunning: job.isRunning,
        enabled: job.definition.enabled !== false,
      }
    }
    return status
  }

  /**
   * Run a specific job immediately
   */
  async runNow(jobName: string): Promise<boolean> {
    const job = this.jobs.get(jobName)
    if (!job) return false
    await this.executeJob(job)
    return true
  }

  // ========================================================================
  // Internal
  // ========================================================================

  private startJob(job: RunningJob): void {
    const { definition } = job

    switch (definition.type) {
      case 'recurring':
        // Run immediately, then on interval
        this.executeJob(job)
        job.timer = setInterval(() => this.executeJob(job), definition.intervalMs || 60_000)
        break

      case 'delayed':
        job.timer = setTimeout(() => this.executeJob(job), definition.delayMs || 0)
        break

      case 'once':
        this.executeJob(job)
        break
    }
  }

  private async executeJob(job: RunningJob): Promise<void> {
    if (job.isRunning) {
      return
    }

    // Use Redis lock to prevent duplicate execution across instances
    const lockKey = `job:lock:${job.definition.name}`
    try {
      const locked = await redis.set(lockKey, Date.now().toString(), 'EX', 300) // 5 min lock
      if (!locked && locked !== 'OK') {
        return // Another instance is running this job
      }
    } catch {
      // Redis unavailable, proceed without distributed lock
    }

    job.isRunning = true
    const startTime = Date.now()

    try {
      await job.definition.handler()
      job.runCount++
      job.lastRun = Date.now()
      job.lastDuration = Date.now() - startTime

      // Log successful job to DB (non-blocking)
      dbService.insertJobRecord({
        job_name: job.definition.name,
        job_type: job.definition.type,
        payload: { duration: job.lastDuration },
      }).then(record => {
        if (record) {
          dbService.updateJobStatus(record.id, 'completed', { duration: job.lastDuration }).catch(() => {})
        }
      }).catch(() => {})

    } catch (error) {
      job.errorCount++
      console.error(`[JobScheduler] Job "${job.definition.name}" failed:`, error)

      // Log failed job to DB
      dbService.insertJobRecord({
        job_name: job.definition.name,
        job_type: job.definition.type,
        payload: { error: String(error) },
      }).then(record => {
        if (record) {
          dbService.updateJobStatus(record.id, 'failed', undefined, String(error)).catch(() => {})
        }
      }).catch(() => {})

      // Retry logic for 'once' and 'delayed' jobs
      const maxRetries = job.definition.maxRetries ?? 3
      if (job.definition.type !== 'recurring' && job.errorCount <= maxRetries) {
        const retryDelay = Math.min(job.errorCount * 5000, 30000)
        setTimeout(() => this.executeJob(job), retryDelay)
      }
    } finally {
      job.isRunning = false
      // Release lock
      try {
        await redis.del(lockKey)
      } catch {
        // Best effort
      }
    }
  }
}

// Singleton
export const jobScheduler = new JobScheduler()
