/**
 * 🎤 VOICE CONTROL PANEL - CYPHER AI v3.0
 * Painel avançado de controle por voz
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Settings,
  Brain,
  Languages,
  Zap,
  Activity,
  MessageSquare,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface VoiceCommand {
  id: string;
  timestamp: Date;
  text: string;
  confidence: number;
  intent: string;
  status: 'processing' | 'executed' | 'failed';
  response?: string;
}

interface VoiceSettings {
  language: string;
  sensitivity: number;
  volume: number;
  autoResponse: boolean;
  continuousListening: boolean;
}

export function VoiceControlPanel() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [settings, setSettings] = useState<VoiceSettings>({
    language: 'pt-BR',
    sensitivity: 70,
    volume: 80,
    autoResponse: true,
    continuousListening: false
  });
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for speech recognition support
    const hasSupport = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    setVoiceSupported(hasSupport);

    if (hasSupport) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = settings.language;

      recognitionRef.current.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript;
        
        setCurrentTranscript(transcript);
        
        if (event.results[last].isFinal) {
          handleVoiceCommand(transcript, event.results[last][0].confidence);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (settings.continuousListening && isListening) {
          recognitionRef.current.start();
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [settings.language, settings.continuousListening, isListening]);

  const handleVoiceCommand = (text: string, confidence: number) => {
    const command: VoiceCommand = {
      id: Date.now().toString(),
      timestamp: new Date(),
      text: text.trim(),
      confidence: confidence * 100,
      intent: detectIntent(text),
      status: 'processing'
    };

    setCommands(prev => [command, ...prev.slice(0, 19)]);
    
    // Simulate command processing
    setTimeout(() => {
      executeCommand(command);
    }, 1000);
  };

  const detectIntent = (text: string): string => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('comprar') || lowerText.includes('buy')) {
      return 'BUY_CRYPTO';
    } else if (lowerText.includes('vender') || lowerText.includes('sell')) {
      return 'SELL_CRYPTO';
    } else if (lowerText.includes('iniciar') || lowerText.includes('start')) {
      return 'START_TRADING';
    } else if (lowerText.includes('parar') || lowerText.includes('stop')) {
      return 'STOP_TRADING';
    } else if (lowerText.includes('lucro') || lowerText.includes('profit')) {
      return 'SHOW_PROFIT';
    } else if (lowerText.includes('modo') || lowerText.includes('mode')) {
      return 'CHANGE_MODE';
    } else if (lowerText.includes('fechar') || lowerText.includes('close')) {
      return 'CLOSE_POSITIONS';
    } else if (lowerText.includes('mercado') || lowerText.includes('market')) {
      return 'MARKET_STATUS';
    } else if (lowerText.includes('ajuda') || lowerText.includes('help')) {
      return 'HELP';
    }
    
    return 'UNKNOWN';
  };

  const executeCommand = (command: VoiceCommand) => {
    let response = '';
    let status: 'executed' | 'failed' = 'executed';

    switch (command.intent) {
      case 'BUY_CRYPTO':
        response = 'Ordem de compra executada com sucesso';
        break;
      case 'SELL_CRYPTO':
        response = 'Ordem de venda executada com sucesso';
        break;
      case 'START_TRADING':
        response = 'Trading automático iniciado';
        break;
      case 'STOP_TRADING':
        response = 'Trading automático pausado';
        break;
      case 'SHOW_PROFIT':
        response = 'Seu lucro atual é de $2,847.50';
        break;
      case 'CHANGE_MODE':
        response = 'Modo de trading alterado';
        break;
      case 'CLOSE_POSITIONS':
        response = 'Todas as posições foram fechadas';
        break;
      case 'MARKET_STATUS':
        response = 'Bitcoin está em alta, $110,500';
        break;
      case 'HELP':
        response = 'Comandos disponíveis: comprar, vender, iniciar trading, mostrar lucro';
        break;
      default:
        response = 'Comando não reconhecido';
        status = 'failed';
    }

    setCommands(prev => 
      prev.map(cmd => 
        cmd.id === command.id 
          ? { ...cmd, status, response }
          : cmd
      )
    );

    if (settings.autoResponse && status === 'executed') {
      speak(response);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = settings.language;
      utterance.volume = settings.volume / 100;
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      
      utterance.onend = () => setIsSpeaking(false);
      
      speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!voiceSupported) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setCurrentTranscript('');
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const getIntentColor = (intent: string) => {
    const colors: Record<string, string> = {
      'BUY_CRYPTO': 'bg-green-500',
      'SELL_CRYPTO': 'bg-red-500',
      'START_TRADING': 'bg-blue-500',
      'STOP_TRADING': 'bg-orange-500',
      'SHOW_PROFIT': 'bg-yellow-500',
      'CHANGE_MODE': 'bg-purple-500',
      'CLOSE_POSITIONS': 'bg-pink-500',
      'MARKET_STATUS': 'bg-cyan-500',
      'HELP': 'bg-gray-500',
      'UNKNOWN': 'bg-red-400'
    };
    return colors[intent] || 'bg-gray-500';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'executed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
    }
  };

  if (!voiceSupported) {
    return (
      <Card className="bg-gray-900 border-gray-800 p-6">
        <div className="text-center">
          <MicOff className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Voice Control Not Supported</h3>
          <p className="text-gray-400">Your browser doesn't support speech recognition.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Voice Control Header */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`}>
              {isListening ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-gray-400" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Voice Control</h2>
              <p className="text-gray-400">
                {isListening ? 'Listening...' : 'Voice recognition inactive'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant={isListening ? 'default' : 'secondary'}>
              {isListening ? 'Active' : 'Inactive'}
            </Badge>
            <Button 
              onClick={toggleListening}
              variant={isListening ? 'destructive' : 'default'}
              className="flex items-center space-x-2"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isListening ? 'Stop' : 'Start'}</span>
            </Button>
          </div>
        </div>

        {/* Current Transcript */}
        {currentTranscript && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-400">Live Transcript:</span>
            </div>
            <p className="text-white italic">"{currentTranscript}"</p>
          </div>
        )}
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="commands" className="space-y-4">
        <TabsList className="grid grid-cols-3 bg-gray-800">
          <TabsTrigger value="commands">Command History</TabsTrigger>
          <TabsTrigger value="settings">Voice Settings</TabsTrigger>
          <TabsTrigger value="training">Voice Training</TabsTrigger>
        </TabsList>

        <TabsContent value="commands" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Commands</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {commands.length === 0 ? (
                <div className="text-center py-8">
                  <Mic className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No voice commands yet. Start speaking!</p>
                </div>
              ) : (
                commands.map((command) => (
                  <div key={command.id} className="p-4 bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getIntentColor(command.intent)}`} />
                        <span className="text-white font-medium">"{command.text}"</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(command.status)}
                        <span className="text-sm text-gray-400">
                          {command.confidence.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="outline" className="text-xs">
                        {command.intent.replace('_', ' ')}
                      </Badge>
                      <span className="text-gray-500">
                        {command.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {command.response && (
                      <div className="mt-2 p-2 bg-gray-700 rounded text-sm text-gray-300">
                        <div className="flex items-center space-x-2">
                          <Volume2 className="w-3 h-3 text-blue-500" />
                          <span>Response: {command.response}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Quick Commands */}
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Voice Commands</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { text: 'Comprar Bitcoin', intent: 'BUY_CRYPTO' },
                { text: 'Mostrar Lucro', intent: 'SHOW_PROFIT' },
                { text: 'Iniciar Trading', intent: 'START_TRADING' },
                { text: 'Status do Mercado', intent: 'MARKET_STATUS' }
              ].map((cmd, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-3 flex flex-col items-center space-y-2"
                  onClick={() => speak(cmd.text)}
                >
                  <div className={`w-3 h-3 rounded-full ${getIntentColor(cmd.intent)}`} />
                  <span className="text-xs text-center">{cmd.text}</span>
                </Button>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Voice Settings</h3>
            
            <div className="space-y-6">
              {/* Language Selection */}
              <div>
                <label className="flex items-center space-x-2 mb-3">
                  <Languages className="w-4 h-4 text-blue-500" />
                  <span className="text-white font-medium">Language</span>
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                  <option value="fr-FR">Français</option>
                </select>
              </div>

              {/* Sensitivity */}
              <div>
                <label className="flex items-center space-x-2 mb-3">
                  <Mic className="w-4 h-4 text-green-500" />
                  <span className="text-white font-medium">Sensitivity: {settings.sensitivity}%</span>
                </label>
                <Slider
                  value={[settings.sensitivity]}
                  onValueChange={(value: number[]) => setSettings(prev => ({ ...prev, sensitivity: value[0] }))}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>

              {/* Volume */}
              <div>
                <label className="flex items-center space-x-2 mb-3">
                  <Volume2 className="w-4 h-4 text-purple-500" />
                  <span className="text-white font-medium">Voice Volume: {settings.volume}%</span>
                </label>
                <Slider
                  value={[settings.volume]}
                  onValueChange={(value: number[]) => setSettings(prev => ({ ...prev, volume: value[0] }))}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Quiet</span>
                  <span>Loud</span>
                </div>
              </div>

              {/* Toggle Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2">
                    <Brain className="w-4 h-4 text-yellow-500" />
                    <span className="text-white font-medium">Auto Response</span>
                  </label>
                  <Button
                    variant={settings.autoResponse ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSettings(prev => ({ ...prev, autoResponse: !prev.autoResponse }))}
                  >
                    {settings.autoResponse ? 'On' : 'Off'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-cyan-500" />
                    <span className="text-white font-medium">Continuous Listening</span>
                  </label>
                  <Button
                    variant={settings.continuousListening ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSettings(prev => ({ ...prev, continuousListening: !prev.continuousListening }))}
                  >
                    {settings.continuousListening ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Voice Training</h3>
            <div className="text-center py-8">
              <Brain className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-white mb-2">Train Your Voice Model</h4>
              <p className="text-gray-400 mb-6">
                Improve recognition accuracy by recording sample commands
              </p>
              <Button className="flex items-center space-x-2 mx-auto">
                <Zap className="w-4 h-4" />
                <span>Start Training Session</span>
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}