'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  sales: number;
}

interface OrdinalsChartProps {
  collection?: string | null;
  /** Optional pre-loaded collection data with floorPrice, volume24h, priceChange24h, trades24h */
  collectionData?: {
    floorPrice?: number;
    volume24h?: number;
    volume7d?: number;
    priceChange24h?: number;
    trades24h?: number;
  } | null;
}

export const OrdinalsChart: React.FC<OrdinalsChartProps> = ({ collection, collectionData }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real chart data from the ordinals API
  const fetchChartData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ordinals/');
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const json = await response.json();

      if (!json.success || !json.data?.trending_collections) {
        throw new Error('Invalid ordinals API response');
      }

      const collections = json.data.trending_collections;

      // If a specific collection is selected, find it
      let targetCollection = null;
      if (collection) {
        targetCollection = collections.find(
          (c: any) => c.symbol === collection || c.name?.toLowerCase() === collection.toLowerCase()
        );
      }

      if (targetCollection) {
        // Single collection: show its floor price as the current data point
        // We don't have historical API data per-point, so show current snapshot
        const floorBTC = targetCollection.floor || 0;
        const volume24h = targetCollection.volume24h || targetCollection.volume || 0;
        const trades24h = targetCollection.trades24h || 0;

        // Create a single-point "chart" representing current state
        // The API returns snapshot data, not historical time series
        const now = Date.now();
        const data: ChartDataPoint[] = [{
          time: new Date(now).toISOString().split('T')[0],
          price: floorBTC,
          volume: volume24h,
          sales: trades24h,
        }];

        setChartData(data);
      } else {
        // All collections: show each collection as a data point sorted by volume
        const data: ChartDataPoint[] = collections
          .filter((c: any) => c.floor > 0)
          .map((c: any) => ({
            time: c.name || c.symbol,
            price: c.floor || 0,
            volume: c.volume24h || c.volume || 0,
            sales: c.trades24h || 0,
          }));

        setChartData(data);
      }
    } catch (err) {
      console.error('[OrdinalsChart] Failed to fetch data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [collection]);

  useEffect(() => {
    fetchChartData();
    const interval = setInterval(fetchChartData, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [fetchChartData]);

  // Use collectionData props if available and chartData is empty
  const displayData = chartData.length > 0 ? chartData : (collectionData && collectionData.floorPrice ? [{
    time: new Date().toISOString().split('T')[0],
    price: collectionData.floorPrice,
    volume: collectionData.volume24h || 0,
    sales: collectionData.trades24h || 0,
  }] : []);

  const latestPrice = displayData.length > 0 ? displayData[displayData.length - 1].price : 0;
  const priceChange = collectionData?.priceChange24h ?? (
    displayData.length > 1
      ? ((latestPrice - displayData[displayData.length - 2].price) / (displayData[displayData.length - 2].price || 1)) * 100
      : 0
  );

  const latestVolume = displayData.length > 0 ? displayData[displayData.length - 1].volume : 0;
  const latestSales = displayData.length > 0 ? displayData[displayData.length - 1].sales : 0;

  useEffect(() => {
    if (!chartRef.current) return;
    if (displayData.length === 0) return;

    const container = chartRef.current;
    container.innerHTML = '';

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '200');
    svg.setAttribute('viewBox', '0 0 400 200');
    svg.style.background = '#000000';

    // Generate path for price line
    const prices = displayData.map(d => d.price);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice || 0.001;

    let pathData = '';
    displayData.forEach((point, index) => {
      const x = displayData.length === 1
        ? 200 // Center single point
        : (index / (displayData.length - 1)) * 380 + 10;
      const y = 180 - ((point.price - minPrice) / priceRange) * 160;

      if (index === 0) {
        pathData += `M ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
      }
    });

    // Create price line
    const priceLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    priceLine.setAttribute('d', pathData);
    priceLine.setAttribute('stroke', '#F7931A');
    priceLine.setAttribute('stroke-width', '2');
    priceLine.setAttribute('fill', 'none');
    svg.appendChild(priceLine);

    // Create gradient
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const linearGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    linearGradient.setAttribute('id', 'priceGradient');
    linearGradient.setAttribute('x1', '0%');
    linearGradient.setAttribute('y1', '0%');
    linearGradient.setAttribute('x2', '0%');
    linearGradient.setAttribute('y2', '100%');

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#F7931A');
    stop1.setAttribute('stop-opacity', '0.3');

    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#F7931A');
    stop2.setAttribute('stop-opacity', '0.05');

    linearGradient.appendChild(stop1);
    linearGradient.appendChild(stop2);
    gradient.appendChild(linearGradient);
    svg.appendChild(gradient);

    // Create area path
    if (displayData.length > 1) {
      const lastX = (displayData.length - 1) / (displayData.length - 1) * 380 + 10;
      const areaPath = pathData + ` L ${lastX} 180 L 10 180 Z`;
      const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      area.setAttribute('d', areaPath);
      area.setAttribute('fill', 'url(#priceGradient)');
      svg.insertBefore(area, priceLine);
    }

    // Add grid lines
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * 180 + 10;
      const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      gridLine.setAttribute('x1', '10');
      gridLine.setAttribute('y1', y.toString());
      gridLine.setAttribute('x2', '390');
      gridLine.setAttribute('y2', y.toString());
      gridLine.setAttribute('stroke', '#F7931A');
      gridLine.setAttribute('stroke-opacity', '0.1');
      gridLine.setAttribute('stroke-width', '1');
      svg.insertBefore(gridLine, priceLine);
    }

    // For single point, add a visible dot
    if (displayData.length === 1) {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', '200');
      dot.setAttribute('cy', '90');
      dot.setAttribute('r', '4');
      dot.setAttribute('fill', '#F7931A');
      svg.appendChild(dot);
    }

    container.appendChild(svg);
  }, [displayData, collection]);

  // 7-day stats from available data
  const last7 = displayData.slice(-7);
  const high7d = last7.length > 0 ? Math.max(...last7.map(d => d.price)) : 0;
  const low7d = last7.length > 0 ? Math.min(...last7.map(d => d.price)) : 0;
  const avg7d = last7.length > 0 ? last7.reduce((sum, d) => sum + d.price, 0) / last7.length : 0;

  if (loading) {
    return (
      <div className="h-full">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-terminal text-bloomberg-orange">
              {collection || 'All Collections'} Floor Price
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-terminal text-bloomberg-orange/40 animate-pulse">
                Loading...
              </span>
            </div>
          </div>
        </div>
        <div className="w-full h-[200px] border border-bloomberg-orange/20 rounded bg-bloomberg-black flex items-center justify-center">
          <span className="text-bloomberg-orange/40 text-sm">Fetching real-time data...</span>
        </div>
      </div>
    );
  }

  if (error || displayData.length === 0) {
    return (
      <div className="h-full">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-terminal text-bloomberg-orange">
              {collection || 'All Collections'} Floor Price
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-terminal text-bloomberg-orange/60">
                No data available
              </span>
            </div>
          </div>
        </div>
        <div className="w-full h-[200px] border border-bloomberg-orange/20 rounded bg-bloomberg-black flex items-center justify-center">
          <span className="text-bloomberg-orange/40 text-sm">
            {error || 'No price data available for this collection'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-terminal text-bloomberg-orange">
            {collection || 'All Collections'} Floor Price
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-terminal text-bloomberg-orange">
              {latestPrice.toFixed(4)} BTC
            </span>
            {priceChange !== 0 && (
              <span className={`text-sm font-terminal ${priceChange >= 0 ? 'text-bloomberg-green' : 'text-bloomberg-red'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        <div className="text-right text-xs text-bloomberg-orange/60">
          <div>24h Volume: {latestVolume > 0 ? `${latestVolume.toFixed(1)} BTC` : 'N/A'}</div>
          <div>24h Sales: {latestSales > 0 ? latestSales : 'N/A'}</div>
        </div>
      </div>

      {/* Chart */}
      <div
        ref={chartRef}
        className="w-full border border-bloomberg-orange/20 rounded bg-bloomberg-black"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="text-center">
          <div className="text-xs text-bloomberg-orange/60">High</div>
          <div className="text-sm font-terminal text-bloomberg-orange">
            {high7d > 0 ? `${high7d.toFixed(4)} BTC` : 'N/A'}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-bloomberg-orange/60">Low</div>
          <div className="text-sm font-terminal text-bloomberg-orange">
            {low7d > 0 ? `${low7d.toFixed(4)} BTC` : 'N/A'}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-bloomberg-orange/60">Avg Price</div>
          <div className="text-sm font-terminal text-bloomberg-orange">
            {avg7d > 0 ? `${avg7d.toFixed(4)} BTC` : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};
