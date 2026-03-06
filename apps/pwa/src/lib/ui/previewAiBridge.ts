import { getAnthropicKey } from '../security/byok';
import { AuthRequiredError } from './aiAccess';
import { normalizePreviewAiInput, type PreviewAiInput } from './previewAiBridgeCore';

export {
  PREVIEW_AI_REQUEST_EVENT_TYPE,
  PREVIEW_AI_CHUNK_TEXT_EVENT_TYPE,
  PREVIEW_AI_CHUNK_OBJECT_EVENT_TYPE,
  PREVIEW_AI_DONE_EVENT_TYPE,
  PREVIEW_AI_ERROR_EVENT_TYPE,
  parsePreviewAiRequestEvent,
} from './previewAiBridgeCore';

type PreviewAiSseEvent = {
  event: string;
  data: unknown;
};

function parseSseEvents(buffer: string): { remaining: string; events: PreviewAiSseEvent[] } {
  const events: PreviewAiSseEvent[] = [];
  let remaining = buffer;

  while (true) {
    const boundary = remaining.indexOf('\n\n');
    if (boundary === -1) {
      break;
    }

    const rawEvent = remaining.slice(0, boundary);
    remaining = remaining.slice(boundary + 2);

    const lines = rawEvent
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0 && !line.startsWith(':'));

    if (lines.length === 0) continue;

    let event = 'message';
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('event:')) {
        event = line.slice('event:'.length).trim();
        continue;
      }
      if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trimStart());
      }
    }

    const rawData = dataLines.join('\n');
    let data: unknown = null;
    if (rawData.length > 0) {
      try {
        data = JSON.parse(rawData);
      } catch {
        data = { text: rawData };
      }
    }

    events.push({ event, data });
  }

  return { remaining, events };
}

export async function executePreviewAiRequest(
  input: PreviewAiInput,
  handlers: {
    onTextChunk: (chunk: string) => void;
    onObjectChunk: (chunk: Record<string, unknown>) => void;
  }
): Promise<void> {
  const normalized = normalizePreviewAiInput(input);
  const apiKey = await getAnthropicKey();
  if (!apiKey) {
    throw new Error('Missing Anthropic API key in host app. Add your BYOK key first.');
  }

  const response = await fetch('/api/preview-ai', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body: JSON.stringify({ input: normalized }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new AuthRequiredError();
    }
    const contentType = response.headers.get('content-type') ?? '';
    const message = contentType.includes('application/json')
      ? ((await response.json().catch(() => null)) as { error?: string } | null)?.error
      : await response.text().catch(() => 'Preview AI request failed.');
    throw new Error(message || 'Preview AI request failed.');
  }

  if (!response.body) {
    throw new Error('Preview AI response stream unavailable.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      buffer += decoder.decode();
      const parsed = parseSseEvents(buffer);
      for (const event of parsed.events) {
        if (event.event === 'text-chunk') {
          const text = (event.data as { text?: unknown } | null)?.text;
          handlers.onTextChunk(typeof text === 'string' ? text : '');
          continue;
        }

        if (event.event === 'object-chunk') {
          const object = (event.data as { object?: unknown } | null)?.object;
          if (object && typeof object === 'object' && !Array.isArray(object)) {
            handlers.onObjectChunk(object as Record<string, unknown>);
          }
          continue;
        }

        if (event.event === 'error') {
          const error = (event.data as { error?: unknown } | null)?.error;
          throw new Error(typeof error === 'string' ? error : 'Preview AI request failed.');
        }

        if (event.event === 'done') {
          return;
        }
      }

      return;
    }

    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseEvents(buffer);
    buffer = parsed.remaining;

    for (const event of parsed.events) {
      if (event.event === 'text-chunk') {
        const text = (event.data as { text?: unknown } | null)?.text;
        handlers.onTextChunk(typeof text === 'string' ? text : '');
        continue;
      }

      if (event.event === 'object-chunk') {
        const object = (event.data as { object?: unknown } | null)?.object;
        if (object && typeof object === 'object' && !Array.isArray(object)) {
          handlers.onObjectChunk(object as Record<string, unknown>);
        }
        continue;
      }

      if (event.event === 'error') {
        const error = (event.data as { error?: unknown } | null)?.error;
        throw new Error(typeof error === 'string' ? error : 'Preview AI request failed.');
      }

      if (event.event === 'done') {
        return;
      }
    }
  }
}
