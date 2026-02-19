// CYPHER AI v2 - Voice Module
// Handles speech recognition, synthesis, and voice command processing

import EventEmitter from 'events';
import { AIOrchestrator } from '../integrations/AIOrchestrator';
import type { 
  CypherAIConfig, 
  VoiceConfig, 
  Intent, 
  VoiceCommand,
  VoiceResponse,
  EmotionType 
} from '../types';

export class VoiceModule extends EventEmitter {
  private config: CypherAIConfig;
  private recognition: any;
  private synthesis: any;
  private isListeningActive: boolean = false;
  private isSpeakingActive: boolean = false;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private aiOrchestrator: AIOrchestrator;
  private analyser: AnalyserNode | null = null;

  constructor(config: CypherAIConfig) {
    super();
    this.config = config;
    
    // Initialize AI Orchestrator for enhanced voice capabilities
    this.aiOrchestrator = new AIOrchestrator(config);
  }

  async initialize(): Promise<void> {
    try {
      // Only initialize in browser environment
      if (typeof window === 'undefined') {
        return;
      }
      
      // Initialize Web Speech API
      this.initWebSpeechAPI();
      
      // Initialize audio context for amplitude detection
      await this.initAudioContext();
      
      this.emit('initialized');
    } catch (error) {
      console.error('Erro ao inicializar VoiceModule:', error);
      // Don't throw error to prevent SSR failures
    }
  }

  private initWebSpeechAPI(): void {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    // @ts-ignore
    const SpeechSynthesis = window.speechSynthesis;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.config.language || this.config.voice?.language || 'pt-BR';

      this.recognition.onstart = () => {
        this.isListeningActive = true;
        this.emit('listeningStarted');
      };

      this.recognition.onend = () => {
        this.isListeningActive = false;
        this.emit('listeningEnded');
      };

      this.recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        const confidence = event.results[current][0].confidence;

        if (event.results[current].isFinal) {
          this.emit('transcription', transcript);
          this.processVoiceCommand(transcript, confidence);
        } else {
          this.emit('interimResult', transcript);
        }
      };

