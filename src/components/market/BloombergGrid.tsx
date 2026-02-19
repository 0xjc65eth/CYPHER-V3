'use client';

import React from 'react';
import { useMultiAssetData } from '@/hooks/useMultiAssetData';
import { useEconomicData } from '@/hooks/useEconomicData';
import { useFinancialNews } from '@/hooks/useFinancialNews';
import { useFedIndicators } from '@/hooks/useFedIndicators';
import { TickerBar } from './panels/TickerBar';
import { CryptoWatchlist } from './panels/CryptoWatchlist';
import { ForexWatchlist } from './panels/ForexWatchlist';
import { CommoditiesWatchlist } from './panels/CommoditiesWatchlist';
import { IndicesWatchlist } from './panels/IndicesWatchlist';
import { AssetHeatmap } from './panels/AssetHeatmap';
import { NewsFeed } from './panels/NewsFeed';
import { EconomicDataPanel } from './panels/EconomicDataPanel';
import { FedIndicatorsPanel } from './panels/FedIndicatorsPanel';
import { CorrelationMatrix } from './panels/CorrelationMatrix';
import { MarketBreadth } from './panels/MarketBreadth';

export default function BloombergGrid() {
  const multiAsset = useMultiAssetData(120000);
  const economic = useEconomicData(1800000);
  const news = useFinancialNews(900000);
  const fed = useFedIndicators(1800000);

  return (
    <div className="space-y-1">
      {/* Scrolling Ticker Bar */}
      <TickerBar
        data={multiAsset.data}
        loading={multiAsset.loading}
      />

      {/* Main Grid: Left 60% / Right 40% */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-1 px-2">
        {/* LEFT COLUMN (3/5 = 60%) */}
        <div className="xl:col-span-3 space-y-1">
          {/* Row 1: Crypto + Indices side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
            <CryptoWatchlist
              data={multiAsset.data?.crypto ?? null}
              loading={multiAsset.loading}
              error={multiAsset.error}
            />
            <IndicesWatchlist
              data={multiAsset.data ? { indices: multiAsset.data.indices, stocks: multiAsset.data.stocks } : null}
              loading={multiAsset.loading}
              error={multiAsset.error}
            />
          </div>

          {/* Row 2: Forex + Commodities side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
            <ForexWatchlist
              data={multiAsset.data?.forex ?? null}
              loading={multiAsset.loading}
              error={multiAsset.error}
            />
            <CommoditiesWatchlist
              data={multiAsset.data?.commodities ?? null}
              loading={multiAsset.loading}
              error={multiAsset.error}
            />
          </div>

          {/* Row 3: Asset Heatmap (full width) */}
          <AssetHeatmap
            data={multiAsset.data}
            loading={multiAsset.loading}
          />
        </div>

        {/* RIGHT COLUMN (2/5 = 40%) */}
        <div className="xl:col-span-2 space-y-1">
          {/* News Feed */}
          <NewsFeed
            articles={news.data?.articles ?? null}
            loading={news.loading}
            error={news.error}
          />

          {/* Economic Data */}
          <EconomicDataPanel
            data={economic.data}
            loading={economic.loading}
            error={economic.error}
          />

          {/* Fed Indicators */}
          <FedIndicatorsPanel
            data={fed.data}
            loading={fed.loading}
            error={fed.error}
          />
        </div>
      </div>

      {/* Bottom Row: Correlation Matrix + Market Breadth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 px-2 pb-2">
        <CorrelationMatrix
          loading={false}
        />
        <MarketBreadth
          data={multiAsset.data}
          loading={multiAsset.loading}
        />
      </div>
    </div>
  );
}
