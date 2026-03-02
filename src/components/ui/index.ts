// Loading States
export {
  LoadingStates,
  SpinnerLoader,
  DotsLoader,
  PulseLoader,
  WaveLoader,
  BarsLoader,
  RingLoader,
  BounceLoader,
  SkeletonLoader,
  LoadingOverlay,
  type LoadingStateProps,
  type SkeletonProps,
  type LoadingOverlayProps
} from './LoadingStates';

// Animated Cards
export {
  default as AnimatedCard,
  BaseCard,
  HoverEffectCard,
  FlipCard,
  GlowCard,
  FloatingCard,
  StackedCards,
  InteractiveCard,
  type AnimatedCardProps,
  type HoverEffectCardProps,
  type FlipCardProps,
  type GlowCardProps,
  type FloatingCardProps,
  type StackedCardsProps,
  type InteractiveCardProps
} from './AnimatedCards';

// Progress Indicators
export {
  default as ProgressIndicators,
  CircularProgress,
  LinearProgress,
  StepProgress,
  MultiProgress,
  SkillBar,
  AnimatedCounter,
  WaveProgress,
  type BaseProgressProps,
  type CircularProgressProps,
  type LinearProgressProps,
  type StepProgressProps,
  type MultiProgressProps,
  type SkillBarProps,
  type CounterProps
} from './ProgressIndicators';

// Interactive Charts
export {
  default as InteractiveCharts,
  LineChart,
  BarChart,
  PieChart,
  MiniChart,
  Heatmap,
  type BaseChartProps,
  type LineChartProps,
  type BarChartProps,
  type PieChartProps,
  type AreaChartProps,
  type ScatterPlotProps,
  type HeatmapProps,
  type MiniChartProps
} from './InteractiveCharts';

// Responsive Layouts
export {
  default as ResponsiveLayouts,
  ResponsiveContainer,
  GridLayout,
  FlexLayout,
  StackLayout,
  SidebarLayout,
  MasonryLayout,
  CardGrid,
  AspectRatio,
  Show,
  LayoutDebugger,
  useBreakpoint,
  type ResponsiveContainerProps,
  type GridLayoutProps,
  type FlexLayoutProps,
  type StackLayoutProps,
  type SidebarLayoutProps,
  type MasonryLayoutProps,
  type CardGridProps,
  type AspectRatioProps
} from './ResponsiveLayouts';

// Re-export existing UI components (named exports, shadcn style)
export * from './alert';
export * from './badge';
export * from './button';
export * from './card';
export * from './dialog';
export * from './dropdown-menu';
export * from './image';
export * from './input';
export * from './label';
export * from './progress';
export * from './scroll-area';
export * from './select';
export * from './separator';
export * from './slider';
export * from './switch';
export * from './table';
export * from './tabs';
export * from './tooltip';
export { useToast } from './use-toast';

// Error Boundaries
export { default as ChartErrorBoundary } from './ChartErrorBoundary';
export { default as DashboardErrorBoundary } from './DashboardErrorBoundary';
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as LoadingSpinner } from './LoadingSpinner';
export { default as PWAInstallPrompt } from './PWAInstallPrompt';