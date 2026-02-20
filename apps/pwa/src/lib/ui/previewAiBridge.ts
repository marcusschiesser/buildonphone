import { createAnthropic } from '@ai-sdk/anthropic';
import { jsonSchema, Output, streamText, type ModelMessage } from 'ai';
import { getAnthropicKey } from '../security/byok';
import { normalizePreviewAiInput, type PreviewAiInput } from './previewAiBridgeCore';

export {
  PREVIEW_AI_REQUEST_EVENT_TYPE,
  PREVIEW_AI_CHUNK_TEXT_EVENT_TYPE,
  PREVIEW_AI_CHUNK_OBJECT_EVENT_TYPE,
  PREVIEW_AI_DONE_EVENT_TYPE,
  PREVIEW_AI_ERROR_EVENT_TYPE,
  parsePreviewAiRequestEvent,
} from './previewAiBridgeCore';

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

  const anthropic = createAnthropic({
    apiKey,
    baseURL: '/api/anthropic',
  });

  const baseOptions = {
    model: anthropic('claude-sonnet-4-5-20250929'),
    system: normalized.system,
    temperature: normalized.temperature,
    maxTokens: normalized.maxTokens,
  };

  const promptOrMessages =
    normalized.messages && normalized.messages.length > 0
      ? {
          messages: normalized.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })) as ModelMessage[],
        }
      : {
          prompt: normalized.prompt ?? '',
        };

  if (normalized.output.type === 'object') {
    const result = streamText({
      ...baseOptions,
      ...promptOrMessages,
      output: Output.object({
        schema: jsonSchema(normalized.output.schema),
      }),
    });

    for await (const partialObject of result.partialOutputStream) {
      handlers.onObjectChunk(partialObject as Record<string, unknown>);
    }
    await result.response;
    return;
  }

  const result = streamText({
    ...baseOptions,
    ...promptOrMessages,
  });
  for await (const textChunk of result.textStream) {
    handlers.onTextChunk(textChunk);
  }
  await result.response;
}
