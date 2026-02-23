import { createAnthropic } from '@ai-sdk/anthropic';
import { stepCountIs } from 'ai';
import { CodingAgent } from 'edge-pi';
import { createVercelSandboxRuntime } from 'edge-pi/vercel-sandbox';
import { Sandbox } from '@vercel/sandbox';
import { DEFAULT_MODEL } from '../model';
import { getSystemPrompt } from './systemPrompt';
import { getErrorMessage, toModelMessages } from './agentShared';

export interface ServerAgentInput {
  apiKey: string;
  theme: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  baseFiles?: Record<string, string>;
  baseVersion?: number;
  onText?: (delta: string) => void;
  onToolCall?: (target: string) => void;
  onStatus?: (status: string) => void;
}

export interface ServerAgentResult {
  text: string;
  artifacts: Record<string, string>;
}

async function hydrateRuntimeWithBaseFilesOrThrow(
  runtime: ReturnType<typeof createVercelSandboxRuntime>,
  baseFiles: Record<string, string> | undefined,
  baseVersion: number | undefined
) {
  const isFollowUp = (baseVersion ?? 0) > 0;

  if (isFollowUp && !baseFiles?.['app.jsx']?.trim()) {
    throw new Error(`Current app.jsx for version v${baseVersion} is missing; cannot run follow-up generation.`);
  }

  if (!baseFiles) return;

  for (const [filename, content] of Object.entries(baseFiles)) {
    await runtime.fs.writeFile(filename, content, 'utf-8');
  }
}

async function readGeneratedAppJsx(runtime: ReturnType<typeof createVercelSandboxRuntime>): Promise<string> {
  const candidates = ['app.jsx', 'src/app.jsx'];

  for (const candidate of candidates) {
    try {
      const content = await runtime.fs.readFile(candidate, 'utf-8');
      if (typeof content === 'string' && content.trim()) {
        return content;
      }
    } catch {
      // continue searching candidates
    }
  }

  throw new Error('Generated app.jsx not found in sandbox runtime.');
}

export async function runServerAgent(input: ServerAgentInput): Promise<ServerAgentResult> {
  const sandbox = await Sandbox.create({
    runtime: 'node22',
    timeout: Number(process.env.GENERATION_SANDBOX_TIMEOUT_MS || '300000'),
  });

  try {
    const runtime = createVercelSandboxRuntime(sandbox, { rootdir: '/vercel/sandbox' });
    input.onStatus?.('Loading current app context');
    await hydrateRuntimeWithBaseFilesOrThrow(runtime, input.baseFiles, input.baseVersion);
    input.onStatus?.('Generating app.jsx');

    const anthropic = createAnthropic({
      apiKey: input.apiKey,
    });

    const agent = new CodingAgent({
      model: anthropic(DEFAULT_MODEL),
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
      appJsx = await readGeneratedAppJsx(runtime);
    } catch (error) {
      throw new Error(`CodingAgent did not produce app.jsx: ${getErrorMessage(error)}`);
    }

    if (!text.trim()) {
      text = 'Generated app.jsx.';
    }

    return {
      text,
      artifacts: {
        'app.jsx': appJsx,
      },
    };
  } finally {
    try {
      await sandbox.stop();
    } catch {
      // no-op
    }
  }
}
