import type { StudioThreadMessage } from '@/lib/ui/studioThread';

export function StudioMessage({ message }: { message: StudioThreadMessage }) {
  return (
    <article
      className={`rounded-2xl px-3 py-2 text-sm ${message.role === 'user' ? 'ml-6 bg-cyan-400/15 text-cyan-100' : 'mr-6 bg-zinc-900 text-zinc-100'}`}
    >
      <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-zinc-400">{message.role}</div>
      {message.isProgress ? (
        <div className="flex items-center gap-2 text-zinc-100">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-cyan-300" />
          <p className="max-w-full whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">{message.content}</p>
        </div>
      ) : (
        <p className="max-w-full whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">{message.content}</p>
      )}
    </article>
  );
}
