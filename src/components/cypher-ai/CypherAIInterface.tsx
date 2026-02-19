'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { Card, Title, Text, Badge, Button, TextInput } from '@tremor/react'
import { 
  RiRobotLine, 
  RiMicLine, 
  RiMicOffLine,
  RiVolumeUpLine,
  RiSendPlaneLine,
  RiSettings3Line,
  RiGlobalLine,
  RiChatSmile3Line,
  RiLightbulbLine,
  RiLoader4Line,
  RiRefreshLine,
  RiStarLine,
  RiShieldCheckLine,
  RiArrowUpLine as RiTrendingUpLine,
  RiVolumeDownLine as RiVolumeOffLine
} from 'react-icons/ri'

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: number
  language: string
  audioUrl?: string
  analysis?: MarketAnalysis
}

interface MarketAnalysis {
  sentiment: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  keyPoints: string[]
  recommendation: string
  riskLevel: 'low' | 'medium' | 'high'
}

interface AIPersonality {
  id: string
  name: string
  description: string
  expertise: string[]
  language: string
  voice: string
  avatar: string
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' }
]

const AI_PERSONALITIES: AIPersonality[] = [
  {
    id: 'cypher_analyst',
    name: 'Cypher Analyst',
    description: 'Expert Bitcoin market analyst with deep knowledge of technical analysis',
    expertise: ['Technical Analysis', 'Market Trends', 'Price Prediction'],
    language: 'en',
    voice: 'professional_male',
    avatar: '🤖'
  },
  {
    id: 'ordinals_expert',
    name: 'Ordinals Oracle',
    description: 'Specialist in Bitcoin Ordinals, inscriptions, and NFT markets',
    expertise: ['Ordinals', 'NFTs', 'Collections', 'Rarity Analysis'],
    language: 'en',
    voice: 'friendly_female',
    avatar: '🎨'
  },
  {
    id: 'runes_master',
    name: 'Runes Master',
    description: 'Expert in Runes protocol, tokenomics, and DeFi strategies',
    expertise: ['Runes Protocol', 'DeFi', 'Tokenomics', 'Yield Farming'],
    language: 'en',
    voice: 'wise_male',
    avatar: 'ᚱ'
  },
  {
    id: 'multilingual_guide',
    name: 'Global Guide',
    description: 'Multilingual assistant for international users',
    expertise: ['General Guidance', 'Education', 'Portfolio Management'],
    language: 'multi',
    voice: 'neutral',
    avatar: '🌍'
  }
]

const QUICK_ACTIONS = [
  { id: 'market_analysis', label: 'Market Analysis', icon: RiTrendingUpLine },
  { id: 'portfolio_review', label: 'Portfolio Review', icon: RiStarLine },
  { id: 'price_prediction', label: 'Price Prediction', icon: RiLightbulbLine },
  { id: 'risk_assessment', label: 'Risk Assessment', icon: RiShieldCheckLine }
]

