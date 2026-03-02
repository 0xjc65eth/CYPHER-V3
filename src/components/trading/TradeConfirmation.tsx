'use client';

import React from 'react';

interface TradeConfirmationProps {
  tradeDetails: any;
  walletAddress: string;
  onConfirm: () => void;
  onBack: () => void;
}

export const TradeConfirmation: React.FC<TradeConfirmationProps> = ({
  onConfirm,
  onBack,
}) => {
  return (
    <div className="trade-confirmation">
      <p>Confirm your trade</p>
      <button onClick={onBack}>Back</button>
      <button onClick={onConfirm}>Confirm</button>
    </div>
  );
};

export default TradeConfirmation;
