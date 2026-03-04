'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BitcoinWalletConnect } from '@/services/BitcoinWalletConnect';

interface WalletData {
  addresses: {
    payment: string;
    ordinals: string;
  };
  balance: {
    total: number;
    confirmed: number;
    unconfirmed: number;
  };
  ordinals: any[];
  runes: any[];
  timestamp: string;
  connected: boolean;
}

interface BitcoinWalletConnectButtonProps {
  onConnect?: (data: WalletData) => void;
  onDisconnect?: () => void;
}

export const BitcoinWalletConnectButton: React.FC<BitcoinWalletConnectButtonProps> = ({
  onConnect,
  onDisconnect
}) => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [walletService] = useState(() => new BitcoinWalletConnect());

  useEffect(() => {
    // Verificar se há dados salvos da carteira
    const storedData = (walletService as any).getStoredWalletData?.();
    if (storedData && storedData.connected) {
      setWalletData(storedData);
      setConnected(true);
      onConnect?.(storedData);
    }
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      console.log('🔗 Iniciando conexão com carteira Bitcoin...');
      
      const result = await walletService.connect('xverse') as any;

      if (result.address) {
        const data = await (walletService as any).loadWalletData?.() || null;

        if (data) {
          setWalletData(data);
          setConnected(true);
          onConnect?.(data);

          console.log('✅ Carteira Bitcoin conectada:', {
            provider: result.walletType,
            payment: data.addresses.payment,
            ordinals: data.addresses.ordinals,
            balance: data.balance.total,
            ordinalsCount: data.ordinals.length,
            runesCount: data.runes.length
          });
        }
      }
    } catch (error: any) {
      console.error('❌ Erro ao conectar carteira Bitcoin:', error);
      
      // Mensagens de erro mais amigáveis
      let errorMessage = 'Erro ao conectar carteira';
      
      if (error.message.includes('não encontrada') || error.message.includes('detectada')) {
        errorMessage = 'Nenhuma carteira Bitcoin detectada. Instale Xverse ou Unisat.';
      } else if (error.message.includes('cancelada')) {
        errorMessage = 'Conexão cancelada pelo usuário.';
      } else if (error.message.includes('rejeitada')) {
        errorMessage = 'Conexão rejeitada pela carteira.';
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    walletService.disconnect();
    setConnected(false);
    setWalletData(null);
    onDisconnect?.();
    console.log('🔌 Carteira Bitcoin desconectada');
  };

  const formatSats = (sats: number) => {
    if (sats === 0) return '0 sats';
    if (sats >= 100000000) return `${(sats / 100000000).toFixed(8)} BTC`;
    return `${sats.toLocaleString()} sats`;
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  if (!connected) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <span className="text-orange-500">₿</span>
            Conectar Carteira Bitcoin
          </CardTitle>
          <CardDescription>
            Conecte sua carteira Bitcoin para acessar Ordinals e Runes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleConnect} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Conectando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-orange-500">₿</span>
                Conectar Carteira
              </div>
            )}
          </Button>
          
          <div className="text-xs text-muted-foreground text-center">
            Suporta: Xverse, Unisat e outras carteiras Bitcoin
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-orange-500">₿</span>
            Carteira Conectada
          </CardTitle>
          <Badge variant="outline" className="text-green-600 border-green-600">
            Online
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Endereços */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Payment:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {formatAddress(walletData?.addresses?.payment || '')}
            </code>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Ordinals:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {formatAddress(walletData?.addresses?.ordinals || '')}
            </code>
          </div>
        </div>

        <Separator />

        {/* Saldo Bitcoin */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Saldo Bitcoin:</span>
            <span className="font-mono text-orange-600">
              {formatSats(walletData?.balance?.total || 0)}
            </span>
          </div>
          
          {(walletData?.balance?.unconfirmed ?? 0) > 0 && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Não confirmado:</span>
              <span className="text-yellow-600">
                {formatSats(walletData!.balance.unconfirmed)}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Estatísticas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-lg font-bold">{walletData?.ordinals?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Ordinals</div>
          </div>
          
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-lg font-bold">{walletData?.runes?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Runes</div>
          </div>
        </div>

        {/* Runes Preview */}
        {walletData?.runes && walletData.runes.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Runes:</div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {walletData.runes.slice(0, 3).map((rune, index) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <span className="font-mono">{rune.spacedName}</span>
                  <span className="text-muted-foreground">
                    {parseInt(rune.balance).toLocaleString()}
                  </span>
                </div>
              ))}
              {walletData.runes.length > 3 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{walletData.runes.length - 3} mais
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botão Desconectar */}
        <Button 
          onClick={handleDisconnect}
          variant="outline"
          size="sm"
          className="w-full"
        >
          Desconectar
        </Button>

        {/* Timestamp */}
        {walletData?.timestamp && (
          <div className="text-xs text-muted-foreground text-center">
            Última atualização: {new Date(walletData.timestamp).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BitcoinWalletConnectButton;