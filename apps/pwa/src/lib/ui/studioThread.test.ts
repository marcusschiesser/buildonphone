import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '@/types';
import { getStudioThreadMessages } from './studioThread';

const baseMessage: ChatMessage = {
  id: 'm1',
  appId: 'a1',
  role: 'assistant',
  content: 'Hello',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('studioThread', () => {
  it('returns persisted messages when not busy', () => {
    const result = getStudioThreadMessages([baseMessage], false, 'Idle', '', null);
    expect(result).toEqual([baseMessage]);
  });

  it('shows progress placeholder when busy and no stream text yet', () => {
    const result = getStudioThreadMessages([baseMessage], true, 'Preparing generation', '', null);
    expect(result).toEqual([
      baseMessage,
      {
        id: '__generation-progress__',
        role: 'status',
        content: 'Preparing generation',
        isProgress: true,
      },
    ]);
  });

  it('shows tool calls message above streamed assistant content', () => {
    const result = getStudioThreadMessages([baseMessage], true, 'Streaming response', 'partial output', '#2 apply_patch (updating app files)');
    expect(result).toEqual([
      baseMessage,
      {
        id: '__generation-progress__',
        role: 'status',
        content: 'Running tool: #2 apply_patch (updating app files)',
        isProgress: true,
      },
      {
        id: '__assistant_stream__',
        role: 'assistant',
        content: 'partial output',
      },
    ]);
  });
});
