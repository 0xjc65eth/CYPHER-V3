'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Lottie from 'lottie-react';
import { 
  Zap, 
  TrendingUp, 
  Shield, 
  Brain, 
  Activity,
  DollarSign,
  BarChart3,
  Wifi,
  RefreshCw
} from 'lucide-react';

// Inline Lottie animation data (simplified)
const bitcoinPulseAnimation = {
  "v": "5.7.4",
  "fr": 30,
  "ip": 0,
  "op": 60,
  "w": 100,
  "h": 100,
  "nm": "Bitcoin Pulse",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "Bitcoin Circle",
      "sr": 1,
      "ks": {
        "o": {"a": 1, "k": [{"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [100]}, {"t": 30, "s": [50]}, {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 30, "s": [50]}, {"t": 60, "s": [100]}], "ix": 11},
        "r": {"a": 1, "k": [{"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [0]}, {"t": 60, "s": [360]}], "ix": 10},
        "p": {"a": 0, "k": [50, 50, 0], "ix": 2},
        "a": {"a": 0, "k": [0, 0, 0], "ix": 1},
        "s": {"a": 1, "k": [{"i": {"x": [0.833, 0.833, 0.833], "y": [0.833, 0.833, 0.833]}, "o": {"x": [0.167, 0.167, 0.167], "y": [0.167, 0.167, 0.167]}, "t": 0, "s": [100, 100, 100]}, {"i": {"x": [0.833, 0.833, 0.833], "y": [0.833, 0.833, 0.833]}, "o": {"x": [0.167, 0.167, 0.167], "y": [0.167, 0.167, 0.167]}, "t": 30, "s": [120, 120, 100]}, {"t": 60, "s": [100, 100, 100]}], "ix": 6}
      },
      "ao": 0,
      "shapes": [
        {
          "ty": "el",
          "p": {"a": 0, "k": [0, 0], "ix": 3},
          "s": {"a": 0, "k": [40, 40], "ix": 2},
          "d": 1,
          "nm": "Ellipse Path 1",
          "mn": "ADBE Vector Shape - Ellipse",
          "hd": false
        },
        {
          "ty": "fl",
          "c": {"a": 0, "k": [0.97647058823529409, 0.59215686274509804, 0.07450980392156863, 1], "ix": 4},
          "o": {"a": 0, "k": [100], "ix": 5},
          "r": 1,
          "bm": 0,
          "nm": "Fill 1",
          "mn": "ADBE Vector Graphic - Fill",
          "hd": false
        }
      ],
      "ip": 0,
      "op": 60,
      "st": 0,
      "bm": 0
    }
  ]
};

const tradingAnimation = {
  "v": "5.7.4",
  "fr": 60,
  "ip": 0,
  "op": 120,
  "w": 100,
  "h": 100,
  "nm": "Trading Chart",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "Chart Line",
      "sr": 1,
      "ks": {
        "o": {"a": 0, "k": [100], "ix": 11},
        "r": {"a": 0, "k": [0], "ix": 10},
        "p": {"a": 0, "k": [50, 50, 0], "ix": 2},
        "a": {"a": 0, "k": [0, 0, 0], "ix": 1},
        "s": {"a": 0, "k": [100, 100, 100], "ix": 6}
      },
      "ao": 0,
      "shapes": [
        {
          "ty": "sh",
          "ks": {
            "a": 1,
            "k": [
              {
                "i": {"x": 0.833, "y": 0.833},
                "o": {"x": 0.167, "y": 0.167},
                "t": 0,
                "s": [{"i": [[0,0],[0,0],[0,0]], "o": [[0,0],[0,0],[0,0]], "v": [[-30,20],[0,0],[30,-20]], "c": false}]
              },
              {
                "t": 120,
                "s": [{"i": [[0,0],[0,0],[0,0]], "o": [[0,0],[0,0],[0,0]], "v": [[-30,-20],[0,10],[30,20]], "c": false}]
              }
            ],
            "ix": 2
          },
          "nm": "Path 1",
          "mn": "ADBE Vector Shape - Group",
          "hd": false
        },
        {
          "ty": "st",
          "c": {"a": 0, "k": [0.12941176470588237, 0.7294117647058823, 0.5058823529411764, 1], "ix": 3},
          "o": {"a": 0, "k": [100], "ix": 4},
          "w": {"a": 0, "k": [3], "ix": 5},
          "lc": 2,
          "lj": 2,
          "bm": 0,
          "nm": "Stroke 1",
          "mn": "ADBE Vector Graphic - Stroke",
          "hd": false
        }
      ],
      "ip": 0,
      "op": 120,
      "st": 0,
      "bm": 0
    }
  ]
};

interface AnimatedStatsWidgetProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  animationType: 'pulse' | 'trading' | 'loading';
  color: 'green' | 'blue' | 'orange' | 'purple' | 'red';
}

export function AnimatedStatsWidget({ 
  title, 
  value, 
  change, 
  icon, 
  animationType, 
  color 
}: AnimatedStatsWidgetProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  const getAnimation = () => {
    switch (animationType) {
      case 'pulse':
        return bitcoinPulseAnimation;
      case 'trading':
        return tradingAnimation;
      default:
        return bitcoinPulseAnimation;
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'border-green-500/30 bg-green-500/10';
      case 'blue':
        return 'border-blue-500/30 bg-blue-500/10';
      case 'orange':
        return 'border-orange-500/30 bg-orange-500/10';
      case 'purple':
        return 'border-purple-500/30 bg-purple-500/10';
      case 'red':
        return 'border-red-500/30 bg-red-500/10';
      default:
        return 'border-gray-500/30 bg-gray-500/10';
    }
  };

  return (
    <Card className={`bg-gray-900/80 backdrop-blur-sm border-gray-800 p-4 ${getColorClasses()}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {icon}
            <h3 className="text-sm font-medium text-gray-400">{title}</h3>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">{value}</p>
            <div className="flex items-center gap-2">
              <Badge className={`text-xs ${
                change.startsWith('+') ? 'bg-green-600' : 
                change.startsWith('-') ? 'bg-red-600' : 'bg-gray-600'
              }`}>
                {change}
              </Badge>
              <span className="text-xs text-gray-500">24h</span>
            </div>
          </div>
        </div>
        
        <div className="w-16 h-16 flex items-center justify-center">
          {isAnimating && animationType !== 'loading' ? (
            <Lottie
              animationData={getAnimation()}
              loop={true}
              autoplay={true}
              style={{ width: 48, height: 48 }}
            />
          ) : (
            <div className={`w-12 h-12 rounded-full ${getColorClasses()} flex items-center justify-center animate-pulse`}>
              {icon}
            </div>
          )}
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsAnimating(!isAnimating)}
        className="w-full mt-3 text-xs"
      >
        <RefreshCw className="w-3 h-3 mr-1" />
        {isAnimating ? 'Stop Animation' : 'Start Animation'}
      </Button>
    </Card>
  );
}

export function AnimatedDashboardGrid() {
  const [marketData, setMarketData] = useState({
    btcPrice: 0,
    btcChange: '--',
    ethPrice: 0,
    ethChange: '--',
    activeAI: 0,
    aiChange: '--',
    volume: 0,
    volumeChange: '--',
    security: 99.8,
    securityChange: '+0.1',
    networkHealth: 0,
    networkChange: '--'
  });

  // Fetch real market data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          '/api/coingecko?endpoint=/coins/markets&params=' +
            encodeURIComponent('vs_currency=usd&ids=bitcoin,ethereum&per_page=2&page=1')
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return;

        const btc = data.find((c: any) => c.id === 'bitcoin');
        const eth = data.find((c: any) => c.id === 'ethereum');

        setMarketData(prev => ({
          ...prev,
          btcPrice: btc?.current_price || prev.btcPrice,
          btcChange: btc?.price_change_percentage_24h != null
            ? `${btc.price_change_percentage_24h >= 0 ? '+' : ''}${btc.price_change_percentage_24h.toFixed(2)}`
            : prev.btcChange,
          ethPrice: eth?.current_price || prev.ethPrice,
          ethChange: eth?.price_change_percentage_24h != null
            ? `${eth.price_change_percentage_24h >= 0 ? '+' : ''}${eth.price_change_percentage_24h.toFixed(2)}`
            : prev.ethChange,
          volume: (btc?.total_volume || 0) / 1e9,
          volumeChange: '--',
        }));
      } catch (err) {
        console.error('AnimatedDashboardGrid fetch error:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatedStatsWidget
        title="Bitcoin Price"
        value={`$${marketData.btcPrice.toLocaleString()}`}
        change={`${marketData.btcChange}%`}
        icon={<DollarSign className="w-4 h-4 text-orange-500" />}
        animationType="pulse"
        color="orange"
      />
      
      <AnimatedStatsWidget
        title="Ethereum Price"
        value={`$${marketData.ethPrice.toLocaleString()}`}
        change={`${marketData.ethChange}%`}
        icon={<TrendingUp className="w-4 h-4 text-blue-500" />}
        animationType="trading"
        color="blue"
      />
      
      <AnimatedStatsWidget
        title="Active AI Agents"
        value={marketData.activeAI.toString()}
        change={`${marketData.aiChange}`}
        icon={<Brain className="w-4 h-4 text-purple-500" />}
        animationType="pulse"
        color="purple"
      />
      
      <AnimatedStatsWidget
        title="24h Volume"
        value={`$${marketData.volume.toFixed(1)}B`}
        change={`${marketData.volumeChange}%`}
        icon={<BarChart3 className="w-4 h-4 text-green-500" />}
        animationType="trading"
        color="green"
      />
      
      <AnimatedStatsWidget
        title="Security Score"
        value={`${marketData.security.toFixed(1)}%`}
        change={`${marketData.securityChange}%`}
        icon={<Shield className="w-4 h-4 text-green-500" />}
        animationType="pulse"
        color="green"
      />
      
      <AnimatedStatsWidget
        title="Network Health"
        value={`${marketData.networkHealth.toFixed(1)}%`}
        change={`${marketData.networkChange}%`}
        icon={<Wifi className="w-4 h-4 text-blue-500" />}
        animationType="loading"
        color="blue"
      />
    </div>
  );
}

// Loading Animation Component
export function LoadingAnimation({ size = 64 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center">
      <Lottie
        animationData={bitcoinPulseAnimation}
        loop={true}
        autoplay={true}
        style={{ width: size, height: size }}
      />
    </div>
  );
}

// Success Animation Component  
export function SuccessAnimation({ size = 64 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center">
      <Lottie
        animationData={tradingAnimation}
        loop={false}
        autoplay={true}
        style={{ width: size, height: size }}
      />
    </div>
  );
}