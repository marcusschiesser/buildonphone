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
    const result = getStudioThreadMessages([baseMessage], false, 'Idle', '');
    expect(result).toEqual([baseMessage]);
  });

  it('shows progress placeholder when busy and no stream text yet', () => {
    const result = getStudioThreadMessages([baseMessage], true, 'Running tool #1: write_file', '');
    expect(result).toEqual([
      baseMessage,
      {
        id: '__generation-progress__',
        role: 'assistant',
        content: 'Running tool #1: write_file',
        isProgress: true,
      },
    ]);
  });

  it('shows streamed assistant content when available', () => {
    const result = getStudioThreadMessages([baseMessage], true, 'Streaming response', 'partial output');
    expect(result).toEqual([
      baseMessage,
      {
        id: '__assistant_stream__',
        role: 'assistant',
        content: 'partial output',
      },
    ]);
  });
});
