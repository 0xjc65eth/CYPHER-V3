'use client';

import { useWallet } from '@/contexts/WalletContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function WalletDebug() {
  const wallet = useWallet();
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const ordinalsAddress = wallet.walletInfo.ordinalsAddress?.address ?? null;
  const paymentAddress = wallet.walletInfo.paymentAddress?.address ?? null;
  const network = wallet.walletInfo.connected ? 'mainnet' : null;

  const testWalletAPI = async () => {
    if (!wallet.address) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/test-wallet/?address=${wallet.address}`);
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ error: 'Failed to test API' });
    } finally {
      setLoading(false);
    }
  };

  if (!wallet.isConnected) {
    return null;
  }

  return (
    <Card className="bg-gray-900 border-gray-700 p-6 mb-4">
      <h3 className="text-lg font-semibold text-white mb-4">Wallet Debug Info</h3>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-400">Connected:</span>
          <span className="text-white">{wallet.isConnected ? 'Yes' : 'No'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Address:</span>
          <span className="text-white font-mono text-xs">{wallet.address || 'None'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Ordinals Address:</span>
          <span className="text-white font-mono text-xs">{ordinalsAddress || 'None'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Payment Address:</span>
          <span className="text-white font-mono text-xs">{paymentAddress || 'None'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Network:</span>
          <span className="text-white">{network || 'Unknown'}</span>
        </div>
      </div>

      <Button
        onClick={testWalletAPI}
        disabled={loading}
        className="w-full mb-4"
      >
        {loading ? 'Testing...' : 'Test Blockchain API'}
      </Button>

      {testResult && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
          <pre className="text-xs text-gray-300 overflow-auto">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
}