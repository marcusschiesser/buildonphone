export const PREVIEW_AI_REQUEST_EVENT_TYPE = 'claw2go-ai-request';
export const PREVIEW_AI_CHUNK_TEXT_EVENT_TYPE = 'claw2go-ai-chunk-text';
export const PREVIEW_AI_CHUNK_OBJECT_EVENT_TYPE = 'claw2go-ai-chunk-object';
export const PREVIEW_AI_DONE_EVENT_TYPE = 'claw2go-ai-done';
export const PREVIEW_AI_ERROR_EVENT_TYPE = 'claw2go-ai-error';

export interface PreviewAiInput {
  prompt?: string;
  messages?: {
    role: 'system' | 'user' | 'assistant';
    content: string | PreviewMessagePart[];
  }[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  output?: { type: 'text' } | { type: 'object'; schema: Record<string, unknown> };
  model?: unknown;
  provider?: unknown;
}

export type PreviewMessagePart = { type: 'text'; text: string } | { type: 'image'; image: string };

export interface PreviewAiRequestEvent {
  type: typeof PREVIEW_AI_REQUEST_EVENT_TYPE;
  requestId: string;
  input: PreviewAiInput;
}

export interface NormalizedPreviewAiInput {
  prompt?: string;
  messages?: { role: 'system' | 'user' | 'assistant'; content: PreviewMessagePart[] }[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  output: { type: 'text' } | { type: 'object'; schema: Record<string, unknown> };
}

export function parsePreviewAiRequestEvent(data: unknown): PreviewAiRequestEvent | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as { type?: unknown; requestId?: unknown; input?: unknown };
  if (payload.type !== PREVIEW_AI_REQUEST_EVENT_TYPE) return null;
  if (typeof payload.requestId !== 'string' || payload.requestId.trim().length === 0) return null;
  if (!payload.input || typeof payload.input !== 'object') return null;
  return {
    type: PREVIEW_AI_REQUEST_EVENT_TYPE,
    requestId: payload.requestId,
    input: payload.input as PreviewAiInput,
  };
}

export function normalizePreviewAiInput(input: PreviewAiInput): NormalizedPreviewAiInput {
  if (input.model != null || input.provider != null) {
    throw new Error('Custom model/provider selection is not supported. Host controls provider and model.');
  }

  const prompt = typeof input.prompt === 'string' ? input.prompt : undefined;
  const messages = Array.isArray(input.messages)
    ? (input.messages as unknown[])
        .map((rawMessage) => {
          if (!rawMessage || typeof rawMessage !== 'object') return null;
          const message = rawMessage as { role?: unknown; content?: unknown };
          if (
            typeof message.role !== 'string' ||
            !['system', 'user', 'assistant'].includes(message.role) ||
            (typeof message.content !== 'string' && !Array.isArray(message.content))
          ) {
            return null;
          }

          const normalizedContent =
            typeof message.content === 'string'
              ? [{ type: 'text' as const, text: message.content }]
              : message.content.filter(isPreviewMessagePart);
          if (normalizedContent.length === 0) return null;

          return {
            role: message.role as 'system' | 'user' | 'assistant',
            content: normalizedContent,
          };
        })
        .filter((message): message is { role: 'system' | 'user' | 'assistant'; content: PreviewMessagePart[] } =>
          Boolean(message)
        )
    : undefined;

  if (!prompt && !messages) {
    throw new Error('AI request must include either prompt or messages.');
  }

  const output =
    input.output?.type === 'object'
      ? (() => {
          if (!input.output.schema || typeof input.output.schema !== 'object' || Array.isArray(input.output.schema)) {
            throw new Error('Object output requires a JSON schema object.');
          }
          return { type: 'object' as const, schema: hardenJsonSchemaForProvider(input.output.schema) };
        })()
      : { type: 'text' as const };

  return {
    prompt,
    messages,
    system: typeof input.system === 'string' ? input.system : undefined,
    temperature: typeof input.temperature === 'number' ? input.temperature : undefined,
    maxTokens: typeof input.maxTokens === 'number' ? input.maxTokens : undefined,
    output,
  };
}

export function hardenJsonSchemaForProvider(schema: Record<string, unknown>): Record<string, unknown> {
  const hardened = hardenSchemaNode(schema);
  if (!hardened || typeof hardened !== 'object' || Array.isArray(hardened)) {
    throw new Error('Object output requires a JSON schema object.');
  }
  return hardened as Record<string, unknown>;
}

function hardenSchemaNode(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(hardenSchemaNode);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  const hardened: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(record)) {
    hardened[key] = hardenSchemaNode(child);
  }

  const typeValue = hardened.type;
  const isObjectNode =
    typeValue === 'object' ||
    (Array.isArray(typeValue) && typeValue.includes('object')) ||
    Object.prototype.hasOwnProperty.call(hardened, 'properties');

  if (isObjectNode && !Object.prototype.hasOwnProperty.call(hardened, 'additionalProperties')) {
    hardened.additionalProperties = false;
  }

  return hardened;
}

function isPreviewMessagePart(value: unknown): value is PreviewMessagePart {
  if (!value || typeof value !== 'object') return false;
  const part = value as { type?: unknown; text?: unknown; image?: unknown };
  if (part.type === 'text') {
    return typeof part.text === 'string';
  }
  if (part.type === 'image') {
    return typeof part.image === 'string';
  }
  return false;
}
