'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Globe,
  Brain,
  Sparkles,
  Loader2,
  Settings,
  X,
  ChevronDown,
  Copy,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { toast } from 'react-hot-toast';
// WALLET TEMPORARILY DISABLED - import { useWalletContext } from '@/contexts/WalletContext';

type Language = 'en' | 'pt' | 'es' | 'fr';
type AIModel = 'openai' | 'gemini' | 'claude';
type MessageRole = 'user' | 'assistant' | 'system';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  language: Language;
  audioUrl?: string;
  metadata?: {
    model?: AIModel;
    tokens?: number;
    processingTime?: number;
    confidence?: number;
  };
}

interface AIConfig {
  model: AIModel;
  language: Language;
  voice: {
    enabled: boolean;
    autoPlay: boolean;
    speed: number;
    voice: string;
  };
  analysis: {
    technical: boolean;
    fundamental: boolean;
    sentiment: boolean;
    onChain: boolean;
  };
}

const LANGUAGES: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' }
];

const AI_MODELS: { id: AIModel; name: string; description: string; icon: string }[] = [
  { id: 'openai', name: 'GPT-4', description: 'Advanced reasoning and analysis', icon: '🧠' },
  { id: 'gemini', name: 'Gemini Pro', description: 'Multimodal AI with vision', icon: '✨' },
  { id: 'claude', name: 'Claude 3', description: 'Constitutional AI assistant', icon: '🤖' }
];

const PRESET_PROMPTS = {
  en: [
    'Analyze current Bitcoin market trends',
    'What are the best Ordinals to invest in?',
    'Explain Runes protocol',
    'Show me arbitrage opportunities'
  ],
  pt: [
    'Analise as tendências atuais do Bitcoin',
    'Quais são os melhores Ordinals para investir?',
    'Explique o protocolo Runes',
    'Mostre oportunidades de arbitragem'
  ],
  es: [
    'Analiza las tendencias actuales de Bitcoin',
    '¿Cuáles son los mejores Ordinals para invertir?',
    'Explica el protocolo Runes',
    'Muestra oportunidades de arbitraje'
  ],
  fr: [
    'Analysez les tendances actuelles du Bitcoin',
    'Quels sont les meilleurs Ordinals pour investir?',
    'Expliquez le protocole Runes',
    'Montrez les opportunités d\'arbitrage'
  ]
};

