'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Send, 
  Bot, 
  User, 
  Settings,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Activity,
  Globe,
  MessageSquare,
  BarChart3,
  Brain,
  Zap,
  RefreshCw
} from 'lucide-react';
import { cypherAI, type CypherAIMessage, type TradingSignal } from '@/lib/services/EnhancedCypherAI';
import { voiceCommandService } from '@/lib/services/VoiceCommandService';

// Language flags mapping
const LANGUAGE_FLAGS = {
  en: '🇺🇸',
  pt: '🇧🇷', 
  fr: '🇫🇷',
  es: '🇪🇸'
};

const LANGUAGE_NAMES = {
  en: 'English',
  pt: 'Português',
  fr: 'Français', 
  es: 'Español'
};

interface EnhancedCypherAIChatProps {
  onSignalGenerated?: (signal: TradingSignal) => void;
  onNavigate?: (target: string) => void;
  marketData?: {
    btcPrice: number;
    priceChange: number;
    marketCap: number;
    fearGreedIndex: number;
  };
}

export function EnhancedCypherAIChat({ 
  onSignalGenerated, 
  onNavigate, 
  marketData 
}: EnhancedCypherAIChatProps) {
  const [messages, setMessages] = useState<CypherAIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'pt' | 'fr' | 'es'>('en');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const userIdRef = useRef('user-' + Date.now()); // Stable across renders

  useEffect(() => {
    // Initialize with greeting message
    const greeting = cypherAI.getGreeting(currentLanguage);
    const greetingMessage: CypherAIMessage = {
      id: 'greeting',
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
      language: currentLanguage
    };
    setMessages([greetingMessage]);
  }, [currentLanguage]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Setup voice command listeners
    if (isVoiceEnabled) {
      voiceCommandService.updateSettings({ 
        language: currentLanguage,
        voiceEnabled: true,
        speechEnabled: true 
      });

      const handleVoiceCommand = (command: any) => {
        if (command.action.type === 'VOICE_CHAT') {
          handleSendMessage(command.action.data.message);
        }
      };

      const handleSpeechInterim = (data: { transcript: string }) => {
        setVoiceTranscript(data.transcript);
      };

      const handleSpeechFinal = (data: { transcript: string }) => {
        setVoiceTranscript('');
        setInputMessage(data.transcript);
      };

      const handleListeningStart = () => setIsListening(true);
      const handleListeningStop = () => setIsListening(false);
      const handleSpeechStart = () => setIsSpeaking(true);
      const handleSpeechEnd = () => setIsSpeaking(false);

      voiceCommandService.on('command_recognized', handleVoiceCommand);
      voiceCommandService.on('speech_interim', handleSpeechInterim);
      voiceCommandService.on('speech_final', handleSpeechFinal);
      voiceCommandService.on('listening_started', handleListeningStart);
      voiceCommandService.on('listening_stopped', handleListeningStop);
      voiceCommandService.on('speech_started', handleSpeechStart);
      voiceCommandService.on('speech_ended', handleSpeechEnd);

      return () => {
        voiceCommandService.off('command_recognized', handleVoiceCommand);
        voiceCommandService.off('speech_interim', handleSpeechInterim);
        voiceCommandService.off('speech_final', handleSpeechFinal);
        voiceCommandService.off('listening_started', handleListeningStart);
        voiceCommandService.off('listening_stopped', handleListeningStop);
        voiceCommandService.off('speech_started', handleSpeechStart);
        voiceCommandService.off('speech_ended', handleSpeechEnd);
      };
    }
  }, [isVoiceEnabled, currentLanguage]);

  const handleSendMessage = async (message?: string) => {
    const messageToSend = message || inputMessage.trim();
    if (!messageToSend) return;

    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await cypherAI.chat(messageToSend, userIdRef.current, currentLanguage, marketData);
      
      setMessages(prev => [...prev, response]);

      // Handle trading signals
      if (response.signals && response.signals.length > 0) {
        response.signals.forEach(signal => {
          onSignalGenerated?.(signal);
        });
      }

      // Speak response if voice is enabled
      if (isVoiceEnabled && response.content) {
        await voiceCommandService.speak(response.content);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: CypherAIMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: getLocalizedText('error_message'),
        timestamp: new Date(),
        language: currentLanguage
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoiceListening = () => {
    if (isListening) {
      voiceCommandService.stopListening();
    } else {
      voiceCommandService.startListening();
    }
  };

  const getLocalizedText = (key: string): string => {
    const texts = {
      en: {
        type_message: "Type your message...",
        voice_listening: "Listening...",
        voice_processing: "Processing...",
        send_message: "Send message",
        toggle_voice: "Toggle voice input",
        toggle_speech: "Toggle speech output",
        settings: "Settings",
        market_analysis: "Market Analysis",
        trading_signals: "Trading Signals",
        smart_money: "Smart Money Concepts",
        error_message: "Sorry, I encountered an error. Please try again.",
        confidence: "Confidence",
        entry_price: "Entry Price",
        stop_loss: "Stop Loss",
        take_profit: "Take Profit",
        risk_reward: "Risk/Reward",
        bullish: "Bullish",
        bearish: "Bearish",
        neutral: "Neutral"
      },
      pt: {
        type_message: "Digite sua mensagem...",
        voice_listening: "Ouvindo...",
        voice_processing: "Processando...",
        send_message: "Enviar mensagem",
        toggle_voice: "Alternar entrada de voz",
        toggle_speech: "Alternar saída de voz",
        settings: "Configurações",
        market_analysis: "Análise de Mercado",
        trading_signals: "Sinais de Trading",
        smart_money: "Smart Money Concepts",
        error_message: "Desculpe, encontrei um erro. Tente novamente.",
        confidence: "Confiança",
        entry_price: "Preço de Entrada",
        stop_loss: "Stop Loss",
        take_profit: "Take Profit",
        risk_reward: "Risco/Recompensa",
        bullish: "Altista",
        bearish: "Baixista",
        neutral: "Neutro"
      },
      fr: {
        type_message: "Tapez votre message...",
        voice_listening: "Écoute...",
        voice_processing: "Traitement...",
        send_message: "Envoyer message",
        toggle_voice: "Basculer entrée vocale",
        toggle_speech: "Basculer sortie vocale",
        settings: "Paramètres",
        market_analysis: "Analyse de Marché",
        trading_signals: "Signaux de Trading",
        smart_money: "Smart Money Concepts",
        error_message: "Désolé, j'ai rencontré une erreur. Veuillez réessayer.",
        confidence: "Confiance",
        entry_price: "Prix d'Entrée",
        stop_loss: "Stop Loss",
        take_profit: "Take Profit",
        risk_reward: "Risque/Récompense",
        bullish: "Haussier",
        bearish: "Baissier",
        neutral: "Neutre"
      },
      es: {
        type_message: "Escribe tu mensaje...",
        voice_listening: "Escuchando...",
        voice_processing: "Procesando...",
        send_message: "Enviar mensaje",
        toggle_voice: "Alternar entrada de voz",
        toggle_speech: "Alternar salida de voz",
        settings: "Configuraciones",
        market_analysis: "Análisis de Mercado",
        trading_signals: "Señales de Trading",
        smart_money: "Smart Money Concepts",
        error_message: "Lo siento, encontré un error. Inténtalo de nuevo.",
        confidence: "Confianza",
        entry_price: "Precio de Entrada",
        stop_loss: "Stop Loss",
        take_profit: "Take Profit",
        risk_reward: "Riesgo/Recompensa",
        bullish: "Alcista",
        bearish: "Bajista",
        neutral: "Neutral"
      }
    };

    return texts[currentLanguage]?.[key as keyof typeof texts[typeof currentLanguage]] || texts.en[key as keyof typeof texts.en];
  };

  const renderMessage = (message: CypherAIMessage) => {
    const isUser = message.role === 'user';
    
    return (
      <div key={message.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
        )}
        
        <div className={`max-w-[80%] ${isUser ? 'order-1' : 'order-2'}`}>
          <div className={`p-3 rounded-lg ${
            isUser 
              ? 'bg-orange-600 text-white ml-auto' 
              : 'bg-gray-800 text-gray-100'
          }`}>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            
            {/* Market Analysis Display */}
            {message.analysis && (
              <div className="mt-3 p-3 bg-gray-900 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-400">{getLocalizedText('market_analysis')}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sentiment:</span>
                    <Badge variant={
                      message.analysis.sentiment === 'bullish' ? 'default' :
                      message.analysis.sentiment === 'bearish' ? 'destructive' : 'secondary'
                    }>
                      {getLocalizedText(message.analysis.sentiment)}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">{getLocalizedText('confidence')}:</span>
                    <span className="text-white">{(message.analysis.confidence * 100).toFixed(1)}%</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Target:</span>
                    <span className="text-white">${message.analysis.priceTarget.toFixed(0)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Risk:</span>
                    <Badge variant={
                      message.analysis.riskAssessment.riskLevel === 'low' ? 'default' :
                      message.analysis.riskAssessment.riskLevel === 'high' ? 'destructive' : 'secondary'
                    }>
                      {message.analysis.riskAssessment.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Trading Signals Display */}
            {message.signals && message.signals.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-semibold text-green-400">{getLocalizedText('trading_signals')}</span>
                </div>
                
                {message.signals.map((signal) => (
                  <div key={signal.id} className="p-3 bg-gray-900 rounded-lg border border-gray-700 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{signal.symbol}</span>
                      <Badge variant={signal.type === 'buy' ? 'default' : 'destructive'}>
                        {signal.type.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">{getLocalizedText('entry_price')}:</span>
                        <span className="text-white">${signal.entry.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">{getLocalizedText('stop_loss')}:</span>
                        <span className="text-white">${signal.stopLoss.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">{getLocalizedText('risk_reward')}:</span>
                        <span className="text-white">1:{signal.riskReward}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">{getLocalizedText('confidence')}:</span>
                        <span className="text-white">{(signal.confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-2">{signal.reasoning}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="text-xs text-gray-500 mt-1">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
        
        {isUser && (
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-gray-300" />
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="bg-gray-900 border-gray-700 h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Cypher AI</h3>
              <p className="text-sm text-gray-400">{getLocalizedText('smart_money')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              {Object.entries(LANGUAGE_FLAGS).map(([lang, flag]) => (
                <Button
                  key={lang}
                  variant={currentLanguage === lang ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-12 p-0"
                  onClick={() => setCurrentLanguage(lang as any)}
                >
                  <span className="text-lg">{flag}</span>
                </Button>
              ))}
            </div>
            
            {/* Voice Controls */}
            {voiceCommandService.isVoiceSupported() && (
              <div className="flex gap-1">
                <Button
                  variant={isVoiceEnabled ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                  title={getLocalizedText('toggle_speech')}
                >
                  {isSpeaking ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
                
                <Button
                  variant={isListening ? 'default' : 'ghost'}
                  size="sm"
                  onClick={toggleVoiceListening}
                  disabled={!isVoiceEnabled}
                  title={getLocalizedText('toggle_voice')}
                  className={isListening ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </Button>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Voice Status */}
        {isVoiceEnabled && (isListening || voiceTranscript) && (
          <div className="mt-2 p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-blue-300">
                {isListening ? getLocalizedText('voice_listening') : getLocalizedText('voice_processing')}
              </span>
            </div>
            {voiceTranscript && (
              <p className="text-sm text-gray-300 mt-1">{voiceTranscript}</p>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(renderMessage)}
        {isLoading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="ml-3 bg-gray-800 rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={getLocalizedText('type_message')}
            className="bg-gray-800 border-gray-600 text-white"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isLoading}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputMessage.trim()}
            size="sm"
            title={getLocalizedText('send_message')}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}