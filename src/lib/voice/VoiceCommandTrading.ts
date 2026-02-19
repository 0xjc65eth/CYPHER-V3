/**
 * 🎤 VOICE COMMAND TRADING SYSTEM - CYPHER AI v3.0
 * Sistema completo de comandos de voz para trading em português
 */

export interface VoiceCommand {
  command: string;
  action: string;
  parameters?: any;
  confidence: number;
}

export interface VoiceConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

export class VoiceCommandTrading {
  private recognition: any;
  private isListening: boolean = false;
  private lastTranscript: string = '';
  
  // Comandos de trading em português
  private commandPatterns = {
    // Comandos básicos
    'iniciar trading': { action: 'start_trading', params: {} },
    'parar trading': { action: 'stop_trading', params: {} },
    'parada de emergência': { action: 'emergency_stop', params: {} },
    
    // Comandos de compra/venda
    'comprar bitcoin': { action: 'buy', params: { asset: 'bitcoin' } },
    'vender bitcoin': { action: 'sell', params: { asset: 'bitcoin' } },
    'comprar ethereum': { action: 'buy', params: { asset: 'ethereum' } },
    'vender ethereum': { action: 'sell', params: { asset: 'ethereum' } },
    
    // Status e consultas
    'mostrar posições': { action: 'show_positions', params: {} },
    'mostrar lucro': { action: 'show_profit', params: {} },
    'status do bot': { action: 'bot_status', params: {} },
    'preço do bitcoin': { action: 'bitcoin_price', params: {} },
    
    // Configurações
    'modo conservador': { action: 'set_mode', params: { mode: 'conservative' } },
    'modo agressivo': { action: 'set_mode', params: { mode: 'aggressive' } },
    'modo moderado': { action: 'set_mode', params: { mode: 'moderate' } }
  };

  constructor(private config: VoiceConfig = {
    language: 'pt-BR',
    continuous: true,
    interimResults: true,
    maxAlternatives: 1
  }) {
    this.initializeRecognition();
  }

  private initializeRecognition() {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;

    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        this.lastTranscript = result[0].transcript.toLowerCase().trim();
        this.processVoiceCommand(this.lastTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // Restart if we're supposed to be listening
        this.recognition.start();
      }
    };
  }

  startListening(): boolean {
    if (!this.recognition) return false;
    
    try {
      this.isListening = true;
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting recognition:', error);
      return false;
    }
  }

  stopListening(): void {
    if (!this.recognition) return;
    
    this.isListening = false;
    this.recognition.stop();
  }

  private processVoiceCommand(transcript: string): VoiceCommand | null {
    // Limpar e normalizar o texto
    const cleanTranscript = transcript.toLowerCase().trim();
    
    // Buscar por comandos conhecidos
    for (const [pattern, command] of Object.entries(this.commandPatterns)) {
      if (cleanTranscript.includes(pattern)) {
        const voiceCommand: VoiceCommand = {
          command: pattern,
          action: command.action,
          parameters: command.params,
          confidence: 0.9
        };
        
        this.executeCommand(voiceCommand);
        return voiceCommand;
      }
    }

    return null;
  }

  private executeCommand(command: VoiceCommand): void {
    // Emitir evento para que outros componentes possam escutar
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('voiceCommand', { 
        detail: command 
      }));
    }
  }

  getLastTranscript(): string {
    return this.lastTranscript;
  }

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
  }

  getListeningStatus(): boolean {
    return this.isListening;
  }

  // Síntese de voz para responder aos comandos
  speak(text: string): void {
    if (typeof window === 'undefined') return;
    
    const synthesis = window.speechSynthesis;
    if (!synthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    
    synthesis.speak(utterance);
  }

  // Respostas automáticas em português
  getResponseMessage(action: string): string {
    const responses: Record<string, string> = {
      'start_trading': 'Bot de trading iniciado com sucesso',
      'stop_trading': 'Bot de trading parado',
      'emergency_stop': 'Parada de emergência ativada',
      'buy': 'Ordem de compra executada',
      'sell': 'Ordem de venda executada',
      'show_positions': 'Mostrando posições abertas',
      'bot_status': 'Status do bot atualizado'
    };

    return responses[action] || 'Comando executado';
  }
}