export function CypherAISystem() {
  // WALLET TEMPORARILY DISABLED - const { connectionState } = useWalletContext();
  const connectionState = { isConnected: false, account: null as string | null };
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<AIConfig>({
    model: 'openai',
    language: 'en',
    voice: {
      enabled: true,
      autoPlay: true,
      speed: 1.0,
      voice: 'nova'
    },
    analysis: {
      technical: true,
      fundamental: true,
      sentiment: true,
      onChain: true
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = config.language === 'pt' ? 'pt-BR' : 
                        config.language === 'es' ? 'es-ES' : 
                        config.language === 'fr' ? 'fr-FR' : 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join(' ');
        
        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast.error('Voice recognition error');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [config.language]);

  // Toggle voice recognition
  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Voice recognition not supported');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      language: config.language
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      // Prepare context with wallet info if connected
      const context = {
        walletConnected: connectionState.isConnected,
        walletAddress: connectionState.account,
        walletBalance: 0,
        language: config.language,
        analysisTypes: Object.entries(config.analysis)
          .filter(([_, enabled]) => enabled)
          .map(([type]) => type)
      };

      // Call AI API
      const response = await fetch('/api/ai/openai-analysis/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          context,
          model: config.model,
          language: config.language
        })
      });

      if (!response.ok) throw new Error('AI request failed');

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        language: config.language,
        metadata: {
          model: config.model,
          tokens: data.usage?.total_tokens,
          processingTime: data.processingTime
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Generate voice if enabled
      if (config.voice.enabled && config.voice.autoPlay) {
        await generateVoice(data.content);
      }

    } catch (error) {
      console.error('AI error:', error);
      toast.error('Failed to get AI response');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getErrorMessage(config.language),
        timestamp: new Date(),
        language: config.language
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate voice
  const generateVoice = async (text: string) => {
    try {
      const response = await fetch('/api/ai/text-to-speech/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: config.voice.voice,
          language: config.language,
          speed: config.voice.speed
        })
      });

      if (!response.ok) throw new Error('Voice generation failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Voice generation error:', error);
    }
  };

  // Get error message in current language
  const getErrorMessage = (lang: Language): string => {
    const messages = {
      en: 'Sorry, I encountered an error processing your request. Please try again.',
      pt: 'Desculpe, encontrei um erro ao processar sua solicitação. Por favor, tente novamente.',
      es: 'Lo siento, encontré un error al procesar tu solicitud. Por favor, inténtalo de nuevo.',
      fr: 'Désolé, j\'ai rencontré une erreur lors du traitement de votre demande. Veuillez réessayer.'
    };
    return messages[lang];
  };

  // Copy message
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied');
  };

  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    toast.success('Conversation cleared');
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Cypher AI Assistant
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </h3>
              <p className="text-sm text-gray-400">
                {AI_MODELS.find(m => m.id === config.model)?.name} • {LANGUAGES.find(l => l.code === config.language)?.flag}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfig(prev => ({ ...prev, voice: { ...prev.voice, enabled: !prev.voice.enabled }}))}
              className={`p-2 rounded-lg transition-colors ${
                config.voice.enabled 
                  ? 'bg-blue-600/20 text-blue-400' 
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {config.voice.enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={clearConversation}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
              title="Clear conversation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-gray-800 space-y-4"
            >
              {/* Model Selection */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">AI Model</label>
                <div className="grid grid-cols-3 gap-2">
                  {AI_MODELS.map(model => (
                    <button
                      key={model.id}
                      onClick={() => setConfig(prev => ({ ...prev, model: model.id }))}
                      className={`p-2 rounded-lg border transition-colors ${
                        config.model === model.id
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <span className="text-lg mb-1 block">{model.icon}</span>
                      <span className="text-xs">{model.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Language</label>
                <div className="grid grid-cols-4 gap-2">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setConfig(prev => ({ ...prev, language: lang.code }))}
                      className={`p-2 rounded-lg border transition-colors ${
                        config.language === lang.code
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <span className="text-lg mb-1 block">{lang.flag}</span>
                      <span className="text-xs">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Analysis Types */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Analysis Types</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(config.analysis).map(([type, enabled]) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          analysis: { ...prev.analysis, [type]: e.target.checked }
                        }))}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                      />
                      <span className="text-sm text-gray-300 capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-300 mb-2">
              {config.language === 'pt' ? 'Como posso ajudar?' :
               config.language === 'es' ? '¿Cómo puedo ayudar?' :
               config.language === 'fr' ? 'Comment puis-je aider?' :
               'How can I help you?'}
            </h4>
            <p className="text-gray-500 mb-6">
              {config.language === 'pt' ? 'Pergunte sobre Bitcoin, Ordinals, Runes ou análise de mercado' :
               config.language === 'es' ? 'Pregunta sobre Bitcoin, Ordinals, Runes o análisis de mercado' :
               config.language === 'fr' ? 'Posez des questions sur Bitcoin, Ordinals, Runes ou l\'analyse de marché' :
               'Ask about Bitcoin, Ordinals, Runes, or market analysis'}
            </p>
            
            {/* Preset Prompts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
              {PRESET_PROMPTS[config.language].map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setInput(prompt)}
                  className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm text-left transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
              >
                {message.role === 'assistant' && (
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                  <div className={`p-4 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-600/20 border border-blue-500/30' 
                      : 'bg-gray-800 border border-gray-700'
                  }`}>
                    <p className="text-gray-100 whitespace-pre-wrap">{message.content}</p>
                    
                    {message.metadata && (
                      <div className="mt-2 pt-2 border-t border-gray-700 flex items-center gap-4 text-xs text-gray-500">
                        {message.metadata.model && (
                          <span>{AI_MODELS.find(m => m.id === message.metadata?.model)?.name}</span>
                        )}
                        {message.metadata.tokens && (
                          <span>{message.metadata.tokens} tokens</span>
                        )}
                        {message.metadata.processingTime && (
                          <span>{message.metadata.processingTime}ms</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1 px-2">
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => copyMessage(message.content)}
                      className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {message.role === 'assistant' && config.voice.enabled && (
                      <button
                        onClick={() => generateVoice(message.content)}
                        className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    <span className="text-gray-400">
                      {config.language === 'pt' ? 'Analisando...' :
                       config.language === 'es' ? 'Analizando...' :
                       config.language === 'fr' ? 'Analyse en cours...' :
                       'Analyzing...'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleListening}
            className={`p-3 rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={
              config.language === 'pt' ? 'Digite sua pergunta...' :
              config.language === 'es' ? 'Escribe tu pregunta...' :
              config.language === 'fr' ? 'Tapez votre question...' :
              'Type your question...'
            }
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            disabled={isProcessing}
          />
          
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isProcessing}
            className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}