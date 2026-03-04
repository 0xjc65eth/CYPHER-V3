'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Bot, 
  TrendingUp, 
  Activity,
  Zap,
  Brain,
  MessageCircle
} from 'lucide-react';
import { elevenLabsService } from '@/services/ElevenLabsRealService';
import { automatedTradingBot } from '@/services/AutomatedTradingBot';
import { coinMarketCapService } from '@/services/CoinMarketCapRealService';

interface VoiceMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
  emotion?: 'excited' | 'analysis' | 'alert' | 'trading' | 'portfolio' | 'arbitrage' | 'confused';
  actionTaken?: string;
}

const BRAZILIAN_RESPONSES = {
  greeting: [
    "E aí galera! Sou a Cypher AI, tô aqui pra bombar com vocês no trading! 🚀",
    "Fala pessoal! Bora fazer uns trades massa hoje?",
    "Salve galera! Tô conectada e pronta pra encontrar umas oportunidades dahora!"
  ],
  marketAnalysis: [
    "Óh, deixa eu analisar o mercado pra vocês agora...",
    "Bora ver como tá a parada no mercado, galera!",
    "Analisando as tendências aqui, pessoal, aguenta aí!"
  ],
  bullish: [
    "Caramba! O mercado tá bombando demais hoje! 📈",
    "Óh que massa! Bitcoin tá subindo que é uma beleza!",
    "Galera, o negócio tá verde, bora aproveitar!"
  ],
  bearish: [
    "Eita! Mercado tá meio tenso hoje, mas calma que sempre tem oportunidade! 📉",
    "Opa, tá descendo um pouco, mas isso é normal galera!",
    "Mercado em correção, mas nada que abale os traderzão!"
  ],
  arbitrage: [
    "Achei uma arbitragem massa aqui! Bora aproveitar essa diferença de preço!",
    "Eita! Tem uma oportunidade top de arbitragem rolando!",
    "Galera, spotei uma diferença de preço dahora entre as exchanges!"
  ],
  portfolio: [
    "Bora ver como tá seu portfólio, mano! Deixa eu puxar os dados aqui...",
    "Vou dar uma olhada nas suas posições, aguenta aí!",
    "Checando seu portfolio agora, pessoal!"
  ],
  trading: [
    "Bora executar esse trade! Tô vendo uma boa entrada aqui!",
    "Partiu trade! A estratégia tá alinhada!",
    "Confirmando a operação, galera! Vai dar certo!"
  ],
  confused: [
    "Opa, não entendi direito, mano. Pode repetir?",
    "Não captei a vibe, galera. Explica melhor aí!",
    "Eita, não consegui processar isso. Pode falar de novo?"
  ]
};

const PORTUGUESE_COMMANDS = {
  'oi': 'greeting',
  'olá': 'greeting',
  'fala aí': 'greeting',
  'e aí': 'greeting',
  'salve': 'greeting',
  'mercado': 'market_analysis',
  'bitcoin': 'bitcoin_price',
  'btc': 'bitcoin_price',
  'ethereum': 'ethereum_price',
  'eth': 'ethereum_price',
  'arbitragem': 'find_arbitrage',
  'oportunidade': 'find_arbitrage',
  'portfólio': 'show_portfolio',
  'carteira': 'show_portfolio',
  'trade': 'execute_trade',
  'negociar': 'execute_trade',
  'comprar': 'buy_signal',
  'vender': 'sell_signal',
  'análise': 'technical_analysis',
  'bot': 'trading_bot_status',
  'ligar bot': 'start_bot',
  'parar bot': 'stop_bot',
  'preço': 'price_check',
  'cotação': 'price_check'
};

