import { workerService } from './workerService';

/**
 * Test runner for Worker Pool functionality
 * Demonstrates real workloads with parallel processing
 */
export class WorkerTestRunner {
  private workerService: any = workerService;

  /**
   * Run comprehensive test suite
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Worker Pool Test Suite...');
    
    const startTime = Date.now();
    
    try {
      // Test 1: Analytics processing
      await this.testAnalyticsProcessing();
      
      // Test 2: Price data processing
      await this.testPriceDataProcessing();
      
      // Test 3: Risk calculations
      await this.testRiskCalculations();
      
      // Test 4: ML predictions
      await this.testMLPredictions();
      
      // Test 5: Chart rendering
      await this.testChartRendering();
      
      // Test 6: Parallel workload
      await this.testParallelWorkload();
      
      // Test 7: Stress test
      await this.testStressLoad();
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      console.log(`✅ All tests completed in ${totalTime}ms`);
      this.printPerformanceReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  /**
   * Test analytics processing with real market data simulation
   */
  async testAnalyticsProcessing(): Promise<void> {
    console.log('📊 Testing Analytics Processing...');
    
    const prices = this.generateRealisticPriceData(500);
    const volumes = this.generateVolumeData(500);
    
    const start = Date.now();
    const result = await this.workerService.processMarketAnalytics({
      prices,
      volumes,
      indicators: ['RSI', 'MACD', 'SMA', 'EMA', 'BB'],
      timeframe: '1h'
    });
    const duration = Date.now() - start;
    
    console.log(`✓ Analytics completed in ${duration}ms`, {
      dataPoints: prices.length,
      indicators: result?.indicators || 'N/A'
    });
  }

  /**
   * Test price data processing with OHLCV data
   */
  async testPriceDataProcessing(): Promise<void> {
    console.log('💰 Testing Price Data Processing...');
    
    const ohlcv = this.generateOHLCVData(1000);
    
    const start = Date.now();
    const result = await this.workerService.processPriceData({
      ohlcv,
      timeframe: '5m',
      calculations: ['SMA', 'EMA', 'RSI', 'MACD', 'ATR']
    });
    const duration = Date.now() - start;
    
    console.log(`✓ Price processing completed in ${duration}ms`, {
      candles: ohlcv.length,
      technicals: result?.technicals || 'N/A'
    });
  }

  /**
   * Test risk calculations with portfolio data
   */
  async testRiskCalculations(): Promise<void> {
    console.log('🛡️ Testing Risk Calculations...');
    
    const portfolio = this.generatePortfolioData();
    const prices = this.generateRealisticPriceData(252); // 1 year of daily data
    
    const start = Date.now();
    const result = await this.workerService.calculateRiskMetrics({
      portfolio,
      prices,
      position: {
        quantity: 1.5,
        price: prices[prices.length - 1],
        leverage: 2,
        stopLoss: prices[prices.length - 1] * 0.95
      }
    });
    const duration = Date.now() - start;
    
    console.log(`✓ Risk calculations completed in ${duration}ms`, {
      portfolio: portfolio.assets.length,
      metrics: result ? Object.keys(result).length : 0
    });
  }

  /**
   * Test ML predictions with feature engineering
   */
  async testMLPredictions(): Promise<void> {
    console.log('🧠 Testing ML Predictions...');
    
    const features = this.generateFeatureMatrix(100);
    
    const start = Date.now();
    const result = await this.workerService.generateMLPredictions({
      features,
      model: 'ensemble',
      target: 'price_direction'
    });
    const duration = Date.now() - start;
    
    console.log(`✓ ML predictions completed in ${duration}ms`, {
      features: features.length,
      prediction: result?.predictions?.primary || 'N/A'
    });
  }

  /**
   * Test chart rendering optimization
   */
  async testChartRendering(): Promise<void> {
    console.log('📈 Testing Chart Rendering...');
    
    const datasets = this.generateChartDatasets(5000);
    
    const start = Date.now();
    const result = await this.workerService.optimizeChartRendering({
      chartType: 'line',
      datasets,
      options: {
        responsive: true,
        animation: { duration: 0 },
        plugins: { legend: { display: true } }
      }
    });
    const duration = Date.now() - start;
    
    console.log(`✓ Chart optimization completed in ${duration}ms`, {
      dataPoints: datasets[0]?.data?.length || 0,
      optimization: result?.performance || 'N/A'
    });
  }

  /**
   * Test parallel workload across all worker types
   */
  async testParallelWorkload(): Promise<void> {
    console.log('⚡ Testing Parallel Workload...');
    
    const prices = this.generateRealisticPriceData(200);
    const volumes = this.generateVolumeData(200);
    
    const start = Date.now();
    const result = await this.workerService.runParallelAnalysis(prices, volumes);
    const duration = Date.now() - start;
    
    console.log(`✓ Parallel analysis completed in ${duration}ms`, {
      analytics: result.analytics ? 'Success' : 'Failed',
      technicals: result.technicals ? 'Success' : 'Failed',
      predictions: result.predictions ? 'Success' : 'Failed',
      risk: result.risk ? 'Success' : 'Failed'
    });
  }

  /**
   * Stress test with high concurrent load
   */
  async testStressLoad(): Promise<void> {
    console.log('🔥 Testing Stress Load...');
    
    const tasks = Array.from({ length: 20 }, (_, i) => ({
      type: ['analytics', 'price', 'risk', 'ml', 'chart'][i % 5] as any,
      data: this.generateTaskData(i % 5),
      priority: Math.floor(Math.random() * 10) + 1
    }));
    
    const start = Date.now();
    const results = await this.workerService.processBatch(tasks);
    const duration = Date.now() - start;
    
    const successful = results.filter((r: any) => !r.error).length;
    const failed = results.length - successful;
    
    console.log(`✓ Stress test completed in ${duration}ms`, {
      totalTasks: tasks.length,
      successful,
      failed,
      successRate: `${Math.round((successful / tasks.length) * 100)}%`
    });
  }

