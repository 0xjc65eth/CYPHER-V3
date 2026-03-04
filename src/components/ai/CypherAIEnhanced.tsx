/**
 * 🤖 CYPHER AI ENHANCED - CYPHER ORDi FUTURE V3
 * Interface avançada com entrada de texto/áudio e respostas fluidas em português brasileiro
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Send, 
  Brain, 
  Volume2, 
  VolumeX, 
  Settings, 
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Loader2,
  FileAudio,
  MessageSquare
} from 'lucide-react';
import { fetchWithRetry } from '@/lib/api-client';
import { API_CONFIG } from '@/lib/api-config';
import { EnhancedLogger } from '@/lib/enhanced-logger';
import { ErrorReporter } from '@/lib/ErrorReporter';
import { CommandResult, EmotionType, AdvancedIntent } from '@/types/ai';

interface VoiceAIManager {
  startListening: (callback: (text: string) => void) => void;
  stopListening: () => void;
  synthesizeText: (text: string, emotion?: EmotionType) => Promise<void>;
  isListening: boolean;
  isSupported: boolean;
}

interface CypherAIResponse {
  text: string;
  emotion: EmotionType;
  intent: AdvancedIntent;
  suggestions?: string[];
  marketData?: any;
  tradingSignals?: any[];
  confidence: number;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  emotion?: EmotionType;
  voiceInput?: boolean;
  confidence?: number;
}

// Respostas em português brasileiro com gírias
const BRAZILIAN_RESPONSES = {
  greeting: [
    "E aí, parceiro! Beleza? Sou a Cypher AI, aqui pra te ajudar no mundo crypto! 🚀",
    "Opa, chegou o bom! Tudo tranquilo? Vamo fazer uns trades maneiros hoje?",
    "Salve, salve! Cypher AI na área! Pronto pra arrasar no Bitcoin?"
  ],
  analysis: [
    "Ó, vou te falar... Os dados mostram que",
    "Então, mano, analisando aqui os gráficos, vejo que",
    "Olha só que situação interessante...",
    "Eita, os indicadores estão mostrando que"
  ],
  bullish: [
    "Tá pumping forte! 📈",
    "Isso aí vai pra lua! 🚀",
    "Tendência de alta bem massa!",
    "Tá voando alto mesmo!"
  ],
  bearish: [
    "Eita, tá meio vermelho... 📉",
    "Cuidado aí, tendência de baixa rolando",
    "Tá meio travado, viu?",
    "Melhor ficar esperto com esse movimento"
  ],
  trading: [
    "Bora fazer uns trades? Vejo umas oportunidades massa aqui!",
    "Que tal essa entrada? Tá com cara de lucro!",
    "Olha essa arbitragem! Dinheiro fácil não existe, mas...",
    "Estratégia pronta! Vamo meter a cara?"
  ],
  error: [
    "Opa, deu ruim aqui... Mas relaxa, vamo resolver!",
    "Eita, bugou! Mas já tô trabalhando na solução",
    "Puts, rolou um problema... Calma que já volto!",
    "Deu pau aqui, mas é coisa rápida de arrumar!"
  ],
  success: [
    "Mandou bem! 👏",
    "Isso aí! Sucesso total!",
    "Perfeito, mano! Funcionou redondinho!",
    "Show de bola! Tudo certo por aqui!"
  ]
};

export default function CypherAIEnhanced() {
  // Estados principais
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('neutral');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  
  // Refs
  const voiceManager = useRef<VoiceAIManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializar Voice AI Manager
  useEffect(() => {
    const initVoiceManager = async () => {
      try {
        // Simular VoiceAIManager (implementação real seria mais complexa)
        voiceManager.current = {
          startListening: (callback) => {
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
              const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
              const recognition = new SpeechRecognition();
              
              recognition.continuous = true;
              recognition.interimResults = true;
              recognition.lang = 'pt-BR';
              
              recognition.onresult = (event: any) => {
                const transcript = event.results[event.results.length - 1][0].transcript;
                if (event.results[event.results.length - 1].isFinal) {
                  callback(transcript);
                }
              };
              
              recognition.start();
            }
          },
          stopListening: () => {
            // Implementar parada do reconhecimento
          },
          synthesizeText: async (text: string, emotion?: EmotionType) => {
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(text);
              utterance.lang = 'pt-BR';
              utterance.rate = 0.9;
              utterance.pitch = emotion === 'excited' ? 1.2 : 1.0;
              speechSynthesis.speak(utterance);
            }
          },
          isListening: false,
          isSupported: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
        };
      } catch (error) {
        ErrorReporter.report(error as Error, {
          component: 'CypherAIEnhanced',
          action: 'initVoiceManager'
        });
      }
    };

    initVoiceManager();
  }, []);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Gerar resposta da AI
  const generateAIResponse = useCallback(async (userMessage: string, isVoice = false): Promise<CypherAIResponse> => {
    try {
      const prompt = `
        Você é a Cypher AI, uma assistente brasileira especialista em criptomoedas.
        Responda de forma natural, usando gírias brasileiras, sendo amigável e confiante.
        Foque em Bitcoin, Ordinals, Runes, BRC-20 e trading.
        
        Mensagem do usuário: "${userMessage}"
        
        Responda em português brasileiro, de forma descontraída mas informativa.
      `;

      // Simular chamada para OpenAI/Claude (implementação real usaria API real)
      const mockResponse: CypherAIResponse = {
        text: generateBrazilianResponse(userMessage),
        emotion: getEmotionFromMessage(userMessage),
        intent: {
          name: getIntentFromMessage(userMessage) as import('@/types/ai').Intent,
          category: 'crypto',
          entities: {},
          confidence: 0.85
        },
        confidence: 0.85,
        suggestions: [
          "Quer ver o preço do Bitcoin?",
          "Vamos analisar uns Ordinals?",
          "Que tal verificar oportunidades de arbitragem?"
        ]
      };

      EnhancedLogger.info('AI Response generated', {
        component: 'CypherAIEnhanced',
        userMessage: userMessage.substring(0, 50),
        emotion: mockResponse.emotion,
        confidence: mockResponse.confidence,
        isVoice
      });

      return mockResponse;
    } catch (error) {
      ErrorReporter.report(error as Error, {
        component: 'CypherAIEnhanced',
        action: 'generateAIResponse',
        userMessage: userMessage.substring(0, 50)
      });
      
      return {
        text: "Opa, deu um probleminha aqui... Mas relaxa, tô voltando já!",
        emotion: 'concerned',
        intent: { name: 'help' as import('@/types/ai').Intent, category: 'system', entities: {}, confidence: 0.1 },
        confidence: 0.1
      };
    }
  }, []);

  // Funções auxiliares para resposta brasileira
  const generateBrazilianResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('olá') || lowerMessage.includes('oi') || lowerMessage.includes('hey')) {
      return BRAZILIAN_RESPONSES.greeting[0];
    }

    if (lowerMessage.includes('bitcoin') || lowerMessage.includes('btc')) {
      const analysis = BRAZILIAN_RESPONSES.analysis[0];
      const trend = BRAZILIAN_RESPONSES.bullish[0];
      return `${analysis} o Bitcoin ${trend}`;
    }

    if (lowerMessage.includes('trade') || lowerMessage.includes('comprar') || lowerMessage.includes('vender')) {
      return BRAZILIAN_RESPONSES.trading[0];
    }

    return "Interessante! Me conta mais sobre isso que quero te ajudar melhor. Sou especialista em crypto, principalmente Bitcoin, Ordinals e Runes!";
  };

  const getEmotionFromMessage = (message: string): EmotionType => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('ótimo') || lowerMessage.includes('perfeito') || lowerMessage.includes('show')) {
      return 'happy';
    }
    if (lowerMessage.includes('problema') || lowerMessage.includes('erro') || lowerMessage.includes('ruim')) {
      return 'concerned';
    }
    if (lowerMessage.includes('trade') || lowerMessage.includes('comprar') || lowerMessage.includes('pump')) {
      return 'excited';
    }
    return 'neutral';
  };

  const getIntentFromMessage = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('preço') || lowerMessage.includes('valor') || lowerMessage.includes('cotação')) {
      return 'price_query';
    }
    if (lowerMessage.includes('comprar') || lowerMessage.includes('vender') || lowerMessage.includes('trade')) {
      return 'trading';
    }
    if (lowerMessage.includes('análise') || lowerMessage.includes('gráfico') || lowerMessage.includes('tendência')) {
      return 'analysis';
    }
    if (lowerMessage.includes('ordinals') || lowerMessage.includes('runes') || lowerMessage.includes('brc')) {
      return 'bitcoin_ecosystem';
    }
    return 'general';
  };

  // Enviar mensagem de texto
  const handleSendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
      voiceInput: false
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    try {
      const aiResponse = await generateAIResponse(inputText);
      
      const assistantMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.text,
        timestamp: Date.now(),
        emotion: aiResponse.emotion,
        confidence: aiResponse.confidence
      };

      setMessages(prev => [...prev, assistantMessage]);
      setCurrentEmotion(aiResponse.emotion);

      // Síntese de voz se habilitada
      if (voiceEnabled && voiceManager.current) {
        await voiceManager.current.synthesizeText(aiResponse.text, aiResponse.emotion);
      }
    } catch (error) {
      ErrorReporter.report(error as Error, {
        component: 'CypherAIEnhanced',
        action: 'handleSendMessage'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle reconhecimento de voz
  const toggleVoiceRecognition = useCallback(() => {
    if (!voiceManager.current?.isSupported) {
      alert('Reconhecimento de voz não suportado neste browser');
      return;
    }

    if (isListening) {
      voiceManager.current.stopListening();
      setIsListening(false);
    } else {
      voiceManager.current.startListening(async (text) => {
        const userMessage: ConversationMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: text,
          timestamp: Date.now(),
          voiceInput: true
        };

        setMessages(prev => [...prev, userMessage]);
        setIsListening(false);

        try {
          const aiResponse = await generateAIResponse(text, true);
          
          const assistantMessage: ConversationMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: aiResponse.text,
            timestamp: Date.now(),
            emotion: aiResponse.emotion,
            confidence: aiResponse.confidence
          };

          setMessages(prev => [...prev, assistantMessage]);
          
          if (voiceEnabled && voiceManager.current) {
            await voiceManager.current.synthesizeText(aiResponse.text, aiResponse.emotion);
          }
        } catch (error) {
          ErrorReporter.report(error as Error, {
            component: 'CypherAIEnhanced',
            action: 'voiceRecognition'
          });
        }
      });
      setIsListening(true);
    }
  }, [isListening, voiceEnabled]);

  // Processar arquivo de áudio
  const handleAudioFile = async () => {
    if (!audioFile) return;

    setIsProcessing(true);
    
    try {
      // Simular transcrição de áudio (implementação real usaria API de speech-to-text)
      const transcript = "Áudio transcrito: Como está o Bitcoin hoje?"; // Mock
      
      const userMessage: ConversationMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: `🎵 ${transcript}`,
        timestamp: Date.now(),
        voiceInput: true
      };

      setMessages(prev => [...prev, userMessage]);
      
      const aiResponse = await generateAIResponse(transcript, true);
      
      const assistantMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.text,
        timestamp: Date.now(),
        emotion: aiResponse.emotion,
        confidence: aiResponse.confidence
      };

      setMessages(prev => [...prev, assistantMessage]);
      setAudioFile(null);
      
      if (voiceEnabled && voiceManager.current) {
        await voiceManager.current.synthesizeText(aiResponse.text, aiResponse.emotion);
      }
    } catch (error) {
      ErrorReporter.report(error as Error, {
        component: 'CypherAIEnhanced',
        action: 'handleAudioFile'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black text-white p-6 rounded-xl border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Cypher AI Enhanced</h2>
            <p className="text-sm text-gray-400">Assistente brasileira especialista em crypto</p>
          </div>
          <Badge 
            className={`ml-2 ${currentEmotion === 'happy' ? 'bg-green-600' : 
                        currentEmotion === 'excited' ? 'bg-blue-600' :
                        currentEmotion === 'concerned' ? 'bg-yellow-600' : 'bg-gray-600'}`}
          >
            {currentEmotion}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={voiceEnabled ? 'text-green-400' : 'text-gray-500'}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <Card className="bg-gray-800 border-gray-700 p-4 h-96 overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-400" />
            <p className="text-lg font-medium mb-2">Fala aí! 👋</p>
            <p className="text-sm">Sou a Cypher AI! Tô aqui pra te ajudar com tudo de crypto.</p>
            <p className="text-sm">Pode falar por texto ou áudio, como preferir!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div
                className={`inline-block max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  {message.role === 'user' ? (
                    <MessageSquare className="w-4 h-4" />
                  ) : (
                    <Brain className="w-4 h-4" />
                  )}
                  {message.voiceInput && <Mic className="w-3 h-3 text-green-400" />}
                  {message.confidence && (
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(message.confidence * 100)}%
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{message.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </Card>

      {/* Input Area */}
      <div className="space-y-4">
        {/* Text Input */}
        <div className="flex space-x-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite sua mensagem ou use o microfone..."
            className="bg-gray-800 border-gray-600 text-white"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isProcessing}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isProcessing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Voice & Audio Controls */}
        <div className="flex items-center space-x-4">
          <Button
            onClick={toggleVoiceRecognition}
            className={`${isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            disabled={isProcessing}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4 mr-2" />
                Parar Gravação
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Falar
              </>
            )}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <FileAudio className="w-4 h-4 mr-2" />
            Upload Áudio
          </Button>

          {audioFile && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">{audioFile.name}</span>
              <Button
                onClick={handleAudioFile}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
                disabled={isProcessing}
              >
                Processar
              </Button>
            </div>
          )}
        </div>

        {/* Status */}
        {isListening && (
          <div className="flex items-center justify-center space-x-2 text-red-400">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            <span className="text-sm">Escutando... Fale agora!</span>
          </div>
        )}
      </div>
    </div>
  );
}