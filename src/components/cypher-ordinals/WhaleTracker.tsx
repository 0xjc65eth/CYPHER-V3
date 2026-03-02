'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, TrendingUp, AlertTriangle, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface Whale {
  address: string;
  balance: string;
  ordinalsCount: number;
  brc20Holdings: Record<string, string>;
  recentActivity: string;
  impact: 'high' | 'medium' | 'low';
  trend: 'up' | 'down';
  change: string;
}

export function WhaleTracker() {
  const [whales, setWhales] = useState<Whale[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const mockWhales: Whale[] = [
      {
        address: 'bc1q...whale1',
        balance: '1,234 BTC',
        ordinalsCount: 15420,
        brc20Holdings: { ORDI: '2.5M', SATS: '450B' },
        recentActivity: 'Bought 50 NodeMonkes',
        impact: 'high',
        trend: 'up',
        change: '+12.4%'
      },
      {
        address: 'bc1q...whale2',
        balance: '892 BTC',
        ordinalsCount: 8750,
        brc20Holdings: { ORDI: '1.8M', RATS: '890M' },
        recentActivity: 'Sold 25 Bitcoin Puppets',
        impact: 'medium',
        trend: 'down',
        change: '-5.1%'
      }
    ]

    setTimeout(() => {
      setWhales(mockWhales)
      setIsLoading(false)
    }, 1000)
  }, [])

  if (isLoading) {
    return <div className="animate-pulse"><Card><CardContent className="p-6"><div className="h-64 bg-gray-700 rounded"></div></CardContent></Card></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Eye className="h-6 w-6 text-red-500" />
          Rastreamento de Baleias
        </h2>
        <Badge variant="outline" className="text-red-400 border-red-400">
          {whales.length} Baleias Ativas
        </Badge>
      </div>

      <div className="grid gap-4">
        {whales.map((whale, index) => (
          <Card key={index} className="group hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`${
                    whale.impact === 'high' ? 'border-red-500 text-red-400' :
                    whale.impact === 'medium' ? 'border-yellow-500 text-yellow-400' :
                    'border-green-500 text-green-400'
                  }`}>
                    {whale.impact.toUpperCase()}
                  </Badge>
                  <h3 className="font-mono font-medium">{whale.address}</h3>
                </div>
                <div className={`flex items-center gap-1 ${whale.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {whale.trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  <span className="font-medium">{whale.change}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="font-bold text-orange-400">{whale.balance}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ordinals</p>
                  <p className="font-bold">{whale.ordinalsCount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">BRC-20 Holdings</p>
                  <div className="space-y-1">
                    {Object.entries(whale.brc20Holdings).map(([token, amount]) => (
                      <p key={token} className="text-sm">{token}: {amount}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recent Activity</p>
                  <p className="font-medium">{whale.recentActivity}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm">
                  <Activity className="h-4 w-4 mr-2" />
                  Ver Histórico
                </Button>
                <Button variant="outline" size="sm">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Criar Alerta
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}