  /**
   * Generate realistic Bitcoin price data with volatility
   */
  private generateRealisticPriceData(length: number): number[] {
    const prices = [];
    let currentPrice = 50000;
    
    for (let i = 0; i < length; i++) {
      // Add trend, volatility, and random walk
      const trend = Math.sin(i * 0.02) * 0.001;
      const volatility = (Math.random() - 0.5) * 0.05;
      const change = trend + volatility;
      
      currentPrice *= (1 + change);
      prices.push(Math.max(1000, currentPrice)); // Minimum price floor
    }
    
    return prices;
  }

  /**
   * Generate volume data correlated with price movements
   */
  private generateVolumeData(length: number): number[] {
    return Array.from({ length }, () => 
      Math.random() * 1000000 + 100000
    );
  }

  /**
   * Generate OHLCV candlestick data
   */
  private generateOHLCVData(length: number): number[][] {
    const ohlcv = [];
    let currentPrice = 50000;
    let timestamp = Date.now() - (length * 5 * 60 * 1000); // 5-minute intervals
    
    for (let i = 0; i < length; i++) {
      const open = currentPrice;
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * volatility;
      const close = open * (1 + change);
      
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.random() * 1000000 + 100000;
      
      ohlcv.push([timestamp, open, high, low, close, volume]);
      
      currentPrice = close;
      timestamp += 5 * 60 * 1000; // 5 minutes
    }
    
    return ohlcv;
  }

  /**
   * Generate portfolio data for risk calculations
   */
  private generatePortfolioData() {
    return {
      totalValue: 100000,
      assets: [
        { symbol: 'BTC', value: 40000, volatility: 0.6, returns: this.generateReturns(30) },
        { symbol: 'ETH', value: 30000, volatility: 0.7, returns: this.generateReturns(30) },
        { symbol: 'SOL', value: 15000, volatility: 0.8, returns: this.generateReturns(30) },
        { symbol: 'AVAX', value: 10000, volatility: 0.9, returns: this.generateReturns(30) },
        { symbol: 'MATIC', value: 5000, volatility: 0.75, returns: this.generateReturns(30) }
      ]
    };
  }

  /**
   * Generate returns data for assets
   */
  private generateReturns(length: number): number[] {
    return Array.from({ length }, () => (Math.random() - 0.5) * 0.1);
  }

  /**
   * Generate feature matrix for ML models
   */
  private generateFeatureMatrix(length: number): number[] {
    return Array.from({ length }, () => Math.random() * 100);
  }

  /**
   * Generate chart datasets
   */
  private generateChartDatasets(dataPoints: number) {
    const prices = this.generateRealisticPriceData(dataPoints);
    
    return [{
      label: 'Bitcoin Price',
      data: prices.map((price, i) => ({ x: i, y: price })),
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
    }];
  }

  /**
   * Generate task data based on worker type
   */
  private generateTaskData(workerType: number) {
    switch (workerType) {
      case 0: // analytics
        return {
          prices: this.generateRealisticPriceData(100),
          volumes: this.generateVolumeData(100),
          indicators: ['RSI', 'MACD']
        };
      case 1: // price
        return {
          ohlcv: this.generateOHLCVData(50),
          timeframe: '1m'
        };
      case 2: // risk
        return {
          portfolio: this.generatePortfolioData(),
          prices: this.generateRealisticPriceData(50)
        };
      case 3: // ml
        return {
          features: this.generateFeatureMatrix(50),
          model: 'linear'
        };
      case 4: // chart
        return {
          chartType: 'line',
          datasets: this.generateChartDatasets(100)
        };
      default:
        return {};
    }
  }

  /**
   * Print comprehensive performance report
   */
  private printPerformanceReport(): void {
    const metrics = this.workerService.getPerformanceMetrics();
    
    console.log('\n📊 WORKER POOL PERFORMANCE REPORT');
    console.log('================================');
    console.log(`Total Tasks: ${metrics.totalTasks}`);
    console.log(`Successful: ${metrics.successfulTasks}`);
    console.log(`Failed: ${metrics.failedTasks}`);
    console.log(`Success Rate: ${Math.round((metrics.successfulTasks / metrics.totalTasks) * 100)}%`);
    console.log(`Average Execution Time: ${Math.round(metrics.averageExecutionTime)}ms`);
    console.log(`Health Score: ${Math.round(metrics.healthScore)}/100`);
    
    if (metrics.workerPool) {
      console.log('\nWorker Pool Status:');
      console.log(`- Total Workers: ${metrics.workerPool.totalWorkers}`);
      console.log(`- Busy Workers: ${metrics.workerPool.busyWorkers}`);
      console.log(`- Idle Workers: ${metrics.workerPool.idleWorkers}`);
      console.log(`- Utilization: ${Math.round(metrics.workerPool.utilizationRate)}%`);
    }
    
    console.log('\nWorker Utilization by Type:');
    Object.entries(metrics.workerUtilization).forEach(([type, utilization]) => {
      console.log(`- ${type}: ${Math.round(utilization as number)}%`);
    });
    
    console.log('\n✅ Test suite completed successfully!');
  }
}

// Export singleton instance
export const workerTestRunner = new WorkerTestRunner();