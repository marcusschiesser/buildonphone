import type { ChatMessage } from '@/types';

export interface StudioThreadMessage {
  id: string;
  role: 'user' | 'assistant' | 'status';
  content: string;
  isProgress?: boolean;
}

export function getStudioThreadMessages(
  messages: ChatMessage[],
  busy: boolean,
  status: string,
  streamedText: string,
  currentToolCall: string | null
): StudioThreadMessage[] {
  if (!busy) return messages;

  const progressContent = currentToolCall ? `Running tool: ${currentToolCall}` : status;

  const transientMessages: StudioThreadMessage[] = [
    {
      id: '__generation-progress__',
      role: 'status',
      content: progressContent,
      isProgress: true,
    },
  ];

  if (streamedText.trim()) {
    transientMessages.push({
      id: '__assistant_stream__',
      role: 'assistant',
      content: streamedText,
    });
  }

  return [...messages, ...transientMessages];
}
