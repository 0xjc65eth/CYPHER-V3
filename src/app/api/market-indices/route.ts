import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Real-time market indices data
export async function GET() {
  try {
    // Try to fetch real data from a financial API
    // For now, we'll use Yahoo Finance API or a similar free service
    const indices = await Promise.all([
      fetchIndexData('SPY', 'S&P 500'),
      fetchIndexData('QQQ', 'NASDAQ'),
      fetchIndexData('UUP', 'DXY'),
      fetchIndexData('GLD', 'GOLD'),
      fetchIndexData('VIX', 'VIX')
    ]);

    return NextResponse.json({
      success: true,
      data: indices.filter(Boolean),
      timestamp: new Date().toISOString(),
      source: 'Financial APIs'
    });
  } catch (error) {
    console.error('Market indices API error:', error);
    
    // Fallback with more realistic, time-based simulation
    const now = new Date();
    const marketOpen = isMarketOpen(now);
    
    return NextResponse.json({
      success: true,
      data: [
        {
          symbol: 'S&P 500',
          price: generateRealisticPrice(5234.18, marketOpen),
          change: generateRealisticChange(1.23, marketOpen),
          lastUpdate: now.toISOString()
        },
        {
          symbol: 'NASDAQ',
          price: generateRealisticPrice(16384.52, marketOpen),
          change: generateRealisticChange(1.84, marketOpen),
          lastUpdate: now.toISOString()
        },
        {
          symbol: 'DXY',
          price: generateRealisticPrice(103.84, marketOpen),
          change: generateRealisticChange(-0.23, marketOpen),
          lastUpdate: now.toISOString()
        },
        {
          symbol: 'GOLD',
          price: generateRealisticPrice(2647.30, marketOpen),
          change: generateRealisticChange(0.45, marketOpen),
          lastUpdate: now.toISOString()
        },
        {
          symbol: 'VIX',
          price: generateRealisticPrice(18.34, marketOpen),
          change: generateRealisticChange(2.1, marketOpen),
          lastUpdate: now.toISOString()
        }
      ],
      timestamp: now.toISOString(),
      source: 'Simulated (Market ' + (marketOpen ? 'Open' : 'Closed') + ')'
    });
  }
}

async function fetchIndexData(symbol: string, name: string) {
  try {
    // Try Yahoo Finance API (free tier)
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      { 
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 60 } // Cache for 1 minute
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      const result = data.chart?.result?.[0];
      const meta = result?.meta;
      const quote = result?.indicators?.quote?.[0];
      
      if (meta && quote) {
        const currentPrice = meta.regularMarketPrice || meta.previousClose;
        const previousClose = meta.previousClose;
        const change = ((currentPrice - previousClose) / previousClose) * 100;
        
        return {
          symbol: name,
          price: Number(currentPrice.toFixed(2)),
          change: Number(change.toFixed(2)),
          lastUpdate: new Date().toISOString()
        };
      }
    }
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
  }
  return null;
}

function isMarketOpen(date: Date): boolean {
  const nyTime = new Date(date.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const day = nyTime.getDay();
  const hour = nyTime.getHours();
  const minute = nyTime.getMinutes();
  const totalMinutes = hour * 60 + minute;
  
  // Market is closed on weekends
  if (day === 0 || day === 6) return false;
  
  // Market hours: 9:30 AM - 4:00 PM ET
  return totalMinutes >= 570 && totalMinutes <= 960; // 9:30 AM = 570 min, 4:00 PM = 960 min
}

function generateRealisticPrice(basePrice: number, marketOpen: boolean): number {
  const now = new Date();
  const variance = marketOpen ? 0.002 : 0.0005; // More movement when market is open
  const timeVariation = Math.sin(now.getTime() / 1000000) * variance;
  const randomVariation = (Math.random() - 0.5) * variance * 2;
  
  return Number((basePrice * (1 + timeVariation + randomVariation)).toFixed(2));
}

function generateRealisticChange(baseChange: number, marketOpen: boolean): number {
  const variance = marketOpen ? 0.1 : 0.02;
  const randomVariation = (Math.random() - 0.5) * variance * 2;
  
  return Number((baseChange + randomVariation).toFixed(2));
}