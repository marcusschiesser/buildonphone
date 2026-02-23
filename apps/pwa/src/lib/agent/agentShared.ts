import type { ModelMessage } from 'ai';

export function toModelMessages(messages: { role: 'user' | 'assistant'; content: string }[]): ModelMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content: [{ type: 'text', text: m.content }],
  }));
}

export function collectErrorMessages(error: unknown): string[] {
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

export function getErrorMessage(error: unknown): string {
  const chain = collectErrorMessages(error);
  const combined = chain.join('\n');
  const billingPattern = /credit balance is too low|plans\s*&\s*billing|billing/i;
  if (billingPattern.test(combined)) {
    return 'Your Anthropic credit balance is too low. Please update billing in [Plans & Billing](https://platform.claude.com/settings/billing).';
  }

  for (const message of chain) {
    if (message && !/no output generated/i.test(message)) {
      return message;
    }
  }

  return error instanceof Error ? error.message : String(error);
}
