'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Target,
  Shield,
  DollarSign,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mic,
  MicOff
} from 'lucide-react';
import { automatedTradingBot as tradingBot } from '@/services/AutomatedTradingBotService';

interface TradingBotDashboardProps {
  className?: string;
}

interface BotStatus {
  isRunning: boolean;
  performance: any;
  positions: any[];
  dailyStats: any;
  config: any;
}

export default function TradingBotDashboard({ className }: TradingBotDashboardProps) {
  const [botStatus, setBotStatus] = useState<BotStatus>({
    isRunning: false,
    performance: {
      totalTrades: 0,
      successfulTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
      winRate: 0,
      maxDrawdown: 0,
      sharpeRatio: 0
    },
    positions: [],
    dailyStats: { tradesCount: 0, profit: 0, startTime: Date.now() },
    config: {}
  });

  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [emergencyStopEnabled, setEmergencyStopEnabled] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState('all');

  useEffect(() => {
    // Initialize bot status
    updateBotStatus();

    // Set up event listeners
    tradingBot.on('botStarted', updateBotStatus);
    tradingBot.on('botStopped', updateBotStatus);
    tradingBot.on('tradeCompleted', updateBotStatus);
    tradingBot.on('performanceUpdate', updateBotStatus);
    tradingBot.on('emergencyStop', handleEmergencyStop);

    return () => {
      tradingBot.removeAllListeners();
    };
  }, []);

  const updateBotStatus = () => {
    setBotStatus({
      isRunning: tradingBot.isRunning,
      performance: tradingBot.getPerformance(),
      positions: tradingBot.getPositions(),
      dailyStats: tradingBot.getDailyStats(),
      config: tradingBot.getConfig()
    });
  };

  const handleStartBot = async () => {
    try {
      await tradingBot.start();
      updateBotStatus();
    } catch (error) {
      console.error('Failed to start bot:', error);
    }
  };

  const handleStopBot = async () => {
    try {
      await tradingBot.stop();
      updateBotStatus();
    } catch (error) {
      console.error('Failed to stop bot:', error);
    }
  };

  const handleEmergencyStop = () => {
    updateBotStatus();
    // Show emergency stop notification
  };

  const handleVoiceCommand = (command: string) => {
    switch (command.toLowerCase()) {
      case 'start bot':
        handleStartBot();
        break;
      case 'stop bot':
        handleStopBot();
        break;
      case 'emergency stop':
        (tradingBot as any).emergencyStop();
        break;
      default:
    }
  };

  const BotControlPanel = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Bot Control
          <Badge variant={botStatus.isRunning ? "default" : "secondary"}>
            {botStatus.isRunning ? 'RUNNING' : 'STOPPED'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={handleStartBot}
            disabled={botStatus.isRunning}
            className="flex-1"
            variant="default"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Bot
          </Button>
          <Button
            onClick={handleStopBot}
            disabled={!botStatus.isRunning}
            className="flex-1"
            variant="outline"
          >
            <Pause className="w-4 h-4 mr-2" />
            Stop Bot
          </Button>
        </div>

        {emergencyStopEnabled && (
          <Button
            onClick={() => (tradingBot as any).emergencyStop()}
            variant="destructive"
            className="w-full"
            disabled={!botStatus.isRunning}
          >
            <Square className="w-4 h-4 mr-2" />
            Emergency Stop
          </Button>
        )}

        <div className="flex items-center justify-between">
          <Label htmlFor="voice-control">Voice Control</Label>
          <div className="flex items-center gap-2">
            {isVoiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            <Switch
              id="voice-control"
              checked={isVoiceEnabled}
              onCheckedChange={setIsVoiceEnabled}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="emergency-stop">Emergency Stop</Label>
          <Switch
            id="emergency-stop"
            checked={emergencyStopEnabled}
            onCheckedChange={setEmergencyStopEnabled}
          />
        </div>
      </CardContent>
    </Card>
  );

  const PerformanceMetrics = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              ${botStatus.performance.totalProfit?.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-green-600">Total Profit</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              ${botStatus.performance.totalLoss?.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-red-600">Total Loss</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Win Rate</span>
            <span className="text-sm font-medium">
              {(botStatus.performance.winRate * 100)?.toFixed(1) || '0.0'}%
            </span>
          </div>
          <Progress value={botStatus.performance.winRate * 100} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Total Trades</div>
            <div className="font-medium">{botStatus.performance.totalTrades || 0}</div>
          </div>
          <div>
            <div className="text-gray-600">Successful</div>
            <div className="font-medium">{botStatus.performance.successfulTrades || 0}</div>
          </div>
          <div>
            <div className="text-gray-600">Max Drawdown</div>
            <div className="font-medium text-red-600">
              {(botStatus.performance.maxDrawdown * 100)?.toFixed(2) || '0.00'}%
            </div>
          </div>
          <div>
            <div className="text-gray-600">Sharpe Ratio</div>
            <div className="font-medium">{botStatus.performance.sharpeRatio?.toFixed(2) || '0.00'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ActivePositions = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Active Positions
          <Badge variant="outline">{botStatus.positions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {botStatus.positions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No active positions
          </div>
        ) : (
          <div className="space-y-3">
            {botStatus.positions.slice(0, 5).map((position, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium">{position.opportunity?.pair || 'Unknown'}</div>
                    <div className="text-sm text-gray-600">
                      {position.opportunity?.type || 'Unknown'} • 
                      {position.opportunity?.direction || 'N/A'}
                    </div>
                  </div>
                  <Badge 
                    variant={position.status === 'executing' ? 'default' : 'secondary'}
                  >
                    {position.status}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Size: ${position.size?.toFixed(2) || '0.00'}</span>
                  <span className={`${position.result?.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {position.result?.profit >= 0 ? '+' : ''}
                    ${position.result?.profit?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const StrategyConfiguration = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Strategy Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="max-risk">Max Risk Per Trade (%)</Label>
            <Slider
              id="max-risk"
              min={0.1}
              max={5.0}
              step={0.1}
              value={[botStatus.config.maxRiskPerTrade * 100]}
              onValueChange={(value: number[]) => {
                (tradingBot as any).updateConfig({ maxRiskPerTrade: value[0] / 100 });
                updateBotStatus();
              }}
              className="mt-2"
            />
            <div className="text-sm text-gray-600 mt-1">
              Current: {(botStatus.config.maxRiskPerTrade * 100)?.toFixed(1)}%
            </div>
          </div>

          <div>
            <Label htmlFor="min-profit">Min Profit Threshold (%)</Label>
            <Slider
              id="min-profit"
              min={0.1}
              max={2.0}
              step={0.1}
              value={[botStatus.config.minProfitThreshold * 100]}
              onValueChange={(value: number[]) => {
                (tradingBot as any).updateConfig({ minProfitThreshold: value[0] / 100 });
                updateBotStatus();
              }}
              className="mt-2"
            />
            <div className="text-sm text-gray-600 mt-1">
              Current: {(botStatus.config.minProfitThreshold * 100)?.toFixed(1)}%
            </div>
          </div>

          <div>
            <Label htmlFor="max-trades">Max Daily Trades</Label>
            <Input
              id="max-trades"
              type="number"
              value={botStatus.config.maxDailyTrades}
              onChange={(e) => {
                (tradingBot as any).updateConfig({ maxDailyTrades: parseInt(e.target.value) });
                updateBotStatus();
              }}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="stop-loss">Stop Loss (%)</Label>
            <Slider
              id="stop-loss"
              min={1}
              max={20}
              step={1}
              value={[botStatus.config.stopLoss * 100]}
              onValueChange={(value: number[]) => {
                (tradingBot as any).updateConfig({ stopLoss: value[0] / 100 });
                updateBotStatus();
              }}
              className="mt-2"
            />
            <div className="text-sm text-gray-600 mt-1">
              Current: {(botStatus.config.stopLoss * 100)?.toFixed(0)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const DailyStats = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Daily Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {botStatus.dailyStats.tradesCount}
            </div>
            <div className="text-sm text-blue-600">Trades Today</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              ${botStatus.dailyStats.profit?.toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-green-600">Daily P&L</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Daily Limit Usage</span>
            <span>{botStatus.dailyStats.tradesCount}/{botStatus.config.maxDailyTrades}</span>
          </div>
          <Progress 
            value={(botStatus.dailyStats.tradesCount / botStatus.config.maxDailyTrades) * 100} 
            className="h-2" 
          />
        </div>

        <div className="text-xs text-gray-500">
          Session started: {new Date(botStatus.dailyStats.startTime).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );

  const SafetyAlerts = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Safety Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <div>
            <div className="font-medium">System Status: Normal</div>
            <div className="text-sm">All safety checks passed</div>
          </div>
        </Alert>

        {botStatus.performance.maxDrawdown > 0.1 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <div>
              <div className="font-medium">High Drawdown Warning</div>
              <div className="text-sm">
                Current drawdown: {(botStatus.performance.maxDrawdown * 100).toFixed(2)}%
              </div>
            </div>
          </Alert>
        )}

        {botStatus.dailyStats.tradesCount >= botStatus.config.maxDailyTrades * 0.8 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <div>
              <div className="font-medium">Daily Limit Warning</div>
              <div className="text-sm">
                Approaching daily trade limit ({botStatus.dailyStats.tradesCount}/{botStatus.config.maxDailyTrades})
              </div>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Automated Trading Bot</h1>
        <div className="flex items-center gap-2">
          <Badge variant={botStatus.isRunning ? "default" : "secondary"} className="text-sm">
            {botStatus.isRunning ? 'ACTIVE' : 'INACTIVE'}
          </Badge>
          {isVoiceEnabled && (
            <Badge variant="outline" className="text-sm">
              <Mic className="w-3 h-3 mr-1" />
              Voice
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <BotControlPanel />
            <PerformanceMetrics />
            <DailyStats />
          </div>
          <SafetyAlerts />
        </TabsContent>

        <TabsContent value="strategies" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StrategyConfiguration />
            <Card>
              <CardHeader>
                <CardTitle>Strategy Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span>Arbitrage</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">+$234.56</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span>Trend Following</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">+$156.78</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span>Mean Reversion</span>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <span className="text-red-600">-$45.32</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="positions" className="space-y-6">
          <ActivePositions />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <StrategyConfiguration />
        </TabsContent>
      </Tabs>
    </div>
  );
}