/**
 * Gateway interface types for dependency injection
 * Supports OpenAI, Replay, and Stub providers
 */

// ============================================================================
// LLM Gateway
// ============================================================================

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  messages: LlmMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json_object';
}

export interface LlmResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export interface ILlmGateway {
  complete(request: LlmRequest): Promise<LlmResponse>;
}

// ============================================================================
// TTS Gateway
// ============================================================================

export interface TtsRequest {
  text: string;
  voice: string;
  model?: string;
  speed?: number;
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac';
}

export interface TtsResponse {
  audioBuffer: Buffer;
  durationSeconds: number;
  latencyMs: number;
}

export interface ITtsGateway {
  synthesize(request: TtsRequest): Promise<TtsResponse>;
}

// ============================================================================
// HTTP Gateway (for web scraping)
// ============================================================================

export interface HttpRequest {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  timeout?: number;
  followRedirects?: boolean;
}

export interface HttpResponse {
  url: string; // final URL after redirects
  status: number;
  headers: Record<string, string>;
  body: string;
  latencyMs: number;
}

export interface IHttpGateway {
  fetch(request: HttpRequest): Promise<HttpResponse>;
}

// ============================================================================
// Gateway Factory
// ============================================================================

export interface GatewayConfig {
  llmProvider: 'openai' | 'replay' | 'stub';
  ttsProvider: 'openai' | 'replay' | 'stub';
  httpProvider: 'openai' | 'replay' | 'stub';
  cassetteKey: string;
  cassettePath: string;
  openaiApiKey?: string;
}

