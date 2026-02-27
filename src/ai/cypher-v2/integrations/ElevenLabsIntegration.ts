// ElevenLabs Integration for CYPHER AI v2
// Ultra-realistic voice synthesis

import type { CypherAIConfig, EmotionType } from '../types';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels: Record<string, string>;
  description?: string;
}

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export class ElevenLabsIntegration {
  private apiKey: string;
  private baseURL: string = 'https://api.elevenlabs.io/v1';
  private defaultVoiceId: string = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
  private voiceSettings: VoiceSettings = {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.5,
    use_speaker_boost: true
  };
  private isInitialized: boolean = false;
  private voices: ElevenLabsVoice[] = [];
  private audioContext: AudioContext | null = null;

  constructor(config: CypherAIConfig) {
    this.apiKey = config.apiKeys?.elevenlabs || '';
    if (!this.apiKey) {
    }
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key é necessária');
    }

    try {
      // Fetch available voices
      await this.fetchVoices();
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Erro ao inicializar ElevenLabs:', error);
      throw error;
    }
  }

  private async fetchVoices(): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/voices`, {
        headers: {
          'Accept': 'application/json',
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();
      this.voices = data.voices || [];
      
      // Find a Portuguese voice if available
      const ptVoice = this.voices.find(v => 
        v.labels?.language === 'pt' || 
        v.labels?.accent?.includes('portuguese')
      );
      
      if (ptVoice) {
        this.defaultVoiceId = ptVoice.voice_id;
      }
    } catch (error) {
      console.error('Erro ao buscar vozes:', error);
    }
  }

  async synthesize(
    text: string, 
    emotion: EmotionType = 'neutral',
    voiceId?: string
  ): Promise<ArrayBuffer | null> {
    if (!this.isInitialized || !text.trim()) {
      return null;
    }

    try {
      // Adjust voice settings based on emotion
      const settings = this.getVoiceSettingsForEmotion(emotion);
      
      const response = await fetch(
        `${this.baseURL}/text-to-speech/${voiceId || this.defaultVoiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          body: JSON.stringify({
            text: this.preprocessText(text, emotion),
            model_id: 'eleven_multilingual_v2',
            voice_settings: settings
          })
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS error: ${response.status}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Erro na síntese de voz:', error);
      return null;
    }
  }

  async synthesizeStreaming(
    text: string,
    emotion: EmotionType = 'neutral',
    onChunk: (audioChunk: ArrayBuffer) => void,
    voiceId?: string
  ): Promise<void> {
    if (!this.isInitialized || !text.trim()) {
      return;
    }

    try {
      const settings = this.getVoiceSettingsForEmotion(emotion);
      
      const response = await fetch(
        `${this.baseURL}/text-to-speech/${voiceId || this.defaultVoiceId}/stream`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          body: JSON.stringify({
            text: this.preprocessText(text, emotion),
            model_id: 'eleven_multilingual_v2',
            voice_settings: settings,
            optimize_streaming_latency: 3
          })
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs streaming error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        if (value && value.length > 0) {
          onChunk(value.buffer as ArrayBuffer);
        }
      }
    } catch (error) {
      console.error('Erro no streaming de voz:', error);
      throw error;
    }
  }

  private getVoiceSettingsForEmotion(emotion: EmotionType): VoiceSettings {
    const baseSettings = { ...this.voiceSettings };
    
    switch (emotion) {
      case 'excited':
      case 'happy':
        return {
          ...baseSettings,
          stability: 0.3,
          similarity_boost: 0.8,
          style: 0.8
        };
        
      case 'concerned':
      case 'confused':
        return {
          ...baseSettings,
          stability: 0.7,
          similarity_boost: 0.6,
          style: 0.3
        };
        
      case 'confident':
      case 'analytical':
        return {
          ...baseSettings,
          stability: 0.8,
          similarity_boost: 0.7,
          style: 0.6
        };
        
      case 'neutral':
      default:
        return baseSettings;
    }
  }

  private preprocessText(text: string, emotion: EmotionType): string {
    // Add emotion-based text modifications for better synthesis
    let processedText = text;
    
    // Add pauses for better rhythm
    processedText = processedText
      .replace(/\. /g, '... ')
      .replace(/\? /g, '?.. ')
      .replace(/! /g, '!.. ')
      .replace(/: /g, ':.. ');
    
    // ElevenLabs does not support SSML — emotion is controlled via voice_settings
    
    return processedText;
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    if (typeof window === 'undefined' || !audioBuffer) {
      return;
    }

    try {
      const ctx = this.getAudioContext();
      const audioBufferDecoded = await ctx.decodeAudioData(audioBuffer);
      const source = ctx.createBufferSource();

      source.buffer = audioBufferDecoded;
      source.connect(ctx.destination);
      source.start(0);

      return new Promise((resolve) => {
        source.onended = () => resolve();
      });
    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error);
    }
  }

  async dispose(): Promise<void> {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
    this.audioContext = null;
    this.isInitialized = false;
  }

  getAvailableVoices(): ElevenLabsVoice[] {
    return this.voices;
  }

  setDefaultVoice(voiceId: string): void {
    const voice = this.voices.find(v => v.voice_id === voiceId);
    if (voice) {
      this.defaultVoiceId = voiceId;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }

  // Clone a voice from audio samples (Premium feature)
  async cloneVoice(params: {
    name: string;
    description: string;
    files: File[];
    labels?: Record<string, string>;
  }): Promise<string | null> {
    if (!this.isInitialized) {
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('name', params.name);
      formData.append('description', params.description);
      
      params.files.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });
      
      if (params.labels) {
        formData.append('labels', JSON.stringify(params.labels));
      }

      const response = await fetch(`${this.baseURL}/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Voice cloning error: ${response.status}`);
      }

      const data = await response.json();
      return data.voice_id;
    } catch (error) {
      console.error('Erro ao clonar voz:', error);
      return null;
    }
  }

  // Get usage statistics
  async getUsageStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/user`, {
        headers: {
          'Accept': 'application/json',
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return null;
    }
  }
}

export default ElevenLabsIntegration;