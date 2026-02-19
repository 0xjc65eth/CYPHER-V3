'use client';

import { useState, useEffect } from 'react';

interface WalletInfo {
  name: string;
  type: 'ethereum' | 'solana' | 'bitcoin';
  icon: string;
  provider?: any;
}

interface MultiWalletProviders {
  ethereum?: any;
  solana?: any;
  phantom?: any;
  unisat?: any;
  xverse?: any;
  BitcoinProvider?: any;
  magicEden?: any;
  leather?: any;
}

export const useMultiWalletDetection = () => {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [providers, setProviders] = useState<MultiWalletProviders>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectAllWallets = async () => {
      // Wait for extensions to fully load
      await new Promise(resolve => setTimeout(resolve, 2000));

      const detectedWallets: WalletInfo[] = [];
      const detectedProviders: MultiWalletProviders = {};

      try {
        if (typeof window !== 'undefined') {
          const win = window as any;
          
          // Ethereum wallets detection with conflict handling
          try {
            if (win.ethereum) {
              detectedProviders.ethereum = win.ethereum;
              
              // Handle multiple providers
              const providers = win.ethereum.providers || [win.ethereum];
              let hasMetaMask = false;
              
              for (const provider of providers) {
                if (provider.isMetaMask && !hasMetaMask) {
                  hasMetaMask = true;
                  detectedWallets.push({ 
                    name: 'MetaMask', 
                    type: 'ethereum',
                    icon: '🦊',
                    provider: provider
                  });
                }
              }
              
              // If no specific provider identified
              if (!hasMetaMask && win.ethereum) {
                detectedWallets.push({ 
                  name: 'Ethereum Wallet', 
                  type: 'ethereum',
                  icon: '💎',
                  provider: win.ethereum
                });
              }
            }
          } catch (e) {
          }

          // Solana wallets detection
          try {
            if (win.solana || win.phantom?.solana) {
              const solanaProvider = win.solana || win.phantom.solana;
              detectedProviders.solana = solanaProvider;
              
              if (solanaProvider.isPhantom) {
                detectedWallets.push({ 
                  name: 'Phantom', 
                  type: 'solana',
                  icon: '👻',
                  provider: solanaProvider
                });
              } else {
                detectedWallets.push({ 
                  name: 'Solana Wallet', 
                  type: 'solana',
                  icon: '☀️',
                  provider: solanaProvider
                });
              }
            }
          } catch (e) {
          }

          // Bitcoin wallets detection
          try {
            // Unisat
            if (win.unisat) {
              detectedProviders.unisat = win.unisat;
              detectedWallets.push({ 
                name: 'Unisat', 
                type: 'bitcoin',
                icon: '🟠',
                provider: win.unisat
              });
            }
            
            // Xverse
            if (win.XverseProviders?.BitcoinProvider || win.BitcoinProvider) {
              const xverseProvider = win.XverseProviders?.BitcoinProvider || win.BitcoinProvider;
              detectedProviders.xverse = xverseProvider;
              detectedWallets.push({ 
                name: 'Xverse', 
                type: 'bitcoin',
                icon: '🔷',
                provider: xverseProvider
              });
            }
            
            // Magic Eden
            if (win.magicEden?.bitcoin) {
              detectedProviders.magicEden = win.magicEden;
              detectedWallets.push({ 
                name: 'Magic Eden', 
                type: 'bitcoin',
                icon: '🟣',
                provider: win.magicEden.bitcoin
              });
            }
            
            // Leather (formerly Hiro)
            if (win.LeatherProvider || win.HiroWalletProvider) {
              const leatherProvider = win.LeatherProvider || win.HiroWalletProvider;
              detectedProviders.leather = leatherProvider;
              detectedWallets.push({ 
                name: 'Leather', 
                type: 'bitcoin',
                icon: '🟤',
                provider: leatherProvider
              });
            }
          } catch (e) {
          }
        }
      } catch (error) {
        console.error('Error in wallet detection:', error);
      }

      setWallets(detectedWallets);
      setProviders(detectedProviders);
      setIsLoading(false);
    };

    detectAllWallets();

    // Re-detect when page fully loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', detectAllWallets);
      return () => document.removeEventListener('DOMContentLoaded', detectAllWallets);
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

      return accounts?.[0] || null;
    } catch (error) {
      console.error('Error connecting Ethereum:', error);
      throw error;
    }
  };

  const connectSolana = async (): Promise<string | null> => {
    try {
      if (!providers.solana) {
        throw new Error('No Solana provider detected');
      }

      const response = await providers.solana.connect({ onlyIfTrusted: false });
      return response?.publicKey?.toString() || null;
    } catch (error) {
      console.error('Error connecting Solana:', error);
      throw error;
    }
  };

  const connectBitcoin = async (walletName: string): Promise<any> => {
    try {
      switch (walletName.toLowerCase()) {
        case 'unisat':
          if (!providers.unisat) throw new Error('Unisat not detected');
          await providers.unisat.requestAccounts();
          const unisatAccounts = await providers.unisat.getAccounts();
          return {
            address: unisatAccounts[0],
            publicKey: await providers.unisat.getPublicKey()
          };
          
        case 'xverse':
          if (!providers.xverse) throw new Error('Xverse not detected');
          const xverseResult = await providers.xverse.request('getAddress', {
            purposes: ['payment', 'ordinals']
          });
          return {
            address: xverseResult.addresses[0].address,
            ordinalsAddress: xverseResult.addresses[1]?.address
          };
          
        case 'magiceden':
          if (!providers.magicEden?.bitcoin) throw new Error('Magic Eden not detected');
          const meAccounts = await providers.magicEden.bitcoin.requestAccounts();
          return {
            address: meAccounts[0]
          };
          
        case 'leather':
          if (!providers.leather) throw new Error('Leather not detected');
          const leatherResponse = await providers.leather.request('getAddresses');
          return {
            address: leatherResponse.result.addresses[0].address
          };
          
        default:
          throw new Error(`Unknown wallet: ${walletName}`);
      }
    } catch (error) {
      console.error(`Error connecting ${walletName}:`, error);
      throw error;
    }
  };

  return {
    wallets,
    providers,
    isLoading,
    hasEthereum: wallets.some(w => w.type === 'ethereum'),
    hasSolana: wallets.some(w => w.type === 'solana'),
    hasBitcoin: wallets.some(w => w.type === 'bitcoin'),
    connectEthereum,
    connectSolana,
    connectBitcoin,
  };
};