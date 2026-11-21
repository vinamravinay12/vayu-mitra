import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { describeCause, logEvent } from '../logging/log.js';
import {
  LlmQuotaExceededError,
  LlmUnavailableError,
  type LlmClient,
  type LlmPurpose,
  type LlmRequest,
} from './llm-client.js';
import { isQuotaExceeded, withRetry, type RetryOptions } from './retry.js';

/** Waits; the default delay between retries. */
export const sleep = (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

/** Two attempts, 500 ms apart, for transient upstream errors. */
const DEFAULT_RETRY: RetryOptions = { attempts: 2, baseDelayMs: 500, delay: sleep };

/**
 * Per model, not per request. A hung call must not hold a Cloud Run slot open:
 * in probing, Gemini 3.6 and 3.8 Flash timed out at 30 s under load while
 * 3.5 Flash-Lite answered in 0.9–1.8 s, so a slow model hands over to the next.
 */
const REQUEST_TIMEOUT_MS = 10_000;

/** Ceilings sized to each schema: a guard verdict is tiny, a family of eight is not. */
const MAX_OUTPUT_TOKENS: Readonly<Record<LlmPurpose, number>> = {
  guard: 120,
  extract: 1500,
  coach: 900,
  ask: 500,
};

/**
 * Thinking is kept to a minimum. Every call is a constrained reading or writing
 * task with a fixed schema, and default thinking can spend the whole output
 * budget on reasoning tokens and return truncated JSON.
 */
const THINKING_LEVEL: Readonly<Record<LlmPurpose, ThinkingLevel>> = {
  guard: ThinkingLevel.MINIMAL,
  extract: ThinkingLevel.MINIMAL,
  coach: ThinkingLevel.MINIMAL,
  ask: ThinkingLevel.MINIMAL,
};

/** The shape of the SDK call this adapter makes, so tests can substitute it. */
export type GenerateContent = (
  parameters: Parameters<GoogleGenAI['models']['generateContent']>[0],
) => Promise<{ text?: string | undefined }>;

/**
 * Adapter over the Gemini Developer API.
 *
 * The key lives only in this server process. Every call is schema-constrained
 * JSON at low temperature, time-limited, retried on transient errors, and falls
 * through the model list on failure.
 */
export function createGeminiClient(
  generateContent: GenerateContent,
  models: readonly string[],
  retry: RetryOptions = DEFAULT_RETRY,
): LlmClient {
  const callModel = (model: string, request: LlmRequest): Promise<string> =>
    withRetry(async () => {
      const response = await generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
        config: {
          systemInstruction: request.systemInstruction,
          temperature: request.temperature,
          maxOutputTokens: MAX_OUTPUT_TOKENS[request.purpose],
          thinkingConfig: { thinkingLevel: THINKING_LEVEL[request.purpose] },
          responseMimeType: 'application/json',
          responseJsonSchema: request.schema,
          abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      });
      return response.text ?? '';
    }, retry);

  return {
    async generate(request: LlmRequest): Promise<string> {
      let lastError: unknown = new Error('No models configured');
      for (const model of models) {
        const started = Date.now();
        try {
          const text = await callModel(model, request);
          logEvent('INFO', 'gemini call', {
            model,
            purpose: request.purpose,
            ms: Date.now() - started,
          });
          return text;
        } catch (cause) {
          lastError = cause;
          logEvent('WARNING', 'gemini call failed', {
            model,
            purpose: request.purpose,
            cause: describeCause(cause),
          });
        }
      }
      const message = describeCause(lastError);
      throw isQuotaExceeded(lastError)
        ? new LlmQuotaExceededError(message)
        : new LlmUnavailableError(message);
    },
  };
}

/** Binds the adapter to the real SDK. */
export function createGeminiClientFromKey(apiKey: string, models: readonly string[]): LlmClient {
  const genai = new GoogleGenAI({ apiKey });
  return createGeminiClient((parameters) => genai.models.generateContent(parameters), models);
}
