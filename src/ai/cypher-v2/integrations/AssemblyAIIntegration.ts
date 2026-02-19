// AssemblyAI Integration for CYPHER AI v2
// Advanced speech recognition with speaker diarization and sentiment analysis

import type { CypherAIConfig } from '../types';

interface TranscriptionResult {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
    speaker?: string;
  }>;
  utterances?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
    speaker: string;
    words: Array<any>;
  }>;
  sentiment_analysis_results?: Array<{
    text: string;
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    confidence: number;
    timestamp: { start: number; end: number };
  }>;
  entities?: Array<{
    entity_type: string;
    text: string;
    start: number;
    end: number;
  }>;
  summary?: string;
  chapters?: Array<{
    summary: string;
    headline: string;
    gist: string;
    start: number;
    end: number;
  }>;
}

export class AssemblyAIIntegration {
  private apiKey: string;
  private baseURL: string = 'https://api.assemblyai.com/v2';
  private isInitialized: boolean = false;
  private websocket: WebSocket | null = null;

  constructor(config: CypherAIConfig) {
    this.apiKey = config.apiKeys?.assemblyai || '';
    if (!this.apiKey) {
    }
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      throw new Error('AssemblyAI API key é necessária');
    }

    try {
      // Test the API connection
      const response = await fetch(`${this.baseURL}/transcript`, {
        method: 'GET',
        headers: {
          'Authorization': this.apiKey
        }
      });

      if (response.ok) {
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar AssemblyAI:', error);
      throw error;
    }
  }

  // Real-time transcription via WebSocket
  async startRealtimeTranscription(params: {
    onPartialTranscript: (text: string) => void;
    onFinalTranscript: (text: string, confidence: number) => void;
    onError?: (error: Error) => void;
    sampleRate?: number;
    wordBoost?: string[];
    languageCode?: string;
  }): Promise<{
    sendAudio: (audioData: ArrayBuffer) => void;
    stop: () => void;
  }> {
    if (!this.isInitialized) {
      throw new Error('AssemblyAI não está inicializado');
    }

    try {
      // Get temporary token for WebSocket
      const tokenResponse = await fetch(`${this.baseURL}/realtime/token`, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expires_in: 3600 // 1 hour
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get WebSocket token');
      }

      const { token } = await tokenResponse.json();

      // Connect to WebSocket
      const wsUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${params.sampleRate || 16000}`;
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        
        // Authenticate
        this.websocket?.send(JSON.stringify({
          token
        }));

        // Configure session
        if (params.wordBoost) {
          this.websocket?.send(JSON.stringify({
            word_boost: params.wordBoost
          }));
        }
      };

      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.message_type) {
          case 'PartialTranscript':
            params.onPartialTranscript(data.text);
            break;
            
          case 'FinalTranscript':
            params.onFinalTranscript(data.text, data.confidence);
            break;
            
          case 'SessionBegins':
            break;
            
          case 'SessionTerminated':
            break;
            
          default:
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        params.onError?.(new Error('WebSocket error'));
      };

      this.websocket.onclose = () => {
      };

      // Return control methods
      return {
        sendAudio: (audioData: ArrayBuffer) => {
          if (this.websocket?.readyState === WebSocket.OPEN) {
            // Convert to base64 for WebSocket transmission
            const base64 = btoa(String.fromCharCode(...new Uint8Array(audioData)));
            this.websocket.send(JSON.stringify({
              audio_data: base64
            }));
          }
        },
        stop: () => {
          if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
          }
        }
      };
    } catch (error) {
      console.error('Erro ao iniciar transcrição em tempo real:', error);
      throw error;
    }
  }

  // Upload and transcribe audio file
  async transcribeAudioFile(params: {
    audioUrl?: string;
    audioFile?: File;
    languageCode?: string;
    speakerLabels?: boolean;
    sentimentAnalysis?: boolean;
    entityDetection?: boolean;
    summarization?: boolean;
    autoChapters?: boolean;
    customVocabulary?: string[];
  }): Promise<TranscriptionResult> {
    if (!this.isInitialized) {
      throw new Error('AssemblyAI não está inicializado');
    }

    try {
      let audioUrl = params.audioUrl;

      // Upload file if provided
      if (params.audioFile && !audioUrl) {
        audioUrl = await this.uploadAudioFile(params.audioFile);
      }

      if (!audioUrl) {
        throw new Error('Audio URL ou arquivo é necessário');
      }

      // Create transcription request
      const transcriptResponse = await fetch(`${this.baseURL}/transcript`, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          language_code: params.languageCode || 'pt',
          speaker_labels: params.speakerLabels || false,
          sentiment_analysis: params.sentimentAnalysis || false,
          entity_detection: params.entityDetection || false,
          summarization: params.summarization || false,
          auto_chapters: params.autoChapters || false,
          word_boost: params.customVocabulary || []
        })
      });

      if (!transcriptResponse.ok) {
        throw new Error('Failed to create transcription');
      }

      const { id } = await transcriptResponse.json();

      // Poll for completion
      return await this.pollTranscriptionStatus(id);
    } catch (error) {
      console.error('Erro na transcrição:', error);
      throw error;
    }
  }

  private async uploadAudioFile(file: File): Promise<string> {
    const uploadResponse = await fetch(`${this.baseURL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey
      },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload audio file');
    }

    const { upload_url } = await uploadResponse.json();
    return upload_url;
  }

  private async pollTranscriptionStatus(
    transcriptId: string, 
    maxAttempts: number = 60
  ): Promise<TranscriptionResult> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const response = await fetch(`${this.baseURL}/transcript/${transcriptId}`, {
        headers: {
          'Authorization': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get transcription status');
      }

      const result: TranscriptionResult = await response.json();

      if (result.status === 'completed') {
        return result;
      } else if (result.status === 'error') {
        throw new Error('Transcription failed');
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Transcription timeout');
  }

  // Advanced features
  async searchTranscripts(query: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/transcript/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error('Search failed');
    }

    return await response.json();
  }

  async getLeMURSummary(transcriptIds: string[], params?: {
    context?: string;
    question?: string;
    finalModel?: 'anthropic/claude-2' | 'basic';
  }): Promise<any> {
    const response = await fetch(`${this.baseURL}/lemur/summary`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transcript_ids: transcriptIds,
        context: params?.context,
        answer_format: 'Provide a detailed summary in Portuguese',
        final_model: params?.finalModel || 'basic'
      })
    });

    if (!response.ok) {
      throw new Error('LeMUR summary failed');
    }

    return await response.json();
  }

  async askLeMURQuestion(transcriptIds: string[], question: string, context?: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/lemur/question-answer`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transcript_ids: transcriptIds,
        questions: [{ question, answer_format: 'text' }],
        context: context || 'Answer questions about cryptocurrency and Bitcoin trading'
      })
    });

    if (!response.ok) {
      throw new Error('LeMUR Q&A failed');
    }

    return await response.json();
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }

  // Custom vocabulary management
  async createCustomModel(params: {
    name: string;
    language: string;
    phrases: Array<{ text: string; boost?: number }>;
  }): Promise<string> {
    const response = await fetch(`${this.baseURL}/model`, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: params.name,
        language: params.language,
        phrases: params.phrases
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create custom model');
    }

    const { id } = await response.json();
    return id;
  }
}

export default AssemblyAIIntegration;