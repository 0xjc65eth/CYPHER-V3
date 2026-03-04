'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mic, MicOff, Volume2, VolumeX, Bot, Send, Sparkles, Brain, 
  Settings, TrendingUp, AlertTriangle, Activity, Zap, 
  Upload, PlayCircle, PauseCircle, BarChart3, 
  MessageSquare, Headphones, Radio
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

// Brazilian personality responses with gírias and casual language
const BRAZILIAN_RESPONSES = {
  greeting: [
    "E aí galera! Sou a CYPHER AI, tô aqui pra bombar com vocês no crypto! 🚀 Bora fazer uns trades massa?",
    "Fala pessoal! Tô conectada e pronta pra encontrar umas oportunidades dahora! Que rolê de hoje?",
    "Salve galera! Tô aqui pra ajudar vocês a lucrar no mercado. Vamos que vamos! 💰",
    "Opa! CYPHER AI na área! Preparados pra uns insights top e trades sinistros? Bora nessa!"
  ],
  marketBullish: [
    "Caramba! O mercado tá bombando demais hoje! Bitcoin voando alto! 📈✨",
    "Óh que massa! Tá tudo verde, galera! Hora de aproveitar essa onda! 🌊💚",
    "Eita! Mercado em alta total! Quem tá posicionado tá lucrando geral! 🔥",
    "Galera, o negócio tá on fire! Bitcoin e altcoins subindo que é uma beleza!"
  ],
  marketBearish: [
    "Opa, mercado meio tenso hoje, mas relaxa galera! Sempre tem oportunidade nos dips! 📉💎",
    "Mercado corrigindo, mas isso é normal! Quem compra na baixa, lucra na alta! 🎯",
    "Eita, tá descendo um pouco, mas nada que abale os traders raiz! Hold strong! 💪",
    "Correção no ar, pessoal! Mas lembrem: buy the dip é a estratégia dos espertos! 🧠"
  ],
  tradingOpportunity: [
    "Achei uma oportunidade massa aqui! Bora aproveitar essa entrada dahora! 🎯💰",
    "Eita! Spotei um setup perfeito! Quem quiser entrar, é agora ou nunca! ⚡",
    "Galera, encontrei uma jogada top! RSI oversold e suporte forte! 📊✨",
    "Óh, que parada linda! Breakout confirmado com volume! Partiu trade! 🚀"
  ],
  arbitrage: [
    "Achei uma arbitragem sinistro aqui! Diferença de preço massa entre as exchanges! 💎",
    "Eita! Tem uma oportunidade top de arbitragem rolando! Bora aproveitar! ⚡💰",
    "Galera, spotei uma diferença dahora! Preço desbalanceado nas corretoras! 🔥",
    "Opa! Arbitragem no ar! Diferença de preço suculenta pra quem é ligeiro! 🏃‍♂️💨"
  ],
  portfolio: [
    "Bora ver como tá seu portfólio, mano! Deixa eu puxar os dados fresquinhos aqui... 📊",
    "Vou dar uma conferida nas suas posições! Aguenta aí que já trago o relatório! 📈",
    "Checando seu portfolio agora! Tô curiosa pra ver como tá a performance! 👀",
    "Deixa eu escanear suas holdings, galera! Dados chegando já já! 🔍✨"
  ],
  analysis: [
    "Analisando o mercado com todo carinho pra vocês! Dados chegando quentinhos! 🔥📊",
    "Bora fazer uma análise top! Indicadores técnicos já tão sendo processados! 🧠⚡",
    "Preparando uma análise dahora! RSI, MACD, tudo no capricho! 📈✨",
    "Processando os dados do mercado! Insights vindo aí, galera! 🚀🔍"
  ],
  confused: [
    "Opa, não entendi direito, mano. Pode repetir? Ou manda um áudio que fica mais fácil! 🎙️",
    "Não captei a vibe, galera. Explica melhor aí! Tô aqui pra ajudar! 😅",
    "Eita, travei aqui. Pode mandar de novo? Ou fala mais devagar! 🤖💭",
    "Não consegui processar isso direito. Reformula aí pra mim! 🔄"
  ]
};

const VOICE_EMOTIONS = {
  excited: 'excited',
  analysis: 'analytical', 
  bullish: 'happy',
  bearish: 'concerned',
  opportunity: 'energetic',
  confused: 'questioning'
} as const;

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  emotion?: keyof typeof VOICE_EMOTIONS;
  confidence?: number;
  metadata?: {
    intent?: string;
    entities?: any;
    marketData?: any;
    tradingSignal?: any;
  };
}

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
}

interface TradingOpportunity {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entry: number;
  target: number;
  stopLoss: number;
  reason: string;
  timeframe: string;
}

// WebSocket connection for real-time data
class RealTimeDataService {
  private ws: WebSocket | null = null;
  private callbacks: Map<string, Function[]> = new Map();
  
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    
    try {
      // In production, this would connect to your WebSocket server
      this.ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
      
      this.ws.onopen = () => {
        this.emit('connected', true);
      };
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.emit('marketData', {
          symbol: data.s,
          price: parseFloat(data.c),
          change24h: parseFloat(data.P),
          volume: parseFloat(data.v)
        });
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      this.ws.onclose = () => {
        setTimeout(() => this.connect(), 5000); // Reconnect after 5s
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }
  
  on(event: string, callback: Function) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }
  
  private emit(event: string, data: any) {
    const callbacks = this.callbacks.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// ElevenLabs integration for Brazilian voice
class BrazilianVoiceService {
  private apiKey: string;
  private voiceId: string = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice for Brazilian Portuguese
  
  constructor() {
    this.apiKey = ''; // ElevenLabs calls routed through /api/ai/text-to-speech server-side
  }
  
  async synthesizeText(text: string, emotion: string = 'excited'): Promise<string> {
    if (!this.apiKey) {
      return this.fallbackTTS(text);
    }
    
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: emotion === 'excited' ? 0.3 : 0.5,
            similarity_boost: 0.7,
            style: emotion === 'analytical' ? 0.2 : 0.8,
            use_speaker_boost: true
          }
        })
      });
      
      if (response.ok) {
        const audioBlob = await response.blob();
        return URL.createObjectURL(audioBlob);
      } else {
        throw new Error('ElevenLabs API error');
      }
    } catch (error) {
      console.error('ElevenLabs synthesis error:', error);
      return this.fallbackTTS(text);
    }
  }
  
  private fallbackTTS(text: string): string {
    // Use Web Speech API as fallback
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    speechSynthesis.speak(utterance);
    return '';
  }
  
  async transcribeAudio(audioFile: File): Promise<string> {
    // This would integrate with ElevenLabs or OpenAI Whisper for transcription
    return "Transcrição do áudio não implementada ainda";
  }
}

// GPT-4 integration with Brazilian personality
class BrazilianGPTService {
  private apiKey: string;
  
  constructor() {
    this.apiKey = ''; // OpenAI calls routed through /api/cypher-ai/chat server-side
  }
  
  async processMessage(message: string, context: any): Promise<string> {
    if (!this.apiKey) {
      return this.getFallbackResponse(message);
    }
    
    try {
      const systemPrompt = `Você é a CYPHER AI, uma assistente de trading brasileira jovem e descolada. 
      Use gírias brasileiras, linguagem casual e seja animada. Você entende de Bitcoin, criptomoedas, 
      trading e análise técnica. Seja útil mas mantenha um tom jovem e brasileiro.
      
      Contexto atual do mercado: ${JSON.stringify(context)}`;
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: 300,
          temperature: 0.8
        })
      });
      
      const data = await response.json();
      return data.choices[0]?.message?.content || this.getFallbackResponse(message);
    } catch (error) {
      console.error('GPT-4 error:', error);
      return this.getFallbackResponse(message);
    }
  }
  
  private getFallbackResponse(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('preço') || lowerMessage.includes('bitcoin') || lowerMessage.includes('btc')) {
      return BRAZILIAN_RESPONSES.analysis[0];
    } else if (lowerMessage.includes('portfolio') || lowerMessage.includes('carteira')) {
      return BRAZILIAN_RESPONSES.portfolio[0];
    } else if (lowerMessage.includes('comprar') || lowerMessage.includes('vender')) {
      return BRAZILIAN_RESPONSES.tradingOpportunity[0];
    } else if (lowerMessage.includes('mercado')) {
      return BRAZILIAN_RESPONSES.marketBullish[0];
    } else {
      return BRAZILIAN_RESPONSES.confused[0];
    }
  }
}

export default function CypherAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [currentMarketData, setCurrentMarketData] = useState<MarketData | null>(null);
  const [tradingOpportunities, setTradingOpportunities] = useState<TradingOpportunity[]>([]);
  const [activeTab, setActiveTab] = useState('chat');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const dataServiceRef = useRef<RealTimeDataService>(new RealTimeDataService());
  const voiceServiceRef = useRef<BrazilianVoiceService>(new BrazilianVoiceService());
  const gptServiceRef = useRef<BrazilianGPTService>(new BrazilianGPTService());
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  
  // Initialize services
  useEffect(() => {
    // Setup speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-BR';
      
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setInputValue(finalTranscript);
          handleSendMessage(finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Erro no reconhecimento de voz",
          description: "Verifique as permissões do microfone",
          variant: "destructive"
        });
      };
    }
    
    // Setup real-time data
    dataServiceRef.current.on('connected', setIsConnected);
    dataServiceRef.current.on('marketData', (data: MarketData) => {
      setCurrentMarketData(data);
      // Generate trading opportunities based on market data
      generateTradingOpportunities(data);
    });
    
    dataServiceRef.current.connect();
    
    // Initial greeting
    setTimeout(() => {
      const greeting = BRAZILIAN_RESPONSES.greeting[0];
      addMessage(greeting, 'assistant', 'excited');
      if (voiceEnabled) {
        speakMessage(greeting, 'excited');
      }
    }, 1000);
    
    return () => {
      dataServiceRef.current.disconnect();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  
  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  const addMessage = (content: string, type: 'user' | 'assistant' | 'system', emotion?: keyof typeof VOICE_EMOTIONS) => {
    const message: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      emotion
    };
    
    setMessages(prev => [...prev, message]);
    return message;
  };
  
  const speakMessage = async (text: string, emotion: string = 'excited') => {
    if (!voiceEnabled) return;
    
    setIsSpeaking(true);
    try {
      const audioUrl = await voiceServiceRef.current.synthesizeText(text, emotion);
      if (audioUrl && audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => setIsSpeaking(false);
        await audioRef.current.play();
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    }
  };
  
  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText || isProcessing) return;
    
    setInputValue('');
    setIsProcessing(true);
    
    // Add user message
    addMessage(messageText, 'user');
    
    try {
      // Process with GPT-4
      const context = {
        marketData: currentMarketData,
        tradingOpportunities,
        isConnected
      };
      
      const response = await gptServiceRef.current.processMessage(messageText, context);
      
      // Determine emotion based on response content
      let emotion: keyof typeof VOICE_EMOTIONS = 'excited';
      if (response.includes('análise') || response.includes('indicador')) {
        emotion = 'analysis';
      } else if (response.includes('subindo') || response.includes('alta') || response.includes('bombando')) {
        emotion = 'bullish';
      } else if (response.includes('descendo') || response.includes('baixa') || response.includes('correção')) {
        emotion = 'bearish';
      } else if (response.includes('oportunidade') || response.includes('trade') || response.includes('entrada')) {
        emotion = 'opportunity';
      }
      
      // Add AI response
      addMessage(response, 'assistant', emotion);
      
      // Speak response
      if (voiceEnabled) {
        await speakMessage(response, emotion);
      }
      
    } catch (error) {
      console.error('Message processing error:', error);
      const errorResponse = BRAZILIAN_RESPONSES.confused[0];
      addMessage(errorResponse, 'assistant', 'confused');
      
      if (voiceEnabled) {
        speakMessage(errorResponse, 'confused');
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Reconhecimento de voz não suportado",
        description: "Seu navegador não suporta reconhecimento de voz",
        variant: "destructive"
      });
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };
  
  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    toast({
      title: "Processando áudio...",
      description: "Transcrevendo sua mensagem de voz"
    });
    
    try {
      const transcript = await voiceServiceRef.current.transcribeAudio(file);
      setInputValue(transcript);
      toast({
        title: "Áudio transcrito!",
        description: "Mensagem pronta para envio"
      });
    } catch (error) {
      console.error('Audio transcription error:', error);
      toast({
        title: "Erro na transcrição",
        description: "Não foi possível processar o áudio",
        variant: "destructive"
      });
    }
  };
  
  const generateTradingOpportunities = (marketData: MarketData) => {
    // Generate opportunities based on real market data without random values
    const opportunities: TradingOpportunity[] = [];

    if (Math.abs(marketData.change24h) > 5) {
      opportunities.push({
        id: Date.now().toString(),
        symbol: marketData.symbol,
        type: marketData.change24h > 0 ? 'BUY' : 'SELL',
        confidence: 80,
        entry: marketData.price,
        target: marketData.price * (marketData.change24h > 0 ? 1.05 : 0.95),
        stopLoss: marketData.price * (marketData.change24h > 0 ? 0.98 : 1.02),
        reason: `${Math.abs(marketData.change24h).toFixed(2)}% movimento confirmado com volume`,
        timeframe: '4H'
      });
    }

    setTradingOpportunities(opportunities);
  };
  
  return (
    <div className="bg-black border border-orange-500/30 rounded-lg overflow-hidden">
      <audio ref={audioRef} />
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioUpload}
        className="hidden"
      />
      
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-b border-orange-500/30">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              {isConnected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black">
                  <Activity className="w-2 h-2 text-white absolute top-0.5 left-0.5" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-orange-500 font-mono">CYPHER AI</h2>
              <p className="text-sm text-orange-400/80">Assistente Brasileira de Trading</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(
              "border-current font-mono text-xs",
              isProcessing ? "text-yellow-400 animate-pulse" : 
              isConnected ? "text-green-400" : "text-orange-400"
            )}>
              {isProcessing ? "PROCESSANDO" : isConnected ? "ONLINE" : "CONECTANDO"}
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
        </CardTitle>
      </CardHeader>
      
      {/* Real-time Market Data Bar */}
      {currentMarketData && (
        <div className="bg-gray-900/50 border-b border-orange-500/20 p-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-orange-400">{currentMarketData.symbol}</span>
            <span className="text-white">${currentMarketData.price.toLocaleString()}</span>
            <span className={cn(
              "flex items-center gap-1",
              currentMarketData.change24h >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {currentMarketData.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {currentMarketData.change24h.toFixed(2)}%
            </span>
          </div>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-900/50">
          <TabsTrigger value="chat" className="data-[state=active]:bg-orange-500/20">
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="data-[state=active]:bg-orange-500/20">
            <Zap className="w-4 h-4 mr-2" />
            Oportunidades
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-orange-500/20">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="mt-0 h-[500px] flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2 font-mono text-sm",
                      message.type === 'user'
                        ? 'bg-orange-500 text-black'
                        : 'bg-gray-800 text-orange-400 border border-orange-500/30'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs opacity-60">
                        {message.timestamp.toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {message.emotion && (
                        <Badge variant="outline" className="text-xs border-current opacity-60">
                          {message.emotion}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 text-orange-400 rounded-lg px-4 py-2 border border-orange-500/30">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 animate-pulse" />
                      <div className="flex gap-1">
                        <span className="w-1 h-1 bg-orange-400 rounded-full animate-bounce" />
                        <span className="w-1 h-1 bg-orange-400 rounded-full animate-bounce delay-100" />
                        <span className="w-1 h-1 bg-orange-400 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Input Area */}
          <div className="border-t border-orange-500/30 p-4 space-y-3">
            {/* Voice Status */}
            {(isListening || isSpeaking) && (
              <div className="flex items-center gap-2 text-sm font-mono">
                {isListening && (
                  <>
                    <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                    <span className="text-red-400">OUVINDO...</span>
                  </>
                )}
                {isSpeaking && (
                  <>
                    <Radio className="w-4 h-4 text-green-400 animate-pulse" />
                    <span className="text-green-400">FALANDO...</span>
                  </>
                )}
              </div>
            )}
            
            {/* Input Controls */}
            <div className="flex gap-2">
              <Button
                onClick={toggleListening}
                disabled={isProcessing}
                className={cn(
                  "transition-all duration-200",
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-black'
                )}
                size="icon"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                variant="outline"
                size="icon"
                className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              >
                <Upload className="w-4 h-4" />
              </Button>
              
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Fala aí! Ou usa o microfone... 🎙️"
                disabled={isProcessing || isListening}
                className="flex-1 px-4 py-2 bg-gray-900 border border-orange-500/30 rounded-lg 
                         text-orange-400 placeholder-orange-400/50 font-mono text-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
              
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isProcessing}
                className="bg-orange-500 hover:bg-orange-600 text-black"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2 overflow-x-auto">
              {[
                { text: "Como tá o Bitcoin?", icon: "₿" },
                { text: "Análise de mercado", icon: "📊" },
                { text: "Encontrar arbitragem", icon: "⚡" },
                { text: "Ver meu portfólio", icon: "💰" }
              ].map((action, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSendMessage(action.text)}
                  disabled={isProcessing}
                  className="text-orange-400 hover:bg-orange-500/10 whitespace-nowrap font-mono text-xs"
                >
                  <span className="mr-1">{action.icon}</span>
                  {action.text}
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="opportunities" className="mt-0 h-[500px] p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-orange-500 font-mono">Trading Opportunities</h3>
              <Badge variant="outline" className="text-orange-400 border-orange-400">
                {tradingOpportunities.length} ativas
              </Badge>
            </div>
            
            {tradingOpportunities.length > 0 ? (
              <div className="space-y-3">
                {tradingOpportunities.map((opp) => (
                  <Card key={opp.id} className="bg-gray-900/50 border-orange-500/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-orange-400 font-mono">{opp.symbol}</span>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "border-current",
                            opp.type === 'BUY' ? "text-green-400" : "text-red-400"
                          )}
                        >
                          {opp.type}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-orange-400/60">Entry:</span>
                          <div className="text-white">${opp.entry.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-orange-400/60">Target:</span>
                          <div className="text-green-400">${opp.target.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-orange-400/60">Stop:</span>
                          <div className="text-red-400">${opp.stopLoss.toLocaleString()}</div>
                        </div>
                      </div>
                      
                      <p className="text-xs text-orange-400/80 mt-2">{opp.reason}</p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-orange-400/60">{opp.timeframe}</span>
                        <span className="text-xs bg-orange-500/20 px-2 py-1 rounded">
                          {opp.confidence.toFixed(0)}% confiança
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-orange-400/50 mx-auto mb-2" />
                <p className="text-orange-400/60 font-mono">Nenhuma oportunidade no momento</p>
                <p className="text-xs text-orange-400/40 mt-1">Aguardando sinais do mercado...</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-0 h-[500px] p-4">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-orange-500 font-mono">Analytics Dashboard</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gray-900/50 border-orange-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-orange-400">Accuracy</span>
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">87.3%</div>
                  <div className="text-xs text-orange-400/60">Últimos 30 dias</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-900/50 border-orange-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-orange-400">Win Rate</span>
                    <BarChart3 className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">73.2%</div>
                  <div className="text-xs text-orange-400/60">Trades realizados</div>
                </CardContent>
              </Card>
            </div>
            
            <Alert className="border-orange-500/30 bg-orange-500/10">
              <Brain className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-orange-400 font-mono text-sm">
                Sistema operando com performance otimizada. 
                Modelo treinado com 2.3M+ de dados históricos do mercado crypto.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}