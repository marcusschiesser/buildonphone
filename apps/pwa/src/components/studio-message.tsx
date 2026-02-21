import type { StudioThreadMessage } from '@/lib/ui/studioThread';
import { StudioMarkdownRenderer } from './studio/markdown-renderer';

export function StudioMessage({ message }: { message: StudioThreadMessage }) {
  const cardClass =
    message.role === 'user'
      ? 'ml-6 bg-cyan-400/15 text-cyan-100'
      : message.role === 'status'
        ? 'mr-6 border border-yellow-300/40 bg-yellow-100/20 text-yellow-50'
        : 'mr-6 bg-zinc-900 text-zinc-100';
  const roleLabel = message.role === 'status' ? 'Status' : message.role;

  return (
    <article className={`rounded-2xl px-3 py-2 text-sm ${cardClass}`}>
      <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-zinc-400">{roleLabel}</div>
      {message.isProgress ? (
        <div className={`flex items-center gap-2 ${message.role === 'status' ? 'text-yellow-100' : 'text-zinc-100'}`}>
          <span
            className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 ${
              message.role === 'status' ? 'border-yellow-200/40 border-t-yellow-200' : 'border-zinc-500 border-t-cyan-300'
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
