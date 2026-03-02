// 📊 CYPHER ORDI FUTURE v3.0.0 - Charts Library
// Biblioteca centralizada de componentes Recharts

// Base Components
export { BaseChart } from './base/BaseChart';

// Bitcoin Charts
export { BitcoinPriceChart } from './bitcoin/BitcoinPriceChart';

// Trading Charts
export { VolumeChart } from './trading/CandlestickChart';

// AI Charts
export { NeuralPredictionChart } from './ai/NeuralPredictionChart';
export { SentimentChart } from './ai/SentimentChart';

// Re-export existing chart components as LineChart, PieChart, DonutChart (aliases for backwards compatibility)
export { BitcoinPriceChart as LineChart } from './bitcoin/BitcoinPriceChart';
export { BaseChart as PieChart } from './base/BaseChart';
export { BaseChart as DonutChart } from './base/BaseChart';
export { BaseChart as BarChart } from './base/BaseChart';

// Types
export type { 
  ChartProps, 
  ChartData, 
  PriceData, 
  ChartTimeframe 
} from './types/chartTypes';

// Utils
export { 
  formatCurrency, 
  generateMockData, 
  calculateSMA 
} from './utils/chartUtils';