/**
 * 🎤 ElevenLabs Voice AI Service - Brazilian Portuguese Ultra-Fluid Voice
 * Real-time text-to-speech with young slang and market-specific terms
 * Ultra-fast <2 second response time with audio streaming
 */

interface ElevenLabsVoiceConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
  outputFormat: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

interface VoiceStreamOptions {
  onChunkReceived?: (chunk: Uint8Array) => void;
  onStarted?: () => void;
  onFinished?: () => void;
  onError?: (error: Error) => void;
}

interface VoiceEmotionSettings {
  excitement: number;
  confidence: number;
  casualness: number;
  enthusiasm: number;
}

export class ElevenLabsVoiceService {
  private config: ElevenLabsVoiceConfig;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private voiceCache: Map<string, AudioBuffer> = new Map();
  private streamController: AbortController | null = null;

  // Brazilian Portuguese voice optimized for young slang
  private static readonly DEFAULT_CONFIG: ElevenLabsVoiceConfig = {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam - young, energetic male voice
    modelId: 'eleven_multilingual_v2', // Best for Portuguese
    outputFormat: 'mp3_22050_32',
    stability: 0.5, // More dynamic for slang
    similarityBoost: 0.8, // High clarity
    style: 0.3, // Slightly exaggerated for personality
    useSpeakerBoost: true
  };

  // Voice emotion presets for different market scenarios
  private static readonly EMOTION_PRESETS = {
    excited: { excitement: 0.9, confidence: 0.8, casualness: 0.9, enthusiasm: 1.0 },
    confident: { excitement: 0.6, confidence: 1.0, casualness: 0.5, enthusiasm: 0.7 },
    casual: { excitement: 0.4, confidence: 0.6, casualness: 1.0, enthusiasm: 0.5 },
    analytical: { excitement: 0.3, confidence: 0.9, casualness: 0.3, enthusiasm: 0.4 },
    warning: { excitement: 0.2, confidence: 0.8, casualness: 0.4, enthusiasm: 0.3 }
  };

