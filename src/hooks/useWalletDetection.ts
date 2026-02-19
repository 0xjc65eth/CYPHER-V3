'use client';

import { useState, useEffect } from 'react';

interface WalletProviders {
  ethereum?: any;
  solana?: any;
  phantom?: any;
  web3?: any;
}

export function useWalletDetection() {
  const [providers, setProviders] = useState<WalletProviders>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectWallets = async () => {
      // Wait for extensions to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      const detectedProviders: WalletProviders = {};

      try {
        if (typeof window !== 'undefined') {
          const windowAny = window as any;
          
          // MetaMask / Ethereum providers
          if (windowAny.ethereum) {
            detectedProviders.ethereum = windowAny.ethereum;
          } else if (windowAny.web3?.currentProvider) {
            detectedProviders.ethereum = windowAny.web3.currentProvider;
          }

          // Phantom / Solana providers
          if (windowAny.solana) {
            detectedProviders.solana = windowAny.solana;
          } else if (windowAny.phantom?.solana) {
            detectedProviders.solana = windowAny.phantom.solana;
          }

          // Phantom object
          if (windowAny.phantom) {
            detectedProviders.phantom = windowAny.phantom;
          }

          // Web3 legacy
          if (windowAny.web3) {
            detectedProviders.web3 = windowAny.web3;
          }
        }
      } catch (error) {
      }

      setProviders(detectedProviders);
      setIsLoading(false);
    };

    detectWallets();

    // Re-detect when page loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', detectWallets);
      return () => document.removeEventListener('DOMContentLoaded', detectWallets);
    }
  }, []);

  const connectEthereum = async (): Promise<string | null> => {
    try {
      if (!providers.ethereum) {
        throw new Error('No Ethereum provider detected');
      }

      const accounts = await providers.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts && accounts.length > 0) {
        return accounts[0];
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error connecting Ethereum:', error);
      throw error;
    }
  };

  const connectSolana = async (): Promise<string | null> => {
    try {
      if (!providers.solana) {
        throw new Error('No Solana provider detected');
      }

      const response = await providers.solana.connect({ onlyIfTrusted: false });
      
      if (response && response.publicKey) {
        return response.publicKey.toString();
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error connecting Solana:', error);
      throw error;
    }
  };

  const switchNetwork = async (chainId: string): Promise<boolean> => {
    try {
      if (!providers.ethereum) {
        return false;
      }

      await providers.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }]
      });

      return true;
    } catch (error) {
      console.error('❌ Error switching network:', error);
      return false;
    }
  };

  return {
    providers,
    isLoading,
    hasEthereum: !!providers.ethereum,
    hasSolana: !!providers.solana,
    connectEthereum,
    connectSolana,
    switchNetwork,
  };
}