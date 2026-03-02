'use client';

import { useState, useEffect } from 'react';
import { cacheService } from '@/lib/cache';
import { devLogger } from '@/lib/logger';

export function CacheStatus() {
  const [status, setStatus] = useState({
    redis: false,
    memorySize: 0,
    memoryKeys: [] as string[],
  });

  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = cacheService.getStats();
      setStatus(currentStatus);
      devLogger.log('CACHE', 'Cache status updated', currentStatus);
    };

    // Atualizar imediatamente
    updateStatus();

    // Atualizar a cada 5 segundos
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-orange-500/20 rounded-lg p-4">
      <h3 className="text-orange-500 font-semibold mb-2">Cache Status</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              status.redis ? 'bg-green-500' : 'bg-yellow-500'
            }`}
          />
          <span className="text-gray-400">
            Redis: {status.redis ? 'Connected' : 'Memory Only'}
          </span>
        </div>

        <div className="text-gray-400">
          Memory Cache: {status.memorySize} keys
        </div>

        {status.memorySize > 0 && (
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Cached Keys:</div>
            <div className="max-h-20 overflow-y-auto">
              {status.memoryKeys.map((key) => (
                <div key={key} className="text-xs text-gray-600 truncate">
                  {key}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