  constructor(config?: Partial<ElevenLabsVoiceConfig>) {
    this.config = { ...ElevenLabsVoiceService.DEFAULT_CONFIG, ...config };
    this.initializeAudioContext();
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (this.audioContext.state === 'suspended') {
        // Will be resumed on first user interaction
      }
    } catch (error) {
      console.error('🎤 Failed to initialize AudioContext:', error);
    }
  }

  /**
   * Convert text to speech with Brazilian Portuguese slang optimization
   */
  async textToSpeech(
    text: string, 
    emotion: keyof typeof ElevenLabsVoiceService.EMOTION_PRESETS = 'casual',
    options?: VoiceStreamOptions
  ): Promise<AudioBuffer | null> {
    try {
      // Preprocess text for Brazilian slang and trading terms
      const processedText = this.preprocessTextForVoice(text);
      
      // Check cache first for performance
      const cacheKey = `${processedText}-${emotion}`;
      if (this.voiceCache.has(cacheKey)) {
        return this.voiceCache.get(cacheKey)!;
      }

      // Resume AudioContext if needed
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const emotionSettings = ElevenLabsVoiceService.EMOTION_PRESETS[emotion];
      const audioBuffer = await this.streamAudioFromElevenLabs(processedText, emotionSettings, options);
      
      // Cache successful results
      if (audioBuffer && processedText.length < 500) { // Only cache short texts
        this.voiceCache.set(cacheKey, audioBuffer);
      }

      return audioBuffer;
    } catch (error) {
      console.error('🎤 ElevenLabs TTS error:', error);
      options?.onError?.(error as Error);
      return null;
    }
  }

  /**
   * Stream audio from ElevenLabs API with real-time processing
   */
  private async streamAudioFromElevenLabs(
    text: string,
    emotion: VoiceEmotionSettings,
    options?: VoiceStreamOptions
  ): Promise<AudioBuffer | null> {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId}/stream`;
    
    const requestBody = {
      text: text,
      model_id: this.config.modelId,
      voice_settings: {
        stability: this.config.stability + (emotion.confidence - 0.5) * 0.2,
        similarity_boost: this.config.similarityBoost,
        style: this.config.style + emotion.excitement * 0.3,
        use_speaker_boost: this.config.useSpeakerBoost
      }
    };

    this.streamController = new AbortController();

    try {
      options?.onStarted?.();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.config.apiKey
        },
        body: JSON.stringify(requestBody),
        signal: this.streamController.signal
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      // Stream audio chunks for ultra-fast response
      const chunks: Uint8Array[] = [];
      const reader = response.body.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        options?.onChunkReceived?.(value);
      }

      // Combine all chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedArray = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        combinedArray.set(chunk, offset);
        offset += chunk.length;
      }

      // Convert to AudioBuffer
      if (!this.audioContext) {
        throw new Error('AudioContext not initialized');
      }

      const audioBuffer = await this.audioContext.decodeAudioData(combinedArray.buffer);
      options?.onFinished?.();
      
      return audioBuffer;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Preprocess text for optimal Brazilian Portuguese voice synthesis
   */
  private preprocessTextForVoice(text: string): string {
    return text
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      
      // Convert emojis to Brazilian expressions
      .replace(/🔥/g, 'bombando')
      .replace(/💰/g, 'grana')
      .replace(/🚀/g, 'voando')
      .replace(/📊/g, '')
      .replace(/📈/g, 'subindo')
      .replace(/📉/g, 'despencando')
      .replace(/💎/g, 'diamante')
      .replace(/⚠️/g, 'atenção')
      .replace(/✅/g, 'confirmado')
      .replace(/❌/g, 'negativo')
      
      // Convert technical terms to spoken form
      .replace(/BTC/g, 'Bitcoin')
      .replace(/ETH/g, 'Ethereum')
      .replace(/USD/g, 'dólares')
      .replace(/24h/g, 'vinte e quatro horas')
      .replace(/(\d+)%/g, '$1 por cento')
      .replace(/\$/g, 'dólares ')
      .replace(/€/g, 'euros ')
      .replace(/₿/g, 'bitcoin ')
      
      // Brazilian slang replacements for natural speech
      .replace(/\bmuito\b/g, 'bagarai')
      .replace(/\bexcelente\b/g, 'massa')
      .replace(/\bótimo\b/g, 'show de bola')
      .replace(/\bruim\b/g, 'furado')
      .replace(/\bproblem\b/g, 'fita')
      .replace(/\bdinheiro\b/g, 'grana')
      .replace(/\brapidamente\b/g, 'ligeiro')
      .replace(/\bagora\b/g, 'agora mané')
      
      // Market-specific slang
      .replace(/\bcomprar\b/g, 'comprar logo')
      .replace(/\bvender\b/g, 'vender rapidão')
      .replace(/\bsubindo\b/g, 'bombando')
      .replace(/\bcaindo\b/g, 'despencando')
      .replace(/\boportunidade\b/g, 'chance boa')
      .replace(/\brisco\b/g, 'parada arriscada')
      .replace(/\blucro\b/g, 'grana boa')
      .replace(/\bprejuízo\b/g, 'prejú')
      
      // Convert numbers for better pronunciation
      .replace(/(\d+),(\d+)/g, '$1 vírgula $2')
      .replace(/(\d{4,})/g, (match) => this.formatNumberForSpeech(match))
      
      // Clean up formatting
      .replace(/•/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .replace(/\.\s*\./g, '.')
      .trim();
  }

  /**
   * Format large numbers for natural speech
   */
  private formatNumberForSpeech(numStr: string): string {
    const num = parseInt(numStr);
    
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)} bilhões`;
    } else if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)} milhões`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)} mil`;
    }
    
    return numStr;
  }

  /**
   * Play audio buffer with queue management
   */
  async playAudio(audioBuffer: AudioBuffer): Promise<void> {
    if (!this.audioContext || !audioBuffer) return;

    // Stop current audio if playing
    if (this.isPlaying && this.currentSource) {
      this.currentSource.stop();
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0.8; // Comfortable volume
      
      this.currentSource.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      this.isPlaying = true;

      this.currentSource.onended = () => {
        this.isPlaying = false;
        this.currentSource = null;
        this.playNextInQueue();
      };

      this.currentSource.start(0);

    } catch (error) {
      console.error('🔊 Audio playback error:', error);
      this.isPlaying = false;
    }
  }

  /**
   * Add audio to queue for sequential playback
   */
  queueAudio(audioBuffer: AudioBuffer): void {
    this.audioQueue.push(audioBuffer);
    
    if (!this.isPlaying) {
      this.playNextInQueue();
    }
  }

  /**
   * Play next audio in queue
   */
  private playNextInQueue(): void {
    if (this.audioQueue.length > 0 && !this.isPlaying) {
      const nextAudio = this.audioQueue.shift()!;
      this.playAudio(nextAudio);
    }
  }

  /**
   * Quick speak method for immediate voice feedback
   */
  async quickSpeak(
    text: string,
    emotion: keyof typeof ElevenLabsVoiceService.EMOTION_PRESETS = 'casual'
  ): Promise<void> {
    const audioBuffer = await this.textToSpeech(text, emotion, {
      onStarted: () => {},
      onChunkReceived: (chunk) => {
        // For ultra-fast response, we could play chunks as they arrive
        // But for simplicity, we'll wait for complete audio
      }
    });

    if (audioBuffer) {
      await this.playAudio(audioBuffer);
    }
  }

  /**
   * Speak text aloud (alias for quickSpeak)
   */
  async speak(text: string): Promise<void> {
    return this.quickSpeak(text, 'casual');
  }

  /**
   * Stop current audio and clear queue
   */
  stopAudio(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    
    if (this.streamController) {
      this.streamController.abort();
    }
    
    this.audioQueue.length = 0;
    this.isPlaying = false;
  }

  /**
   * Get available emotions for voice synthesis
   */
  getAvailableEmotions(): string[] {
    return Object.keys(ElevenLabsVoiceService.EMOTION_PRESETS);
  }

  /**
   * Check if voice service is ready
   */
  isReady(): boolean {
    return !!this.audioContext && this.audioContext.state !== 'closed';
  }

  /**
   * Get current playing state
   */
  getPlayingState(): {
    isPlaying: boolean;
    queueLength: number;
    cacheSize: number;
  } {
    return {
      isPlaying: this.isPlaying,
      queueLength: this.audioQueue.length,
      cacheSize: this.voiceCache.size
    };
  }

  /**
   * Clear voice cache to free memory
   */
  clearCache(): void {
    this.voiceCache.clear();
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    this.stopAudio();
    this.clearCache();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
  }
}

