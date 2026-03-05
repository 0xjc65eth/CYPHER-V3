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

      void totalTime;
      this.printPerformanceReport();

    } catch (error) {
      console.error('[WorkerTestRunner] Test suite failed:', error);
    }
  }

  /**
   * Test analytics processing with real market data simulation
   */
  async testAnalyticsProcessing(): Promise<void> {
    const prices = this.generateRealisticPriceData(500);
    const volumes = this.generateVolumeData(500);

    await this.workerService.processMarketAnalytics({
      prices,
      volumes,
      indicators: ['RSI', 'MACD', 'SMA', 'EMA', 'BB'],
      timeframe: '1h'
    });
  }

  /**
   * Test price data processing with OHLCV data
   */
  async testPriceDataProcessing(): Promise<void> {
    const ohlcv = this.generateOHLCVData(1000);

    await this.workerService.processPriceData({
      ohlcv,
      timeframe: '5m',
      calculations: ['SMA', 'EMA', 'RSI', 'MACD', 'ATR']
    });
  }

  /**
   * Test risk calculations with portfolio data
   */
  async testRiskCalculations(): Promise<void> {
    const portfolio = this.generatePortfolioData();
    const prices = this.generateRealisticPriceData(252); // 1 year of daily data

    await this.workerService.calculateRiskMetrics({
      portfolio,
      prices,
      position: {
        quantity: 1.5,
        price: prices[prices.length - 1],
        leverage: 2,
        stopLoss: prices[prices.length - 1] * 0.95
      }
    });
  }

  /**
   * Test ML predictions with feature engineering
   */
  async testMLPredictions(): Promise<void> {
    const features = this.generateFeatureMatrix(100);

    await this.workerService.generateMLPredictions({
      features,
      model: 'ensemble',
      target: 'price_direction'
    });
  }

  /**
   * Test chart rendering optimization
   */
  async testChartRendering(): Promise<void> {
    const datasets = this.generateChartDatasets(5000);

    await this.workerService.optimizeChartRendering({
      chartType: 'line',
      datasets,
      options: {
        responsive: true,
        animation: { duration: 0 },
        plugins: { legend: { display: true } }
      }
    });
  }

  /**
   * Test parallel workload across all worker types
   */
  async testParallelWorkload(): Promise<void> {
    const prices = this.generateRealisticPriceData(200);
    const volumes = this.generateVolumeData(200);

    await this.workerService.runParallelAnalysis(prices, volumes);
  }

  /**
   * Stress test with high concurrent load
   */
  async testStressLoad(): Promise<void> {
    const tasks = Array.from({ length: 20 }, (_, i) => ({
      type: ['analytics', 'price', 'risk', 'ml', 'chart'][i % 5] as any,
      data: this.generateTaskData(i % 5),
      priority: (i % 10) + 1
    }));

    await this.workerService.processBatch(tasks);
  }

  /**
   * Generate realistic Bitcoin price data with volatility
   */
  private generateRealisticPriceData(length: number): number[] {
    const prices = [];
    let currentPrice = 50000;

    for (let i = 0; i < length; i++) {
      // Add trend with deterministic pattern (no random walk)
      const trend = Math.sin(i * 0.02) * 0.001;
      const volatility = Math.sin(i * 0.1) * 0.025;
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
    return Array.from({ length }, (_, i) =>
      500000 + Math.sin(i * 0.3) * 400000
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
      const change = Math.sin(i * 0.15) * volatility;
      const close = open * (1 + change);

      const high = Math.max(open, close) * 1.005;
      const low = Math.min(open, close) * 0.995;
      const volume = 500000 + Math.sin(i * 0.3) * 400000;

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
    return Array.from({ length }, (_, i) => Math.sin(i * 0.5) * 0.05);
  }

  /**
   * Generate feature matrix for ML models
   */
  private generateFeatureMatrix(length: number): number[] {
    return Array.from({ length }, (_, i) => (i / length) * 100);
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
   * Print comprehensive performance report (no-op in production)
   */
  private printPerformanceReport(): void {
    // Performance metrics are available via workerService.getPerformanceMetrics()
    // but not logged to console in production
    void this.workerService.getPerformanceMetrics();
  }
}

// Export singleton instance
export const workerTestRunner = new WorkerTestRunner();
