'use client';

import React from 'react';

export interface BitcoinPriceDisplayProps {
  className?: string;
}

export const BitcoinPriceDisplay: React.FC<BitcoinPriceDisplayProps> = ({ className }) => {
  return (
    <div className={className}>
      <span className="text-orange-500 font-mono text-sm">BTC --</span>
    </div>
  );
};

export default BitcoinPriceDisplay;
