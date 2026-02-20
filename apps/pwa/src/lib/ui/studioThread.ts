import type { ChatMessage } from '@/types';

export interface StudioThreadMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isProgress?: boolean;
}

export function getStudioThreadMessages(
  messages: ChatMessage[],
  busy: boolean,
  status: string,
  streamedText: string
): StudioThreadMessage[] {
  if (!busy) return messages;

  if (streamedText.trim()) {
    return [
      ...messages,
      {
        id: '__assistant_stream__',
        role: 'assistant',
        content: streamedText,
      },
    ];
  }

  return [
    ...messages,
    {
      id: '__generation-progress__',
      role: 'assistant',
      content: status,
      isProgress: true,
    },
  ];
}
