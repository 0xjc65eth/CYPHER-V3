import {
  LayoutDashboard, BarChart3, Hammer, CandlestickChart,
  Gem, Coins, CircleDollarSign, Diamond, ArrowLeftRight,
  TrendingUp, Briefcase, Brain, Users, Cpu, LineChart,
  GraduationCap, Plug, FileText, Bell, Wrench,
  Database, Network, Activity, Zap, Shield, Bug
} from 'lucide-react';

type IconEntry = { icon: React.ElementType; color: string };

export const NavigationIcons: Record<string, IconEntry> = {
  '/':              { icon: LayoutDashboard, color: '#F59E0B' },
  '/market':        { icon: BarChart3,       color: '#3B82F6' },
  '/miners':        { icon: Hammer,           color: '#8B5CF6' },
  '/trading':       { icon: CandlestickChart,color: '#10B981' },
  '/ordinals':      { icon: Gem,             color: '#F97316' },
  '/runes':         { icon: Coins,           color: '#EF4444' },
  '/brc20':         { icon: CircleDollarSign,color: '#06B6D4' },
  '/rare-sats':     { icon: Diamond,         color: '#EC4899' },
  '/swap':          { icon: ArrowLeftRight,  color: '#14B8A6' },
  '/arbitrage':     { icon: TrendingUp,      color: '#22C55E' },
  '/portfolio':     { icon: Briefcase,       color: '#6366F1' },
  '/cypher-ai':     { icon: Brain,           color: '#A855F7' },
  '/social':        { icon: Users,           color: '#0EA5E9' },
  '/neural':        { icon: Cpu,             color: '#F43F5E' },
  '/analytics':     { icon: LineChart,       color: '#84CC16' },
  '/training':      { icon: GraduationCap,   color: '#FBBF24' },
  '/integrations':  { icon: Plug,            color: '#64748B' },
  '/documentation': { icon: FileText,        color: '#94A3B8' },
  '/alerts':        { icon: Bell,            color: '#FB923C' },
  '/tools':         { icon: Wrench,          color: '#78716C' },
  '/hacker-yields': { icon: Zap,             color: '#F59E0B' },
  '/bug-report':    { icon: Bug,             color: '#EF4444' },
};

export const DashboardIcons = {
  blockchain:    { icon: Database, color: '#3B82F6' },
  networkStatus: { icon: Network,  color: '#10B981' },
  activity:      { icon: Activity, color: '#F59E0B' },
  lightning:     { icon: Zap,      color: '#FBBF24' },
  security:      { icon: Shield,   color: '#EF4444' },
};
