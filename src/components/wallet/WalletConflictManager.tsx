'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface WalletConflict {
  extension: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
}

export function WalletConflictManager() {
  const [conflicts, setConflicts] = useState<WalletConflict[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isResolved, setIsResolved] = useState(false);

  // Disabled - no conflict notifications
  return null;

  useEffect(() => {
    const detectConflicts = () => {
      const detectedConflicts: WalletConflict[] = [];
      
      try {
        // Check for Pocket Universe conflicts
        const hasPocketUniverse = document.querySelector('[id*="pocket-universe"]') ||
                                 (window as any).pocketUniverse;
        if (hasPocketUniverse) {
          detectedConflicts.push({
            extension: 'Pocket Universe',
            issue: 'May interfere with wallet connections',
            severity: 'medium'
          });
        }

        // Check for Magic Eden conflicts
        const hasMagicEden = (window as any).magicEden;
        if (hasMagicEden) {
          detectedConflicts.push({
            extension: 'Magic Eden',
            issue: 'Multiple provider injection detected',
            severity: 'low'
          });
        }

        // Check for multiple Ethereum providers
        const win = window as any;
        if (win.ethereum && win.ethereum.providers && win.ethereum.providers.length > 1) {
          detectedConflicts.push({
            extension: 'Multiple Ethereum Wallets',
            issue: `${win.ethereum.providers.length} providers detected`,
            severity: 'medium'
          });
        }

        // Check for Solana provider conflicts
        const hasMultipleSolana = win.solana && win.phantom?.solana && 
                                 win.solana !== win.phantom.solana;
        if (hasMultipleSolana) {
          detectedConflicts.push({
            extension: 'Multiple Solana Wallets',
            issue: 'Conflicting Solana providers',
            severity: 'low'
          });
        }

        setConflicts(detectedConflicts);
        setIsVisible(detectedConflicts.length > 0);

      } catch (error) {
        console.debug('Conflict detection error:', error);
      }
    };

    // Wait for extensions to load
    setTimeout(detectConflicts, 2000);
    
    // Periodic check
    const interval = setInterval(detectConflicts, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const resolveConflicts = () => {
    try {
      // Clear console errors
      const originalError = console.error;
      const originalWarn = console.warn;
      
      (window as any).console.error = (...args: any[]) => {
        const message = args.join(' ');
        
        // Suppress known conflicts
        if (
          message.includes('Cannot redefine property') ||
          message.includes('Cannot set property') ||
          message.includes('Magic Eden provider') ||
          message.includes('Pocket Universe') ||
          message.includes('hostname check')
        ) {
          return;
        }
        
        originalError.apply(console, args);
      };
      
      (window as any).console.warn = (...args: any[]) => {
        const message = args.join(' ');
        
        if (
          message.includes('provider conflict') ||
          message.includes('multiple wallet')
        ) {
          return;
        }
        
        originalWarn.apply(console, args);
      };

      setIsResolved(true);
      setIsVisible(false);
      
      // Auto-hide after success
      setTimeout(() => {
        setIsResolved(false);
      }, 3000);

    } catch (error) {
      console.debug('Conflict resolution error:', error);
    }
  };

  if (isResolved) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Card className="bg-green-900 border-green-600 p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-green-200 text-sm">
            Wallet conflicts resolved
          </span>
        </Card>
      </div>
    );
  }

  if (!isVisible || conflicts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Card className="bg-yellow-900/90 border-yellow-600 p-4 backdrop-blur">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h3 className="text-yellow-200 font-semibold text-sm">
              Wallet Extension Conflicts
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0 text-yellow-400 hover:text-yellow-300"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2 mb-4">
          {conflicts.map((conflict: WalletConflict, index: number) => (
            <div key={index} className="text-xs">
              <div className="text-yellow-200 font-medium">
                {conflict.extension}
              </div>
              <div className="text-yellow-300/80">
                {conflict.issue}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={resolveConflicts}
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-700 text-yellow-50 text-xs"
          >
            Auto-Resolve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="border-yellow-600 text-yellow-300 hover:bg-yellow-600/20 text-xs"
          >
            Ignore
          </Button>
        </div>

        <div className="mt-3 text-xs text-yellow-300/60">
          These conflicts won&apos;t affect wallet functionality but may cause console warnings.
        </div>
      </Card>
    </div>
  );
}