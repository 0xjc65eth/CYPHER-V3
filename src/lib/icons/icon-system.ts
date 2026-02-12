/**
 * Comprehensive Icon System Configuration
 * Bloomberg Terminal Inspired Professional Icon Mapping
 */

import {
  // Trading & Market Icons
  TrendingUp,
  TrendingDown,
  CandlestickChart,
  LineChart,
  BarChart3,
  ArrowUpDown,
  ArrowRightLeft,
  Scale,
  Target,
  Crosshair,
  
  // Crypto & Blockchain Icons
  Bitcoin,
  Wallet,
  Coins,
  CircuitBoard,
  Cpu,
  HardDrive,
  Binary,
  Hash,
  Key,
  Lock,
  
  // Analytics & Data Icons
  Activity,
  BarChart,
  PieChart,
  TrendingUp as Analytics,
  Database,
  FileBarChart,
  Gauge,
  Sigma,
  Calculator,
  
  // AI & Neural Icons
  Brain,
  Bot,
  Sparkles,
  Zap,
  Network,
  GitBranch,
  Workflow,
  Cpu as Processor,
  Command,
  Terminal,
  
  // Social & Communication Icons
  MessageSquare,
  Users,
  UserCheck,
  Share2,
  Send,
  Bell,
  BellRing,
  Mail,
  AtSign,
  Globe,
  
  // Navigation & UI Icons
  Home,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  MoreHorizontal,
  Grid3x3,
  
  // Action & Status Icons
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  Download,
  Upload,
  Save,
  Copy,
  Check,
  AlertTriangle,
  
  // Settings & System Icons
  Settings,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Shield,
  ShieldCheck,
  Info,
  HelpCircle,
  FileText,
  Code,
  
  // Time & History Icons
  Clock,
  History,
  Calendar,
  Timer,
  Hourglass,
  
  // Additional Professional Icons
  Building2,
  Briefcase,
  Trophy,
  Award,
  Star,
  Bookmark,
  Flag,
  Pin,
  Layers,
  Package,
  
  type LucideIcon
} from 'lucide-react';

export interface IconConfig {
  icon: LucideIcon;
  label: string;
  description?: string;
  color?: string;
}

export interface IconCategory {
  name: string;
  description: string;
  icons: Record<string, IconConfig>;
}

/**
 * Bloomberg Terminal-inspired icon system with professional categorization
 */
