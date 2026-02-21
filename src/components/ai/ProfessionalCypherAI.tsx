'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  TrendingUp,
  Zap,
  Eye,
  Target,
  BarChart3,
  Activity,
  Settings,
  Download,
  Share,
  Cpu,
  Network,
  Database,
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  Globe,
  Bell,
  Loader2
} from 'lucide-react';

// 🧠 AI Response Interface
interface AIResponse {
  id: string;
  type: 'analysis' | 'recommendation' | 'alert' | 'insight';
  content: string;
  confidence: number;
  timestamp: number;
  sources: string[];
  actions?: AIAction[];
  visualData?: any;
}

interface AIAction {
  id: string;
  type: 'trade' | 'watch' | 'research' | 'alert';
  label: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  params: any;
}

// 🎯 AI Agent Status
interface AIAgent {
  id: string;
  name: string;
  model: 'gpt-4' | 'gemini-pro' | 'claude-3' | 'custom';
  status: 'active' | 'idle' | 'thinking' | 'error';
  specialty: string;
  confidence: number;
  tasks: number;
}

export function ProfessionalCypherAI() {
  // 🎯 State Management
  const [messages, setMessages] = useState<AIResponse[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gpt-4' | 'gemini-pro' | 'multi'>('multi');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [analysisMode, setAnalysisMode] = useState<'real-time' | 'deep' | 'predictive'>('real-time');
  
  // 🎯 Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);

  // 🎤 Voice Recognition Setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        if (event.results[event.results.length - 1].isFinal) {
          setInputText(transcript);
          setIsListening(false);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // 🤖 Initialize AI Agents
  useEffect(() => {
    const initialAgents: AIAgent[] = [
      {
        id: 'gpt-4-analyst',
        name: 'GPT-4 Market Analyst',
        model: 'gpt-4',
        status: 'active',
        specialty: 'Market Analysis & Predictions',
        confidence: 0.94,
        tasks: 12
      },
      {
        id: 'gemini-scanner',
        name: 'Gemini Opportunity Scanner',
        model: 'gemini-pro',
        status: 'active',
        specialty: 'Ordinals & Runes Discovery',
        confidence: 0.89,
        tasks: 8
      },
      {
        id: 'claude-risk',
        name: 'Claude Risk Manager',
        model: 'claude-3',
        status: 'active',
        specialty: 'Risk Assessment & Portfolio',
        confidence: 0.92,
        tasks: 5
      },
      {
        id: 'custom-sentiment',
        name: 'Sentiment Engine',
        model: 'custom',
        status: 'thinking',
        specialty: 'Social & News Analysis',
        confidence: 0.87,
        tasks: 15
      }
    ];
    setAgents(initialAgents);
  }, []);

  // 🔄 Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 🎤 Voice Recognition Control
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // 🔊 Text-to-Speech
  const speakResponse = async (text: string) => {
    if (!audioEnabled || !text) return;
    
    try {
      // Use ElevenLabs API for professional voice
      const response = await fetch('/api/ai/text-to-speech/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text.substring(0, 500), // Limit for cost control
          voice_id: 'professional_male'
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (error) {
      console.error('Text-to-speech error:', error);
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text.substring(0, 200));
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        speechSynthesis.speak(utterance);
      }
    }
  };

  // 🧠 AI Processing Function
  const processAIRequest = async (query: string) => {
    setIsGenerating(true);
    
    try {
      // Multi-model analysis with fallbacks
      const responses = await Promise.allSettled([
        callOpenAI(query).catch(() => generateFallbackResponse(query, 'openai')),
        callGemini(query).catch(() => generateFallbackResponse(query, 'gemini')),
        callCustomAnalysis(query).catch(() => generateFallbackResponse(query, 'custom'))
      ]);

      // Always get at least one response (even if fallback)
      const validResponses = responses
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<AIResponse>).value);

      if (validResponses.length > 0) {
        // Select best response based on confidence
        const bestResponse = validResponses.reduce((prev, current) => 
          prev.confidence > current.confidence ? prev : current
        );

        setMessages(prev => [...prev, bestResponse]);
        
        // Speak response if enabled
        if (audioEnabled && bestResponse.content) {
          speakResponse(bestResponse.content);
        }
      } else {
        // Ultimate fallback
        const fallbackResponse = generateFallbackResponse(query, 'system');
        setMessages(prev => [...prev, fallbackResponse]);
      }
    } catch (error) {
      console.error('AI processing error:', error);
      const errorFallback = generateFallbackResponse(query, 'error');
      setMessages(prev => [...prev, errorFallback]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate Fallback Response
  const generateFallbackResponse = (query: string, source: string): AIResponse => {
    console.warn('[ProfessionalCypherAI] Using fallback data');
    const analysisTemplates = {
      bitcoin: {
        content: `Based on current market conditions, Bitcoin is showing consolidation patterns. Key support levels are holding around $42,000-$44,000 range. Volume analysis suggests retail interest continues.`,
        confidence: 0
      },
      ordinals: {
        content: `Ordinals market analysis: Floor prices for top collections are showing volatility. Daily inscription volume remains moderate with growing utility focus. Collections with proven roadmaps showing resilience.`,
        confidence: 0
      },
      runes: {
        content: `Runes protocol showing steady development. Etching activity indicates selective participation. Focus on runes with strong communities and utility cases recommended.`,
        confidence: 0
      },
      brc20: {
        content: `BRC-20 ecosystem analysis: ORDI maintaining market leadership with consolidation. Emerging tokens showing speculative interest. Risk management essential in this volatile sector.`,
        confidence: 0
      }
    };

    const queryLower = query.toLowerCase();
    let template = analysisTemplates.bitcoin; // default

    if (queryLower.includes('ordinal')) template = analysisTemplates.ordinals;
    else if (queryLower.includes('rune')) template = analysisTemplates.runes;
    else if (queryLower.includes('brc') || queryLower.includes('token')) template = analysisTemplates.brc20;

    const actions = [];
    if (template.confidence > 0.8) {
      actions.push({
        id: 'monitor-action',
        type: 'watch' as const,
        label: 'Monitor Opportunity',
        description: 'Continue monitoring this asset for optimal entry',
        risk: 'low' as const,
        params: { action: 'watch' }
      });
    }

    return {
      id: `fallback-${Date.now()}`,
      type: 'analysis',
      content: template.content + `\n\n⚠️ Analysis generated using fallback system due to API limitations. For full professional analysis, ensure API connectivity.`,
      confidence: template.confidence,
      timestamp: Date.now(),
      sources: [`CYPHER AI Fallback (${source})`],
      actions
    };
  };

  // 🎯 OpenAI Integration
  const callOpenAI = async (query: string): Promise<AIResponse> => {
    const response = await fetch('/api/ai/openai-analysis/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query,
        model: 'gpt-4-turbo',
        context: 'bitcoin_ordinals_trading'
      })
    });

    const data = await response.json();
    
    return {
      id: `openai-${Date.now()}`,
      type: 'analysis',
      content: data.analysis,
      confidence: data.confidence || 0.85,
      timestamp: Date.now(),
      sources: ['OpenAI GPT-4', 'Real-time market data'],
      actions: data.actions || []
    };
  };

  // 💎 Gemini Integration
  const callGemini = async (query: string): Promise<AIResponse> => {
    const response = await fetch('/api/ai/gemini-analysis/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query,
        model: 'gemini-pro',
        focus: 'ordinals_runes_brc20'
      })
    });

    const data = await response.json();
    
    return {
      id: `gemini-${Date.now()}`,
      type: 'insight',
      content: data.insight,
      confidence: data.confidence || 0.82,
      timestamp: Date.now(),
      sources: ['Google Gemini Pro', 'Blockchain analytics'],
      actions: data.recommendations || []
    };
  };

  // 🔧 Custom Analysis
  const callCustomAnalysis = async (query: string): Promise<AIResponse> => {
    // Custom ML model for Bitcoin ecosystem
    const response = await fetch('/api/ai/custom-analysis/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query,
        networks: ['bitcoin', 'ordinals', 'runes'],
        depth: analysisMode
      })
    });

    const data = await response.json();
    
    return {
      id: `custom-${Date.now()}`,
      type: 'recommendation',
      content: data.recommendation,
      confidence: data.confidence || 0.88,
      timestamp: Date.now(),
      sources: ['CYPHER Custom Model', 'Multi-source aggregation'],
      actions: data.trade_signals || []
    };
  };

  // ❌ Error Message
  const addErrorMessage = (error: string) => {
    const errorResponse: AIResponse = {
      id: `error-${Date.now()}`,
      type: 'alert',
      content: error,
      confidence: 0,
      timestamp: Date.now(),
      sources: ['System']
    };
    setMessages(prev => [...prev, errorResponse]);
  };

  // 📝 Handle Submit
  const handleSubmit = async () => {
    if (!inputText.trim() || isGenerating) return;

    // Add user message
    const userMessage: AIResponse = {
      id: `user-${Date.now()}`,
      type: 'analysis',
      content: inputText,
      confidence: 1,
      timestamp: Date.now(),
      sources: ['User Input']
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Process with AI
    await processAIRequest(inputText);
  };

  // 🎯 Quick Actions
  const quickActions = [
    { label: 'Analyze Current Market', query: 'Analyze the current Bitcoin and Ordinals market conditions with trading recommendations' },
    { label: 'Find Runes Opportunities', query: 'Scan for profitable Runes trading opportunities with high confidence scores' },
    { label: 'BRC-20 Alpha Scanner', query: 'Identify undervalued BRC-20 tokens with growth potential in the next 7 days' },
    { label: 'Portfolio Risk Check', query: 'Evaluate my current portfolio risk and suggest optimizations for Bitcoin ecosystem assets' },
    { label: 'Mempool Fee Analysis', query: 'Analyze current mempool conditions and recommend optimal transaction timing' },
    { label: 'Whale Movement Alert', query: 'Check for significant whale movements in Bitcoin, Ordinals, and major BRC-20 tokens' }
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 flex flex-col">
      {/* 🎛️ Professional Header */}
      <div className="bg-black/50 backdrop-blur-xl border-b border-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">CYPHER AI</h1>
                <p className="text-sm text-gray-400">Professional Trading Intelligence</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {agents.map(agent => (
                <div key={agent.id} className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full">
                  <div className={`w-2 h-2 rounded-full ${
                    agent.status === 'active' ? 'bg-green-500' :
                    agent.status === 'thinking' ? 'bg-yellow-500 animate-pulse' :
                    agent.status === 'idle' ? 'bg-gray-500' : 'bg-red-500'
                  }`} />
                  <span className="text-xs text-gray-300">{agent.model.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Analysis Mode:</span>
              <select 
                value={analysisMode}
                onChange={(e) => setAnalysisMode(e.target.value as any)}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-white text-sm"
              >
                <option value="real-time">Real-time</option>
                <option value="deep">Deep Analysis</option>
                <option value="predictive">Predictive</option>
              </select>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={audioEnabled ? 'text-green-400' : 'text-gray-500'}
            >
              {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* 📊 AI Agents Status */}
      <div className="bg-gray-900/50 border-b border-gray-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {agents.map(agent => (
            <Card key={agent.id} className="bg-gray-800 border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{agent.name}</span>
                <Badge className={`text-xs ${
                  agent.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  agent.status === 'thinking' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {agent.status}
                </Badge>
              </div>
              <div className="text-xs text-gray-400 mb-2">{agent.specialty}</div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Confidence</span>
                <span className="text-xs text-white font-medium">{(agent.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full" 
                  style={{ width: `${agent.confidence * 100}%` }}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 💬 Messages Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* 📝 Chat Interface */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">CYPHER AI Ready</h2>
                <p className="text-gray-400 mb-6">Professional AI analysis for Bitcoin, Ordinals, Runes & BRC-20 trading</p>
                
                {/* Quick Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="p-4 h-auto border-gray-700 hover:border-gray-600 text-left"
                      onClick={() => {
                        setInputText(action.query);
                        handleSubmit();
                      }}
                    >
                      <div>
                        <div className="font-medium text-white mb-1">{action.label}</div>
                        <div className="text-xs text-gray-400">{action.query.substring(0, 60)}...</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="space-y-3">
                <Card className={`p-6 ${
                  message.sources?.[0] === 'User Input' 
                    ? 'bg-blue-900/20 border-blue-800 ml-12' 
                    : 'bg-gray-900 border-gray-700 mr-12'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.sources?.[0] === 'User Input'
                          ? 'bg-blue-600' 
                          : 'bg-gradient-to-r from-purple-500 to-pink-500'
                      }`}>
                        {message.sources?.[0] === 'User Input' ? (
                          <span className="text-white text-sm font-bold">U</span>
                        ) : (
                          <Brain className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {message.sources?.[0] === 'User Input' ? 'You' : 'CYPHER AI'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    
                    {message.confidence > 0 && message.sources?.[0] !== 'User Input' && (
                      <Badge className={`${
                        message.confidence > 0.8 ? 'bg-green-500/20 text-green-400' :
                        message.confidence > 0.6 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {(message.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-gray-200 leading-relaxed mb-4">
                    {message.content}
                  </div>
                  
                  {message.sources && message.sources[0] !== 'User Input' && (
                    <div className="border-t border-gray-700 pt-3">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {message.sources.map((source, index) => (
                          <Badge key={index} variant="outline" className="text-xs border-gray-600 text-gray-400">
                            {source}
                          </Badge>
                        ))}
                      </div>
                      
                      {message.actions && message.actions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {message.actions.map((action) => (
                            <Button
                              key={action.id}
                              size="sm"
                              variant="outline"
                              className={`border-gray-600 text-xs ${
                                action.type === 'trade' ? 'hover:border-green-500 hover:text-green-400' :
                                action.type === 'watch' ? 'hover:border-blue-500 hover:text-blue-400' :
                                action.type === 'alert' ? 'hover:border-yellow-500 hover:text-yellow-400' :
                                'hover:border-purple-500 hover:text-purple-400'
                              }`}
                            >
                              {action.type === 'trade' && <TrendingUp className="w-3 h-3 mr-1" />}
                              {action.type === 'watch' && <Eye className="w-3 h-3 mr-1" />}
                              {action.type === 'alert' && <Bell className="w-3 h-3 mr-1" />}
                              {action.type === 'research' && <Target className="w-3 h-3 mr-1" />}
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </div>
            ))}

            {isGenerating && (
              <Card className="bg-gray-900 border-gray-700 p-6 mr-12">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">CYPHER AI</div>
                    <div className="text-xs text-gray-400">Analyzing...</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-gray-400">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm">Processing with multiple AI models...</span>
                </div>
              </Card>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* 📝 Input Area */}
          <div className="border-t border-gray-800 p-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="Ask CYPHER AI about Bitcoin, Ordinals, Runes, BRC-20..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  disabled={isGenerating}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleListening}
                    className={`p-2 ${isListening ? 'text-red-400' : 'text-gray-400'}`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              <Button 
                onClick={handleSubmit}
                disabled={!inputText.trim() || isGenerating}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6"
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            {isListening && (
              <div className="mt-3 flex items-center gap-2 text-red-400">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm">Listening...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfessionalCypherAI;