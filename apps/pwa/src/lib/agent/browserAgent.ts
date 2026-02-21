import { createAnthropic } from '@ai-sdk/anthropic';
import { stepCountIs, type ModelMessage } from 'ai';
import { CodingAgent } from 'edge-pi';
import { getSystemPrompt } from './systemPrompt';
import { getBrowserRuntime, hydrateContainer, readGeneratedAppJsx } from './webcontainerSession';

export interface BrowserAgentInput {
  apiKey: string;
  theme: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  baseFiles?: Record<string, string>;
  baseVersion?: number;
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

function getErrorMessage(error: unknown): string {
  const chain = collectErrorMessages(error);
  const combined = chain.join('\n');
  const billingPattern = /credit balance is too low|plans\s*&\s*billing|billing/i;
  if (billingPattern.test(combined)) {
    return 'Your Anthropic credit balance is too low. Please update billing in [Plans & Billing](https://platform.claude.com/settings/billing).';
  }

  for (const msg of chain) {
    if (msg && !/no output generated/i.test(msg)) {
      return msg;
    }
  }

  return error instanceof Error ? error.message : String(error);
}

function collectErrorMessages(error: unknown): string[] {
  const messages: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && !seen.has(current)) {
    seen.add(current);
    if (typeof current === 'string') {
      messages.push(current);
      break;
    }
    if (current instanceof Error) {
      messages.push(current.message);
      current = current.cause;
      continue;
    }
    if (typeof current === 'object') {
      const value = current as { message?: unknown; cause?: unknown; errors?: unknown };
      if (typeof value.message === 'string') {
        messages.push(value.message);
      }
      if (Array.isArray(value.errors)) {
        for (const nested of value.errors) {
          messages.push(...collectErrorMessages(nested));
        }
      }
      current = value.cause;
      continue;
    }
    break;
  }

  return messages.filter((m) => m.trim().length > 0);
}

async function hydrateRuntimeWithBaseFilesOrThrow(baseFiles: Record<string, string> | undefined, baseVersion: number | undefined) {
  const isFollowUp = (baseVersion ?? 0) > 0;

  if (isFollowUp && !baseFiles?.['app.jsx']?.trim()) {
    throw new Error(`Current app.jsx for version v${baseVersion} is missing; cannot run follow-up generation.`);
  }

  if (!baseFiles) return;

  try {
    await hydrateContainer(baseFiles);
  } catch (error) {
    throw new Error(`Failed to load current app.jsx into runtime before generation: ${getErrorMessage(error)}`);
  }
}

export async function runBrowserAgent(input: BrowserAgentInput): Promise<BrowserAgentResult> {
  input.onStatus?.('Loading current app context');
  await hydrateRuntimeWithBaseFilesOrThrow(input.baseFiles, input.baseVersion);
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
  let streamFailureMessage: string | null = null;

  try {
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') {
        text += part.text;
        input.onText?.(part.text);
      }
      if (part.type === 'tool-call') {
        input.onToolCall?.(part.toolName);
      }
      if (part.type === 'error') {
        streamFailureMessage = getErrorMessage(part.error ?? part);
      }
    }
  } catch (error) {
    throw new Error(`CodingAgent generation failed while streaming: ${getErrorMessage(error)}`);
  }

  try {
    await result.response;
  } catch (error) {
    if (streamFailureMessage) {
      throw new Error(streamFailureMessage);
    }
    throw new Error(`CodingAgent generation failed before completion: ${getErrorMessage(error)}`);
  }

  input.onStatus?.('Syncing artifacts');
  let appJsx = '';
  try {
    appJsx = await readGeneratedAppJsx();
  } catch (error) {
    throw new Error(`CodingAgent did not produce app.jsx: ${getErrorMessage(error)}`);
  }
  const artifacts: Record<string, string> = { 'app.jsx': appJsx };
  if (!text.trim()) text = 'Generated app.jsx.';

  return { text, artifacts };
}
