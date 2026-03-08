/**
 * CYPHER AI Trading Agent - Pump.fun Connector
 * Detects new token launches and trades on bonding curves via PumpPortal API
 * REST + WebSocket for real-time token detection
 */

export interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  imageUri?: string;
  bondingCurveProgress: number; // 0-100, 100 = graduated to Raydium
  marketCapSol: number;
  liquiditySol: number;
  holders: number;
  createdAt: number;
  graduated: boolean;
  mintAuthority: 'renounced' | 'active' | 'unknown';
}

export interface PumpFunTradeResult {
  success: boolean;
  txHash?: string;
  error?: string;
  amountIn: number;
  amountOut: number;
}

type TokenCallback = (token: PumpFunToken) => void;

export class PumpFunConnector {
  private readonly apiUrl = 'https://pumpportal.fun/api';
  private ws: WebSocket | null = null;
  private tokenListeners: Set<TokenCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private connected = false;

  /**
   * Connect WebSocket for real-time new token detection
   */
  async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket('wss://pumpportal.fun/api/data');

        this.ws.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;

          // Subscribe to new token events
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              method: 'subscribeNewToken',
            }));
          }
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string);
            if (data.txType === 'create' && data.mint) {
              const token: PumpFunToken = {
                mint: data.mint,
                name: data.name || 'Unknown',
                symbol: data.symbol || '???',
                description: data.description,
                imageUri: data.uri,
                bondingCurveProgress: 0,
                marketCapSol: data.marketCapSol || 0,
                liquiditySol: data.vSolInBondingCurve || 0,
                holders: 1,
                createdAt: Date.now(),
                graduated: false,
                mintAuthority: 'unknown',
              };
              this.tokenListeners.forEach(cb => {
                try { cb(token); } catch { /* listener error */ }
              });
            }
          } catch { /* parse error */ }
        };

        this.ws.onclose = () => {
          this.connected = false;
          this.scheduleReconnect();
        };

        this.ws.onerror = () => {
          if (!this.connected) reject(new Error('WebSocket connection failed'));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Register listener for new token launches
   */
  onNewToken(callback: TokenCallback): () => void {
    this.tokenListeners.add(callback);
    return () => { this.tokenListeners.delete(callback); };
  }

  /**
   * Get token status from PumpPortal API
   */
  async getTokenStatus(mint: string): Promise<PumpFunToken | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(`${this.apiUrl}/token/${mint}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) return null;
      const data = await response.json();
      return {
        mint: data.mint || mint,
        name: data.name || 'Unknown',
        symbol: data.symbol || '???',
        description: data.description,
        imageUri: data.image_uri,
        bondingCurveProgress: data.bonding_curve_progress || 0,
        marketCapSol: data.market_cap_sol || 0,
        liquiditySol: data.virtual_sol_reserves || 0,
        holders: data.holder_count || 0,
        createdAt: data.created_timestamp || Date.now(),
        graduated: data.complete === true,
        mintAuthority: data.mint_authority_revoked ? 'renounced' : 'active',
      };
    } catch {
      return null;
    }
  }

  /**
   * Buy token on bonding curve via PumpPortal trade API
   * Requires Solana keypair for signing
   */
  async buyOnCurve(
    mint: string,
    solAmount: number,
    keypairBase58: string,
    slippageBps: number = 500, // 5% default for memecoins
  ): Promise<PumpFunTradeResult> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${this.apiUrl}/trade-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          publicKey: keypairBase58,
          action: 'buy',
          mint,
          amount: solAmount,
          denominatedInSol: 'true',
          slippage: slippageBps / 100, // PumpPortal uses percentage
          priorityFee: 0.001, // SOL priority fee
          pool: 'pump',
        }),
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: errText, amountIn: solAmount, amountOut: 0 };
      }

      const data = await response.json();
      return {
        success: true,
        txHash: data.signature || data.tx,
        amountIn: solAmount,
        amountOut: data.tokenAmount || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        amountIn: solAmount,
        amountOut: 0,
      };
    }
  }

  /**
   * Sell token on bonding curve
   */
  async sellOnCurve(
    mint: string,
    tokenAmount: number,
    keypairBase58: string,
    slippageBps: number = 500,
  ): Promise<PumpFunTradeResult> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${this.apiUrl}/trade-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          publicKey: keypairBase58,
          action: 'sell',
          mint,
          amount: tokenAmount,
          denominatedInSol: 'false',
          slippage: slippageBps / 100,
          priorityFee: 0.001,
          pool: 'pump',
        }),
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: errText, amountIn: tokenAmount, amountOut: 0 };
      }

      const data = await response.json();
      return {
        success: true,
        txHash: data.signature || data.tx,
        amountIn: tokenAmount,
        amountOut: data.solAmount || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        amountIn: tokenAmount,
        amountOut: 0,
      };
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    setTimeout(() => {
      this.connectWebSocket().catch(() => {});
    }, this.reconnectDelay);
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts; // prevent reconnect
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.tokenListeners.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }
}
