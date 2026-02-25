import type { ChatMessage } from '@/types';

const ROLE_PRIORITY: Record<ChatMessage['role'], number> = {
  user: 0,
  assistant: 1,
};

export function compareChatMessages(a: ChatMessage, b: ChatMessage): number {
  const createdAtComparison = a.createdAt.localeCompare(b.createdAt);
  if (createdAtComparison !== 0) return createdAtComparison;

  const roleComparison = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role];
  if (roleComparison !== 0) return roleComparison;

  return a.id.localeCompare(b.id);
}

export function sortChatMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort(compareChatMessages);
}
