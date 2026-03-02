/**
 * CYPHER AI INTERFACE - CYPHER ORDi FUTURE V3
 * Multi-agent chat interface with agent routing
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Brain,
  Sparkles,
  MessageCircle,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Zap
} from 'lucide-react';
import { enhancedCypherAI, CypherAIResponse, CypherAIContext } from '@/services/enhanced-cypher-ai';
import { EnhancedLogger } from '@/lib/enhanced-logger';
import { ErrorReporter } from '@/lib/ErrorReporter';
import { AgentBadge } from '@/components/cypher-ai/AgentBadge';
import { AgentSelector } from '@/components/cypher-ai/AgentSelector';

interface AgentMeta {
  name: string;
  icon: string;
  color: string;
  specialty?: string;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  audioUrl?: string;
  timestamp: Date;
  mood?: string;
  emojis?: string[];
  action?: string;
  agent?: AgentMeta;
  dataSources?: string[];
}

export function CypherAIInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
      }
    };
  }, [currentAudio]);

  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      type: 'ai',
      content: 'Welcome to CYPHER AI Multi-Agent Terminal. Ask about market analysis, on-chain data, ordinals, macro trends, DeFi, risk management, sentiment, or quant analysis. Each query is routed to the best specialist agent.',
      timestamp: new Date(),
      agent: { name: 'Alpha', icon: '\u{1F4C8}', color: '#F7931A' },
    };

    setMessages([welcomeMessage]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputText;
    setInputText('');
    setIsProcessing(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // Call the multi-agent API directly to get agent metadata
      const body: Record<string, unknown> = {
        message: messageText,
        language: 'en-US',
        useGemini: true,
      };
      if (selectedAgent) {
        body.agentHint = selectedAgent;
      }

      const res = await fetch('/api/cypher-ai/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'API error');
      }

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        type: 'ai',
        content: data.response || 'No response received.',
        timestamp: new Date(),
        agent: data.agent || undefined,
        dataSources: data.agent?.dataFetchers || undefined,
      };

      setMessages(prev => [...prev, aiMessage]);

      EnhancedLogger.info('Cypher AI agent response received', {
        component: 'CypherAIInterface',
        agent: data.agent?.name,
        source: data.source,
      });

    } catch (error) {
      // Handle timeout with a friendly message
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutMessage: Message = {
          id: crypto.randomUUID(),
          type: 'ai',
          content: 'AI is taking too long to respond. Please try again.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, timeoutMessage]);
        return;
      }

      ErrorReporter.report(error as Error, {
        component: 'CypherAIInterface',
        action: 'sendMessage',
        message: messageText
      });

      // Fallback to enhancedCypherAI service with a hard timeout
      try {
        const context: CypherAIContext = {
          conversationHistory: messages.map(m => `${m.type}: ${m.content}`),
          timestamp: Date.now()
        };
        const fallbackPromise = enhancedCypherAI.processTextInput(messageText, context);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Fallback timeout')), 10000)
        );
        const response = await Promise.race([fallbackPromise, timeoutPromise]);
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          type: 'ai',
          content: response.text,
          audioUrl: response.audioUrl,
          timestamp: new Date(),
          mood: response.mood,
          emojis: response.emojis,
          action: response.action
        };
        setMessages(prev => [...prev, aiMessage]);
        if (audioEnabled && response.audioUrl) {
          playAudio(response.audioUrl);
        }
      } catch {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          type: 'ai',
          content: 'Connection error. Please try again.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAudioInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      ErrorReporter.report(error as Error, {
        component: 'CypherAIInterface',
        action: 'startRecording'
      });
      alert('Error accessing microphone. Check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudioInput = async (audioBlob: Blob) => {
    try {
      const audioFile = new File([audioBlob], 'audio.wav', { type: 'audio/wav' });

      const userMessage: Message = {
        id: crypto.randomUUID(),
        type: 'user',
        content: 'Audio message',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);

      const response = await enhancedCypherAI.processAudioInput(audioFile);

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        type: 'ai',
        content: response.text,
        audioUrl: response.audioUrl,
        timestamp: new Date(),
        mood: response.mood,
        emojis: response.emojis,
        action: response.action
      };

      setMessages(prev => [...prev, aiMessage]);

      if (audioEnabled && response.audioUrl) {
        playAudio(response.audioUrl);
      }
    } catch (error) {
      ErrorReporter.report(error as Error, {
        component: 'CypherAIInterface',
        action: 'processAudioInput'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = (audioUrl: string, messageId?: string) => {
    try {
      if (currentAudio) {
        currentAudio.pause();
      }
      const audio = new Audio(audioUrl);
      audio.onplay = () => setPlayingMessageId(messageId ?? null);
      audio.onended = () => setPlayingMessageId(null);
      audio.onerror = () => setPlayingMessageId(null);
      setCurrentAudio(audio);
      audio.play();
    } catch (error: any) {
      EnhancedLogger.warn('Failed to play audio', {
        component: 'CypherAIInterface',
        error: error.message
      });
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      setPlayingMessageId(null);
    }
  };

  const clearChat = () => {
    setMessages([]);
    enhancedCypherAI.clearHistory();
  };

  const copyMessage = (content: string) => {
    try {
      navigator.clipboard.writeText(content);
    } catch {
      // Clipboard API not available (e.g. non-HTTPS context)
    }
  };

  const getAgentBorderColor = (agent?: AgentMeta) => {
    if (!agent) return 'border-gray-700';
    return 'border-gray-700';
  };

  return (
    <div className="bg-black min-h-screen pt-20 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="bg-gray-900 border-orange-500/30 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Cypher AI</h1>
                  <p className="text-sm text-gray-400">Multi-Agent Analytics Terminal</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className="text-orange-500 hover:bg-orange-500/10"
                  aria-label={audioEnabled ? 'Mute audio' : 'Enable audio'}
                >
                  {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearChat}
                  className="text-orange-500 hover:bg-orange-500/10"
                  aria-label="Clear chat"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>

                <Badge className="bg-green-500/20 text-green-400">
                  ONLINE
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Chat Messages */}
        <Card className="bg-gray-900 border-gray-700 mb-6">
          <div className="p-4 h-[28rem] overflow-y-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-orange-500 text-white'
                      : `bg-gray-800 text-white ${getAgentBorderColor(message.agent)}`
                  }`}
                  style={
                    message.type === 'ai' && message.agent
                      ? {
                          borderLeft: `3px solid ${message.agent.color}`,
                          backgroundColor: `${message.agent.color}08`,
                        }
                      : undefined
                  }
                >
                  {/* Agent badge for AI messages */}
                  {message.type === 'ai' && message.agent && (
                    <div className="mb-2">
                      <AgentBadge
                        name={message.agent.name}
                        icon={message.agent.icon}
                        color={message.agent.color}
                        specialty={message.agent.specialty}
                      />
                    </div>
                  )}

                  {/* Legacy mood/action display for fallback responses */}
                  {message.type === 'ai' && !message.agent && message.mood && (
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-400">
                        {message.mood.toUpperCase()}
                      </span>
                    </div>
                  )}

                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* Data sources */}
                  {message.dataSources && message.dataSources.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {message.dataSources.map((src) => (
                        <span
                          key={src}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-700/50 text-gray-400"
                        >
                          {src.replace('fetch', '')}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs opacity-60">
                      {message.timestamp.toLocaleTimeString()}
                    </span>

                    <div className="flex items-center gap-1">
                      {message.audioUrl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => playingMessageId === message.id ? stopAudio() : playAudio(message.audioUrl!, message.id)}
                          className="h-6 w-6 p-0"
                          aria-label={playingMessageId === message.id ? 'Pause audio' : 'Play audio'}
                        >
                          {playingMessageId === message.id ?
                            <Pause className="w-3 h-3" /> :
                            <Play className="w-3 h-3" />
                          }
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyMessage(message.content)}
                        className="h-6 w-6 p-0"
                        aria-label="Copy message"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                    <span className="text-sm text-gray-400">
                      {selectedAgent ? `${selectedAgent} analyzing...` : 'Routing to agent...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </Card>

        {/* Input Area */}
        <Card className="bg-gray-900 border-gray-700">
          <div className="p-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask about markets, on-chain data, ordinals, macro, DeFi, risk, sentiment, or quant..."
                  className="bg-gray-800 border-gray-600 text-white resize-none"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isProcessing}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </Button>

                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  variant={isRecording ? "destructive" : "outline"}
                  className={isRecording ? "animate-pulse" : ""}
                  aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <AgentSelector value={selectedAgent} onChange={setSelectedAgent} />

              <div className="flex items-center gap-3 text-xs text-gray-400">
                {isRecording && <span>Recording...</span>}
                {audioEnabled && <span>Audio on</span>}
                <span>{messages.length} messages</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default CypherAIInterface;
