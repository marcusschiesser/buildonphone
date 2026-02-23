import type { StudioThreadMessage } from '@/lib/ui/studioThread';
import { StudioMarkdownRenderer } from './studio/markdown-renderer';

export function StudioMessage({ message }: { message: StudioThreadMessage }) {
  const cardClass =
    message.role === 'user'
      ? 'ml-6 nm-raised-sm bg-accent/10 text-zinc-100'
      : message.role === 'status'
        ? 'mr-6 nm-flat bg-[--accent-warn]/10 text-[--accent-warn]'
        : 'mr-6 nm-inset-sm bg-ink text-zinc-200';
  const roleLabel = message.role === 'status' ? 'Status' : message.role;

  return (
    <article className={`rounded-2xl px-3 py-2 text-sm ${cardClass}`}>
      <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[--text-3]">{roleLabel}</div>
      {message.isProgress ? (
        <div className={`flex items-center gap-2 ${message.role === 'status' ? 'text-[--accent-warn]' : 'text-zinc-100'}`}>
          <span
            className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 ${
              message.role === 'status' ? 'border-[--accent-warn]/40 border-t-[--accent-warn]' : 'border-zinc-500 border-t-accent'
            }`}
          />
          <p className="max-w-full whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">{message.content}</p>
        </div>
      ) : (
        <StudioMarkdownRenderer content={message.content} />
      )}
    </article>
  );
}