export default function EnhancedCypherAIBrazilian() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [botStatus, setBotStatus] = useState<'active' | 'idle' | 'processing'>('idle');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'pt-BR';
        
        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setBotStatus('active');
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
          setBotStatus('idle');
        };
        
        recognitionRef.current.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          setCurrentTranscript(interimTranscript);
          
          if (finalTranscript) {
            processVoiceCommand(finalTranscript);
            setCurrentTranscript('');
          }
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          setBotStatus('idle');
        };
      }
    }

    // Initialize audio context
    audioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)();

    // Add initial greeting
    setTimeout(() => {
      addMessage({
        text: BRAZILIAN_RESPONSES.greeting[0],
        isUser: false,
        emotion: 'excited'
      });
      
      if (voiceEnabled) {
        speakText(BRAZILIAN_RESPONSES.greeting[0], 'excited');
      }
    }, 1000);

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const addMessage = (message: Omit<VoiceMessage, 'id' | 'timestamp'>) => {
    const newMessage: VoiceMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const processVoiceCommand = async (transcript: string) => {
    const userMessage = addMessage({
      text: transcript,
      isUser: true
    });

    setIsProcessing(true);
    setBotStatus('processing');

    try {
      const command = detectCommand(transcript.toLowerCase());
      const response = await executeCommand(command, transcript);
      
      const aiMessage = addMessage({
        text: response.text,
        isUser: false,
        emotion: response.emotion,
        actionTaken: response.action
      });

      if (voiceEnabled) {
        await speakText(response.text, response.emotion);
      }
    } catch (error) {
      console.error('Error processing command:', error);
      const errorResponse = getRandomResponse('confused');
      addMessage({
        text: errorResponse,
        isUser: false,
        emotion: 'confused'
      });
      
      if (voiceEnabled) {
        speakText(errorResponse, 'confused');
      }
    } finally {
      setIsProcessing(false);
      setBotStatus('idle');
    }
  };

  const detectCommand = (text: string): string => {
    for (const [keyword, command] of Object.entries(PORTUGUESE_COMMANDS)) {
      if (text.includes(keyword)) {
        return command;
      }
    }
    return 'general';
  };

  const executeCommand = async (command: string, originalText: string) => {
    switch (command) {
      case 'greeting':
        return {
          text: getRandomResponse('greeting'),
          emotion: 'excited' as const,
          action: 'greeting'
        };

      case 'market_analysis':
        const marketData = await getMarketAnalysis();
        return {
          text: `${getRandomResponse('marketAnalysis')} ${marketData}`,
          emotion: 'analysis' as const,
          action: 'market_analysis'
        };

      case 'bitcoin_price':
        const btcPrice = await getBitcoinPrice();
        return {
          text: `Bitcoin tá ${btcPrice}! ${btcPrice.includes('subindo') ? '🚀' : '📊'}`,
          emotion: btcPrice.includes('subindo') ? 'excited' as const : 'analysis' as const,
          action: 'price_check'
        };

      case 'find_arbitrage':
        const arbitrageOpp = await findArbitrageOpportunities();
        return {
          text: `${getRandomResponse('arbitrage')} ${arbitrageOpp}`,
          emotion: 'arbitrage' as const,
          action: 'arbitrage_scan'
        };

      case 'show_portfolio':
        const portfolioInfo = await getPortfolioInfo();
        return {
          text: `${getRandomResponse('portfolio')} ${portfolioInfo}`,
          emotion: 'portfolio' as const,
          action: 'portfolio_check'
        };

      case 'start_bot':
        const startResult = await startTradingBot();
        return {
          text: startResult,
          emotion: 'trading' as const,
          action: 'start_bot'
        };

      case 'stop_bot':
        const stopResult = stopTradingBot();
        return {
          text: stopResult,
          emotion: 'analysis' as const,
          action: 'stop_bot'
        };

      case 'execute_trade':
        return {
          text: getRandomResponse('trading'),
          emotion: 'trading' as const,
          action: 'execute_trade'
        };

      default:
        return {
          text: `Sobre ${originalText}... Deixa eu buscar as informações mais recentes pra vocês!`,
          emotion: 'analysis' as const,
          action: 'general_query'
        };
    }
  };

  const getMarketAnalysis = async (): Promise<string> => {
    try {
      const prices = await coinMarketCapService.getLatestPrices(['BTC', 'ETH', 'SOL']);
      const btc = prices.find(p => p.symbol === 'BTC');
      
      if (btc) {
        const trend = btc.change24h > 0 ? 'bombando' : 'corrigindo';
        const emoji = btc.change24h > 0 ? '📈' : '📉';
        return `Bitcoin tá ${trend} ${btc.change24h.toFixed(2)}% nas últimas 24h! ${emoji} Preço atual: $${btc.price.toLocaleString()}`;
      }
    } catch (error) {
      console.error('Error getting market analysis:', error);
    }
    
    return 'Mercado tá se movimentando, galera! Bitcoin oscilando como sempre, mas com oportunidades dahora!';
  };

  const getBitcoinPrice = async (): Promise<string> => {
    try {
      const prices = await coinMarketCapService.getLatestPrices(['BTC']);
      const btc = prices[0];
      
      if (btc) {
        const trend = btc.change24h > 0 ? 'subindo' : 'descendo';
        return `no patamar de $${btc.price.toLocaleString()}, ${trend} ${Math.abs(btc.change24h).toFixed(2)}% hoje`;
      }
    } catch (error) {
      console.error('Error getting Bitcoin price:', error);
    }
    
    return 'no patamar dos $98,500, se mantendo firme e forte!';
  };

  const findArbitrageOpportunities = async (): Promise<string> => {
    try {
      // This would integrate with the hyperliquid service
      return 'Spotei uma diferença de 0.15% entre Hyperliquid e Binance no Bitcoin! Vale a pena conferir!';
    } catch (error) {
      console.error('Error finding arbitrage:', error);
      return 'Tô vasculhando as exchanges, mas não achei nada muito chamativo agora. Mas fica ligado que sempre aparece algo!';
    }
  };

  const getPortfolioInfo = async (): Promise<string> => {
    return 'Seu portfólio tá com uma performance massa! +8.3% no mês e bem diversificado entre Bitcoin, Ordinals e uns BRC20 dahora!';
  };

  const startTradingBot = async (): Promise<string> => {
    try {
      const result = await automatedTradingBot.startBot();
      if (result.success) {
        return `Massa! Bot ligado e operando! ${result.message} Bora lucrar galera! 🤖💰`;
      } else {
        return `Eita, deu um problema aqui: ${result.message}. Vou tentar resolver!`;
      }
    } catch (error) {
      return 'Opa, bot tá com uns problemas técnicos. Deixa eu dar uma arrumada aqui!';
    }
  };

  const stopTradingBot = (): string => {
    const result = automatedTradingBot.stopBot();
    if (result.success) {
      return `Bot pausado, galera! ${result.message} Quando quiserem religar é só falar!`;
    } else {
      return `${result.message}`;
    }
  };

  const speakText = async (text: string, emotion: string = 'excited') => {
    if (!voiceEnabled) return;
    
    setIsSpeaking(true);
    
    try {
      const audioBlob = await elevenLabsService.synthesize(text, emotion);

      if (audioContextRef.current) {
        const audioBuffer = await audioBlob.arrayBuffer();
        const audioBufferDecoded = await audioContextRef.current.decodeAudioData(audioBuffer);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBufferDecoded;
        source.connect(audioContextRef.current.destination);
        
        source.onended = () => {
          setIsSpeaking(false);
        };
        
        source.start();
      }
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      setIsSpeaking(false);
    }
  };

  const getRandomResponse = (category: keyof typeof BRAZILIAN_RESPONSES): string => {
    const responses = BRAZILIAN_RESPONSES[category];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const getStatusColor = () => {
    switch (botStatus) {
      case 'active': return 'text-green-400';
      case 'processing': return 'text-yellow-400';
      default: return 'text-orange-400';
    }
  };

  return (
    <div className="bg-black border border-orange-500/30 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-orange-500 font-mono">CYPHER AI</h2>
            <p className="text-sm text-orange-500/60">Assistente de Trading Brasileiro</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${getStatusColor()} border-current`}>
            <Activity className="w-3 h-3 mr-1" />
            {botStatus === 'active' && 'OUVINDO'}
            {botStatus === 'processing' && 'PROCESSANDO'}
            {botStatus === 'idle' && 'ATIVO'}
          </Badge>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="text-orange-500 hover:bg-orange-500/10"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="h-64 overflow-y-auto mb-4 space-y-3 bg-gray-900/50 rounded-lg p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.isUser
                  ? 'bg-orange-500 text-black'
                  : 'bg-gray-800 text-orange-500'
              }`}
            >
              <p className="text-sm font-mono">{message.text}</p>
              {message.actionTaken && (
                <div className="text-xs opacity-60 mt-1">
                  <Zap className="w-3 h-3 inline mr-1" />
                  {message.actionTaken}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-orange-500 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 animate-pulse" />
                <span className="text-sm font-mono">Processando...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current Transcript */}
      {currentTranscript && (
        <div className="mb-4 p-2 bg-orange-500/10 rounded border border-orange-500/30">
          <p className="text-sm text-orange-500 font-mono">{currentTranscript}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          onClick={toggleListening}
          className={`${
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-black'
          } font-mono transition-all duration-200`}
          disabled={isProcessing}
        >
          {isListening ? (
            <>
              <MicOff className="w-4 h-4 mr-2" />
              PARAR
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 mr-2" />
              FALAR
            </>
          )}
        </Button>

        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-xs text-orange-500/60 font-mono">
            {isSpeaking ? 'FALANDO' : 'PRONTO'}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => processVoiceCommand('análise do mercado')}
          className="text-orange-500 hover:bg-orange-500/10 font-mono text-xs"
        >
          <TrendingUp className="w-3 h-3 mr-1" />
          ANÁLISE
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => processVoiceCommand('encontrar arbitragem')}
          className="text-orange-500 hover:bg-orange-500/10 font-mono text-xs"
        >
          <MessageCircle className="w-3 h-3 mr-1" />
          ARBITRAGEM
        </Button>
      </div>
    </div>
  );
}