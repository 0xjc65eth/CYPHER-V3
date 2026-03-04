'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Volume2, 
  Users, 
  DollarSign,
  Activity,
  AlertTriangle,
  Bell,
  Phone,
  Megaphone,
  Target,
  Zap,
  Eye,
  Timer,
  BarChart3,
  LineChart,
  Flame,
  Crown,
  Trophy,
  Clock
} from 'lucide-react';

interface Trader {
  id: string;
  name: string;
  avatar: string;
  position: { x: number; y: number };
  status: 'buying' | 'selling' | 'neutral' | 'shouting';
  currentTrade?: {
    symbol: string;
    type: 'BUY' | 'SELL';
    amount: number;
    price: number;
  };
  pnl: number;
  volume: number;
  energy: number;
  reputation: number;
}

interface MarketShout {
  id: string;
  trader: string;
  message: string;
  type: 'BUY' | 'SELL' | 'INFO' | 'ALERT';
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  symbol?: string;
  price?: number;
  volume?: number;
}

interface OrderBookEntry {
  price: number;
  volume: number;
  count: number;
  side: 'bid' | 'ask';
  timestamp: number;
}

export default function WallStreetTradingFloor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [marketShouts, setMarketShouts] = useState<MarketShout[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBookEntry[]>([]);
  const [marketMood, setMarketMood] = useState<'bull' | 'bear' | 'volatile' | 'calm'>('volatile');
  const [tradingIntensity, setTradingIntensity] = useState(0.7);
  const [totalVolume, setTotalVolume] = useState(0);
  const [activeDeals, setActiveDeals] = useState(0);
  const [marketTemperature, setMarketTemperature] = useState(85);

  // Initialize virtual traders
  useEffect(() => {
    const initTraders = () => {
      const traderNames = [
        'GORDON GEKKO', 'WOLF BELFORT', 'JAMIE DIMON', 'BUFFETT W.', 'SOROS G.',
        'ICAHN C.', 'PAULSON J.', 'TUDOR P.', 'DALIO R.', 'GRIFFIN K.',
        'SIMONS J.', 'TEPPER D.', 'ACKMAN B.', 'LOEB D.', 'EINHORN D.'
      ];

      const newTraders: Trader[] = traderNames.map((name, index) => ({
        id: `trader-${index}`,
        name,
        avatar: `👨‍💼`,
        position: {
          x: (index * 60) % 800,
          y: (Math.floor(index / 13) * 100) % 400
        },
        status: 'neutral',
        pnl: 0,
        volume: 0,
        energy: 0,
        reputation: 0
      }));

      setTraders(newTraders);
    };

    initTraders();
  }, []);

  // No fake market shouts - remove this entirely
  // Market shouts should come from real trading data, not Math.random()
  useEffect(() => {
    // Clear fake shouts on mount
    setMarketShouts([]);
  }, []);

  // Market metrics should come from real data, not random generation
  useEffect(() => {
    // Initialize with zero/neutral values
    setTotalVolume(0);
    setActiveDeals(0);
    setMarketTemperature(50);
    setMarketMood('calm');
  }, []);

  // Draw trading floor visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw floor grid
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Draw traders
      traders.forEach(trader => {
        const { x, y } = trader.position;
        
        // Trader circle
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, 2 * Math.PI);
        
        if (trader.status === 'buying') {
          ctx.fillStyle = '#00ff88';
        } else if (trader.status === 'selling') {
          ctx.fillStyle = '#ff4444';
        } else {
          ctx.fillStyle = '#888';
        }
        
        ctx.fill();
        
        // Energy pulse
        if (trader.energy > 70) {
          ctx.beginPath();
          ctx.arc(x, y, 20 + Math.sin(Date.now() * 0.01) * 5, 0, 2 * Math.PI);
          ctx.strokeStyle = trader.status === 'buying' ? '#00ff88' : '#ff4444';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Name label
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(trader.name.split(' ')[0], x, y - 25);
      });

      // Draw connections between active traders
      traders.forEach((trader1, i) => {
        traders.slice(i + 1).forEach(trader2 => {
          if (trader1.energy > 80 && trader2.energy > 80) {
            ctx.beginPath();
            ctx.moveTo(trader1.position.x, trader1.position.y);
            ctx.lineTo(trader2.position.x, trader2.position.y);
            ctx.strokeStyle = `rgba(255, 165, 0, 0.2)`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();
  }, [traders]);

  const getMoodColor = () => {
    switch (marketMood) {
      case 'bull': return 'text-green-400 border-green-400';
      case 'bear': return 'text-red-400 border-red-400';
      case 'volatile': return 'text-orange-400 border-orange-400';
      case 'calm': return 'text-blue-400 border-blue-400';
    }
  };

  const getMoodIcon = () => {
    switch (marketMood) {
      case 'bull': return <TrendingUp className="h-4 w-4" />;
      case 'bear': return <TrendingDown className="h-4 w-4" />;
      case 'volatile': return <Zap className="h-4 w-4" />;
      case 'calm': return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header with Market Status */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Crown className="h-8 w-8 text-yellow-500" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                WALL STREET TRADING FLOOR
              </h1>
            </div>
            <Badge className={`${getMoodColor()} bg-black/80 border text-sm px-3 py-1`}>
              {getMoodIcon()}
              MARKET: {marketMood.toUpperCase()}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge className="bg-green-500/20 border-green-500 text-green-400">
              <Timer className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
            <Badge className="bg-orange-500/20 border-orange-500 text-orange-400">
              <Flame className="h-3 w-3 mr-1" />
              TEMP: {marketTemperature}°
            </Badge>
          </div>
        </div>

        {/* Market Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-black/50 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Volume</p>
                  <p className="text-xl font-bold text-green-400">
                    ${(totalVolume / 1000000).toFixed(1)}M
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Traders</p>
                  <p className="text-xl font-bold text-blue-400">{traders.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-orange-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Deals</p>
                  <p className="text-xl font-bold text-orange-400">{Math.floor(activeDeals)}</p>
                </div>
                <Target className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Intensity</p>
                  <p className="text-xl font-bold text-red-400">
                    {Math.floor(tradingIntensity * 100)}%
                  </p>
                </div>
                <Activity className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Trading Floor Visualization */}
        <Card className="col-span-2 bg-black/50 border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-orange-400">TRADING FLOOR</h2>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-orange-400" />
                <span className="text-sm text-orange-400">LIVE VIEW</span>
              </div>
            </div>
            
            <canvas
              ref={canvasRef}
              width={800}
              height={400}
              className="w-full border border-orange-500/30 rounded-lg bg-black/80"
            />
            
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-gray-400">BUYING</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-gray-400">SELLING</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-xs text-gray-400">NEUTRAL</span>
                </div>
              </div>
              
              <Badge className="bg-yellow-500/20 border-yellow-500 text-yellow-400">
                <Trophy className="h-3 w-3 mr-1" />
                ELITE FLOOR
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Market Shouts Feed */}
        <Card className="bg-black/50 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-red-400">MARKET SHOUTS</h2>
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-red-400" />
                <Volume2 className="h-4 w-4 text-red-400" />
              </div>
            </div>
            
            <div className="space-y-2 max-h-80 overflow-y-auto">
              <AnimatePresence>
                {marketShouts.map((shout) => (
                  <motion.div
                    key={shout.id}
                    initial={{ opacity: 0, x: 50, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -50, scale: 0.9 }}
                    className={`p-3 rounded-lg border ${
                      shout.priority === 'urgent' 
                        ? 'bg-red-500/20 border-red-500 animate-pulse' 
                        : shout.type === 'BUY'
                        ? 'bg-green-500/20 border-green-500'
                        : 'bg-red-500/20 border-red-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-yellow-400">
                        {shout.trader}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(shout.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm font-bold">{shout.message}</p>
                    {shout.price && (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="text-xs bg-black/50">
                          ${shout.price.toFixed(0)}
                        </Badge>
                        {shout.volume && (
                          <Badge className="text-xs bg-black/50">
                            {shout.volume.toFixed(0)}K
                          </Badge>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Traders Leaderboard */}
      <Card className="mt-6 bg-black/50 border-purple-500/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-purple-400">TOP TRADERS - LEADERBOARD</h2>
            <Crown className="h-6 w-6 text-yellow-500" />
          </div>
          
          <div className="grid grid-cols-5 gap-4">
            {traders
              .sort((a, b) => b.pnl - a.pnl)
              .slice(0, 5)
              .map((trader, index) => (
                <Card key={trader.id} className="bg-black/30 border-purple-500/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">
                      {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                    </div>
                    <h3 className="font-bold text-sm mb-1">{trader.name}</h3>
                    <p className={`text-lg font-bold ${trader.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${(trader.pnl / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-gray-400">
                      Vol: ${(trader.volume / 1000000).toFixed(1)}M
                    </p>
                    <div className="mt-2">
                      <div className="w-full bg-gray-700 rounded-full h-1">
                        <div 
                          className="bg-purple-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${trader.energy}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}