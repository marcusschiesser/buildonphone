import { createAnthropic } from '@ai-sdk/anthropic';
import { stepCountIs, type ModelMessage } from 'ai';
import { CodingAgent } from 'edge-pi';
import { getSystemPrompt } from './systemPrompt';
import { getBrowserRuntime, readGeneratedAppJsx } from './webcontainerSession';

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
    throw new Error(`CodingAgent generation failed while streaming: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    await result.response;
  } catch (error) {
    throw new Error(`CodingAgent generation failed before completion: ${error instanceof Error ? error.message : String(error)}`);
  }

  input.onStatus?.('Syncing artifacts');
  let appJsx = '';
  try {
    appJsx = await readGeneratedAppJsx();
  } catch (error) {
    throw new Error(`CodingAgent did not produce app.jsx: ${error instanceof Error ? error.message : String(error)}`);
  }
  const artifacts: Record<string, string> = { 'app.jsx': appJsx };
  if (!text.trim()) text = 'Generated app.jsx.';

  return { text, artifacts };
}
