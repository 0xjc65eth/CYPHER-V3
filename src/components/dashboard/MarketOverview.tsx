'use client';

import React from 'react';

export const MarketOverview: React.FC = () => {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Market Overview</h3>
      <p className="text-gray-400">Loading market data...</p>
    </div>
  );
};

export default MarketOverview;
