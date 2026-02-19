'use client';

// Voice Command Service for Cypher AI
export interface VoiceCommand {
  id: string;
  command: string;
  language: 'en' | 'pt' | 'fr' | 'es';
  confidence: number;
  timestamp: Date;
  action: VoiceAction;
  parameters?: any;
}

export interface VoiceAction {
  type: 'ANALYZE_BITCOIN' | 'SHOW_PORTFOLIO' | 'EXECUTE_TRADE' | 'MARKET_UPDATE' | 
        'PRICE_ALERT' | 'VOICE_CHAT' | 'NAVIGATION' | 'EMERGENCY_STOP';
  target?: string;
  data?: any;
}

export interface VoiceSettings {
  language: 'en' | 'pt' | 'fr' | 'es';
  voiceEnabled: boolean;
  speechEnabled: boolean;
  wakeWord: string;
  sensitivity: number;
  autoSpeak: boolean;
  volume: number;
}

export interface SpeechSynthesisConfig {
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  language: string;
}

class VoiceCommandService {
  private isInitialized = false;
  private isListening = false;
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private settings: VoiceSettings = {
    language: 'en',
    voiceEnabled: true,
    speechEnabled: true,
    wakeWord: 'cypher',
    sensitivity: 0.7,
    autoSpeak: true,
    volume: 0.8
  };

  private commandPatterns = {
    en: {
      'ANALYZE_BITCOIN': [
        /analyze bitcoin/i,
        /bitcoin analysis/i,
        /check bitcoin/i,
        /bitcoin price/i,
        /market analysis/i
      ],
      'SHOW_PORTFOLIO': [
        /show portfolio/i,
        /my portfolio/i,
        /portfolio status/i,
        /holdings/i,
        /balance/i
      ],
      'EXECUTE_TRADE': [
        /buy bitcoin/i,
        /sell bitcoin/i,
        /execute trade/i,
        /place order/i,
        /trade bitcoin/i
      ],
      'MARKET_UPDATE': [
        /market update/i,
        /crypto news/i,
        /market status/i,
        /current market/i
      ],
      'PRICE_ALERT': [
        /price alert/i,
        /set alert/i,
        /notify me when/i,
        /alert at/i
      ],
      'NAVIGATION': [
        /go to dashboard/i,
        /open trading/i,
        /show analytics/i,
        /navigate to/i
      ],
      'EMERGENCY_STOP': [
        /emergency stop/i,
        /stop all trades/i,
        /cancel everything/i,
        /emergency/i
      ]
    },
    pt: {
      'ANALYZE_BITCOIN': [
        /analisar bitcoin/i,
        /análise bitcoin/i,
        /verificar bitcoin/i,
        /preço bitcoin/i,
        /análise de mercado/i
      ],
      'SHOW_PORTFOLIO': [
        /mostrar portfólio/i,
        /meu portfólio/i,
        /status portfólio/i,
        /posições/i,
        /saldo/i
      ],
      'EXECUTE_TRADE': [
        /comprar bitcoin/i,
        /vender bitcoin/i,
        /executar trade/i,
        /fazer ordem/i,
        /negociar bitcoin/i
      ],
      'MARKET_UPDATE': [
        /atualização mercado/i,
        /notícias crypto/i,
        /status mercado/i,
        /mercado atual/i
      ],
      'PRICE_ALERT': [
        /alerta preço/i,
        /definir alerta/i,
        /me avise quando/i,
        /alerta em/i
      ],
      'NAVIGATION': [
        /ir para dashboard/i,
        /abrir trading/i,
        /mostrar analytics/i,
        /navegar para/i
      ],
      'EMERGENCY_STOP': [
        /parada emergência/i,
        /parar todos trades/i,
        /cancelar tudo/i,
        /emergência/i
      ]
    },
    fr: {
      'ANALYZE_BITCOIN': [
        /analyser bitcoin/i,
        /analyse bitcoin/i,
        /vérifier bitcoin/i,
        /prix bitcoin/i,
        /analyse marché/i
      ],
      'SHOW_PORTFOLIO': [
        /montrer portefeuille/i,
        /mon portefeuille/i,
        /statut portefeuille/i,
        /positions/i,
        /solde/i
      ],
      'EXECUTE_TRADE': [
        /acheter bitcoin/i,
        /vendre bitcoin/i,
        /exécuter trade/i,
        /placer ordre/i,
        /trader bitcoin/i
      ],
      'MARKET_UPDATE': [
        /mise à jour marché/i,
        /nouvelles crypto/i,
        /statut marché/i,
        /marché actuel/i
      ],
      'PRICE_ALERT': [
        /alerte prix/i,
        /définir alerte/i,
        /me prévenir quand/i,
        /alerte à/i
      ],
      'NAVIGATION': [
        /aller au tableau/i,
        /ouvrir trading/i,
        /montrer analytics/i,
        /naviguer vers/i
      ],
      'EMERGENCY_STOP': [
        /arrêt urgence/i,
        /arrêter tous trades/i,
        /annuler tout/i,
        /urgence/i
      ]
    },
    es: {
      'ANALYZE_BITCOIN': [
        /analizar bitcoin/i,
        /análisis bitcoin/i,
        /verificar bitcoin/i,
        /precio bitcoin/i,
        /análisis mercado/i
      ],
      'SHOW_PORTFOLIO': [
        /mostrar portafolio/i,
        /mi portafolio/i,
        /estado portafolio/i,
        /posiciones/i,
        /saldo/i
      ],
      'EXECUTE_TRADE': [
        /comprar bitcoin/i,
        /vender bitcoin/i,
        /ejecutar trade/i,
        /hacer orden/i,
        /operar bitcoin/i
      ],
      'MARKET_UPDATE': [
        /actualización mercado/i,
        /noticias crypto/i,
        /estado mercado/i,
        /mercado actual/i
      ],
      'PRICE_ALERT': [
        /alerta precio/i,
        /establecer alerta/i,
        /avisarme cuando/i,
        /alerta en/i
      ],
      'NAVIGATION': [
        /ir al dashboard/i,
        /abrir trading/i,
        /mostrar analytics/i,
        /navegar a/i
      ],
      'EMERGENCY_STOP': [
        /parada emergencia/i,
        /parar todos trades/i,
        /cancelar todo/i,
        /emergencia/i
      ]
    }
  };

  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (typeof window === 'undefined') return;

