export class EnhancedVoiceService {
  private recognition: any;
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private language: string = 'pt-BR';
  private isInitialized: boolean = false;
  
  constructor() {
    // Defer initialization to avoid SSR issues
    this.initializeAsync();
  }

  private async initializeAsync() {
    // Only initialize in browser environment
    if (typeof window === 'undefined') return;
    
    try {
      this.synthesis = window.speechSynthesis;
      
      // Configurar reconhecimento de voz
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.language;
        this.recognition.maxAlternatives = 3;
      }
      
      this.isInitialized = true;
    } catch (error) {
    }
  }
  
  startListening(onResult: (text: string) => void, onError?: (error: any) => void): void {
    if (!this.isInitialized || !this.recognition) {
      console.error('Reconhecimento de voz não suportado ou não inicializado');
      return;
    }
    
    this.recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;
      onResult(text);
    };
    
    this.recognition.onerror = (event: any) => {
      console.error('Erro no reconhecimento:', event.error);
      if (onError) onError(event.error);
    };
    
    this.recognition.onend = () => {
      this.isListening = false;
      // Reiniciar automaticamente se ainda estiver ativo
      if (this.isListening) {
        this.recognition.start();
      }
    };
    
    this.recognition.start();
    this.isListening = true;
  }
  
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.isListening = false;
      this.recognition.stop();
    }
  }
  
  speak(text: string, options?: { rate?: number; pitch?: number; voice?: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized || !this.synthesis) {
        reject(new Error('Síntese de voz não suportada ou não inicializada'));
        return;
      }
      
      // Cancelar qualquer fala anterior
      this.synthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.language;
      utterance.rate = options?.rate || 1.1;
      utterance.pitch = options?.pitch || 1.0;
      utterance.volume = 1.0;
      
      // Selecionar voz em português se disponível
      const voices = this.synthesis.getVoices();
      const ptVoice = voices.find(voice => voice.lang.includes('pt'));
      if (ptVoice) {
        utterance.voice = ptVoice;
      }
      
      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);
      
      this.synthesis.speak(utterance);
    });
  }
  
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.isInitialized || !this.synthesis) return [];
    return this.synthesis.getVoices();
  }
  
  setLanguage(lang: string): void {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }
  
  isSupported(): boolean {
    return this.isInitialized && !!(this.recognition && this.synthesis);
  }
}

export class EnhancedVoiceCommandProcessor {
  private commands: Map<string, (params?: any) => void> = new Map();
  
  constructor() {
    this.initializeCommands();
  }
  
  private initializeCommands(): void {
    // Comandos de trading
    this.commands.set('iniciar bot', () => { /* noop - implement bot start */ });
    this.commands.set('parar bot', () => { /* noop - implement bot stop */ });
    this.commands.set('comprar bitcoin', () => { /* noop - implement buy */ });
    this.commands.set('vender bitcoin', () => { /* noop - implement sell */ });

    // Comandos de análise
    this.commands.set('análise de mercado', () => { /* noop - implement analysis */ });
    this.commands.set('mostrar portfolio', () => { /* noop - implement portfolio */ });
    this.commands.set('oportunidades', () => { /* noop - implement opportunities */ });
  }
  
  processCommand(text: string): { command: string; confidence: number; action?: () => void } {
    const lowerText = text.toLowerCase().trim();
    
    // Procurar comando exato
    for (const [command, action] of this.commands) {
      if (lowerText.includes(command)) {
        return { command, confidence: 0.9, action };
      }
    }
    
    // Análise de intenção mais flexível
    if (lowerText.includes('bot') && (lowerText.includes('iniciar') || lowerText.includes('começar'))) {
      return { command: 'iniciar bot', confidence: 0.8, action: this.commands.get('iniciar bot') };
    }
    
    if (lowerText.includes('mercado') || lowerText.includes('análise')) {
      return { command: 'análise de mercado', confidence: 0.7, action: this.commands.get('análise de mercado') };
    }
    
    return { command: 'unknown', confidence: 0.3 };
  }
  
  addCommand(trigger: string, action: (params?: any) => void): void {
    this.commands.set(trigger.toLowerCase(), action);
  }
  
  removeCommand(trigger: string): void {
    this.commands.delete(trigger.toLowerCase());
  }
  
  getCommands(): string[] {
    return Array.from(this.commands.keys());
  }
}