export const IconSystem: Record<string, IconCategory> = {
  // Trading & Market Icons
  trading: {
    name: 'Trading & Markets',
    description: 'Icons for trading operations and market data',
    icons: {
      marketTrend: { icon: TrendingUp, label: 'Market Trend', color: '#00D964' },
      priceChart: { icon: CandlestickChart, label: 'Price Chart', color: '#FFB800' },
      orderBook: { icon: BarChart3, label: 'Order Book', color: '#0088FE' },
      trades: { icon: ArrowUpDown, label: 'Trades', color: '#00C49F' },
      arbitrage: { icon: ArrowRightLeft, label: 'Arbitrage', color: '#FFBB28' },
      balance: { icon: Scale, label: 'Balance', color: '#8884D8' },
      target: { icon: Target, label: 'Price Target', color: '#FF8042' },
      precision: { icon: Crosshair, label: 'Precision Trading', color: '#00D964' },
      volatility: { icon: Activity, label: 'Volatility', color: '#FF6B6B' }
    }
  },

  // Cryptocurrency Icons
  crypto: {
    name: 'Cryptocurrency',
    description: 'Blockchain and cryptocurrency related icons',
    icons: {
      bitcoin: { icon: Bitcoin, label: 'Bitcoin', color: '#F7931A' },
      wallet: { icon: Wallet, label: 'Wallet', color: '#4E7CFF' },
      tokens: { icon: Coins, label: 'Tokens', color: '#FFD700' },
      blockchain: { icon: CircuitBoard, label: 'Blockchain', color: '#00D4FF' },
      mining: { icon: Cpu, label: 'Mining', color: '#8B7FFF' },
      storage: { icon: HardDrive, label: 'Cold Storage', color: '#6C757D' },
      ordinals: { icon: Binary, label: 'Ordinals', color: '#FF6B00' },
      hash: { icon: Hash, label: 'Hash Rate', color: '#00BFA5' },
      keys: { icon: Key, label: 'Private Keys', color: '#FFB800' },
      security: { icon: Lock, label: 'Security', color: '#00C853' }
    }
  },

  // Analytics & Data Visualization
  analytics: {
    name: 'Analytics & Data',
    description: 'Data analysis and visualization icons',
    icons: {
      dashboard: { icon: Gauge, label: 'Dashboard', color: '#0088FE' },
      charts: { icon: LineChart, label: 'Charts', color: '#00C49F' },
      metrics: { icon: BarChart, label: 'Metrics', color: '#FFBB28' },
      distribution: { icon: PieChart, label: 'Distribution', color: '#FF8042' },
      database: { icon: Database, label: 'Database', color: '#8884D8' },
      reports: { icon: FileBarChart, label: 'Reports', color: '#82CA9D' },
      calculate: { icon: Calculator, label: 'Calculator', color: '#FFC658' },
      sigma: { icon: Sigma, label: 'Statistics', color: '#8B7FFF' },
      heatmap: { icon: Grid3x3, label: 'Heatmap', color: '#FF6B6B' }
    }
  },

  // AI & Machine Learning
  ai: {
    name: 'AI & Neural Systems',
    description: 'Artificial intelligence and neural network icons',
    icons: {
      neural: { icon: Brain, label: 'Neural Network', color: '#9C27B0' },
      bot: { icon: Bot, label: 'AI Bot', color: '#00BCD4' },
      insights: { icon: Sparkles, label: 'AI Insights', color: '#FFD700' },
      processing: { icon: Zap, label: 'Processing', color: '#FFC107' },
      network: { icon: Network, label: 'Network', color: '#4CAF50' },
      branches: { icon: GitBranch, label: 'Model Branches', color: '#FF5722' },
      workflow: { icon: Workflow, label: 'Workflow', color: '#2196F3' },
      compute: { icon: Processor, label: 'Compute', color: '#795548' },
      command: { icon: Command, label: 'Commands', color: '#607D8B' },
      terminal: { icon: Terminal, label: 'Terminal', color: '#00E676' }
    }
  },

  // Social & Communication
  social: {
    name: 'Social & Communication',
    description: 'Social features and communication tools',
    icons: {
      chat: { icon: MessageSquare, label: 'Chat', color: '#0088FE' },
      community: { icon: Users, label: 'Community', color: '#00C49F' },
      verified: { icon: UserCheck, label: 'Verified', color: '#00C853' },
      share: { icon: Share2, label: 'Share', color: '#FFBB28' },
      send: { icon: Send, label: 'Send', color: '#FF8042' },
      notifications: { icon: Bell, label: 'Notifications', color: '#8884D8' },
      alerts: { icon: BellRing, label: 'Alerts', color: '#FF6B6B' },
      email: { icon: Mail, label: 'Email', color: '#82CA9D' },
      mention: { icon: AtSign, label: 'Mention', color: '#FFC658' },
      global: { icon: Globe, label: 'Global', color: '#8B7FFF' }
    }
  },

  // Navigation
  navigation: {
    name: 'Navigation',
    description: 'Navigation and menu icons',
    icons: {
      home: { icon: Home, label: 'Home', color: '#0088FE' },
      menu: { icon: Menu, label: 'Menu', color: '#6C757D' },
      close: { icon: X, label: 'Close', color: '#FF6B6B' },
      next: { icon: ChevronRight, label: 'Next', color: '#00C49F' },
      previous: { icon: ChevronLeft, label: 'Previous', color: '#00C49F' },
      expand: { icon: ChevronDown, label: 'Expand', color: '#FFBB28' },
      collapse: { icon: ChevronUp, label: 'Collapse', color: '#FFBB28' },
      moreVert: { icon: MoreVertical, label: 'More', color: '#8884D8' },
      moreHoriz: { icon: MoreHorizontal, label: 'More Options', color: '#8884D8' },
      grid: { icon: Grid3x3, label: 'Grid View', color: '#82CA9D' }
    }
  },

  // Actions & Status
  actions: {
    name: 'Actions & Status',
    description: 'Action buttons and status indicators',
    icons: {
      play: { icon: Play, label: 'Start', color: '#00C853' },
      pause: { icon: Pause, label: 'Pause', color: '#FFB800' },
      stop: { icon: StopCircle, label: 'Stop', color: '#FF5252' },
      refresh: { icon: RefreshCw, label: 'Refresh', color: '#0088FE' },
      download: { icon: Download, label: 'Download', color: '#00C49F' },
      upload: { icon: Upload, label: 'Upload', color: '#FFBB28' },
      save: { icon: Save, label: 'Save', color: '#8884D8' },
      copy: { icon: Copy, label: 'Copy', color: '#82CA9D' },
      success: { icon: Check, label: 'Success', color: '#00C853' },
      warning: { icon: AlertTriangle, label: 'Warning', color: '#FFB800' }
    }
  },

  // Settings & System
  settings: {
    name: 'Settings & System',
    description: 'System configuration and settings',
    icons: {
      settings: { icon: Settings, label: 'Settings', color: '#6C757D' },
      preferences: { icon: Sliders, label: 'Preferences', color: '#0088FE' },
      toggleOff: { icon: ToggleLeft, label: 'Toggle Off', color: '#E0E0E0' },
      toggleOn: { icon: ToggleRight, label: 'Toggle On', color: '#00C853' },
      security: { icon: Shield, label: 'Security', color: '#FF5252' },
      verified: { icon: ShieldCheck, label: 'Verified', color: '#00C853' },
      info: { icon: Info, label: 'Information', color: '#0088FE' },
      help: { icon: HelpCircle, label: 'Help', color: '#FFBB28' },
      docs: { icon: FileText, label: 'Documentation', color: '#8884D8' },
      code: { icon: Code, label: 'Code', color: '#00E676' }
    }
  },

  // Time & History
  time: {
    name: 'Time & History',
    description: 'Time-related and historical data icons',
    icons: {
      clock: { icon: Clock, label: 'Time', color: '#0088FE' },
      history: { icon: History, label: 'History', color: '#00C49F' },
      calendar: { icon: Calendar, label: 'Calendar', color: '#FFBB28' },
      timer: { icon: Timer, label: 'Timer', color: '#FF8042' },
      pending: { icon: Hourglass, label: 'Pending', color: '#8884D8' }
    }
  },

  // Professional & Business
  professional: {
    name: 'Professional',
    description: 'Business and professional icons',
    icons: {
      enterprise: { icon: Building2, label: 'Enterprise', color: '#0088FE' },
      portfolio: { icon: Briefcase, label: 'Portfolio', color: '#00C49F' },
      achievement: { icon: Trophy, label: 'Achievement', color: '#FFD700' },
      award: { icon: Award, label: 'Award', color: '#FF8042' },
      favorite: { icon: Star, label: 'Favorite', color: '#FFBB28' },
      bookmark: { icon: Bookmark, label: 'Bookmark', color: '#8884D8' },
      flag: { icon: Flag, label: 'Flag', color: '#FF6B6B' },
      pin: { icon: Pin, label: 'Pin', color: '#82CA9D' },
      layers: { icon: Layers, label: 'Layers', color: '#FFC658' },
      package: { icon: Package, label: 'Package', color: '#8B7FFF' }
    }
  }
};

/**
 * Get icon by category and name
 */
export const getIcon = (category: string, name: string): IconConfig | undefined => {
  return IconSystem[category]?.icons[name];
};

/**
 * Get all icons from a category
 */
export const getCategoryIcons = (category: string): Record<string, IconConfig> | undefined => {
  return IconSystem[category]?.icons;
};

/**
 * Search icons by label or description
 */
export const searchIcons = (query: string): Array<{ category: string; name: string; config: IconConfig }> => {
  const results: Array<{ category: string; name: string; config: IconConfig }> = [];
  const searchTerm = query.toLowerCase();

  Object.entries(IconSystem).forEach(([categoryKey, category]) => {
    Object.entries(category.icons).forEach(([iconKey, iconConfig]) => {
      if (
        iconConfig.label.toLowerCase().includes(searchTerm) ||
        iconConfig.description?.toLowerCase().includes(searchTerm)
      ) {
        results.push({
          category: categoryKey,
          name: iconKey,
          config: iconConfig
        });
      }
    });
  });

  return results;
};

/**
 * Navigation Icon Mapping
 * Maps navigation routes to appropriate icons
 */
export const NavigationIcons = {
  '/': getIcon('navigation', 'home')!,
  '/dashboard': getIcon('analytics', 'dashboard')!,
  '/market': getIcon('trading', 'marketTrend')!,
  '/portfolio': getIcon('professional', 'portfolio')!,
  '/analytics': getIcon('analytics', 'charts')!,
  '/trading': getIcon('trading', 'priceChart')!,
  '/arbitrage': getIcon('trading', 'arbitrage')!,
  '/ordinals': getIcon('crypto', 'ordinals')!,
  '/runes': getIcon('crypto', 'tokens')!,
  '/miners': getIcon('crypto', 'mining')!,
  '/cypher-ai': getIcon('ai', 'neural')!,
  '/neural': getIcon('ai', 'network')!,
  '/social': getIcon('social', 'community')!,
  '/integrations': getIcon('ai', 'workflow')!,
  '/documentation': getIcon('settings', 'docs')!,
  '/settings': getIcon('settings', 'settings')!,
  '/brc20': getIcon('crypto', 'tokens')!,
  '/rare-sats': getIcon('crypto', 'security')!,
  '/training': getIcon('ai', 'neural')!,
  '/swap': getIcon('trading', 'arbitrage')!
} as const;