      this.recognition.onerror = (event: any) => {
        // Handle different types of speech recognition errors
        switch (event.error) {
          case 'network':
            // Don't emit error for network issues, just retry
            setTimeout(() => {
              if (this.isListeningActive && this.recognition) {
                try {
                  this.recognition.start();
                } catch (error) {
                }
              }
            }, 3000);
            break;
          
          case 'not-allowed':
            console.error('❌ Permissão de microfone negada');
            this.emit('error', new Error('Permissão de microfone necessária para comando de voz'));
            break;
          
          case 'no-speech':
            // Don't emit error for no speech, this is normal
            break;

          case 'audio-capture':
            break;

          case 'service-not-allowed':
            break;
          
          default:
            // Don't emit errors for common browser issues
        }
      };
    }

    if (SpeechSynthesis) {
      this.synthesis = SpeechSynthesis;
    }
  }

  private async initAudioContext(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        // Only create AudioContext if it doesn't exist and browser supports it
        if (!this.audioContext) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            this.audioContext = new AudioContextClass();
          }
        }

        // Only proceed if AudioContext is available and not closed
        if (this.audioContext && this.audioContext.state !== 'closed') {
          // Resume context if suspended
          if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
          }

          // Request microphone access
          try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
              audio: { 
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              } 
            });

            // Only create nodes if context is still running
            if (this.audioContext.state === 'running') {
              const source = this.audioContext.createMediaStreamSource(this.mediaStream);
              this.analyser = this.audioContext.createAnalyser();
              this.analyser.fftSize = 256;
              source.connect(this.analyser);

              // Start amplitude monitoring
              this.monitorAmplitude();
            }
          } catch (micError) {
          }
        }
      }
    } catch (error) {
    }
  }

  private monitorAmplitude(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkAmplitude = () => {
      if (this.analyser && this.isListeningActive) {
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate average amplitude
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Emit amplitude (0-100 scale)
        const amplitude = (average / 255) * 100;
        this.emit('amplitude', amplitude);
      }
      
      requestAnimationFrame(checkAmplitude);
    };

    checkAmplitude();
  }

  async startListening(): Promise<any> {
    if (!this.recognition) {
      throw new Error('Reconhecimento de voz não disponível');
    }

    try {
      // Check if already listening to avoid conflicts
      if (this.isListeningActive) {
        return;
      }

      // Resume audio context if suspended
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Add safety check for wallet extensions interference
      try {
        this.recognition.start();
      } catch (error: any) {
        if (error.message?.includes('already started')) {
          return;
        }
        throw error;
      }
      
      // Return a mock stream for compatibility
      return {
        on: (event: string, callback: (...args: any[]) => void) => {
          this.on(event, callback);
        }
      };
    } catch (error) {
      console.error('Erro ao iniciar escuta:', error);
      
      // Don't throw error for common issues, just log them
      if (error instanceof Error && 
          (error.message.includes('not-allowed') || 
           error.message.includes('network') ||
           error.message.includes('already started'))) {
        return null;
      }
      
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    if (this.recognition && this.isListeningActive) {
      this.recognition.stop();
    }
  }

  async speak(text: string, emotion: EmotionType = 'neutral'): Promise<void> {
    const voiceEnabled = this.config.voiceEnabled || this.config.voice?.enabled;
    if (!voiceEnabled || !text?.trim()) {
      return;
    }

    // Try AI Orchestrator first (ElevenLabs + fallback)
    if (this.aiOrchestrator.isReady()) {
      try {
        const voiceResult = await this.aiOrchestrator.synthesizeVoice(text, emotion);
        
        if (voiceResult.success) {
          this.isSpeakingActive = true;
          this.emit('speakingStarted');
          
          // If we got audio buffer from ElevenLabs, play it
          if (voiceResult.audioBuffer && voiceResult.source === 'elevenlabs') {
            await this.playAudioBuffer(voiceResult.audioBuffer);
          }
          
          this.isSpeakingActive = false;
          this.emit('speakingEnded');
          return;
        }
      } catch (error) {
      }
    }

    // Fallback to browser synthesis
    if (!this.synthesis) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        // Check if synthesis is ready
        if (this.synthesis.speaking) {
          this.synthesis.cancel(); // Cancel any ongoing speech
        }

        const utterance = new SpeechSynthesisUtterance(text.trim());
        
        // Configure voice based on emotion
        this.configureVoiceForEmotion(utterance, emotion);
        
        utterance.onstart = () => {
          this.isSpeakingActive = true;
          this.emit('speakingStarted');
        };

        utterance.onend = () => {
          this.isSpeakingActive = false;
          this.emit('speakingEnded');
          resolve();
        };

        utterance.onerror = (event) => {
          this.isSpeakingActive = false;
          this.emit('speakingError', event);
          console.error('❌ Erro na síntese de voz:', event.error);
          // Don't reject for common errors, just resolve
          if (event.error === 'interrupted' || event.error === 'canceled') {
            resolve();
          } else {
            reject(new Error(`Erro na síntese de voz: ${event.error}`));
          }
        };

        // Add timeout as fallback
        const timeout = setTimeout(() => {
          if (this.isSpeakingActive) {
            this.synthesis.cancel();
            this.isSpeakingActive = false;
            resolve();
          }
        }, 30000); // 30 second timeout

        utterance.addEventListener('end', () => clearTimeout(timeout));
        utterance.addEventListener('error', () => clearTimeout(timeout));

        this.synthesis.speak(utterance);
      } catch (error) {
        console.error('❌ Erro ao configurar síntese:', error);
        reject(error);
      }
    });
  }

  private configureVoiceForEmotion(utterance: SpeechSynthesisUtterance, emotion: EmotionType): void {
    // Get available voices
    const voices = this.synthesis.getVoices();
    const portugueseVoice = voices.find((voice: any) => 
      voice.lang.startsWith('pt') || voice.lang.startsWith('pt-BR')
    );

    if (portugueseVoice) {
      utterance.voice = portugueseVoice;
    }

    // Adjust speech parameters based on emotion
    switch (emotion) {
      case 'excited':
        utterance.rate = 1.2;
        utterance.pitch = 1.2;
        utterance.volume = 0.9;
        break;
      case 'happy':
        utterance.rate = 1.1;
        utterance.pitch = 1.1;
        utterance.volume = 0.8;
        break;
      case 'concerned':
        utterance.rate = 0.9;
        utterance.pitch = 0.9;
        utterance.volume = 0.7;
        break;
      case 'analytical':
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        break;
      default:
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
    }
  }

  async detectIntent(text: string): Promise<Intent> {
    // Enhanced intent detection with better pattern matching
    const lowerText = text.toLowerCase().trim();
    
    // Enhanced greeting patterns
    const greetingPatterns = [
      /^(oi|olá|hey|hi|bom dia|boa tarde|boa noite|cypher)/i,
      /(como (é|está)|tudo bem|como vai)/i
    ];
    
    if (greetingPatterns.some(pattern => pattern.test(lowerText))) {
      return {
        name: 'greeting',
        confidence: 0.9,
        entities: { originalText: text },
        category: 'conversation'
      };
    }
    
    // Enhanced trading intents
    const tradingBuyPatterns = [
      /(comprar|buy|adquirir).*bitcoin/i,
      /(comprar|buy|adquirir).*btc/i,
      /(investir|aplicar).*bitcoin/i
    ];
    
    const tradingSellPatterns = [
      /(vender|sell|liquidar).*bitcoin/i,
      /(vender|sell|liquidar).*btc/i
    ];
    
    if (tradingBuyPatterns.some(pattern => pattern.test(lowerText))) {
      return this.createTradingIntent('buy_crypto', text);
    }
    
    if (tradingSellPatterns.some(pattern => pattern.test(lowerText))) {
      return this.createTradingIntent('sell_crypto', text);
    }

    // Enhanced price check intents
    const pricePatterns = [
      /(qual.*preço|preço.*bitcoin|preço.*btc)/i,
      /(cotação|valor|quanto custa)/i,
      /(price|value).*bitcoin/i
    ];
    
    if (pricePatterns.some(pattern => pattern.test(lowerText))) {
      return this.createPriceIntent(text);
    }

    // Enhanced analysis intents
    const analysisPatterns = [
      /(análise|analise|analysis).*mercado/i,
      /(tendência|trend|movimento)/i,
      /(recomendação|devo.*comprar|devo.*vender)/i
    ];
    
    if (analysisPatterns.some(pattern => pattern.test(lowerText))) {
      return this.createAnalysisIntent(text);
    }

    // Enhanced portfolio intents
    const portfolioPatterns = [
      /(portfolio|carteira|saldo|meus.*investimentos)/i,
      /(como.*estou|minha.*posição)/i
    ];
    
    if (portfolioPatterns.some(pattern => pattern.test(lowerText))) {
      return this.createPortfolioIntent(text);
    }
    
    // Help and information intents
    const helpPatterns = [
      /(ajuda|help|como.*funciona|explica)/i,
      /(o que.*pode|suas.*funções)/i
    ];
    
    if (helpPatterns.some(pattern => pattern.test(lowerText))) {
      return {
        name: 'help_request',
        confidence: 0.8,
        entities: { originalText: text },
        category: 'information'
      };
    }
    
    // News and market insights
    const newsPatterns = [
      /(notícias|news|novidades)/i,
      /(acontecendo|mercado.*hoje)/i
    ];
    
    if (newsPatterns.some(pattern => pattern.test(lowerText))) {
      return {
        name: 'market_news',
        confidence: 0.7,
        entities: { originalText: text },
        category: 'information'
      };
    }

    // Default intent with better confidence scoring
    const confidence = this.calculateGeneralConfidence(text);
    
    return {
      name: 'general_question',
      confidence,
      entities: { originalText: text },
      category: 'general'
    };
  }
  
  private calculateGeneralConfidence(text: string): number {
    // Calculate confidence based on text characteristics
    const wordCount = text.trim().split(/\s+/).length;
    const hasQuestionMark = text.includes('?');
    const hasCryptoTerms = /(bitcoin|crypto|blockchain|btc|eth)/i.test(text);
    
    let confidence = 0.3; // Base confidence
    
    if (wordCount > 3) confidence += 0.1;
    if (hasQuestionMark) confidence += 0.1;
    if (hasCryptoTerms) confidence += 0.2;
    
    return Math.min(confidence, 0.8);
  }

  private createTradingIntent(action: string, text: string): Intent {
    const entities: Record<string, any> = {};
    
    // Extract amount
    const amountMatch = text.match(/(\d+(?:[.,]\d+)?)/);
    if (amountMatch) {
      entities.amount = parseFloat(amountMatch[1].replace(',', '.'));
    }

    // Extract asset
    const assets = ['bitcoin', 'btc', 'ethereum', 'eth', 'bnb', 'ada', 'sol'];
    for (const asset of assets) {
      if (text.toLowerCase().includes(asset)) {
        entities.asset = asset.toUpperCase() === 'BITCOIN' ? 'BTC' : asset.toUpperCase();
        break;
      }
    }

    return {
      name: action,
      confidence: 0.8,
      entities,
      action,
      category: 'trading'
    };
  }

  private createPriceIntent(text: string): Intent {
    const entities: Record<string, any> = {};
    
    // Extract asset
    const assets = ['bitcoin', 'btc', 'ethereum', 'eth', 'bnb', 'ada', 'sol'];
    for (const asset of assets) {
      if (text.toLowerCase().includes(asset)) {
        entities.asset = asset.toUpperCase() === 'BITCOIN' ? 'BTC' : asset.toUpperCase();
        break;
      }
    }

    if (!entities.asset) {
      entities.asset = 'BTC'; // Default to Bitcoin
    }

    return {
      name: 'price_check',
      confidence: 0.9,
      entities,
      action: 'get_price',
      category: 'market'
    };
  }

  private createAnalysisIntent(text: string): Intent {
    const entities: Record<string, any> = {};
    
    // Extract asset
    const assets = ['bitcoin', 'btc', 'ethereum', 'eth'];
    for (const asset of assets) {
      if (text.toLowerCase().includes(asset)) {
        entities.asset = asset.toUpperCase() === 'BITCOIN' ? 'BTC' : asset.toUpperCase();
        break;
      }
    }

    if (!entities.asset) {
      entities.asset = 'BTC';
    }

    // Extract analysis type
    if (text.includes('técnica')) {
      entities.type = 'technical';
    } else if (text.includes('sentimento')) {
      entities.type = 'sentiment';
    } else {
      entities.type = 'general';
    }

    return {
      name: 'market_analysis',
      confidence: 0.8,
      entities,
      action: 'analyze_market',
      category: 'analysis'
    };
  }

  private createPortfolioIntent(text: string): Intent {
    return {
      name: 'portfolio_status',
      confidence: 0.8,
      entities: {},
      action: 'show_portfolio',
      category: 'portfolio'
    };
  }

  private processVoiceCommand(transcript: string, confidence: number): void {
    const command: VoiceCommand = {
      id: Date.now().toString(),
      timestamp: new Date(),
      rawText: transcript,
      intent: { name: '', category: 'general', confidence: 0, entities: {} },
      entities: [],
      confidence,
      language: this.config.language
    };

    // Detect intent
    this.detectIntent(transcript).then(intent => {
      command.intent = intent;
      this.emit('commandReceived', command);
    });
  }

  setConfig(config: Partial<VoiceConfig>): void {
    // Update voice configuration
    if (this.recognition) {
      if (config.language) {
        this.recognition.lang = config.language;
      }
      if (config.continuousListening !== undefined) {
        this.recognition.continuous = config.continuousListening;
      }
    }
  }

  async destroy(): Promise<void> {
    if (this.isListeningActive) {
      await this.stopListening();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }

    if (this.audioContext) {
      await this.audioContext.close();
    }

    this.removeAllListeners();
  }

  // Getters
  get isListening(): boolean {
    return this.isListeningActive;
  }

  get isSpeaking(): boolean {
    return this.isSpeakingActive;
  }

  get isAvailable(): boolean {
    return !!(this.recognition && this.synthesis);
  }

  private async playAudioBuffer(audioBuffer: ArrayBuffer): Promise<void> {
    if (typeof window === 'undefined' || !this.audioContext) {
      return;
    }

    try {
      const audioBufferDecoded = await this.audioContext.decodeAudioData(audioBuffer);
      const source = this.audioContext.createBufferSource();
      
      source.buffer = audioBufferDecoded;
      source.connect(this.audioContext.destination);
      source.start(0);
      
      return new Promise((resolve) => {
        source.onended = () => resolve();
      });
    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error);
    }
  }
}