export function CypherAIInterface() {
  const wallet = useWallet()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [selectedPersonality, setSelectedPersonality] = useState(AI_PERSONALITIES[0])
  const [showSettings, setShowSettings] = useState(false)
  const [voiceSettings, setVoiceSettings] = useState({
    speed: 1,
    pitch: 1,
    volume: 0.8
  })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<any>(null)

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = selectedLanguage

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setInputMessage(transcript)
          setIsRecording(false)
        }

        recognitionRef.current.onerror = () => {
          setIsRecording(false)
        }

        recognitionRef.current.onend = () => {
          setIsRecording(false)
        }
      }

      // Speech Synthesis
      synthRef.current = window.speechSynthesis
    }

    // Add welcome message
    if (messages.length === 0) {
      addAIMessage(getWelcomeMessage(), null)
    }
  }, [selectedLanguage])

  const getWelcomeMessage = () => {
    const welcomeMessages = {
      en: `Hello! I'm ${selectedPersonality.name}, your AI-powered Bitcoin analytics assistant. I can help you with market analysis, portfolio management, and answer questions about Bitcoin, Ordinals, and Runes. How can I assist you today?`,
      pt: `Olá! Eu sou ${selectedPersonality.name}, seu assistente de análise Bitcoin com IA. Posso ajudá-lo com análise de mercado, gestão de portfólio e responder perguntas sobre Bitcoin, Ordinals e Runes. Como posso ajudá-lo hoje?`,
      es: `¡Hola! Soy ${selectedPersonality.name}, tu asistente de análisis de Bitcoin con IA. Puedo ayudarte con análisis de mercado, gestión de cartera y responder preguntas sobre Bitcoin, Ordinals y Runes. ¿Cómo puedo ayudarte hoy?`,
      fr: `Bonjour! Je suis ${selectedPersonality.name}, votre assistant d'analyse Bitcoin alimenté par l'IA. Je peux vous aider avec l'analyse de marché, la gestion de portefeuille et répondre aux questions sur Bitcoin, Ordinals et Runes. Comment puis-je vous aider aujourd'hui?`
    }
    return welcomeMessages[selectedLanguage as keyof typeof welcomeMessages] || welcomeMessages.en
  }

  const addAIMessage = (content: string, analysis: MarketAnalysis | null) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type: 'ai',
      content,
      timestamp: Date.now(),
      language: selectedLanguage,
      analysis
    }
    setMessages(prev => [...prev, message])
    
    // Text-to-speech
    if (isVoiceEnabled && synthRef.current) {
      speakMessage(content)
    }
  }

  const addUserMessage = (content: string) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: Date.now(),
      language: selectedLanguage
    }
    setMessages(prev => [...prev, message])
  }

  const speakMessage = (text: string) => {
    if (synthRef.current && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = getVoiceLanguage(selectedLanguage)
      utterance.rate = voiceSettings.speed
      utterance.pitch = voiceSettings.pitch
      utterance.volume = voiceSettings.volume
      
      // Try to find a voice that matches the language
      const voices = synthRef.current.getVoices()
      const voice = voices.find((v: any) => v.lang.startsWith(selectedLanguage))
      if (voice) {
        utterance.voice = voice
      }
      
      synthRef.current.speak(utterance)
    }
  }

  const getVoiceLanguage = (lang: string) => {
    const langMap: Record<string, string> = {
      en: 'en-US',
      pt: 'pt-BR',
      es: 'es-ES',
      fr: 'fr-FR'
    }
    return langMap[lang] || 'en-US'
  }

  const startRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(true)
      recognitionRef.current.start()
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage = inputMessage.trim()
    addUserMessage(userMessage)
    setInputMessage('')
    setIsLoading(true)

    try {
      // Simulate API call to Cypher AI
      const response = await fetch('/api/cypher-ai/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          language: selectedLanguage,
          personality: selectedPersonality.id,
          walletData: wallet.walletData,
          context: {
            connectedWallet: wallet.connected,
            isPremium: wallet.isPremium
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      addAIMessage(data.response, data.analysis)
    } catch (error) {
      console.error('Error sending message:', error)
      addAIMessage(
        selectedLanguage === 'pt' ? 'Desculpe, ocorreu um erro. Tente novamente.' :
        selectedLanguage === 'es' ? 'Lo siento, ocurrió un error. Inténtalo de nuevo.' :
        selectedLanguage === 'fr' ? 'Désolé, une erreur s\'est produite. Veuillez réessayer.' :
        'Sorry, an error occurred. Please try again.',
        null
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (actionId: string) => {
    const actions = {
      market_analysis: {
        en: 'Please provide a comprehensive market analysis for Bitcoin',
        pt: 'Por favor, forneça uma análise de mercado abrangente para Bitcoin',
        es: 'Por favor, proporciona un análisis de mercado integral para Bitcoin',
        fr: 'Veuillez fournir une analyse de marché complète pour Bitcoin'
      },
      portfolio_review: {
        en: 'Review my current portfolio and suggest improvements',
        pt: 'Revise meu portfólio atual e sugira melhorias',
        es: 'Revisa mi cartera actual y sugiere mejoras',
        fr: 'Examinez mon portefeuille actuel et suggérez des améliorations'
      },
      price_prediction: {
        en: 'What is your Bitcoin price prediction for the next week?',
        pt: 'Qual é sua previsão de preço do Bitcoin para a próxima semana?',
        es: '¿Cuál es tu predicción del precio de Bitcoin para la próxima semana?',
        fr: 'Quelle est votre prédiction de prix Bitcoin pour la semaine prochaine?'
      },
      risk_assessment: {
        en: 'Assess the current market risks and opportunities',
        pt: 'Avalie os riscos e oportunidades atuais do mercado',
        es: 'Evalúa los riesgos y oportunidades actuales del mercado',
        fr: 'Évaluez les risques et opportunités actuels du marché'
      }
    }

    const action = actions[actionId as keyof typeof actions]
    if (action) {
      setInputMessage(action[selectedLanguage as keyof typeof action])
    }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <Card className="bg-gradient-to-br from-[#1A1A3A]/90 to-[#2A2A5A]/90 border border-indigo-500/30 shadow-2xl backdrop-blur-xl">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-2xl">
              {selectedPersonality.avatar}
            </div>
            <div>
              <Title className="text-white flex items-center gap-2">
                {selectedPersonality.name}
                {wallet.isPremium && (
                  <RiShieldCheckLine className="w-5 h-5 text-yellow-400" />
                )}
              </Title>
              <Text className="text-gray-300 text-sm">{selectedPersonality.description}</Text>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
              {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.flag} {selectedLanguage.toUpperCase()}
            </Badge>
            
            <button
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                isVoiceEnabled 
                  ? 'bg-emerald-600/50 text-emerald-300' 
                  : 'bg-gray-700/50 text-gray-400'
              }`}
            >
              {isVoiceEnabled ? <RiVolumeUpLine className="w-4 h-4" /> : <RiVolumeOffLine className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors"
            >
              <RiSettings3Line className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 p-4 bg-black/30 rounded-xl border border-gray-600/30">
            <Text className="text-white text-sm font-medium mb-4">AI Assistant Settings</Text>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Language Selection */}
              <div>
                <Text className="text-gray-400 text-xs mb-2">Language</Text>
                <div className="grid grid-cols-2 gap-2">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLanguage(lang.code)}
                      className={`p-2 text-sm rounded-lg transition-colors ${
                        selectedLanguage === lang.code
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700/30 text-gray-300 hover:bg-gray-600/30'
                      }`}
                    >
                      {lang.flag} {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Personality */}
              <div>
                <Text className="text-gray-400 text-xs mb-2">AI Personality</Text>
                <div className="space-y-2">
                  {AI_PERSONALITIES.map((personality) => (
                    <button
                      key={personality.id}
                      onClick={() => setSelectedPersonality(personality)}
                      className={`w-full p-2 text-left text-sm rounded-lg transition-colors ${
                        selectedPersonality.id === personality.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700/30 text-gray-300 hover:bg-gray-600/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{personality.avatar}</span>
                        <div>
                          <div className="font-medium">{personality.name}</div>
                          <div className="text-xs opacity-80">{personality.expertise.join(', ')}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Voice Settings */}
            {isVoiceEnabled && (
              <div className="mt-4 pt-4 border-t border-gray-600/30">
                <Text className="text-gray-400 text-xs mb-3">Voice Settings</Text>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Text className="text-gray-400 text-xs mb-1">Speed</Text>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={voiceSettings.speed}
                      onChange={(e) => setVoiceSettings(prev => ({ ...prev, speed: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Text className="text-gray-400 text-xs mb-1">Pitch</Text>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={voiceSettings.pitch}
                      onChange={(e) => setVoiceSettings(prev => ({ ...prev, pitch: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Text className="text-gray-400 text-xs mb-1">Volume</Text>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={voiceSettings.volume}
                      onChange={(e) => setVoiceSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-4">
          <Text className="text-gray-400 text-sm mb-2">Quick Actions</Text>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700/30 hover:bg-gray-600/30 rounded-lg transition-colors text-sm text-gray-300 hover:text-white"
              >
                <action.icon className="w-4 h-4" />
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="bg-black/20 rounded-xl border border-gray-600/30 h-80 overflow-y-auto p-4 mb-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}>
                <div className="text-sm">{message.content}</div>
                
                {message.analysis && (
                  <div className="mt-2 pt-2 border-t border-gray-600/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`${
                        message.analysis.sentiment === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' :
                        message.analysis.sentiment === 'bearish' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {message.analysis.sentiment.toUpperCase()}
                      </Badge>
                      <Text className="text-xs text-gray-400">
                        {message.analysis.confidence}% confidence
                      </Text>
                    </div>
                    
                    <div className="text-xs space-y-1">
                      {message.analysis.keyPoints.map((point, index) => (
                        <div key={index} className="flex items-start gap-1">
                          <span className="text-indigo-400">•</span>
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-2 text-xs">
                      <Text className="text-gray-400">Recommendation:</Text>
                      <Text className="text-gray-200">{message.analysis.recommendation}</Text>
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-gray-100 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <RiLoader4Line className="w-4 h-4 animate-spin" />
                  <Text className="text-sm">Thinking...</Text>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <TextInput
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                selectedLanguage === 'pt' ? 'Digite sua mensagem...' :
                selectedLanguage === 'es' ? 'Escribe tu mensaje...' :
                selectedLanguage === 'fr' ? 'Tapez votre message...' :
                'Type your message...'
              }
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="bg-black/30 border-gray-600/30 text-white pr-12"
            />
          </div>
          
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-lg transition-colors ${
              isRecording
                ? 'bg-red-600/50 text-red-300 animate-pulse'
                : 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
            }`}
          >
            {isRecording ? <RiMicOffLine className="w-5 h-5" /> : <RiMicLine className="w-5 h-5" />}
          </button>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="p-3 bg-indigo-600/50 hover:bg-indigo-500/50 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <RiSendPlaneLine className="w-5 h-5" />
          </button>
        </div>
      </div>
    </Card>
  )
}