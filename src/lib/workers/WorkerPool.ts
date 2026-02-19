// Advanced Worker Pool for Parallel Processing
export interface WorkerTask {
  id: string
  type: 'price_analysis' | 'arbitrage_scan' | 'pattern_detection' | 'sentiment_analysis'
  data: any
  priority: number
  timestamp: number
}

export interface WorkerResult {
  taskId: string
  success: boolean
  result?: any
  error?: string
  executionTime: number
}

interface PooledWorker {
  id: number
  worker: Worker
  busy: boolean
  taskCount: number
}

export class WorkerPool {
  private readonly WORKER_COUNT = 200
  private workers: PooledWorker[] = []
  private taskQueue: WorkerTask[] = []
  private pendingTasks: Map<string, {
    resolve: (result: WorkerResult) => void
    reject: (error: Error) => void
  }> = new Map()
  private isInitialized = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize()
    }
  }

  private async initialize() {
    
    // Create worker script content inline
    const workerScript = `
      self.addEventListener('message', async (event) => {
        const { taskId, type, data } = event.data
        const startTime = Date.now()
        
        try {
          let result
          
          switch (type) {
            case 'price_analysis':
              result = await analyzePrices(data)
              break
            case 'arbitrage_scan':
              result = await scanArbitrage(data)
              break
            case 'pattern_detection':
              result = await detectPatterns(data)
              break
            case 'sentiment_analysis':
              result = await analyzeSentiment(data)
              break
            default:
              throw new Error('Unknown task type: ' + type)
          }
          
          self.postMessage({
            taskId,
            success: true,
            result,
            executionTime: Date.now() - startTime
          })
        } catch (error) {
          self.postMessage({
            taskId,
            success: false,
            error: error.message,
            executionTime: Date.now() - startTime
          })
        }
      })
      
      async function analyzePrices(data) {
        // Simple moving average calculation
        const { prices, period = 20 } = data
        if (!prices || prices.length < period) return null
        
        const sma = []
        for (let i = period - 1; i < prices.length; i++) {
          const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
          sma.push(sum / period)
        }
        
        // Calculate RSI
        const gains = []
        const losses = []
        for (let i = 1; i < prices.length; i++) {
          const diff = prices[i] - prices[i - 1]
          gains.push(diff > 0 ? diff : 0)
          losses.push(diff < 0 ? -diff : 0)
        }
        
        const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14
        const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
        const rsi = 100 - (100 / (1 + rs))
        
        return {
          currentPrice: prices[prices.length - 1],
          sma: sma[sma.length - 1],
          rsi,
          trend: prices[prices.length - 1] > sma[sma.length - 1] ? 'bullish' : 'bearish',
          strength: Math.abs(rsi - 50) / 50
        }
      }
      
      async function scanArbitrage(data) {
        const { exchanges } = data
        const opportunities = []
        
        for (let i = 0; i < exchanges.length; i++) {
          for (let j = i + 1; j < exchanges.length; j++) {
            const priceDiff = Math.abs(exchanges[i].price - exchanges[j].price)
            const profitPercentage = (priceDiff / Math.min(exchanges[i].price, exchanges[j].price)) * 100
            
            if (profitPercentage > 0.1) {
              opportunities.push({
                buyExchange: exchanges[i].price < exchanges[j].price ? exchanges[i].name : exchanges[j].name,
                sellExchange: exchanges[i].price > exchanges[j].price ? exchanges[i].name : exchanges[j].name,
                buyPrice: Math.min(exchanges[i].price, exchanges[j].price),
                sellPrice: Math.max(exchanges[i].price, exchanges[j].price),
                profit: profitPercentage
              })
            }
          }
        }
        
        return opportunities.sort((a, b) => b.profit - a.profit)
      }
      
      async function detectPatterns(data) {
        const { candles } = data
        const patterns = []
        
        // Simple pattern detection
        if (candles.length >= 3) {
          const [prev, curr, next] = candles.slice(-3)
          
          // Hammer pattern
          if (curr.low < prev.low && curr.close > curr.open && (curr.close - curr.open) < (curr.high - curr.low) * 0.3) {
            patterns.push({ type: 'hammer', confidence: 0.7 })
          }
          
          // Doji pattern
          if (Math.abs(curr.close - curr.open) < (curr.high - curr.low) * 0.1) {
            patterns.push({ type: 'doji', confidence: 0.8 })
          }
        }
        
        return patterns
      }
      
      async function analyzeSentiment(data) {
        const { text } = data
        const positiveWords = ['bullish', 'moon', 'pump', 'buy', 'long', 'growth']
        const negativeWords = ['bearish', 'dump', 'sell', 'short', 'crash', 'bear']
        
        const words = text.toLowerCase().split(/\\s+/)
        let positiveCount = 0
        let negativeCount = 0
        
        words.forEach(word => {
          if (positiveWords.includes(word)) positiveCount++
          if (negativeWords.includes(word)) negativeCount++
        })
        
        const total = positiveCount + negativeCount
        if (total === 0) return { sentiment: 'neutral', score: 0 }
        
        const score = (positiveCount - negativeCount) / total
        return {
          sentiment: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral',
          score,
          confidence: Math.min(total / words.length, 1)
        }
      }
    `
    
    // Create workers using blob URL
    const blob = new Blob([workerScript], { type: 'application/javascript' })
    const workerUrl = URL.createObjectURL(blob)
    
    // Initialize workers
    for (let i = 0; i < this.WORKER_COUNT; i++) {
      const worker = new Worker(workerUrl)
      const pooledWorker: PooledWorker = {
        id: i,
        worker,
        busy: false,
        taskCount: 0
      }
      
      worker.addEventListener('message', (event) => {
        this.handleWorkerMessage(pooledWorker, event.data)
      })
      
      worker.addEventListener('error', (error) => {
        console.error(`Worker ${i} error:`, error)
        pooledWorker.busy = false
      })
      
      this.workers.push(pooledWorker)
    }
    
    this.isInitialized = true
    
    // Start processing queue
    this.processQueue()
  }

  private handleWorkerMessage(worker: PooledWorker, message: WorkerResult) {
    worker.busy = false
    worker.taskCount++
    
    const pending = this.pendingTasks.get(message.taskId)
    if (pending) {
      pending.resolve(message)
      this.pendingTasks.delete(message.taskId)
    }
    
    // Process next task in queue
    this.processQueue()
  }

  private processQueue() {
    if (!this.isInitialized || this.taskQueue.length === 0) return
    
    // Find available workers
    const availableWorkers = this.workers.filter(w => !w.busy)
    if (availableWorkers.length === 0) return
    
    // Sort tasks by priority
    this.taskQueue.sort((a, b) => b.priority - a.priority)
    
    // Assign tasks to workers
    while (this.taskQueue.length > 0 && availableWorkers.length > 0) {
      const task = this.taskQueue.shift()!
      const worker = availableWorkers.shift()!
      
      worker.busy = true
      worker.worker.postMessage({
        taskId: task.id,
        type: task.type,
        data: task.data
      })
    }
  }

  public async executeTask(task: Omit<WorkerTask, 'id' | 'timestamp'>): Promise<WorkerResult> {
    const taskWithId: WorkerTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }
    
    return new Promise((resolve, reject) => {
      this.pendingTasks.set(taskWithId.id, { resolve, reject })
      this.taskQueue.push(taskWithId)
      this.processQueue()
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingTasks.has(taskWithId.id)) {
          this.pendingTasks.delete(taskWithId.id)
          reject(new Error('Task timeout'))
        }
      }, 30000)
    })
  }

  public async analyzeBitcoinPrice(data: {
    symbol: string
    prices: number[]
    volumes: number[]
    timeframe: string
  }): Promise<{
    predictions: any[]
    consensus: number
    confidence: number
  }> {
    // Execute parallel analysis across multiple workers
    const tasks = []
    const batchSize = Math.ceil(data.prices.length / 10)
    
    for (let i = 0; i < 10; i++) {
      const start = i * batchSize
      const end = Math.min(start + batchSize, data.prices.length)
      
      tasks.push(this.executeTask({
        type: 'price_analysis',
        data: {
          prices: data.prices.slice(start, end),
          volumes: data.volumes.slice(start, end)
        },
        priority: 10
      }))
    }
    
    const results = await Promise.all(tasks)
    const validResults = results.filter(r => r.success && r.result)
    
    // Aggregate predictions
    const predictions = validResults.map(r => r.result)
    const avgPrice = predictions.reduce((sum, p) => sum + (p.currentPrice || 0), 0) / predictions.length
    const confidence = validResults.length / tasks.length
    
    return {
      predictions,
      consensus: avgPrice,
      confidence
    }
  }

  public getStatus() {
    const busyWorkers = this.workers.filter(w => w.busy).length
    const totalTasks = this.workers.reduce((sum, w) => sum + w.taskCount, 0)
    
    return {
      initialized: this.isInitialized,
      totalWorkers: this.WORKER_COUNT,
      busyWorkers,
      idleWorkers: this.WORKER_COUNT - busyWorkers,
      queueLength: this.taskQueue.length,
      totalTasksProcessed: totalTasks,
      utilizationRate: (busyWorkers / this.WORKER_COUNT) * 100
    }
  }

  public destroy() {
    this.workers.forEach(w => w.worker.terminate())
    this.workers = []
    this.taskQueue = []
    this.pendingTasks.clear()
    this.isInitialized = false
  }
}

// Singleton instance
export const workerPool = new WorkerPool()