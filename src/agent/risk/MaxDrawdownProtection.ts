/**
 * CYPHER AI Trading Agent - Max Drawdown Protection
 * Tracks equity curve and enforces drawdown limits
 */

export class MaxDrawdownProtection {
  private equityHistory: Array<{ timestamp: number; equity: number }> = [];
  private peakEquity: number = 0;
  private maxDrawdownSeen: number = 0;

  constructor(private initialCapital: number) {
    this.peakEquity = initialCapital;
    this.equityHistory.push({ timestamp: Date.now(), equity: initialCapital });
  }

  // Update equity curve with new value
  updateEquity(currentEquity: number): void {
    this.equityHistory.push({ timestamp: Date.now(), equity: currentEquity });

    if (currentEquity > this.peakEquity) {
      this.peakEquity = currentEquity;
    }

    const currentDrawdown = (this.peakEquity - currentEquity) / this.peakEquity;
    if (currentDrawdown > this.maxDrawdownSeen) {
      this.maxDrawdownSeen = currentDrawdown;
    }

    // Keep only last 30 days of history (every 5 minutes = ~8640 entries)
    if (this.equityHistory.length > 10000) {
      this.equityHistory = this.equityHistory.slice(-10000);
    }
  }

  getCurrentDrawdown(): number {
    const lastEquity = this.equityHistory[this.equityHistory.length - 1]?.equity || this.initialCapital;
    return this.peakEquity > 0 ? (this.peakEquity - lastEquity) / this.peakEquity : 0;
  }

  getMaxDrawdown(): number {
    return this.maxDrawdownSeen;
  }

  getDailyPnL(): number {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const dayStart = this.equityHistory.find(e => e.timestamp >= oneDayAgo);
    const current = this.equityHistory[this.equityHistory.length - 1];

    if (!dayStart || !current) return 0;
    return current.equity - dayStart.equity;
  }

  getWeeklyPnL(): number {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekStart = this.equityHistory.find(e => e.timestamp >= oneWeekAgo);
    const current = this.equityHistory[this.equityHistory.length - 1];

    if (!weekStart || !current) return 0;
    return current.equity - weekStart.equity;
  }

  getPeakEquity(): number {
    return this.peakEquity;
  }

  getEquityHistory(): Array<{ timestamp: number; equity: number }> {
    return [...this.equityHistory];
  }
}