/**
 * Dashboard Component Icon Mapping
 */
export const DashboardIcons = {
  marketOverview: getIcon('trading', 'marketTrend')!,
  portfolioSummary: getIcon('professional', 'portfolio')!,
  tradingSignals: getIcon('trading', 'target')!,
  arbitrageScanner: getIcon('trading', 'arbitrage')!,
  neuralPredictions: getIcon('ai', 'neural')!,
  sentimentAnalysis: getIcon('ai', 'insights')!,
  miningStats: getIcon('crypto', 'mining')!,
  ordinalsTrending: getIcon('crypto', 'ordinals')!,
  runesActivity: getIcon('crypto', 'tokens')!,
  priceAlerts: getIcon('social', 'alerts')!,
  newsUpdates: getIcon('social', 'global')!,
  aiAssistant: getIcon('ai', 'bot')!,
  networkMetrics: getIcon('ai', 'network')!,
  priceUp: { icon: TrendingUp, label: 'Price Up', color: '#00C853' },
  priceDown: { icon: TrendingDown, label: 'Price Down', color: '#FF5252' },
  blockchain: getIcon('crypto', 'blockchain')!,
  hashrate: getIcon('crypto', 'hash')!,
  difficulty: getIcon('analytics', 'gauge')!,
  mempool: getIcon('analytics', 'database')!,
  networkStatus: getIcon('ai', 'network')!
} as const;

/**
 * Status Icon Mapping
 */
export const StatusIcons = {
  success: getIcon('actions', 'success')!,
  warning: getIcon('actions', 'warning')!,
  error: { icon: X, label: 'Error', color: '#FF5252' },
  info: getIcon('settings', 'info')!,
  loading: getIcon('actions', 'refresh')!,
  pending: getIcon('time', 'pending')!
} as const;

/**
 * Default icon configuration
 */
export const DefaultIcon: IconConfig = {
  icon: CircuitBoard,
  label: 'Default',
  color: '#6C757D'
};