'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';

export function VoiceCommandInterface() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTranscript(transcript);
        processCommand(transcript);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const processCommand = async (text: string) => {
    try {
      const res = await fetch('/api/ai/voice-command/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: text })
      });
      const data = await res.json();
      setResponse(data.response || 'Comando processado!');
    } catch {
      setResponse('Erro ao processar comando');
    }
  };

  return (
    <Card className="p-6 bg-black/50 border-cyan-500/30">
      <h3 className="text-xl font-bold mb-4 text-cyan-400">Comandos de Voz</h3>
      
      <Button
        onClick={toggleListening}
        className={`w-full py-4 ${isListening ? 'bg-red-600' : 'bg-cyan-600'}`}
      >
        {isListening ? <MicOff className="mr-2" /> : <Mic className="mr-2" />}
        {isListening ? 'Parar' : 'Falar Comando'}
      </Button>

      {transcript && (
        <div className="mt-4 p-3 bg-gray-900 rounded">
          <p className="text-sm text-gray-400">Você disse:</p>
          <p className="text-white">{transcript}</p>
        </div>
      )}

      {response && (
        <div className="mt-4 p-3 bg-cyan-900/30 rounded">
          <p className="text-cyan-400">{response}</p>
        </div>
      )}
    </Card>
  );
}