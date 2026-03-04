// CYPHER AI v2 - Interface Avançada com Comando de Voz e IA Conversacional

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mic, MicOff, Volume2, VolumeX, Bot, Send, Sparkles, Brain,
  Activity, TrendingUp, DollarSign, AlertCircle, Settings,
  Headphones, MessageSquare, BarChart3, Zap, Shield, Cpu
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import MessageDataCard from './MessageDataCard';
import { EnhancedVoiceService, EnhancedVoiceCommandProcessor } from '@/lib/services/enhanced-voice-service';

// Importar módulos da AI
import { CypherAI } from '@/ai/cypher-v2';
import type { 
  ConversationMessage, 
  MarketData, 
  VoiceConfig,
  AIPersonality 
} from '@/ai/cypher-v2/types';

// Tipos locais
interface AIState {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  isThinking: boolean;
  voiceEnabled: boolean;
  continuousMode: boolean;
  emotion: 'neutral' | 'happy' | 'excited' | 'concerned' | 'analytical';
}

interface AIMetrics {
  responseTime: number;
  accuracy: number;
  sessionsToday: number;
  commandsProcessed: number;
  marketCoverage: number;
}

// Componente de Visualização de Voz
const VoiceVisualizer: React.FC<{ isActive: boolean; amplitude: number }> = ({ 
  isActive, 
  amplitude 
}) => {
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {[...Array(7)].map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            "w-1 bg-gradient-to-t from-purple-600 to-purple-400 rounded-full",
            isActive ? "opacity-100" : "opacity-30"
          )}
          animate={{
            height: isActive ? amplitude * (20 + Math.sin(Date.now() / 100 + i) * 15) : 4,
            scale: isActive ? [1, 1.1, 1] : 1
          }}
          transition={{
            height: { duration: 0.1 },
            scale: { duration: 0.3, repeat: Infinity }
          }}
        />
      ))}
    </div>
  );
};

// Componente de Status da AI
const AIStatusIndicator: React.FC<{ state: AIState }> = ({ state }) => {
  const getStatusText = () => {
    if (state.isListening) return "Ouvindo...";
    if (state.isSpeaking) return "Falando...";
    if (state.isThinking) return "Pensando...";
    if (state.isProcessing) return "Processando...";
    return "Pronta";
  };

  const getStatusColor = () => {
    if (state.isListening) return "text-red-500";
    if (state.isSpeaking) return "text-blue-500";
    if (state.isThinking) return "text-yellow-500";
    if (state.isProcessing) return "text-purple-500";
    return "text-green-500";
  };

  return (
    <div className="flex items-center gap-2">
      <div className={cn("relative", getStatusColor())}>
        <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
        <div className="absolute inset-0 w-2 h-2 rounded-full bg-current animate-ping" />
      </div>
      <span className="text-sm font-medium">{getStatusText()}</span>
    </div>
  );
};

