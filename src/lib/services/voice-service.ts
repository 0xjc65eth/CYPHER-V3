interface VoiceConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
}

interface VoiceCallbacks {
  onResult: (transcript: string, isFinal: boolean) => void;
  onStart: () => void;
  onEnd: () => void;
  onError: (error: string) => void;
}

export class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private config: VoiceConfig;
  private callbacks: VoiceCallbacks;

  constructor(config: VoiceConfig, callbacks: VoiceCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
    this.initializeVoiceServices();
  }

  private initializeVoiceServices() {
    // Check if browser supports Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.lang = this.config.language;
      this.recognition.continuous = false; // Force false to avoid network errors
      this.recognition.interimResults = false; // Simplified for stability
      (this.recognition as any).maxAlternatives = 1;
      
      this.setupRecognitionHandlers();
    } else {
    }

    // Check if browser supports Speech Synthesis
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      
      // Wait for voices to load
      if (this.synthesis.getVoices().length === 0) {
        this.synthesis.addEventListener('voiceschanged', () => {
        });
      }
    } else {
    }
  }

  private setupRecognitionHandlers() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks.onStart();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.callbacks.onEnd();
    };

    this.recognition.onresult = (event) => {
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

      if (finalTranscript) {
        this.callbacks.onResult(finalTranscript.trim(), true);
      } else if (interimTranscript) {
        this.callbacks.onResult(interimTranscript.trim(), false);
      }
    };

    this.recognition.onerror = (event) => {
      let errorMessage = 'Speech recognition error';
      
      // Handle specific errors more gracefully
      switch (event.error) {
        case 'network':
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
          break;
        case 'not-allowed':
          errorMessage = 'Permissão de microfone negada. Permitir acesso ao microfone.';
          break;
        case 'no-speech':
          errorMessage = 'Nenhuma fala detectada. Tente falar mais alto.';
          break;
        case 'audio-capture':
          errorMessage = 'Erro ao capturar áudio. Verifique o microfone.';
          break;
        default:
          errorMessage = `Erro: ${event.error}`;
      }
      
      this.callbacks.onError(errorMessage);
      console.error('🎤 Voice error:', event.error);
      
      // Auto-restart on network errors after delay
      if (event.error === 'network' && this.isListening) {
        setTimeout(() => {
          if (this.isListening) {
            this.startListening();
          }
        }, 2000);
      }
    };

    (this.recognition as any).onnomatch = () => {
      this.callbacks.onError('No speech was recognized');
    };
  }

  async startListening(): Promise<boolean> {
    if (!this.recognition || this.isListening) {
      return false;
    }

    // Check microphone permissions first
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' as any });
        
        if (permission.state === 'denied') {
          this.callbacks.onError('Permissão de microfone negada. Clique no ícone do cadeado na barra de endereços para permitir o acesso ao microfone.');
          return false;
        }
      }
    } catch (error) {
    }

    try {
      this.recognition.start();
      return true;
    } catch (error: any) {
      console.error('Error starting voice recognition:', error);
      
      if (error.message && error.message.includes('already started')) {
        // Recognition is already running, stop and restart
        this.recognition.stop();
        setTimeout(() => {
          this.recognition?.start();
        }, 100);
        return true;
      } else {
        this.callbacks.onError('Falha ao iniciar reconhecimento de voz. Verifique as permissões do microfone.');
        return false;
      }
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  speak(text: string, options?: { 
    rate?: number; 
    pitch?: number; 
    volume?: number; 
    voice?: SpeechSynthesisVoice;
    onEnd?: () => void;
  }): void {
    if (!this.synthesis) {
      return;
    }

    // Cancel any ongoing speech
    this.synthesis.cancel();

    // Split long text into chunks for better synthesis
    const maxLength = 200;
    const textChunks = this.splitTextIntoChunks(text, maxLength);
    
    let currentChunk = 0;
    
    const speakChunk = () => {
      if (currentChunk >= textChunks.length) {
        if (options?.onEnd) {
          options.onEnd();
        }
        return;
      }

      const utterance = new SpeechSynthesisUtterance(textChunks[currentChunk]);
      
      // Improved voice settings for more natural speech
      utterance.rate = options?.rate || 0.9; // Slightly slower for clarity
      utterance.pitch = options?.pitch || 1.0;
      utterance.volume = options?.volume || 0.8;
      
      // Find the best Portuguese voice
      const voices = this.synthesis!.getVoices();
      let bestVoice = null;
      
      // Priority order for Portuguese voices
      const preferredVoices = [
        'Microsoft Maria - Portuguese (Brazil)',
        'Google português do Brasil',
        'Luciana',
        'Microsoft Helena - Portuguese (Portugal)',
        'Joana',
        'Microsoft Daniel - Portuguese (Brazil)'
      ];
      
      for (const preferred of preferredVoices) {
        bestVoice = voices.find(voice => 
          voice.name.includes(preferred) ||
          voice.name.toLowerCase().includes(preferred.toLowerCase())
        );
        if (bestVoice) break;
      }
      
      // Fallback to any Portuguese voice
      if (!bestVoice) {
        bestVoice = voices.find(voice => 
          voice.lang.includes('pt') || 
          voice.lang.includes('PT') ||
          voice.name.toLowerCase().includes('portuguese') ||
          voice.name.toLowerCase().includes('brasil')
        );
      }
      
      if (bestVoice) {
        utterance.voice = bestVoice;
      } else {
      }

      utterance.onstart = () => {
      };

      utterance.onend = () => {
        currentChunk++;
        // Small pause between chunks for natural flow
        setTimeout(() => {
          speakChunk();
        }, 100);
      };

      utterance.onerror = (event) => {
        console.error('🔊 Speech synthesis error:', event.error);
        // Try to continue with next chunk on error
        if (event.error === 'interrupted') {
          currentChunk++;
          setTimeout(() => {
            speakChunk();
          }, 100);
        } else if (options?.onEnd) {
          options.onEnd();
        }
      };

      this.synthesis!.speak(utterance);
    };

    speakChunk();
  }

  private splitTextIntoChunks(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (currentChunk.length + trimmedSentence.length + 1 <= maxLength) {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        
        // If single sentence is too long, split by words
        if (trimmedSentence.length > maxLength) {
          const words = trimmedSentence.split(' ');
          let wordChunk = '';
          
          for (const word of words) {
            if (wordChunk.length + word.length + 1 <= maxLength) {
              wordChunk += (wordChunk ? ' ' : '') + word;
            } else {
              if (wordChunk) {
                chunks.push(wordChunk);
              }
              wordChunk = word;
            }
          }
          
          if (wordChunk) {
            currentChunk = wordChunk;
          } else {
            currentChunk = '';
          }
        } else {
          currentChunk = trimmedSentence;
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }
    
    return chunks;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  isSupported(): boolean {
    return !!(this.recognition && this.synthesis);
  }

  getListeningState(): boolean {
    return this.isListening;
  }

  destroy(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
}

// Voice command processor
export class VoiceCommandProcessor {
  private static readonly COMMANDS = {
    'preço': ['preço', 'cotação', 'valor', 'quanto custa'],
    'comprar': ['comprar', 'investir', 'entrada'],
    'vender': ['vender', 'sair', 'lucro'],
    'análise': ['análise', 'analisar', 'situação'],
    'mercado': ['mercado', 'tendência', 'movimento'],
    'ajuda': ['ajuda', 'help', 'comandos'],
    'limpar': ['limpar', 'clear', 'novo'],
  };

  static processCommand(transcript: string): { 
    command: string | null; 
    confidence: number; 
    originalText: string;
  } {
    const text = transcript.toLowerCase().trim();
    let bestMatch: string | null = null;
    let highestScore = 0;

    for (const [command, keywords] of Object.entries(this.COMMANDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          const score = keyword.length / text.length;
          if (score > highestScore) {
            highestScore = score;
            bestMatch = command;
          }
        }
      }
    }

    return {
      command: bestMatch,
      confidence: highestScore,
      originalText: transcript
    };
  }

  static formatVoiceResponse(text: string): string {
    // Remove markdown formatting for voice
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/•/g, '-')
      .replace(/📊|📈|📉|💡|🎯|⚠️|✅|🤖|🟠|ᚱ|🔥|💰|💎/g, '')
      .replace(/\n+/g, '. ')
      .trim();
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}