    try {
      // Initialize Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.getLanguageCode(this.settings.language);

        this.recognition.onresult = (event: any) => {
          this.handleSpeechResult(event);
        };

        this.recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          this.emit('error', { type: 'speech_recognition', error: event.error });
        };

        this.recognition.onend = () => {
          if (this.isListening) {
            // Restart recognition if it was supposed to be listening
            setTimeout(() => this.startListening(), 1000);
          }
        };
      }

      // Initialize Speech Synthesis
      if ('speechSynthesis' in window) {
        this.synthesis = window.speechSynthesis;
      }

      this.isInitialized = true;
      this.emit('initialized', { success: true });

    } catch (error) {
      console.error('Failed to initialize voice commands:', error);
      this.emit('error', { type: 'initialization', error });
    }
  }

  // Start listening for voice commands
  startListening(): boolean {
    if (!this.isInitialized || !this.recognition || !this.settings.voiceEnabled) {
      return false;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      this.emit('listening_started', {});
      return true;
    } catch (error) {
      console.error('Failed to start listening:', error);
      return false;
    }
  }

  // Stop listening for voice commands
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.emit('listening_stopped', {});
    }
  }

  // Toggle listening state
  toggleListening(): boolean {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      return this.startListening();
    }
  }

  // Handle speech recognition results
  private handleSpeechResult(event: any) {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // Emit interim results for real-time feedback
    if (interimTranscript) {
      this.emit('speech_interim', { transcript: interimTranscript });
    }

    // Process final transcript
    if (finalTranscript) {
      this.emit('speech_final', { transcript: finalTranscript });
      this.processCommand(finalTranscript);
    }
  }

  // Process voice command
  private processCommand(transcript: string) {
    const command = this.parseCommand(transcript);
    
    if (command) {
      this.emit('command_recognized', command);
      this.executeCommand(command);
    } else {
      // If no specific command, treat as chat input
      const chatCommand: VoiceCommand = {
        id: `voice_${Date.now()}`,
        command: transcript,
        language: this.settings.language,
        confidence: 0.8,
        timestamp: new Date(),
        action: {
          type: 'VOICE_CHAT',
          data: { message: transcript }
        }
      };
      
      this.emit('command_recognized', chatCommand);
      this.executeCommand(chatCommand);
    }
  }

  // Parse voice command from transcript
  private parseCommand(transcript: string): VoiceCommand | null {
    const normalizedTranscript = transcript.toLowerCase().trim();
    
    // Check for wake word
    if (!normalizedTranscript.includes(this.settings.wakeWord)) {
      return null;
    }

    const patterns = this.commandPatterns[this.settings.language];
    
    for (const [actionType, regexList] of Object.entries(patterns)) {
      for (const regex of regexList) {
        if (regex.test(normalizedTranscript)) {
          return {
            id: `voice_${Date.now()}`,
            command: transcript,
            language: this.settings.language,
            confidence: 0.9,
            timestamp: new Date(),
            action: {
              type: actionType as any,
              data: this.extractParameters(normalizedTranscript, actionType)
            }
          };
        }
      }
    }

    return null;
  }

  // Extract parameters from voice command
  private extractParameters(transcript: string, actionType: string): any {
    const params: any = {};

    switch (actionType) {
      case 'PRICE_ALERT':
        const priceMatch = transcript.match(/(\d+(?:\.\d+)?)/);
        if (priceMatch) {
          params.price = parseFloat(priceMatch[1]);
        }
        break;
        
      case 'EXECUTE_TRADE':
        const amountMatch = transcript.match(/(\d+(?:\.\d+)?)/);
        if (amountMatch) {
          params.amount = parseFloat(amountMatch[1]);
        }
        
        if (transcript.includes('buy') || transcript.includes('comprar') || 
            transcript.includes('acheter') || transcript.includes('comprar')) {
          params.side = 'buy';
        } else if (transcript.includes('sell') || transcript.includes('vender') || 
                   transcript.includes('vendre') || transcript.includes('vender')) {
          params.side = 'sell';
        }
        break;
        
      case 'NAVIGATION':
        if (transcript.includes('dashboard') || transcript.includes('painel')) {
          params.target = 'dashboard';
        } else if (transcript.includes('trading') || transcript.includes('negociação')) {
          params.target = 'trading';
        } else if (transcript.includes('analytics') || transcript.includes('análise')) {
          params.target = 'analytics';
        }
        break;
    }

    return params;
  }

  // Execute voice command
  private async executeCommand(command: VoiceCommand) {
    try {
      this.emit('command_executing', command);

      switch (command.action.type) {
        case 'ANALYZE_BITCOIN':
          this.emit('execute_analysis', { symbol: 'BTC' });
          await this.speak(this.getResponse('analyzing_bitcoin', command.language));
          break;

        case 'SHOW_PORTFOLIO':
          this.emit('execute_portfolio', {});
          await this.speak(this.getResponse('showing_portfolio', command.language));
          break;

        case 'EXECUTE_TRADE':
          this.emit('execute_trade', command.action.data);
          await this.speak(this.getResponse('executing_trade', command.language));
          break;

        case 'MARKET_UPDATE':
          this.emit('execute_market_update', {});
          await this.speak(this.getResponse('market_update', command.language));
          break;

        case 'PRICE_ALERT':
          this.emit('execute_price_alert', command.action.data);
          await this.speak(this.getResponse('price_alert_set', command.language));
          break;

        case 'NAVIGATION':
          this.emit('execute_navigation', command.action.data);
          await this.speak(this.getResponse('navigating', command.language));
          break;

        case 'EMERGENCY_STOP':
          this.emit('execute_emergency_stop', {});
          await this.speak(this.getResponse('emergency_stop', command.language));
          break;

        case 'VOICE_CHAT':
          this.emit('execute_voice_chat', command.action.data);
          break;

        default:
      }

      this.emit('command_executed', command);

    } catch (error) {
      console.error('Error executing command:', error);
      this.emit('command_error', { command, error });
      await this.speak(this.getResponse('command_error', command.language));
    }
  }

  // Text-to-speech
  async speak(text: string, config?: Partial<SpeechSynthesisConfig>): Promise<boolean> {
    if (!this.synthesis || !this.settings.speechEnabled) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        // Cancel any ongoing speech
        this.synthesis!.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Apply configuration
        const finalConfig = {
          voice: '',
          rate: 1,
          pitch: 1,
          volume: this.settings.volume,
          language: this.getLanguageCode(this.settings.language),
          ...config
        };

        utterance.rate = finalConfig.rate;
        utterance.pitch = finalConfig.pitch;
        utterance.volume = finalConfig.volume;
        utterance.lang = finalConfig.language;

        // Find appropriate voice
        const voices = this.synthesis!.getVoices();
        const voice = voices.find(v => 
          v.lang.startsWith(finalConfig.language) || 
          v.name.includes(finalConfig.voice)
        );
        
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onend = () => {
          this.emit('speech_ended', { text });
          resolve(true);
        };

        utterance.onerror = (error) => {
          console.error('Speech synthesis error:', error);
          this.emit('speech_error', { text, error });
          resolve(false);
        };

        this.synthesis!.speak(utterance);
        this.emit('speech_started', { text });

      } catch (error) {
        console.error('Failed to speak:', error);
        resolve(false);
      }
    });
  }

  // Get language-specific responses
  private getResponse(key: string, language: 'en' | 'pt' | 'fr' | 'es'): string {
    const responses = {
      en: {
        analyzing_bitcoin: "Analyzing Bitcoin market conditions...",
        showing_portfolio: "Opening your portfolio...",
        executing_trade: "Executing trade...",
        market_update: "Fetching market update...",
        price_alert_set: "Price alert has been set.",
        navigating: "Navigating...",
        emergency_stop: "Emergency stop activated. All operations halted.",
        command_error: "Sorry, I couldn't execute that command."
      },
      pt: {
        analyzing_bitcoin: "Analisando condições do mercado Bitcoin...",
        showing_portfolio: "Abrindo seu portfólio...",
        executing_trade: "Executando negociação...",
        market_update: "Buscando atualização do mercado...",
        price_alert_set: "Alerta de preço foi definido.",
        navigating: "Navegando...",
        emergency_stop: "Parada de emergência ativada. Todas operações interrompidas.",
        command_error: "Desculpe, não consegui executar esse comando."
      },
      fr: {
        analyzing_bitcoin: "Analyse des conditions du marché Bitcoin...",
        showing_portfolio: "Ouverture de votre portefeuille...",
        executing_trade: "Exécution du trade...",
        market_update: "Récupération de la mise à jour du marché...",
        price_alert_set: "L'alerte de prix a été définie.",
        navigating: "Navigation...",
        emergency_stop: "Arrêt d'urgence activé. Toutes les opérations arrêtées.",
        command_error: "Désolé, je n'ai pas pu exécuter cette commande."
      },
      es: {
        analyzing_bitcoin: "Analizando condiciones del mercado Bitcoin...",
        showing_portfolio: "Abriendo tu portafolio...",
        executing_trade: "Ejecutando operación...",
        market_update: "Obteniendo actualización del mercado...",
        price_alert_set: "Alerta de precio ha sido establecida.",
        navigating: "Navegando...",
        emergency_stop: "Parada de emergencia activada. Todas las operaciones detenidas.",
        command_error: "Lo siento, no pude ejecutar ese comando."
      }
    };

    return responses[language][key as keyof typeof responses[typeof language]] || responses.en[key as keyof typeof responses.en];
  }

  // Get language code for speech recognition/synthesis
  private getLanguageCode(language: 'en' | 'pt' | 'fr' | 'es'): string {
    const codes = {
      en: 'en-US',
      pt: 'pt-BR',
      fr: 'fr-FR',
      es: 'es-ES'
    };
    
    return codes[language];
  }

  // Event system
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }

  // Settings management
  updateSettings(newSettings: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    
    if (this.recognition) {
      this.recognition.lang = this.getLanguageCode(this.settings.language);
    }
    
    this.emit('settings_updated', this.settings);
  }

  getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  // Status methods
  isListeningActive(): boolean {
    return this.isListening;
  }

  isVoiceSupported(): boolean {
    return this.isInitialized && this.recognition !== null && this.synthesis !== null;
  }

  // Cleanup
  destroy() {
    this.stopListening();
    this.eventListeners.clear();
    
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
}

// Singleton instance
export const voiceCommandService = new VoiceCommandService();
export default voiceCommandService;