// Componente Principal
const CypherAIV2: React.FC = () => {
  // Estados
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [aiState, setAIState] = useState<AIState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isThinking: false,
    voiceEnabled: true,
    continuousMode: false,
    emotion: 'neutral'
  });
  
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [metrics, setMetrics] = useState<AIMetrics>({
    responseTime: 0,
    accuracy: 98.5,
    sessionsToday: 42,
    commandsProcessed: 156,
    marketCoverage: 87
  });
  
  const [voiceAmplitude, setVoiceAmplitude] = useState(0);
  const [selectedPersonality, setSelectedPersonality] = useState<any>('professional');
  const [activeTab, setActiveTab] = useState('chat');
  
  // Refs
  const cypherAI = useRef<CypherAI | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const voiceService = useRef<EnhancedVoiceService | null>(null);

  // Inicializar CYPHER AI
  useEffect(() => {
    // Skip initialization during SSR
    if (typeof window === 'undefined') return;
    
    const initAI = async () => {
      try {
        cypherAI.current = new CypherAI({
          apiKeys: {
            openai: '', // AI calls routed through /api/cypher-ai/chat server-side
            elevenlabs: '', // Voice calls routed through /api/ai/text-to-speech server-side
            coingecko: '' // Market calls routed through /api/coingecko server-side
          },
          personality: selectedPersonality,
          language: 'pt-BR',
          voiceEnabled: true,
        } as any);

        // Configurar event listeners
        (cypherAI.current as any).on('stateChange', (state: Partial<AIState>) => {
          setAIState(prev => ({ ...prev, ...state }));
        });

        (cypherAI.current as any).on('message', (message: ConversationMessage) => {
          setMessages(prev => [...prev, message]);
        });

        (cypherAI.current as any).on('marketUpdate', (data: MarketData) => {
          setMarketData(data);
        });

        (cypherAI.current as any).on('voiceAmplitude', (amplitude: number) => {
          setVoiceAmplitude(amplitude);
        });

        // Inicializar Enhanced Voice Service
        voiceService.current = new EnhancedVoiceService();

        // Inicializar AI
        if (cypherAI.current) {
          await (cypherAI.current as any).initialize();
        }

        // Mensagem de boas-vindas simples
        const welcomeMessage = {
          id: Date.now().toString(),
          role: 'assistant' as const,
          content: 'Olá! Sou a CYPHER AI v2 🚀 Sua assistente de cripto com superpoderes!\n\nComo posso te ajudar hoje?\n\n📊 Posso falar sobre:\n• Preços e análises de mercado\n• Estratégias de trading\n• Ordinals e Runes\n• Educação sobre cripto\n\n🎤 **Comando de Voz Ativo!**\nClique no microfone e diga comandos como:\n• "Preço do Bitcoin"\n• "Análise do mercado"\n• "Oportunidades"',
          timestamp: new Date(),
          emotion: 'happy',
          confidence: 1
        } as ConversationMessage;
        
        setMessages([welcomeMessage]);

      } catch (error) {
        console.error('Erro ao inicializar CYPHER AI:', error);
      }
    };

    initAI();

    return () => {
      (cypherAI.current as any)?.destroy?.();
    };
  }, [selectedPersonality]);

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Handlers
  const handleVoiceToggle = useCallback(async () => {
    if (!voiceService.current) return;

    if (aiState.isListening) {
      voiceService.current.stopListening();
    } else {
      (voiceService.current as any).startListening(() => {}, (err: any) => {
        console.error('Failed to start voice recognition', err);
      });
    }
  }, [aiState.isListening]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message to chat
    const userMessageObj = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: userMessage,
      timestamp: new Date(),
      confidence: 1
    } as ConversationMessage;
    
    setMessages(prev => [...prev, userMessageObj]);
    setAIState(prev => ({ ...prev, isThinking: true, isProcessing: true }));

    try {
      // Call the real API
      const response = await fetch('/api/ai/command/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          context: { timestamp: new Date().toISOString() }
        }),
      });

      const result = await response.json();

      if (result.success) {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: result.data.response,
          timestamp: new Date(),
          confidence: result.data.confidence / 100,
          emotion: 'analytical'
        } as ConversationMessage;

        setMessages(prev => [...prev, aiMessage]);

        // Speak the response if voice is enabled
        if (aiState.voiceEnabled && voiceService.current) {
          setAIState(prev => ({ ...prev, isSpeaking: true }));
          
          // Use enhanced voice service with better speech processing
          (voiceService.current as any).speak(result.data.response, {
            rate: 0.85,
            pitch: 1.0,
            volume: 0.9,
            onEnd: () => {
              setAIState(prev => ({ ...prev, isSpeaking: false }));
            }
          }).catch((error: any) => {
            console.error('Speech error:', error);
            setAIState(prev => ({ ...prev, isSpeaking: false }));
          });
        }
      } else {
        throw new Error(result.error || 'Failed to get AI response');
      }
    } catch (error: any) {
      console.error('Erro ao processar mensagem:', error);

      const errorMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant' as const,
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date(),
        confidence: 0,
        emotion: 'concerned'
      } as ConversationMessage;
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setAIState(prev => ({ ...prev, isThinking: false, isProcessing: false }));
    }
  }, [inputValue, aiState.voiceEnabled]);

  const handleQuickCommand = useCallback(async (command: string) => {
    // Convert command to appropriate message
    const commandMessages: Record<string, string> = {
      'analyze_bitcoin': 'Faça uma análise completa do Bitcoin',
      'show_portfolio': 'Mostre informações do meu portfolio',
      'find_opportunities': 'Quais são as melhores oportunidades agora?',
      'market_trends': 'Quais são as tendências do mercado?',
      'check_alerts': 'Verifique os alertas ativos',
      'enable_pro_mode': 'Ativar modo AI Pro',
      'preço': 'Qual é o preço atual do Bitcoin?',
      'comprar': 'Devo comprar Bitcoin agora?',
      'vender': 'É hora de vender?',
      'análise': 'Faça uma análise técnica',
      'mercado': 'Como está o mercado?',
      'ajuda': 'Como posso te ajudar?',
      'limpar': 'clear_chat'
    };

    const message = commandMessages[command] || command;
    
    if (message === 'clear_chat') {
      setMessages([]);
      return;
    }

    // Simulate typing the command and sending it
    setInputValue(message);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  }, [handleSendMessage]);

  // Comandos rápidos
  const quickCommands = [
    { icon: '📊', text: 'Análise do Bitcoin', command: 'analyze_bitcoin' },
    { icon: '💼', text: 'Meu Portfolio', command: 'show_portfolio' },
    { icon: '🎯', text: 'Oportunidades', command: 'find_opportunities' },
    { icon: '📈', text: 'Tendências', command: 'market_trends' },
    { icon: '⚡', text: 'Alertas', command: 'check_alerts' },
    { icon: '🤖', text: 'Modo AI Pro', command: 'enable_pro_mode' }
  ];


  // Helper function to parse JSON from message content
  const parseMessageContent = (content: string): { text: string; jsonData?: any } => {
    try {
      // Check if the entire content is JSON
      const parsed = JSON.parse(content);
      return { text: '', jsonData: parsed };
    } catch {
      // Try to find JSON within the text
      const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        try {
          const jsonData = JSON.parse(jsonMatch[0]);
          const textBefore = content.substring(0, jsonMatch.index).trim();
          const textAfter = content.substring(jsonMatch.index! + jsonMatch[0].length).trim();
          const text = [textBefore, textAfter].filter(Boolean).join('\n').trim();
          return { text, jsonData };
        } catch {
          // If JSON parsing fails, return original content
          return { text: content };
        }
      }
    }
    return { text: content };
  };

  // Renderização de mensagem com formatação rica
  const renderMessage = (message: ConversationMessage) => {
    const isUser = message.role === 'user';
    const { text, jsonData } = parseMessageContent(message.content);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "flex",
          isUser ? 'justify-end' : 'justify-start'
        )}
      >
        <div className={cn(
          "max-w-[80%] rounded-lg px-4 py-3",
          isUser 
            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        )}>
          {!isUser && (message as any).emotion && (
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-purple-500 capitalize">
                {(message as any).emotion}
              </span>
              {(message as any).confidence && (
                <Badge variant="secondary" className="text-xs">
                  {Math.round((message as any).confidence * 100)}% confiante
                </Badge>
              )}
            </div>
          )}
          
          {text && <div className="whitespace-pre-wrap">{text}</div>}
          
          {jsonData && <MessageDataCard data={jsonData} />}
          
          {!jsonData && (message as any).data && (
            <MessageDataCard data={(message as any).data} />
          )}
          
          <p className="text-xs opacity-70 mt-2">
            {message.timestamp.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <Card className="w-full max-w-6xl mx-auto h-[800px] flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative z-10">
      <CardHeader className="border-b border-gray-700 relative z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Brain className="h-10 w-10 text-purple-600" />
              <Sparkles className="h-5 w-5 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                CYPHER AI v2
              </CardTitle>
              <p className="text-sm text-gray-400">
                Assistente de Cripto com IA Avançada
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <AIStatusIndicator state={aiState} />
            
            <div className="flex items-center gap-2">
              <Button
                variant={aiState.voiceEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const newVoiceState = !aiState.voiceEnabled;
                  setAIState(prev => ({ ...prev, voiceEnabled: newVoiceState }));

                  // Update AI configuration
                  if (cypherAI.current) {
                    (cypherAI.current as any).setVoiceConfig({ enabled: newVoiceState });
                  }
                }}
              >
                {aiState.voiceEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant={aiState.continuousMode ? "default" : "outline"}
                size="sm"
                onClick={() => setAIState(prev => ({ ...prev, continuousMode: !prev.continuousMode }))}
                title="Modo Contínuo - AI sempre ouvindo"
              >
                <Headphones className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-4 w-full bg-gray-800/50 relative z-30">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="market" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Mercado
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Métricas
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="flex-1 flex flex-col p-0 relative z-20">
            {/* Área de Mensagens */}
            <ScrollArea className="flex-1 p-4 relative z-40" ref={scrollAreaRef}>
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map(message => (
                    <div key={message.id}>
                      {renderMessage(message)}
                    </div>
                  ))}
                </AnimatePresence>
                
                {aiState.isThinking && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-gray-800 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-purple-500 animate-pulse" />
                        <span className="text-sm text-gray-400">
                          CYPHER está analisando...
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
            
            {/* Visualizador de Voz */}
            {(aiState.isListening || aiState.isSpeaking) && (
              <div className="border-t border-gray-700 p-3 bg-gray-800/30">
                <VoiceVisualizer 
                  isActive={aiState.isListening || aiState.isSpeaking}
                  amplitude={voiceAmplitude}
                />
              </div>
            )}
            
            {/* Comandos Rápidos */}
            <div className="border-t border-gray-700 p-3">
              <div className="flex gap-2 mb-3 overflow-x-auto">
                {quickCommands.map((cmd, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleQuickCommand(cmd.command)}
                    disabled={aiState.isProcessing}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full text-sm whitespace-nowrap transition-colors"
                  >
                    <span>{cmd.icon}</span>
                    <span>{cmd.text}</span>
                  </motion.button>
                ))}
              </div>
              
              {/* Input Area */}
              <div className="flex gap-2">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handleVoiceToggle}
                    disabled={aiState.isProcessing}
                    variant={aiState.isListening ? "destructive" : "outline"}
                    size="icon"
                    className={cn(
                      "transition-all",
                      aiState.isListening && "animate-pulse"
                    )}
                  >
                    {aiState.isListening ? (
                      <MicOff className="h-5 w-5" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </Button>
                </motion.div>
                
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Digite ou fale comigo..."
                  disabled={aiState.isProcessing || aiState.isListening}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                />
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || aiState.isProcessing}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="market" className="flex-1 p-4">
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Dados de Mercado em Tempo Real
              </h3>
              
              {marketData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Bitcoin</span>
                        <span className="text-2xl font-bold text-green-500">
                          ${(marketData as any).bitcoin?.price.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {(marketData as any).bitcoin?.change24h > 0 ? '+' : ''}
                        {(marketData as any).bitcoin?.change24h.toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Mais cards de mercado... */}
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  Carregando dados de mercado...
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="insights" className="flex-1 p-4">
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                Insights Inteligentes
              </h3>
              
              <Alert className="border-purple-500/50 bg-purple-500/10">
                <AlertCircle className="h-4 w-4 text-purple-500" />
                <AlertDescription>
                  <strong>Oportunidade Detectada:</strong> O Bitcoin está formando um padrão de alta.
                  Probabilidade de rompimento: 78%
                </AlertDescription>
              </Alert>
              
              {/* Mais insights... */}
            </div>
          </TabsContent>
          
          <TabsContent value="metrics" className="flex-1 p-4">
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Métricas da AI
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-500">
                      {metrics.responseTime}ms
                    </div>
                    <div className="text-sm text-gray-400">
                      Tempo de Resposta
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-500">
                      {metrics.accuracy}%
                    </div>
                    <div className="text-sm text-gray-400">
                      Precisão
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-500">
                      {metrics.commandsProcessed}
                    </div>
                    <div className="text-sm text-gray-400">
                      Comandos Hoje
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-500">
                      {metrics.marketCoverage}%
                    </div>
                    <div className="text-sm text-gray-400">
                      Cobertura
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Performance Neural</span>
                  <span className="text-sm font-medium">92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CypherAIV2;