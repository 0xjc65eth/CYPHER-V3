'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface VoiceCommand {
  command: string[];
  callback: (...args: any[]) => void;
}

interface VoiceInterfaceProps {
  onCommand?: (action: any) => void;
  onResponse?: (data: any) => void;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  onCommand,
  onResponse
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);

  // Comandos de voz
  const commands: VoiceCommand[] = [
    {
      command: ['cypher', 'ei cypher', 'fala cypher', 'oi cypher'],
      callback: () => handleWakeWord()
    },
    {
      command: ['analise oportunidades', 'procure trades', 'analise mercado'],
      callback: () => handleAnalysis()
    },
    {
      command: ['execute trades', 'faça operações', 'execute operações'],
      callback: () => handleExecuteTrades()
    },
    {
      command: ['preço bitcoin', 'preço btc', 'valor bitcoin'],
      callback: () => handlePriceCheck('bitcoin')
    },
    {
      command: ['conectar carteira', 'conecte wallet'],
      callback: () => handleWalletConnect()
    },
    {
      command: ['parar', 'pare', 'stop'],
      callback: () => handleStop()
    }
  ];

  useEffect(() => {
    // Verificar suporte do navegador
    if (typeof window !== 'undefined') {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        setBrowserSupported(false);
        return;
      }

      // Inicializar Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-BR';
      recognitionRef.current.maxAlternatives = 1;

      // Event listeners
      recognitionRef.current.onstart = () => {
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            setConfidence(Math.round(result[0].confidence * 100));
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const fullTranscript = finalTranscript || interimTranscript;
        setTranscript(fullTranscript);

        // Processar comando se final
        if (finalTranscript) {
          processVoiceCommand(finalTranscript.toLowerCase().trim());
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Erro no reconhecimento de voz:', event.error);
        if (event.error === 'no-speech') {
          speak('Não consegui te ouvir, pode repetir?');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      // Inicializar Speech Synthesis
      if ('speechSynthesis' in window) {
        synthRef.current = window.speechSynthesis;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const processVoiceCommand = (text: string) => {

    // Verificar comandos específicos
    const matchedCommand = commands.find(cmd => 
      cmd.command.some(c => text.includes(c))
    );

    if (matchedCommand) {
      matchedCommand.callback();
    } else {
      // Processar linguagem natural
      processNaturalLanguage(text);
    }
  };

  const handleWakeWord = () => {
    setAiResponse('E aí, mano! Tô aqui, pode mandar!');
    speak('E aí, mano! Tô aqui, pode mandar!');
    setIsListening(true);
  };

  const handleAnalysis = async () => {
    setIsProcessing(true);
    setAiResponse('Beleza, vou dar uma olhada nas paradas pra você...');
    speak('Beleza, vou dar uma olhada nas paradas pra você...');

    try {
      // Simular análise
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const opportunities = [
        {
          type: 'arbitrage',
          pair: 'BTC/USDT',
          buyPrice: 45000,
          sellPrice: 45500,
          profit: 1.1,
          risk: 'low'
        },
        {
          type: 'trend',
          pair: 'ETH/USDT',
          signal: 'buy',
          confidence: 85,
          risk: 'medium'
        }
      ];

      const response = formatOpportunitiesResponse(opportunities);
      setAiResponse(response);
      speak(response);
      onResponse?.(opportunities);
    } catch (error) {
      const errorMsg = 'Pô, deu ruim aqui. Mas relaxa que vou tentar de novo.';
      setAiResponse(errorMsg);
      speak(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteTrades = async () => {
    setIsProcessing(true);
    const msg = 'Fechou! Vou executar essas operações pra você. Fica suave!';
    setAiResponse(msg);
    speak(msg);

    try {
      // Simular execução
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const results = {
        executed: 2,
        successful: 2,
        profit: 150.75
      };

      const response = `Pronto, chefe! Executei ${results.executed} operações. Todas deram certo! Lucro total: $${results.profit}.`;
      setAiResponse(response);
      speak(response);
      onResponse?.(results);
    } catch (error) {
      const errorMsg = 'Ih, deu um problema aqui. Melhor a gente revisar isso.';
      setAiResponse(errorMsg);
      speak(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePriceCheck = async (asset: string) => {
    setIsProcessing(true);
    const msg = `Vou ver o preço do ${asset} pra você...`;
    setAiResponse(msg);
    speak(msg);

    try {
      // Simular busca de preço
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const price = asset === 'bitcoin' ? 45234.67 : 2876.43;
      const change = asset === 'bitcoin' ? 2.3 : -1.2;
      
      const response = `${asset === 'bitcoin' ? 'Bitcoin' : asset} tá cotado em $${price.toLocaleString()}. ${change > 0 ? 'Subiu' : 'Desceu'} ${Math.abs(change)}% nas últimas 24h.`;
      setAiResponse(response);
      speak(response);
      onResponse?.({ asset, price, change });
    } catch (error) {
      const errorMsg = 'Não consegui pegar o preço agora, tenta de novo em uns segundos.';
      setAiResponse(errorMsg);
      speak(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWalletConnect = () => {
    const msg = 'Vou abrir o conectar de carteira pra você!';
    setAiResponse(msg);
    speak(msg);
    onCommand?.({ type: 'connect_wallet' });
  };

  const handleStop = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    const msg = 'Beleza, parei de escutar. Quando precisar, é só chamar!';
    setAiResponse(msg);
    speak(msg);
  };

  const processNaturalLanguage = async (text: string) => {
    setIsProcessing(true);
    
    try {
      // Em produção, usar OpenAI API
      const response = await fetch('/api/ai/process/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          context: 'trading',
          style: 'informal_br'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiResponse(data.response);
        speak(data.response);
        
        if (data.action) {
          onCommand?.(data.action);
        }
      } else {
        throw new Error('API error');
      }
    } catch (error) {
      // Fallback response
      const responses = [
        'Não entendi muito bem, pode explicar melhor?',
        'Hmm, não captei. Reformula aí pra mim.',
        'Desculpa, não peguei direito. Pode repetir?'
      ];
      const randomResponse = responses[Date.now() % responses.length];
      setAiResponse(randomResponse);
      speak(randomResponse);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatOpportunitiesResponse = (opportunities: any[]) => {
    if (opportunities.length === 0) {
      return 'Pô, tá osso hoje. Não achei nada muito bom não. Melhor esperar um pouco.';
    }

    let response = 'Aí, achei umas paradas interessantes:\n\n';
    
    opportunities.forEach((opp, idx) => {
      response += `${idx + 1}. ${opp.type === 'arbitrage' ? 'Arbitragem' : 'Trade'} `;
      response += `${opp.pair}: `;
      
      if (opp.type === 'arbitrage') {
        response += `compra por ${opp.buyPrice} e vende por ${opp.sellPrice}. `;
        response += `Lucro estimado: ${opp.profit}%. `;
      } else {
        response += `sinal de ${opp.signal}. `;
        response += `Confiança: ${opp.confidence}%. `;
      }
      
      if (opp.risk === 'low') {
        response += 'Essa tá tranquila, risco baixo.\n';
      } else if (opp.risk === 'medium') {
        response += 'Tem um risco médio, mas vale a pena.\n';
      } else {
        response += 'Cuidado com essa, tá arriscada.\n';
      }
    });

    return response;
  };

  const speak = (text: string) => {
    if (!synthRef.current) return;

    // Parar qualquer fala anterior
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1;
    utterance.pitch = 0.9;
    utterance.volume = 0.8;

    // Tentar usar voz brasileira se disponível
    const voices = synthRef.current.getVoices();
    const brazilianVoice = voices.find((voice: any) => 
      voice.lang.includes('pt-BR') || voice.lang.includes('pt')
    );
    
    if (brazilianVoice) {
      utterance.voice = brazilianVoice;
    }

    synthRef.current.speak(utterance);
  };

  const startListening = () => {
    if (!recognitionRef.current || !browserSupported) return;

    setTranscript('');
    setIsListening(true);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;

    setIsListening(false);
    recognitionRef.current.stop();
  };

  if (!browserSupported) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="text-center p-6">
          <div className="text-red-500 mb-4">❌</div>
          <p className="text-muted-foreground">
            Seu navegador não suporta reconhecimento de voz. 
            Use Chrome ou Edge para melhor experiência.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto bg-gradient-to-br from-purple-900/20 to-blue-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          Cypher AI Voice
          <Badge variant="outline" className="text-purple-400 border-purple-400">
            Beta
          </Badge>
        </CardTitle>
        <CardDescription>
          Converse com o Cypher em português brasileiro
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Visualizador de Voz */}
        {isListening && (
          <div className="voice-visualizer flex items-center justify-center gap-1 h-16">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={`voice-bar bg-gradient-to-t from-purple-500 to-blue-500 rounded-full transition-all duration-300`}
                style={{
                  width: '4px',
                  height: `${Math.random() * 40 + 10}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Botão de Microfone */}
        <div className="flex justify-center">
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            className={`w-20 h-20 rounded-full transition-all duration-300 ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
            }`}
          >
            {isProcessing ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-2xl">
                {isListening ? '🔴' : '🎤'}
              </span>
            )}
          </Button>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {isListening 
              ? 'Escutando... fale agora!' 
              : 'Clique no microfone para falar'
            }
          </p>
          
          {confidence > 0 && (
            <Badge variant="outline" className="mt-2">
              Confiança: {confidence}%
            </Badge>
          )}
        </div>

        <Separator />

        {/* Transcrição */}
        {transcript && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-purple-400">Você disse:</p>
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm italic">"{transcript}"</p>
            </div>
          </div>
        )}

        {/* Resposta da IA */}
        {aiResponse && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-blue-400">Cypher responde:</p>
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-3 rounded-lg border border-purple-500/20">
              <p className="text-sm">{aiResponse}</p>
            </div>
          </div>
        )}

        {/* Comandos Disponíveis */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Comandos:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/30 p-2 rounded">
              <span className="text-purple-400">"Ei Cypher"</span><br />
              Ativar IA
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <span className="text-purple-400">"Analise oportunidades"</span><br />
              Buscar trades
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <span className="text-purple-400">"Preço Bitcoin"</span><br />
              Verificar preços
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <span className="text-purple-400">"Execute trades"</span><br />
              Executar operações
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="text-center text-xs text-muted-foreground">
          Status: {isListening ? '🟢 Escutando' : isProcessing ? '🟡 Processando' : '⚪ Aguardando'}
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceInterface;