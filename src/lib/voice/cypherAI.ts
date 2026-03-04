// CYPHER AI - Voice Assistant Core

// Declarações de tipo para Web Speech API
interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
}

// SpeechRecognition types already in lib.dom, access via (window as any).webkitSpeechRecognition

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export class CypherAI {
  private recognition: any | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private callbacks: Map<string, Function> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.setupRecognition();
      }
      
      this.synthesis = window.speechSynthesis;
    } else {
      this.synthesis = null;
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.toLowerCase();
      
      if (result.isFinal && transcript.includes('cypher')) {
        this.processCommand(transcript);
      }
    };
  }

  private processCommand(command: string) {
    const cleanCommand = command.replace(/cypher,?\s*/g, '').trim();
    
    const commands = [
      { pattern: /bitcoin\s+price/i, action: 'showBitcoinPrice' },
      { pattern: /arbitrage/i, action: 'findArbitrage' },
      { pattern: /dashboard/i, action: 'navigateDashboard' },
    ];

    for (const cmd of commands) {
      if (cmd.pattern.test(cleanCommand)) {
        const callback = this.callbacks.get(cmd.action);
        if (callback) callback(cleanCommand);
        return;
      }
    }
  }

  speak(text: string) {
    if (this.synthesis && typeof window !== 'undefined') {
      const utterance = new SpeechSynthesisUtterance(text);
      this.synthesis.speak(utterance);
    }
  }

  startListening() {
    if (this.recognition && !this.isListening) {
      this.isListening = true;
      this.recognition.start();
      this.speak('Cypher AI activated');
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.isListening = false;
      this.recognition.stop();
    }
  }

  on(action: string, callback: Function) {
    this.callbacks.set(action, callback);
  }
}

export const cypherAI = new CypherAI();