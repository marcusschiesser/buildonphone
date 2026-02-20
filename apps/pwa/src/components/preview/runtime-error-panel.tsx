import type { PreviewFixPayload } from '@/lib/ui/previewRuntimeError';

export function PreviewRuntimeErrorPanel({
  error,
  onFix,
}: {
  error: PreviewFixPayload;
  onFix?: () => void;
}) {
  return (
    <div className="absolute inset-x-3 bottom-3 z-10 rounded-xl border border-red-400/40 bg-zinc-950/95 p-3 text-zinc-100 shadow-lg backdrop-blur">
      <div className="text-[10px] uppercase tracking-[0.2em] text-red-300">Generated App Runtime Error</div>
      <p className="mt-1 text-sm text-zinc-200">{error.errorMessage || 'Unknown runtime error'}</p>
      {error.stack?.trim() ? (
        <pre className="mt-2 max-h-36 overflow-auto rounded-md bg-black/35 p-2 text-[11px] leading-relaxed text-zinc-300">
          {error.stack}
        </pre>
      ) : null}
      {onFix ? (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onFix}
            className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-500/30"
          >
            Fix
          </button>
        </div>
      ) : null}
    </div>
  );
}
