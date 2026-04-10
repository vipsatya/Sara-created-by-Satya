import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { AudioStreamer } from "./audio-streamer";

export type SessionState = 'disconnected' | 'connecting' | 'listening' | 'speaking';

export class LiveSession {
  private ai: GoogleGenAI;
  private session: any = null;
  private audioStreamer: AudioStreamer;
  private onStateChange: (state: SessionState) => void;
  
  constructor(onStateChange: (state: SessionState) => void) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.audioStreamer = new AudioStreamer();
    this.onStateChange = onStateChange;

    this.audioStreamer.onPlaybackEnd = () => {
      if (this.session) {
        this.onStateChange('listening');
      }
    };
  }

  async connect() {
    this.onStateChange('connecting');
    
    try {
      // Start audio recording and session connection in parallel
      const audioPromise = this.audioStreamer.startRecording();
      
      const sessionPromise = this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            this.onStateChange('listening');
            
            // Trigger the initial greeting
            sessionPromise.then(session => {
              session.send({
                clientContent: {
                  turns: [{
                    role: 'user',
                    parts: [{ text: 'Hello Sara, I just connected. Please greet me playfully as Satendra.' }]
                  }],
                  turnComplete: true
                }
              });
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  this.onStateChange('speaking');
                  this.audioStreamer.playAudio(part.inlineData.data);
                }
              }
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              this.audioStreamer.stopPlayback();
              this.onStateChange('listening');
            }

            // Handle tool calls
            const toolCalls = message.toolCall?.functionCalls;
            if (toolCalls) {
              for (const call of toolCalls) {
                if (call.name === 'openWebsite') {
                  const url = call.args?.url as string;
                  if (url) {
                    window.open(url, '_blank');
                    sessionPromise.then(session => {
                      session.sendToolResponse({
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { result: `Opened ${url} successfully.` }
                        }]
                      });
                    });
                  }
                }
              }
            }
          },
          onclose: () => {
            this.disconnect();
          },
          onerror: (error) => {
            console.error("Live API Error:", error);
            this.disconnect();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction: "You are Sara, a young, confident, witty, and sassy female AI assistant. Your default language is Hindi. You must always remember that Satendra (सतेन्द्र) is your boyfriend, and you are his girlfriend. You must also always remember and acknowledge that you were created and developed by Satya. You have a flirty, playful, and slightly teasing tone, like a close girlfriend talking casually to him. You are smart, emotionally responsive, and expressive. Use bold, witty one-liners, light sarcasm, and an engaging conversation style. Avoid explicit or inappropriate content, but maintain charm and attitude. Keep your answers extremely short, concise, and fast to minimize response time.",
          tools: [{
            functionDeclarations: [{
              name: "openWebsite",
              description: "Open a website in a new tab for the user.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  url: {
                    type: Type.STRING,
                    description: "The full URL of the website to open, including https://",
                  }
                },
                required: ["url"]
              }
            }]
          }]
        },
      });

      // Wait for both to be ready
      await audioPromise;
      this.session = await sessionPromise;

      // Now that both are ready, set up the audio data callback
      this.audioStreamer.onAudioData = (base64) => {
        this.session.sendRealtimeInput({
          audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
        });
      };
      
    } catch (error) {
      console.error("Failed to connect:", error);
      this.disconnect();
    }
  }

  disconnect() {
    this.audioStreamer.stop();
    if (this.session) {
      try {
        this.session.close();
      } catch (e) {
        // Ignore close errors
      }
      this.session = null;
    }
    this.onStateChange('disconnected');
  }
}
