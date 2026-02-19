interface ElevenLabsConfig {
  apiKey: string;
}

export class ElevenLabsRealService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private voiceId = 'JBFqnCBsd6RMkjVDRZzb'; // George voice ID
  
  constructor(config: ElevenLabsConfig) {
    this.apiKey = config.apiKey || process.env.ELEVENLABS_API_KEY || '';
  }
  
  async synthesize(text: string, emotion?: string): Promise<Blob> {
    try {
      // Adicionar emoção ao texto se especificada
      const enhancedText = emotion ? this.addEmotionToText(text, emotion) : text;
      
      const response = await fetch(`${this.baseUrl}/text-to-speech/${this.voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: enhancedText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: emotion === 'excited' ? 0.8 : 0.5,
            use_speaker_boost: true
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Erro na síntese de voz:', error);
      // Retornar áudio vazio em caso de erro
      return new Blob([], { type: 'audio/mpeg' });
    }
  }
  
  async transcribe(audioBlob: Blob): Promise<string> {
    // ElevenLabs não tem API de transcrição, então vamos simular
    // Em produção, você usaria um serviço como Whisper API
    return 'Texto transcrito do áudio';
  }
  
  private addEmotionToText(text: string, emotion: string): string {
    // Adicionar indicadores de emoção para o ElevenLabs
    switch (emotion) {
      case 'excited':
        return `<prosody rate="110%" pitch="+5%">${text}</prosody>`;
      case 'calm':
        return `<prosody rate="90%" pitch="-5%">${text}</prosody>`;
      case 'analytical':
        return `<prosody rate="95%">${text}</prosody>`;
      case 'concerned':
        return `<prosody rate="85%" pitch="-10%">${text}</prosody>`;
      default:
        return text;
    }
  }
  
  async getVoices(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }
      
      const data = await response.json();
      return data.voices;
    } catch (error) {
      console.error('Erro ao buscar vozes:', error);
      return [];
    }
  }
  
  setVoiceId(voiceId: string): void {
    this.voiceId = voiceId;
  }
}

export const elevenLabsService = new ElevenLabsRealService({
  apiKey: process.env.ELEVENLABS_API_KEY || ''
});