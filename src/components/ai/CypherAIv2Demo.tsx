'use client'

/**
 * 🧠 CYPHER AI v2 Demo Component
 * Showcasing Gemini-like capabilities with streaming, advanced NLU, and conversation flow
 */

import React, { useState, useRef, useEffect } from 'react';
import { useCypherAIv2 } from '@/hooks/useCypherAIv2';
import type { ConversationMessage, AIPersonality } from '@/ai/cypher-v2/types';

// Icons
import { 
  MicrophoneIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  ChartBarIcon,
  UserIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

const CypherAIv2Demo: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [showInsights, setShowInsights] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle SSR hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const {
    // States
    isInitialized,
    isProcessing,
    isThinking,
    isListening,
    isSpeaking,
    isStreaming,
    messages,
    currentMessage,
    suggestions,
    dialogState,
    conversationInsights,
    voiceEnabled,
    voiceAmplitude,
    marketData,
    userExpertise,
    personality,
    activeStreams,
    streamingProgress,
    
    // Actions
    sendMessage,
    startListening,
    stopListening,
    toggleVoice,
    setPersonality,
    setUserExpertise,
    selectSuggestion,
    resetConversation,
    clearMessages,
    
    // Error
    error
  } = useCypherAIv2();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentMessage]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;
    
    try {
      await sendMessage(inputText);
      setInputText('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageIcon = (message: ConversationMessage) => {
    switch (message.role) {
      case 'user':
        return <UserIcon className="w-6 h-6 text-blue-500" />;
      case 'assistant':
        return <CpuChipIcon className="w-6 h-6 text-green-500" />;
      case 'system':
        return <ChartBarIcon className="w-6 h-6 text-gray-500" />;
      default:
        return <CpuChipIcon className="w-6 h-6" />;
    }
  };

  const getEmotionColor = (emotion?: string) => {
    switch (emotion) {
      case 'excited': return 'text-green-600';
      case 'concerned': return 'text-orange-600';
      case 'analytical': return 'text-blue-600';
      case 'confident': return 'text-purple-600';
      case 'happy': return 'text-green-500';
      default: return 'text-gray-700';
    }
  };

  const getPhaseColor = (phase?: string) => {
    switch (phase) {
      case 'greeting': return 'bg-green-100 text-green-800';
      case 'information_gathering': return 'bg-blue-100 text-blue-800';
      case 'analysis': return 'bg-purple-100 text-purple-800';
      case 'recommendation': return 'bg-orange-100 text-orange-800';
      case 'conclusion': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (!isMounted || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Inicializando CYPHER AI v2...</h2>
          <p className="text-gray-500 mt-2">Carregando capacidades Gemini-like</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                🧠 CYPHER AI v2
                <span className="text-sm font-normal bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Gemini-like
                </span>
              </h1>
              <p className="text-gray-600 mt-1">
                Conversa inteligente com streaming, NLU avançado e gerenciamento de diálogo
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Voice Control */}
              <button
                onClick={toggleVoice}
                className={`p-3 rounded-full transition-colors ${voiceEnabled ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                title={voiceEnabled ? 'Desativar voz' : 'Ativar voz'}
              >
                {voiceEnabled ? (
                  <SpeakerWaveIcon className="w-6 h-6" />
                ) : (
                  <SpeakerXMarkIcon className="w-6 h-6" />
                )}
              </button>
              
              {/* Reset Conversation */}
              <button
                onClick={resetConversation}
                className="p-3 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                title="Reiniciar conversa"
              >
                <ArrowPathIcon className="w-6 h-6" />
              </button>
              
              {/* Insights Toggle */}
              <button
                onClick={() => setShowInsights(!showInsights)}
                className="px-4 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
              >
                {showInsights ? 'Ocultar' : 'Mostrar'} Insights
              </button>
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-gray-600">Status: {isInitialized ? 'Online' : 'Offline'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs ${getPhaseColor(dialogState.phase)}`}>
                {dialogState.phase}
              </span>
              {dialogState.topic && (
                <span className="text-gray-500">• Tópico: {dialogState.topic}</span>
              )}
            </div>
            
            {isStreaming && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-600">Streaming... {Math.round(streamingProgress * 100)}%</span>
              </div>
            )}
            
            {activeStreams > 0 && (
              <span className="text-orange-600">
                {activeStreams} stream(s) ativo(s)
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Main Chat Area */}
          <div className="flex-1 bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Messages */}
            <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role !== 'user' && (
                    <div className="flex-shrink-0">
                      {getMessageIcon(message)}
                    </div>
                  )}
                  
                  <div
                    className={`max-w-md p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-500 text-white' : message.role === 'system' ? 'bg-gray-200 text-gray-700' : 'bg-white border shadow-sm'}`}
                  >
                    <div className={getEmotionColor(message.metadata?.emotion)}>
                      {message.content}
                    </div>

                    {message.metadata?.confidence && (
                      <div className="text-xs mt-2 opacity-70">
                        Confiança: {Math.round(message.metadata.confidence * 100)}%
                      </div>
                    )}
                    
                    <div className="text-xs mt-1 opacity-50">
                      {message.timestamp?.toLocaleTimeString()}
                    </div>
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      {getMessageIcon(message)}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Current streaming message */}
              {currentMessage && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <CpuChipIcon className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="max-w-md p-3 rounded-lg bg-white border shadow-sm">
                    <div className="text-gray-700">
                      {currentMessage}
                      <span className="animate-pulse">|</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Processing indicators */}
              {isThinking && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <CpuChipIcon className="w-6 h-6 text-blue-500 animate-pulse" />
                  </div>
                  <div className="max-w-md p-3 rounded-lg bg-blue-50 border">
                    <div className="text-blue-700 flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      Pensando...
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="px-6 py-3 bg-yellow-50 border-t border-yellow-200">
                <p className="text-sm text-yellow-800 mb-2">💡 Sugestões:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => selectSuggestion(suggestion)}
                      className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm hover:bg-yellow-300 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Input Area */}
            <div className="p-6 bg-white border-t">
              <div className="flex gap-3 items-end">
                {/* Voice button with amplitude indicator */}
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`p-3 rounded-full transition-all ${isListening ? 'bg-red-100 text-red-600 hover:bg-red-200 scale-110' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                  disabled={!voiceEnabled}
                  style={{
                    transform: isListening ? `scale(${1.1 + voiceAmplitude / 200})` : 'scale(1)'
                  }}
                >
                  <MicrophoneIcon className="w-6 h-6" />
                </button>
                
                <div className="flex-1">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem ou use o microfone..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={2}
                    disabled={isProcessing}
                  />
                </div>
                
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isProcessing}
                  className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PaperAirplaneIcon className="w-6 h-6" />
                </button>
              </div>
              
              {/* Processing indicators */}
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                {isProcessing && <span className="text-blue-600">Processando...</span>}
                {isSpeaking && <span className="text-green-600">🔊 Falando...</span>}
                {isListening && <span className="text-red-600">🎤 Escutando...</span>}
              </div>
            </div>
          </div>
          
          {/* Insights Panel */}
          {showInsights && (
            <div className="w-80 bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Insights da Conversa</h3>
              
              {/* User Profile */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">👤 Perfil do Usuário</h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm text-gray-600">Expertise:</label>
                    <select
                      value={userExpertise}
                      onChange={(e) => setUserExpertise(e.target.value as any)}
                      className="ml-2 text-sm border rounded px-2 py-1"
                    >
                      <option value="beginner">Iniciante</option>
                      <option value="intermediate">Intermediário</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600">Personalidade:</label>
                    <select
                      value={personality as any}
                      onChange={(e) => setPersonality(e.target.value as unknown as AIPersonality)}
                      className="ml-2 text-sm border rounded px-2 py-1"
                    >
                      <option value="professional">Profissional</option>
                      <option value="friendly">Amigável</option>
                      <option value="analytical">Analítica</option>
                      <option value="casual">Casual</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Dialog State */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">🗣️ Estado do Diálogo</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Fase:</span>
                    <span className={`px-2 py-1 rounded text-xs ${getPhaseColor(dialogState.phase)}`}>
                      {dialogState.phase}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Confiança:</span>
                    <span>{Math.round(dialogState.confidence * 100)}%</span>
                  </div>
                  
                  {dialogState.topic && (
                    <div className="flex justify-between">
                      <span>Tópico:</span>
                      <span className="text-blue-600">{dialogState.topic}</span>
                    </div>
                  )}
                  
                  {dialogState.pendingActions.length > 0 && (
                    <div>
                      <span>Ações pendentes:</span>
                      <ul className="text-xs text-gray-500 mt-1">
                        {dialogState.pendingActions.map((action, i) => (
                          <li key={i}>• {action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Market Data */}
              {marketData && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-2">💰 Dados de Mercado</h4>
                  <div className="space-y-1 text-sm">
                    {marketData.bitcoin?.price && (
                      <div className="flex justify-between">
                        <span>Bitcoin:</span>
                        <span className="font-mono">${marketData.bitcoin.price.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {marketData.bitcoin?.change24h !== undefined && (
                      <div className="flex justify-between">
                        <span>24h:</span>
                        <span className={`font-mono ${marketData.bitcoin.change24h > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {marketData.bitcoin.change24h > 0 ? '+' : ''}{marketData.bitcoin.change24h.toFixed(2)}%
                        </span>
                      </div>
                    )}
                    
                    {marketData.bitcoin?.source && (
                      <div className="text-xs text-gray-500 mt-2">
                        Fonte: {marketData.bitcoin.source}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Conversation Insights */}
              {conversationInsights && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">🧠 Insights Avançados</h4>
                  <div className="text-sm space-y-1">
                    {conversationInsights.recentFlow && (
                      <div>
                        <span className="text-gray-600">Fluxo recente:</span>
                        <div className="text-xs text-gray-500 mt-1">
                          {conversationInsights.recentFlow.join(' → ')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <span>❌</span>
              <span className="font-medium">Erro:</span>
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CypherAIv2Demo;