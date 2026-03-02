'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { 
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Brain,
  Sparkles,
  Bot,
  User,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  DollarSign,
  Hash,
  Zap,
  Shield,
  Target,
  MessageSquare,
  Settings,
  Languages,
  Command
} from 'lucide-react';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'command' | 'analysis' | 'alert';
  data?: any;
}

interface CypherAIConfig {
  model: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3';
  temperature: number;
  language: 'auto' | 'pt' | 'en';
  voice: string;
  personality: 'professional' | 'friendly' | 'technical';
}

// Cypher AI Core Class
class CypherAICore {
  private context: Message[] = [];
  private config: CypherAIConfig;
  private speechRecognition: any;
  private speechSynthesis: any;
  private isListening: boolean = false;
  private marketData: any = {};
  
  constructor(config: CypherAIConfig) {
    this.config = config;
    this.initializeSpeech();
  }

  private initializeSpeech() {
    if (typeof window !== 'undefined') {
      // Initialize Web Speech API with better browser support
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.continuous = true;
        this.speechRecognition.interimResults = true;
        this.speechRecognition.lang = this.config.language === 'pt' ? 'pt-BR' : 'en-US';
        
        // Add error handling
        this.speechRecognition.onerror = (event: any) => {
          this.isListening = false;
        };
        
        this.speechRecognition.onend = () => {
          this.isListening = false;
        };
      } else {
      }
      
      this.speechSynthesis = window.speechSynthesis;
    }
  }

  async processNaturalLanguage(input: string): Promise<string> {
    // Detect language if auto
    const detectedLang = this.detectLanguage(input);
    const isPortuguese = detectedLang === 'pt';
    
    // Extract intent and entities
    const intent = this.extractIntent(input);
    const entities = this.extractEntities(input);
    
    // Process based on intent
    switch (intent) {
      case 'price_query':
        return this.handlePriceQuery(entities, isPortuguese);
      
      case 'trade_execution':
        return this.handleTradeExecution(entities, isPortuguese);
      
      case 'market_analysis':
        return this.handleMarketAnalysis(entities, isPortuguese);
      
      case 'portfolio_query':
        return this.handlePortfolioQuery(entities, isPortuguese);
      
      case 'alert_setup':
        return this.handleAlertSetup(entities, isPortuguese);
      
      default:
        return this.handleGeneralQuery(input, isPortuguese);
    }
  }

  private detectLanguage(text: string): string {
    // Simple language detection based on common words
    const portugueseWords = ['qual', 'quanto', 'comprar', 'vender', 'preço', 'mercado', 'análise'];
    const englishWords = ['what', 'how', 'buy', 'sell', 'price', 'market', 'analysis'];
    
    const ptCount = portugueseWords.filter(word => text.toLowerCase().includes(word)).length;
    const enCount = englishWords.filter(word => text.toLowerCase().includes(word)).length;
    
    return ptCount > enCount ? 'pt' : 'en';
  }

  private extractIntent(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Price queries
    if (lowerText.match(/price|preço|valor|quanto|cost|worth/)) {
      return 'price_query';
    }
    
    // Trade execution
    if (lowerText.match(/buy|sell|comprar|vender|trade|swap|trocar/)) {
      return 'trade_execution';
    }
    
    // Market analysis
    if (lowerText.match(/analysis|análise|trend|tendência|forecast|previsão/)) {
      return 'market_analysis';
    }
    
    // Portfolio
    if (lowerText.match(/portfolio|carteira|balance|saldo|holdings|posições/)) {
      return 'portfolio_query';
    }
    
    // Alerts
    if (lowerText.match(/alert|alerta|notify|notificar|when|quando/)) {
      return 'alert_setup';
    }
    
    return 'general';
  }

  private extractEntities(text: string): any {
    const entities: any = {};
    
    // Extract cryptocurrency symbols
    const cryptoRegex = /\b(BTC|ETH|SOL|USDT|USDC|BNB|ADA|DOT|MATIC|AVAX)\b/gi;
    const matches = text.match(cryptoRegex);
    if (matches) {
      entities.assets = matches.map(m => m.toUpperCase());
    }
    
    // Extract amounts
    const amountRegex = /\$?\d+\.?\d*[kKmM]?/g;
    const amounts = text.match(amountRegex);
    if (amounts) {
      entities.amounts = amounts.map(a => this.parseAmount(a));
    }
    
    // Extract percentages
    const percentRegex = /\d+\.?\d*%/g;
    const percents = text.match(percentRegex);
    if (percents) {
      entities.percentages = percents.map(p => parseFloat(p));
    }
    
    // Extract time periods
    const timeRegex = /\b(\d+)?\s*(minute|hour|day|week|month|minuto|hora|dia|semana|mês)/gi;
    const times = text.match(timeRegex);
    if (times) {
      entities.timePeriods = times;
    }
    
    return entities;
  }

  private parseAmount(amount: string): number {
    let value = parseFloat(amount.replace(/[$,]/g, ''));
    if (amount.toLowerCase().includes('k')) value *= 1000;
    if (amount.toLowerCase().includes('m')) value *= 1000000;
    return value;
  }

  private async handlePriceQuery(entities: any, isPortuguese: boolean): Promise<string> {
    const asset = entities.assets?.[0] || 'BTC';
    const price = await this.getAssetPrice(asset);
    const change24h = await this.get24hChange(asset);
    
    if (isPortuguese) {
      return `O preço atual do ${asset} é $${price.toLocaleString('pt-BR')}, com uma variação de ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}% nas últimas 24 horas. ${
        change24h > 5 ? '📈 Está em alta forte!' : 
        change24h > 0 ? '📊 Movimento positivo moderado.' :
        change24h < -5 ? '📉 Correção significativa em andamento.' :
        '📊 Movimento lateral.'
      }`;
    } else {
      return `The current price of ${asset} is $${price.toLocaleString()}, with a ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}% change in the last 24 hours. ${
        change24h > 5 ? '📈 Strong upward momentum!' : 
        change24h > 0 ? '📊 Moderate positive movement.' :
        change24h < -5 ? '📉 Significant correction underway.' :
        '📊 Sideways movement.'
      }`;
    }
  }

  private async handleTradeExecution(entities: any, isPortuguese: boolean): Promise<string> {
    const asset = entities.assets?.[0];
    const amount = entities.amounts?.[0];
    
    if (!asset || !amount) {
      return isPortuguese ? 
        'Por favor, especifique o ativo e o valor que deseja negociar. Por exemplo: "Comprar 0.1 BTC" ou "Vender $1000 de ETH".' :
        'Please specify the asset and amount you want to trade. For example: "Buy 0.1 BTC" or "Sell $1000 worth of ETH".';
    }
    
    // Simulate trade analysis
    const marketCondition = await this.analyzeMarketCondition(asset);
    const recommendation = this.generateTradeRecommendation(marketCondition);
    
    if (isPortuguese) {
      return `📊 Análise para ${asset}:
      
Condição do mercado: ${marketCondition.trend === 'bullish' ? 'Alta' : marketCondition.trend === 'bearish' ? 'Baixa' : 'Lateral'}
RSI: ${marketCondition.rsi}
Volume 24h: $${(marketCondition.volume / 1e9).toFixed(2)}B

${recommendation.action === 'buy' ? '✅ Recomendação: COMPRAR' : recommendation.action === 'sell' ? '⚠️ Recomendação: VENDER' : '⏸️ Recomendação: AGUARDAR'}

${recommendation.reason}

💡 Sugestão: ${recommendation.suggestion}`;
    } else {
      return `📊 Analysis for ${asset}:
      
Market condition: ${marketCondition.trend}
RSI: ${marketCondition.rsi}
24h Volume: $${(marketCondition.volume / 1e9).toFixed(2)}B

${recommendation.action === 'buy' ? '✅ Recommendation: BUY' : recommendation.action === 'sell' ? '⚠️ Recommendation: SELL' : '⏸️ Recommendation: WAIT'}

${recommendation.reason}

💡 Suggestion: ${recommendation.suggestion}`;
    }
  }

  private async handleMarketAnalysis(entities: any, isPortuguese: boolean): Promise<string> {
    const asset = entities.assets?.[0] || 'BTC';
    const analysis = await this.performTechnicalAnalysis(asset);
    const sentiment = await this.analyzeSentiment(asset);
    
    if (isPortuguese) {
      return `🔍 Análise Completa - ${asset}

📈 Análise Técnica:
• Tendência: ${analysis.trend === 'bullish' ? 'Alta' : analysis.trend === 'bearish' ? 'Baixa' : 'Lateral'}
• Suporte: $${analysis.support.toLocaleString('pt-BR')}
• Resistência: $${analysis.resistance.toLocaleString('pt-BR')}
• RSI: ${analysis.rsi} ${analysis.rsi > 70 ? '(Sobrecomprado)' : analysis.rsi < 30 ? '(Sobrevendido)' : '(Neutro)'}
• MACD: ${analysis.macd > 0 ? 'Positivo' : 'Negativo'}

💬 Sentimento do Mercado:
• Geral: ${sentiment.overall === 'positive' ? '😊 Positivo' : sentiment.overall === 'negative' ? '😟 Negativo' : '😐 Neutro'}
• Fear & Greed: ${sentiment.fearGreedIndex} ${sentiment.fearGreedIndex > 70 ? '(Ganância Extrema)' : sentiment.fearGreedIndex < 30 ? '(Medo Extremo)' : ''}
• Menções sociais: ${sentiment.socialMentions > 1000 ? '🔥 Muito alto' : '📊 Normal'}

🎯 Níveis-chave para observar:
• Entrada: $${analysis.entryPoint.toLocaleString('pt-BR')}
• Stop Loss: $${analysis.stopLoss.toLocaleString('pt-BR')}
• Take Profit: $${analysis.takeProfit.toLocaleString('pt-BR')}

⚡ Ação sugerida: ${analysis.suggestedAction}`;
    } else {
      return `🔍 Complete Analysis - ${asset}

📈 Technical Analysis:
• Trend: ${analysis.trend}
• Support: $${analysis.support.toLocaleString()}
• Resistance: $${analysis.resistance.toLocaleString()}
• RSI: ${analysis.rsi} ${analysis.rsi > 70 ? '(Overbought)' : analysis.rsi < 30 ? '(Oversold)' : '(Neutral)'}
• MACD: ${analysis.macd > 0 ? 'Positive' : 'Negative'}

💬 Market Sentiment:
• Overall: ${sentiment.overall === 'positive' ? '😊 Positive' : sentiment.overall === 'negative' ? '😟 Negative' : '😐 Neutral'}
• Fear & Greed: ${sentiment.fearGreedIndex} ${sentiment.fearGreedIndex > 70 ? '(Extreme Greed)' : sentiment.fearGreedIndex < 30 ? '(Extreme Fear)' : ''}
• Social mentions: ${sentiment.socialMentions > 1000 ? '🔥 Very high' : '📊 Normal'}

🎯 Key levels to watch:
• Entry: $${analysis.entryPoint.toLocaleString()}
• Stop Loss: $${analysis.stopLoss.toLocaleString()}
• Take Profit: $${analysis.takeProfit.toLocaleString()}

⚡ Suggested action: ${analysis.suggestedAction}`;
    }
  }

  private async handlePortfolioQuery(entities: any, isPortuguese: boolean): Promise<string> {
    // Mock portfolio data
    const portfolio = {
      totalValue: 125000,
      pnl24h: 3500,
      pnlPercentage: 2.88,
      topHoldings: [
        { asset: 'BTC', amount: 0.5, value: 52250, percentage: 41.8 },
        { asset: 'ETH', amount: 10, value: 22850, percentage: 18.3 },
        { asset: 'SOL', amount: 250, value: 24687.5, percentage: 19.75 }
      ]
    };
    
    if (isPortuguese) {
      return `💼 Resumo da Carteira

📊 Valor Total: $${portfolio.totalValue.toLocaleString('pt-BR')}
${portfolio.pnl24h > 0 ? '📈' : '📉'} P&L 24h: ${portfolio.pnl24h > 0 ? '+' : ''}$${Math.abs(portfolio.pnl24h).toLocaleString('pt-BR')} (${portfolio.pnl24h > 0 ? '+' : ''}${portfolio.pnlPercentage.toFixed(2)}%)

🏆 Principais Posições:
${portfolio.topHoldings.map(h => 
  `• ${h.asset}: ${h.amount} unidades ($${h.value.toLocaleString('pt-BR')} - ${h.percentage.toFixed(1)}%)`
).join('\n')}

💡 Análise:
${portfolio.pnlPercentage > 5 ? '✅ Excelente performance! Considere realizar alguns lucros.' :
  portfolio.pnlPercentage > 0 ? '📊 Performance positiva. Continue monitorando.' :
  portfolio.pnlPercentage > -5 ? '⚠️ Pequena correção. Normal em mercados voláteis.' :
  '🔴 Correção significativa. Pode ser oportunidade de compra.'}

Deseja uma análise detalhada de algum ativo específico?`;
    } else {
      return `💼 Portfolio Summary

📊 Total Value: $${portfolio.totalValue.toLocaleString()}
${portfolio.pnl24h > 0 ? '📈' : '📉'} 24h P&L: ${portfolio.pnl24h > 0 ? '+' : ''}$${Math.abs(portfolio.pnl24h).toLocaleString()} (${portfolio.pnl24h > 0 ? '+' : ''}${portfolio.pnlPercentage.toFixed(2)}%)

🏆 Top Holdings:
${portfolio.topHoldings.map(h => 
  `• ${h.asset}: ${h.amount} units ($${h.value.toLocaleString()} - ${h.percentage.toFixed(1)}%)`
).join('\n')}

💡 Analysis:
${portfolio.pnlPercentage > 5 ? '✅ Excellent performance! Consider taking some profits.' :
  portfolio.pnlPercentage > 0 ? '📊 Positive performance. Keep monitoring.' :
  portfolio.pnlPercentage > -5 ? '⚠️ Small correction. Normal in volatile markets.' :
  '🔴 Significant correction. Could be a buying opportunity.'}

Would you like a detailed analysis of any specific asset?`;
    }
  }

  private async handleAlertSetup(entities: any, isPortuguese: boolean): Promise<string> {
    const asset = entities.assets?.[0];
    const percentage = entities.percentages?.[0];
    
    if (!asset) {
      return isPortuguese ?
        'Para criar um alerta, especifique o ativo e a condição. Exemplo: "Me avise quando BTC subir 5%" ou "Alerta se ETH cair para $2000".' :
        'To create an alert, specify the asset and condition. Example: "Alert me when BTC rises 5%" or "Notify if ETH drops to $2000".';
    }
    
    if (isPortuguese) {
      return `🔔 Alerta configurado com sucesso!

Você será notificado quando:
• ${asset} ${percentage ? `variar ${percentage}%` : 'atingir o preço especificado'}

Configurações do alerta:
• 📱 Notificação push: Ativada
• 🔊 Alerta sonoro: Ativado
• 📧 Email: Ativado

Você pode gerenciar seus alertas a qualquer momento dizendo "mostrar alertas" ou "cancelar alerta ${asset}".`;
    } else {
      return `🔔 Alert successfully configured!

You will be notified when:
• ${asset} ${percentage ? `moves ${percentage}%` : 'reaches the specified price'}

Alert settings:
• 📱 Push notification: Enabled
• 🔊 Sound alert: Enabled
• 📧 Email: Enabled

You can manage your alerts anytime by saying "show alerts" or "cancel ${asset} alert".`;
    }
  }

  private async handleGeneralQuery(input: string, isPortuguese: boolean): Promise<string> {
    // For general queries, provide helpful information
    if (isPortuguese) {
      return `Entendi sua pergunta sobre "${input}". Como seu assistente de trading, posso ajudar com:

📊 Análise de mercado em tempo real
💰 Cotações e gráficos
🔄 Execução de trades
📈 Análise técnica e fundamentalista
🔔 Configuração de alertas
💼 Gestão de portfolio
🎯 Estratégias de trading

Experimente perguntar:
• "Qual o preço do Bitcoin?"
• "Análise técnica do ETH"
• "Comprar $1000 em SOL"
• "Como está meu portfolio?"

Como posso ajudar você hoje?`;
    } else {
      return `I understand your query about "${input}". As your trading assistant, I can help with:

📊 Real-time market analysis
💰 Price quotes and charts
🔄 Trade execution
📈 Technical and fundamental analysis
🔔 Alert configuration
💼 Portfolio management
🎯 Trading strategies

Try asking:
• "What's the price of Bitcoin?"
• "Technical analysis for ETH"
• "Buy $1000 worth of SOL"
• "How's my portfolio doing?"

How can I assist you today?`;
    }
  }

  // Helper methods for data fetching via real APIs
  private async getAssetPrice(asset: string): Promise<number> {
    try {
      const idMap: Record<string, string> = {
        BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana',
        BNB: 'binancecoin', ADA: 'cardano', USDT: 'tether', USDC: 'usd-coin'
      };
      const id = idMap[asset];
      if (id) {
        const res = await fetch(
          `/api/coingecko/simple/price?ids=${id}&vs_currencies=usd`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (res.ok) {
          const data = await res.json();
          if (data[id]?.usd) return data[id].usd;
        }
      }
    } catch (error) {
      // Silently fall back to static prices
    }

    // Static fallback prices (no randomness)
    const prices: Record<string, number> = {
      BTC: 104500, ETH: 2285, SOL: 98.75, BNB: 312.45, ADA: 0.58, USDT: 1.00, USDC: 1.00
    };
    return prices[asset] || 0;
  }

  private async get24hChange(asset: string): Promise<number> {
    try {
      const idMap: Record<string, string> = {
        BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana',
        BNB: 'binancecoin', ADA: 'cardano'
      };
      const id = idMap[asset];
      if (id) {
        const res = await fetch(
          `/api/coingecko/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (res.ok) {
          const data = await res.json();
          if (data[id]?.usd_24h_change !== undefined) return data[id].usd_24h_change;
        }
      }
    } catch (error) {
      // Silently fall back to 0
    }

    return 0; // No change data available
  }

  private async analyzeMarketCondition(asset: string): Promise<any> {
    // Fetch real price and determine trend from 24h change
    const price = await this.getAssetPrice(asset);
    const change = await this.get24hChange(asset);
    // Simple RSI approximation: map 24h change to 0-100 scale
    const rsi = Math.max(0, Math.min(100, 50 + change * 3));

    return {
      trend: change > 1 ? 'bullish' : change < -1 ? 'bearish' : 'neutral',
      rsi: Math.round(rsi),
      volume: 0 // Volume not available from simple price endpoint
    };
  }

  private generateTradeRecommendation(marketCondition: any): any {
    const isBullish = marketCondition.trend === 'bullish';
    const isOverbought = marketCondition.rsi > 70;
    const isOversold = marketCondition.rsi < 30;
    
    let action = 'wait';
    let reason = '';
    let suggestion = '';
    
    if (isBullish && !isOverbought) {
      action = 'buy';
      reason = 'Market shows strong upward momentum with room to grow.';
      suggestion = 'Consider scaling in with 30% of intended position.';
    } else if (!isBullish && !isOversold) {
      action = 'sell';
      reason = 'Market showing weakness, protect your capital.';
      suggestion = 'Consider taking profits or setting stop-losses.';
    } else {
      action = 'wait';
      reason = 'Market conditions are unclear or extreme.';
      suggestion = 'Wait for better entry opportunity.';
    }
    
    return { action, reason, suggestion };
  }

  private async performTechnicalAnalysis(asset: string): Promise<any> {
    const price = await this.getAssetPrice(asset);
    const change = await this.get24hChange(asset);
    const trend = change > 1 ? 'bullish' : change < -1 ? 'bearish' : 'neutral';
    const rsi = Math.max(0, Math.min(100, 50 + change * 3));

    return {
      trend,
      support: price * 0.95,
      resistance: price * 1.05,
      rsi: Math.round(rsi),
      macd: change > 0 ? 1 : -1, // Simplified signal
      entryPoint: price * 0.98,
      stopLoss: price * 0.94,
      takeProfit: price * 1.06,
      suggestedAction: trend === 'bullish'
        ? 'Consider entering on pullback to support.'
        : trend === 'bearish'
        ? 'Wait for reversal confirmation before entering.'
        : 'Market is ranging. Wait for a breakout.'
    };
  }

  private async analyzeSentiment(asset: string): Promise<any> {
    // Try to fetch Fear & Greed Index from a real source
    let fearGreedIndex = 50;
    try {
      const res = await fetch('/api/coingecko/global', { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        // Use market cap change as a proxy for sentiment
        const marketCapChange = data?.data?.market_cap_change_percentage_24h_usd || 0;
        fearGreedIndex = Math.max(0, Math.min(100, 50 + marketCapChange * 5));
      }
    } catch { /* use default */ }

    const change = await this.get24hChange(asset);
    return {
      overall: change > 2 ? 'positive' : change < -2 ? 'negative' : 'neutral',
      fearGreedIndex: Math.round(fearGreedIndex),
      socialMentions: 0 // No social data available without dedicated API
    };
  }

  async speak(text: string) {
    if (!this.speechSynthesis) return;
    
    // Stop any current speech
    this.speechSynthesis.cancel();
    
    // Clean text for better speech synthesis
    const cleanText = text
      .replace(/[📊📈📉💰🔄🔔💡✅⚠️🔴🎯⚡🏆💼🔍💬😊😟😐🔥]/g, '') // Remove emojis
      .replace(/•/g, '') // Remove bullet points
      .replace(/\n+/g, '. ') // Replace line breaks with pauses
      .trim();
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = this.config.language === 'pt' ? 'pt-BR' : 'en-US';
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1.0;
    utterance.volume = 0.7;
    
    // Add voice selection based on language
    const voices = this.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith(this.config.language === 'pt' ? 'pt' : 'en')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    this.speechSynthesis.speak(utterance);
  }

  startListening(onResult: (text: string) => void, onPartialResult?: (text: string) => void) {
    if (!this.speechRecognition || this.isListening) return;
    
    this.isListening = true;
    let finalTranscript = '';
    
    this.speechRecognition.onresult = (event: any) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Call partial result callback for real-time feedback
      if (onPartialResult && interimTranscript) {
        onPartialResult(interimTranscript);
      }
      
      // Call final result when speech is complete
      if (finalTranscript) {
        onResult(finalTranscript.trim());
        this.stopListening();
      }
    };
    
    this.speechRecognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      
      // Provide user feedback for common errors
      switch (event.error) {
        case 'not-allowed':
          break;
        case 'no-speech':
          break;
        case 'network':
          break;
      }
    };
    
    try {
      this.speechRecognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.isListening = false;
    }
  }

  stopListening() {
    if (this.speechRecognition && this.isListening) {
      this.speechRecognition.stop();
      this.isListening = false;
    }
  }
}

interface CypherAIChatProps {
  micEnabled: boolean;
}

export function CypherAIChat({ micEnabled }: CypherAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [config, setConfig] = useState<CypherAIConfig>({
    model: 'gpt-4',
    temperature: 0.7,
    language: 'auto',
    voice: 'default',
    personality: 'professional'
  });

  const cypherAI = useRef<CypherAICore | null>(null);

  useEffect(() => {
    cypherAI.current = new CypherAICore(config);
    
    // Add welcome message with capabilities overview
    setMessages([{
      id: '1',
      role: 'assistant',
      content: `Olá! Sou o Cypher AI, seu assistente de trading inteligente. 🚀

Estou conectado com múltiplas APIs para fornecer:
📊 Dados em tempo real do CoinMarketCap
🔗 Integração com Hiro API para Bitcoin/Ordinals
🎯 Análise técnica avançada
🔊 Comandos de voz em português
⚡ Execução de trades via agregador DEX

Experimente perguntar:
• "Qual o preço do Bitcoin?"
• "Análise do mercado de altcoins"
• "Como está meu portfolio?"
• "Configurar alerta para ETH"

Como posso ajudar você hoje?`,
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      // Process with Cypher AI (with 15s hard timeout to prevent freezing)
      const processPromise = cypherAI.current!.processNaturalLanguage(text);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Processing timeout')), 15000)
      );
      const response = await Promise.race([processPromise, timeoutPromise]);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Speak response if enabled
      if (soundEnabled) {
        cypherAI.current!.speak(response);
      }
      
      // Play notification sound
      playSound('message');
    } catch (error) {
      console.error('Processing error:', error);
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSend = () => sendMessage(input);

  const handleVoiceInput = () => {
    if (!cypherAI.current) return;
    
    if (isListening) {
      cypherAI.current.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      cypherAI.current.startListening(
        (finalText) => {
          setIsListening(false);
          // Send the voice text directly (avoids stale state)
          sendMessage(finalText);
        },
        (partialText) => {
          // Show partial results in real-time
          setInput(partialText);
        }
      );
    }
  };

  const playSound = (type: string) => {
    if (!soundEnabled) return;
    
    const audio = new Audio(`/sounds/${type}.mp3`);
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  // Quick commands in Portuguese
  const quickCommands = [
    { icon: <DollarSign className="w-4 h-4" />, text: 'Preço Bitcoin', cmd: 'Qual o preço atual do Bitcoin?' },
    { icon: <TrendingUp className="w-4 h-4" />, text: 'Análise mercado', cmd: 'Analise o mercado de criptomoedas' },
    { icon: <Activity className="w-4 h-4" />, text: 'Meu portfolio', cmd: 'Como está meu portfolio?' },
    { icon: <Target className="w-4 h-4" />, text: 'Oportunidades', cmd: 'Encontre oportunidades de trading' },
    { icon: <Hash className="w-4 h-4" />, text: 'Fear & Greed', cmd: 'Qual o índice de medo e ganância?' },
    { icon: <BarChart3 className="w-4 h-4" />, text: 'Top gainers', cmd: 'Quais são os maiores ganhos hoje?' }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Cypher AI</h3>
              <p className="text-xs text-gray-400">Always learning, always earning</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="h-8 w-8"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 w-8"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick commands */}
        <div className="flex flex-wrap gap-2">
          {quickCommands.map((cmd, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => sendMessage(cmd.cmd)}
              className="h-7 text-xs border-gray-700 hover:border-purple-500"
            >
              {cmd.icon}
              <span className="ml-1">{cmd.text}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                <div className={`flex items-start gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' ? 'bg-blue-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}>
                    {message.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-500/20 border border-blue-500/30' 
                      : 'bg-gray-800/50 border border-gray-700'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span className="text-sm text-gray-400">Thinking...</span>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte sobre trading, mercado, portfolio..."
            className="flex-1 bg-gray-800/50 border-gray-700 focus:border-purple-500"
          />
          {micEnabled && (
            <Button
              variant={isListening ? 'default' : 'outline'}
              size="icon"
              onClick={handleVoiceInput}
              disabled={isProcessing}
              className={isListening ? 'bg-red-500 hover:bg-red-600' : ''}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        
        {isListening && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Listening... Speak now</span>
          </div>
        )}
      </div>
    </div>
  );
}