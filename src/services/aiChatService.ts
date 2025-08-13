import { supabase } from '../lib/supabase';

// Configuration for AI services
interface AIConfig {
  openaiApiKey: string;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  anthropicApiKey?: string; // Optional - if you want to use Claude
}

// Message types
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  mode?: 'live' | 'ai';
}

interface KnowledgeBaseResult {
  id: number;
  category: string;
  question: string;
  answer: string;
  relevance_score: number;
}

class AIChatService {
  private config: AIConfig;
  private conversationHistory: ChatMessage[] = [];
  private sessionId: string;
  private audioContext: AudioContext | null = null;
  private voiceEnabled: boolean = false;

  constructor(config: Partial<AIConfig>) {
    this.config = {
      openaiApiKey: config.openaiApiKey || import.meta.env.VITE_OPENAI_API_KEY || '',
      elevenLabsApiKey: config.elevenLabsApiKey || import.meta.env.VITE_ELEVENLABS_API_KEY || '',
      elevenLabsVoiceId: config.elevenLabsVoiceId || import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL', // Default to "Bella" voice
      anthropicApiKey: config.anthropicApiKey || import.meta.env.VITE_ANTHROPIC_API_KEY
    };
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  // Check if live staff is available
  async isStaffAvailable(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('is_chat_staff_available');
      
      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking staff availability:', error);
      return false;
    }
  }

  // Search knowledge base using Supabase
  async searchKnowledgeBase(query: string): Promise<KnowledgeBaseResult[]> {
    try {
      const { data, error } = await supabase
        .rpc('search_knowledge_base', {
          query_text: query,
          limit_results: 3
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return [];
    }
  }

  // Generate AI response using OpenAI
  async generateAIResponse(userMessage: string): Promise<string> {
    try {
      // First, search the knowledge base
      const knowledgeResults = await this.searchKnowledgeBase(userMessage);
      
      // If we have high-confidence matches, use them
      if (knowledgeResults.length > 0 && knowledgeResults[0].relevance_score > 0.7) {
        return knowledgeResults[0].answer;
      }

      // Otherwise, use OpenAI for more complex queries
      const systemPrompt = `You are a friendly and helpful virtual receptionist for Music Supplies, a music instrument store. 
      You should be warm, professional, and knowledgeable about musical instruments and our services.
      
      Our store information:
      - We carry guitars (Yamaha, Ibanez, Epiphone), drums (Pearl, Tama, Ludwig), and keyboards (Roland, Korg, Yamaha)
      - We offer repairs, lessons ($30/30min, $50/hour), and financing
      - Hours: Mon-Fri 9am-6pm, Sat 10am-4pm, Sun closed
      - Free shipping over $99
      
      ${knowledgeResults.length > 0 ? `Related information from our database:\n${knowledgeResults.map(r => r.answer).join('\n')}` : ''}
      
      If you don't know something specific, offer to connect them with a staff member or take their contact info.
      Keep responses concise and friendly.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            ...this.conversationHistory.slice(-5), // Include last 5 messages for context
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Fallback to knowledge base or default response
      const knowledgeResults = await this.searchKnowledgeBase(userMessage);
      if (knowledgeResults.length > 0) {
        return knowledgeResults[0].answer;
      }
      
      return "I apologize, but I'm having trouble understanding your question. Would you like me to connect you with one of our staff members who can help you better?";
    }
  }

  // Generate embeddings for knowledge base (for advanced search)
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return [];
    }
  }

  // Convert text to speech using ElevenLabs
  async textToSpeech(text: string): Promise<ArrayBuffer | null> {
    if (!this.voiceEnabled || !this.config.elevenLabsApiKey) {
      return null;
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.config.elevenLabsVoiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.config.elevenLabsApiKey
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.5,
              use_speaker_boost: true
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Error generating speech:', error);
      return null;
    }
  }

  // Play audio response
  async playAudioResponse(audioBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    try {
      const audioData = await this.audioContext.decodeAudioData(audioBuffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioData;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  // Main chat method
  async sendMessage(
    message: string, 
    userIdentifier?: string,
    preferVoice: boolean = false
  ): Promise<{ text: string; audio?: ArrayBuffer; mode: 'live' | 'ai' }> {
    // Store user message
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Log conversation to database
    await this.logConversation('user', message, userIdentifier);

    // Check if staff is available
    const staffAvailable = await this.isStaffAvailable();

    if (staffAvailable) {
      // Route to live chat (existing WebSocket implementation)
      return {
        text: "Connecting you to our live receptionist...",
        mode: 'live'
      };
    }

    // Generate AI response
    const aiResponse = await this.generateAIResponse(message);
    
    // Store AI response
    this.conversationHistory.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
      mode: 'ai'
    });

    // Log AI response
    await this.logConversation('assistant', aiResponse, userIdentifier, 'ai');

    // Generate voice if requested
    let audioBuffer: ArrayBuffer | null = null;
    if (preferVoice) {
      audioBuffer = await this.textToSpeech(aiResponse);
    }

    return {
      text: aiResponse,
      audio: audioBuffer || undefined,
      mode: 'ai'
    };
  }

  // Log conversation to database
  private async logConversation(
    messageType: 'user' | 'assistant' | 'system',
    message: string,
    userIdentifier?: string,
    mode: 'live' | 'ai' = 'ai'
  ): Promise<void> {
    try {
      await supabase
        .from('chat_conversations')
        .insert({
          session_id: this.sessionId,
          user_identifier: userIdentifier,
          message_type: messageType,
          message: message,
          mode: mode,
          metadata: {
            timestamp: new Date().toISOString(),
            conversationLength: this.conversationHistory.length
          }
        });
    } catch (error) {
      console.error('Error logging conversation:', error);
    }
  }

  // Enable/disable voice
  setVoiceEnabled(enabled: boolean): void {
    this.voiceEnabled = enabled;
    if (enabled && !this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  // Get conversation history
  getConversationHistory(): ChatMessage[] {
    return this.conversationHistory;
  }

  // Clear conversation
  clearConversation(): void {
    this.conversationHistory = [];
    this.sessionId = this.generateSessionId();
  }

  // Add knowledge to database (admin function)
  async addKnowledgeBaseEntry(
    category: string,
    question: string,
    answer: string,
    keywords: string[]
  ): Promise<boolean> {
    try {
      // Generate embedding for the question
      const embedding = await this.generateEmbedding(question + ' ' + answer);

      const { error } = await supabase
        .from('chat_knowledge_base')
        .insert({
          category,
          question,
          answer,
          keywords,
          embedding: embedding.length > 0 ? embedding : null
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding knowledge base entry:', error);
      return false;
    }
  }
}

export default AIChatService;

// Export singleton instance
export const aiChatService = new AIChatService({});