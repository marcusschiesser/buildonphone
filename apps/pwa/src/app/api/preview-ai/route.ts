import { createAnthropic } from '@ai-sdk/anthropic';
import { jsonSchema, Output, streamText, type ModelMessage } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_MODEL } from '@/lib/model';
import { normalizePreviewAiInput, type PreviewAiInput } from '@/lib/ui/previewAiBridgeCore';

export const runtime = 'nodejs';

function createSseResponseStream(executor: (send: (event: string, data: unknown) => void) => Promise<void>) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await executor(send);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        send('error', { error: message });
      } finally {
        send('done', {});
        controller.close();
      }
    },
  });
}

function toModelMessages(messages: NonNullable<ReturnType<typeof normalizePreviewAiInput>['messages']>): ModelMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  })) as ModelMessage[];
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { input?: PreviewAiInput } | null;
  if (!body?.input) {
    return NextResponse.json({ error: 'Missing preview AI input.' }, { status: 400 });
  }

  const normalized = normalizePreviewAiInput(body.input);
  const serverKey = process.env.ANTHROPIC_API_KEY?.trim();
  const byok = req.headers.get('x-api-key')?.trim();
  const apiKey = serverKey || byok;

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Anthropic API key in host app. Add your BYOK key first.' }, { status: 400 });
  }

  const anthropic = createAnthropic({ apiKey });

  const stream = createSseResponseStream(async (send) => {
    const baseOptions = {
      model: anthropic(DEFAULT_MODEL),
      system: normalized.system,
      temperature: normalized.temperature,
      maxTokens: normalized.maxTokens,
    };

    const promptOrMessages =
      normalized.messages && normalized.messages.length > 0
        ? {
            messages: toModelMessages(normalized.messages),
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
        send('object-chunk', { object: partialObject });
      }
      await result.response;
      return;
    }

    const result = streamText({
      ...baseOptions,
      ...promptOrMessages,
    });

    for await (const textChunk of result.textStream) {
      send('text-chunk', { text: textChunk });
    }
    await result.response;
  });

  return new NextResponse(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