// Voice response analyzer for context-aware emotion selection
export class VoiceResponseAnalyzer {
  /**
   * Analyze text content to suggest appropriate emotion
   */
  static analyzeEmotion(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Excitement indicators
    if (this.containsAny(lowerText, ['🔥', 'bombando', 'massa', 'show', 'incrível', 'demais', 'voando'])) {
      return 'excited';
    }
    
    // Warning indicators
    if (this.containsAny(lowerText, ['cuidado', 'atenção', 'risco', 'perigo', 'furado', 'zebra'])) {
      return 'warning';
    }
    
    // Analytical indicators
    if (this.containsAny(lowerText, ['análise', 'dados', 'indicador', 'rsi', 'macd', 'técnica', 'estudo'])) {
      return 'analytical';
    }
    
    // Confident indicators
    if (this.containsAny(lowerText, ['confirmado', 'certeza', 'garantido', 'confiança', 'expert'])) {
      return 'confident';
    }
    
    // Default to casual for general conversation
    return 'casual';
  }

  private static containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Split long text into optimal chunks for voice synthesis
   */
  static splitForVoice(text: string, maxLength: number = 500): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (currentChunk.length + trimmedSentence.length + 2 <= maxLength) {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        currentChunk = trimmedSentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }
    
    return chunks;
  }
}

export default ElevenLabsVoiceService;