// components/WalletConnect/MultiChainWallet.jsx
import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { Connection, PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

// Exportar configurações para uso em outros componentes
export const SUPPORTED_EVM_CHAINS = [
  { id: 1, name: 'Ethereum', chainId: 1, icon: '⟠' },
  { id: 42161, name: 'Arbitrum', chainId: 42161, icon: '🔷' },
  { id: 137, name: 'Polygon', chainId: 137, icon: '🟣' },
  { id: 10, name: 'Optimism', chainId: 10, icon: '🔴' },
  { id: 8453, name: 'Base', chainId: 8453, icon: '🔵' }
];

export const SUPPORTED_SOLANA_CHAINS = [
  { name: 'Solana Mainnet', cluster: 'mainnet-beta', icon: '🟢' },
  { name: 'Solana Devnet', cluster: 'devnet', icon: '🟡' },
  { name: 'Solana Testnet', cluster: 'testnet', icon: '🔵' }
];

export const MultiChainWallet = ({ onConnect, onDisconnect }) => {
  const { open } = useAppKit();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  
  // Solana Wallet Adapter
  const { 
    publicKey: solanaAddress, 
    connected: solanaConnected,
    wallet: solanaWallet,
    disconnect: disconnectSolana
  } = useWallet();
  
  // Estados locais
  const [solanaBalance, setSolanaBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({
    evm: false,
    solana: false,
    bitcoin: false
  });

  // Configurações de rede
  const networks = {
    ethereum: { name: 'Ethereum', chainId: 1, icon: '⟠' },
    arbitrum: { name: 'Arbitrum', chainId: 42161, icon: '🔷' },
    polygon: { name: 'Polygon', chainId: 137, icon: '🟣' },
    optimism: { name: 'Optimism', chainId: 10, icon: '🔴' },
    base: { name: 'Base', chainId: 8453, icon: '🔵' },
    solana: { name: 'Solana', chainId: 'solana', icon: '🟢' }
  };

  // Effeitos para monitorar conexões
  useEffect(() => {
    setConnectionStatus(prev => ({
      ...prev,
      evm: isConnected,
      solana: solanaConnected
    }));
  }, [isConnected, solanaConnected]);

  useEffect(() => {
    if (solanaConnected && solanaAddress) {
      fetchSolanaBalance();
    }
  }, [solanaConnected, solanaAddress]);

  useEffect(() => {
    if (onConnect && (isConnected || solanaConnected)) {
      const walletData = {
        evm: isConnected ? {
          address,
          chain: chain?.name,
          chainId: chain?.id,
          balance: balance?.formatted,
          symbol: balance?.symbol
        } : null,
        solana: solanaConnected ? {
          address: solanaAddress?.toBase58(),
          balance: solanaBalance,
          wallet: solanaWallet?.adapter?.name
        } : null,
        timestamp: new Date().toISOString()
      };
      
      onConnect(walletData);
    }
  }, [isConnected, solanaConnected, address, balance, solanaBalance, chain]);

  // Buscar saldo Solana
  const fetchSolanaBalance = async () => {
    if (!solanaAddress) return;
    
    try {
      setIsLoading(true);
      const connection = new Connection(clusterApiUrl('mainnet-beta'));
      const balance = await connection.getBalance(new PublicKey(solanaAddress));
      setSolanaBalance(balance / 1e9); // Converter para SOL
    } catch (error) {
      console.error('Erro ao buscar saldo Solana:', error);
      setError('Erro ao buscar saldo Solana');
    } finally {
      setIsLoading(false);
    }
  };

  // Conectar carteiras
  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Abrir modal do Reown AppKit para conexões EVM e Solana
      open();
      
    } catch (error) {
      console.error('Erro na conexão:', error);
      setError('Erro ao conectar carteira');
    } finally {
      setIsLoading(false);
    }
  };

  // Desconectar todas as carteiras
  const handleDisconnectAll = async () => {
    try {
      setIsLoading(true);
      
      // Desconectar EVM
      if (isConnected) {
        disconnect();
      }
      
      // Desconectar Solana
      if (solanaConnected) {
        await disconnectSolana();
      }
      
      // Reset estados
      setSolanaBalance(0);
      setError(null);
      setConnectionStatus({ evm: false, solana: false, bitcoin: false });
      
      if (onDisconnect) {
        onDisconnect();
      }
      
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      setError('Erro ao desconectar carteiras');
    } finally {
      setIsLoading(false);
    }
  };

  // Formatar endereço
  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Formatar saldo
  const formatBalance = (bal, decimals = 4) => {
    if (!bal) return '0';
    return parseFloat(bal).toFixed(decimals);
  };

  // Detectar qual rede está conectada
  const getNetworkInfo = (chainId) => {
    return Object.values(networks).find(net => net.chainId === chainId) || 
           { name: 'Desconhecida', icon: '❓' };
  };

  // Estados de renderização
  const hasAnyConnection = isConnected || solanaConnected;
  const networkInfo = chain ? getNetworkInfo(chain.id) : null;

  return (
    <div className="multi-chain-wallet w-full max-w-md mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
        <h3 className="text-lg font-bold">Multi-Chain Wallet</h3>
        <div className="flex items-center gap-2 mt-2">
          <div className={`w-2 h-2 rounded-full ${hasAnyConnection ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-sm">
            {hasAnyConnection ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="bg-white dark:bg-gray-800 border-x border-gray-200 dark:border-gray-700">
        {!hasAnyConnection ? (
          /* Estado Desconectado */
          <div className="p-6 text-center">
            <div className="mb-6">
              <div className="text-4xl mb-4">🔗</div>
              <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Conectar Carteira Multi-Chain
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Conecte-se a Ethereum, Arbitrum, Polygon, Optimism, Base e Solana
              </p>
            </div>

            {/* Networks Suportadas */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {Object.entries(networks).map(([key, network]) => (
                <div key={key} className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-lg">{network.icon}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{network.name}</div>
                </div>
              ))}
            </div>

            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Conectando...
                </div>
              ) : (
                'Conectar Carteira'
              )}
            </button>
          </div>
        ) : (
          /* Estado Conectado */
          <div className="p-4 space-y-4">
            {/* EVM Connection */}
            {isConnected && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{networkInfo?.icon || '⟠'}</span>
                    <div>
                      <div className="font-medium text-blue-800 dark:text-blue-200">
                        {networkInfo?.name || chain?.name}
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-300">
                        {formatAddress(address)}
                      </div>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
                    {formatBalance(balance?.formatted)} {balance?.symbol}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    Saldo EVM
                  </div>
                </div>
              </div>
            )}

            {/* Solana Connection */}
            {solanaConnected && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">🟢</span>
                    <div>
                      <div className="font-medium text-green-800 dark:text-green-200">
                        Solana ({solanaWallet?.adapter?.name})
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-300">
                        {formatAddress(solanaAddress?.toBase58())}
                      </div>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-green-800 dark:text-green-200">
                    {formatBalance(solanaBalance)} SOL
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Saldo Solana
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={fetchSolanaBalance}
                disabled={!solanaConnected || isLoading}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded text-sm transition-colors disabled:opacity-50"
              >
                🔄 Atualizar
              </button>
              
              <button
                onClick={handleDisconnectAll}
                disabled={isLoading}
                className="flex-1 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 py-2 px-4 rounded text-sm transition-colors disabled:opacity-50"
              >
                🔌 Desconectar
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mx-4 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 p-3 rounded-b-lg text-xs text-center border-x border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-center items-center gap-4">
          <span>EVM: {connectionStatus.evm ? '✅' : '❌'}</span>
          <span>Solana: {connectionStatus.solana ? '✅' : '❌'}</span>
          <span>Bitcoin: {connectionStatus.bitcoin ? '✅' : '❌'}</span>
        </div>
      </div>
    </div>
  );
};

export default MultiChainWallet;