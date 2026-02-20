'use client';

import React, { useEffect, useState } from 'react';

export function ChartDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [rechartsAvailable, setRechartsAvailable] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const runDiagnostics = async () => {
      const results: any = {};
      const errorList: string[] = [];

      // Test 1: Check if Recharts can be imported
      try {
        const recharts = await import('recharts');
        results.rechartsImport = 'SUCCESS';
        results.rechartsComponents = Object.keys(recharts);
        setRechartsAvailable(true);
      } catch (error) {
        results.rechartsImport = 'FAILED';
        results.rechartsError = error instanceof Error ? error.message : 'Unknown error';
        errorList.push(`Recharts import failed: ${results.rechartsError}`);
      }

      // Test 2: Check if Lightweight Charts is available
      try {
        const lightweight = await import('lightweight-charts');
        results.lightweightImport = 'SUCCESS';
      } catch (error) {
        results.lightweightImport = 'FAILED';
        results.lightweightError = error instanceof Error ? error.message : 'Unknown error';
        errorList.push(`Lightweight Charts import failed: ${results.lightweightError}`);
      }

      // Test 4: Check client-side rendering
      results.isClient = typeof window !== 'undefined';
      results.userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'Server';

      setDiagnostics(results);
      setErrors(errorList);
    };

    runDiagnostics();
  }, []);

  // Simple Recharts test if available
  const RenderSimpleChart = () => {
    if (!rechartsAvailable) {
      return <div className="text-red-500">Recharts not available</div>;
    }

    try {
      const { LineChart, Line, XAxis, YAxis, ResponsiveContainer } = require('recharts');
      const data = [
        { x: 1, y: 10 },
        { x: 2, y: 20 },
        { x: 3, y: 15 },
        { x: 4, y: 25 },
      ];

      return (
        <div className="bg-gray-800 p-4 rounded">
          <h4 className="text-white mb-2">Simple Recharts Test</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <XAxis dataKey="x" />
              <YAxis />
              <Line type="monotone" dataKey="y" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    } catch (error) {
      return (
        <div className="text-red-500">
          Error rendering simple chart: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      );
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-4">📊 Chart Library Diagnostics</h2>
      
      {/* Error Summary */}
      {errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-500 p-4 rounded mb-4">
          <h3 className="text-red-400 font-semibold mb-2">Errors Found:</h3>
          <ul className="list-disc list-inside text-red-300">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="font-semibold mb-2">📦 Library Status</h3>
          <div className="space-y-1 text-sm">
            <div className={diagnostics.rechartsImport === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}>
              Recharts: {diagnostics.rechartsImport || 'Testing...'}
            </div>
            <div className={diagnostics.lightweightImport === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}>
              Lightweight: {diagnostics.lightweightImport || 'Testing...'}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h3 className="font-semibold mb-2">🌐 Environment</h3>
          <div className="space-y-1 text-sm">
            <div>Client: {diagnostics.isClient ? '✅' : '❌'}</div>
            <div>React: {React.version}</div>
            <div>Browser: {diagnostics.userAgent ? diagnostics.userAgent.split(' ')[0] : 'Unknown'}</div>
          </div>
        </div>
      </div>

      {/* Recharts Components */}
      {diagnostics.rechartsComponents && (
        <div className="bg-gray-800 p-4 rounded mb-4">
          <h3 className="font-semibold mb-2">📊 Available Recharts Components</h3>
          <div className="grid grid-cols-4 gap-2 text-sm">
            {diagnostics.rechartsComponents.map((component: string) => (
              <div key={component} className="text-blue-300">{component}</div>
            ))}
          </div>
        </div>
      )}

      {/* Simple Chart Test */}
      <div className="mb-4">
        <RenderSimpleChart />
      </div>

      {/* Raw Diagnostics Data */}
      <div className="bg-gray-800 p-4 rounded">
        <h3 className="font-semibold mb-2">🔍 Raw Diagnostics</h3>
        <pre className="text-xs overflow-auto max-h-60">
          {JSON.stringify(diagnostics, null, 2)}
        </pre>
      </div>
    </div>
  );
}