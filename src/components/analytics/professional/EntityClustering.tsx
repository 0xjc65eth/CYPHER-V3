'use client'

import { FC } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Network, Activity, TrendingUp } from 'lucide-react'

interface EntityClusteringProps {
  timeRange: string
  isLive?: boolean
}

const EntityClustering: FC<EntityClusteringProps> = ({ timeRange, isLive }) => {
  const stats = [
    { label: 'Active Clusters', value: '1,234', icon: Users, change: '+12.5%' },
    { label: 'Network Effects', value: '89%', icon: Network, change: '+5.2%' },
    { label: 'Cluster Activity', value: '3.2K/h', icon: Activity, change: '+8.7%' },
    { label: 'Growth Rate', value: '15.3%', icon: TrendingUp, change: '+2.1%' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Entity Clustering Analysis</h2>
        {isLive && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-muted-foreground">Live</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{stat.change}</span> from last {timeRange}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cluster Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center bg-muted/10 rounded-lg">
            <p className="text-muted-foreground">Entity cluster visualization</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Entities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium">{i}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Entity {i}</p>
                      <p className="text-xs text-muted-foreground">Cluster #{i * 123}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">0 BTC</p>
                    <p className="text-xs text-green-600">0.0%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cluster Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Clustering Coefficient</span>
                  <span className="text-sm font-medium">0.67</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '67%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Network Density</span>
                  <span className="text-sm font-medium">0.43</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '43%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Centralization</span>
                  <span className="text-sm font-medium">0.82</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '82%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default EntityClustering