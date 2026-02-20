import { createAnthropic } from '@ai-sdk/anthropic';
import { stepCountIs, streamText, tool, type ModelMessage } from 'ai';
import { CodingAgent } from 'edge-pi';
import { z } from 'zod';
import { getSystemPrompt } from './systemPrompt';
import { getBrowserRuntime, hydrateContainer, readGeneratedAppJsx } from './webcontainerSession';

export interface BrowserAgentInput {
  apiKey: string;
  theme: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  baseFiles?: Record<string, string>;
  onText?: (delta: string) => void;
  onToolCall?: (target: string) => void;
  onStatus?: (status: string) => void;
}

export interface BrowserAgentResult {
  text: string;
  artifacts: Record<string, string>;
}

function toModelMessages(messages: BrowserAgentInput['messages']): ModelMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content: [{ type: 'text', text: m.content }],
  }));
}

async function runFallbackAgent(input: BrowserAgentInput, anthropic: ReturnType<typeof createAnthropic>): Promise<BrowserAgentResult> {
  const artifacts: Record<string, string> = {};
  let text = '';

  const result = streamText({
    model: anthropic('claude-sonnet-4-5-20250929'),
    system: getSystemPrompt(input.theme),
    messages: toModelMessages(input.messages),
    tools: {
      write_file: tool({
        description: 'Write output app file',
        inputSchema: z.object({
          filename: z.string(),
          content: z.string(),
        }),
        execute: async ({ filename, content }) => {
          if (filename === 'app.jsx') {
            artifacts[filename] = content;
            input.onToolCall?.(filename);
            return { success: true };
          }
          return { success: false };
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });

  for await (const part of result.fullStream) {
    if (part.type === 'text-delta') {
      text += part.text;
      input.onText?.(part.text);
    }
  }

  try {
    await result.response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!(message.includes('No output generated') && Object.keys(artifacts).length > 0)) {
      throw error;
    }
  }

  if (!text.trim()) text = 'Generated app.jsx.';
  return { text, artifacts };
}

export async function runBrowserAgent(input: BrowserAgentInput): Promise<BrowserAgentResult> {
  input.onStatus?.('Generating app.jsx');

  const anthropic = createAnthropic({
    apiKey: input.apiKey,
    baseURL: '/api/anthropic',
  });

  const runtime = await getBrowserRuntime();
  const agent = new CodingAgent({
    model: anthropic('claude-sonnet-4-5-20250929'),
    runtime,
    cwd: '.',
    stopWhen: stepCountIs(8),
    toolSet: 'coding',
    systemPromptOptions: {
      appendSystemPrompt: getSystemPrompt(input.theme),
    },
  });

  const result = await agent.stream({
    messages: toModelMessages(input.messages),
  });
  let text = '';

  try {
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') {
        text += part.text;
        input.onText?.(part.text);
      }
      if (part.type === 'tool-call') {
        input.onToolCall?.(part.toolName);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('ENOENT') && message.includes('app.jsx')) {
      input.onStatus?.('Retrying with fallback generator');
      return runFallbackAgent(input, anthropic);
    }
    throw error;
  }

  try {
    await result.response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('ENOENT') && message.includes('app.jsx')) {
      input.onStatus?.('Retrying with fallback generator');
      return runFallbackAgent(input, anthropic);
    }
    throw error;
  }

  input.onStatus?.('Syncing artifacts');
  let appJsx = '';
  try {
    appJsx = await readGeneratedAppJsx();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('app.jsx')) {
      input.onStatus?.('Retrying with fallback generator');
      return runFallbackAgent(input, anthropic);
    }
    throw error;
  }
  const artifacts: Record<string, string> = { 'app.jsx': appJsx };
  if (!text.trim()) text = 'Generated app.jsx.';

  return { text, artifacts };
}
