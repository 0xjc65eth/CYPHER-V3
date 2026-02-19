import { ElevenLabsRealService } from './ElevenLabsRealService';

export interface VoiceAIConfig {
  recognition: 'continuous' | 'single';
  synthesis: 'elevenlabs' | 'browser';
  language: string;
  apiKey?: string;
}

export class VoiceAIManager {
  private recognition: any;
  private synthesis: ElevenLabsRealService;
  private language: string;
  private isListening: boolean = false;
  
  constructor(config: VoiceAIConfig) {
    this.language = config.language || 'pt-BR';
    
    // Configurar reconhecimento de voz (Web Speech API)
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = config.recognition === 'continuous';
      this.recognition.interimResults = true;
      this.recognition.lang = this.language;
    }
    
    // Configurar síntese de voz
    this.synthesis = new ElevenLabsRealService({ 
      apiKey: config.apiKey || ''  // ElevenLabs key used server-side only via /api/ai/text-to-speech
    });
  }
  
  async startListening(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Reconhecimento de voz não suportado neste navegador');
    }
    
    return new Promise((resolve, reject) => {
      this.recognition.start();
      this.isListening = true;
      
      this.recognition.onstart = () => {
        resolve();
      };
      
      this.recognition.onerror = (event: any) => {
        console.error('Erro no reconhecimento:', event.error);
        this.isListening = false;
        reject(event.error);
      };
    });
  }
  
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
  
  onResult(callback: (text: string) => void): void {
    if (!this.recognition) return;
    
    this.recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;
      callback(text);
    };
  }
  
  async processVoiceInput(audioBlob: Blob): Promise<string> {
    // Para áudio gravado, usar a API do ElevenLabs
    try {
      const text = await this.synthesis.transcribe(audioBlob);
      return text;
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error);
      throw error;
    }
  }
  
  async generateResponse(text: string): Promise<{
    response: string;
    emotion?: string;
  }> {
    // Analisar a intenção e gerar resposta com gírias
    const lowerText = text.toLowerCase();
    let response = '';
    let emotion = 'neutral';
    
    if (lowerText.includes('olá') || lowerText.includes('oi')) {
      response = "E aí, mano! Tô ligado que tu quer ganhar uma grana. Bora nessa! 🚀";
      emotion = 'friendly';
    } else if (lowerText.includes('bot') || lowerText.includes('trading')) {
      response = "Quer que eu ative o bot de trading pra você? É só falar 'iniciar bot' que eu coloco ele pra trabalhar!";
      emotion = 'excited';
    } else if (lowerText.includes('mercado') || lowerText.includes('bitcoin')) {
      response = "O mercado tá bombando, mano! Bitcoin subindo, altcoins seguindo... Quer uma análise completa?";
      emotion = 'analytical';
    } else {
      response = "Tô aqui pra te ajudar, parça! Pode perguntar sobre trading, mercado, ou qualquer parada de crypto!";
      emotion = 'helpful';
    }
    
    return { response, emotion };
  }
  
  async speak(text: string, emotion?: string): Promise<void> {
    try {
      const audio = await this.synthesis.synthesize(text, emotion);
      
      if (typeof window !== 'undefined') {
        const audioUrl = URL.createObjectURL(audio);
        const audioElement = new Audio(audioUrl);
        
        return new Promise((resolve, reject) => {
          audioElement.onended = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          
          audioElement.onerror = (error) => {
            URL.revokeObjectURL(audioUrl);
            reject(error);
          };
          
          audioElement.play();
        });
      }
    } catch (error) {
      console.error('Erro ao falar:', error);
      // Fallback para síntese do navegador
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.language;
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    }
  }
  
  setLanguage(language: string): void {
    this.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }
  
  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }
}

export default VoiceAIManager;