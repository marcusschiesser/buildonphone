import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '@/types';
import { sortChatMessages } from './chatMessageSort';

function message(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: 'id',
    appId: 'app',
    role: 'user',
    content: 'content',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('chatMessageSort', () => {
  it('sorts by createdAt ascending', () => {
    const sorted = sortChatMessages([
      message({ id: '2', createdAt: '2026-01-01T00:00:01.000Z' }),
      message({ id: '1', createdAt: '2026-01-01T00:00:00.000Z' }),
    ]);

    expect(sorted.map((m) => m.id)).toEqual(['1', '2']);
  });

  it('prefers user before assistant when timestamps tie', () => {
    const sorted = sortChatMessages([
      message({ id: 'assistant', role: 'assistant' }),
      message({ id: 'user', role: 'user' }),
    ]);

    expect(sorted.map((m) => m.id)).toEqual(['user', 'assistant']);
  });

  it('uses id as deterministic fallback when createdAt and role tie', () => {
    const sorted = sortChatMessages([
      message({ id: 'b' }),
      message({ id: 'a' }),
    ]);

    expect(sorted.map((m) => m.id)).toEqual(['a', 'b']);
  });
});
