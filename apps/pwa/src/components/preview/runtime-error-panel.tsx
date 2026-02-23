import type { PreviewFixPayload } from '@/lib/ui/previewRuntimeError';
import { Button } from '@/components/ui/button';

export function PreviewRuntimeErrorPanel({
  error,
  onFix,
}: {
  error: PreviewFixPayload;
  onFix?: () => void;
}) {
  return (
    <div className="absolute inset-x-3 bottom-3 z-10 rounded-xl nm-raised bg-ink p-3 text-zinc-100 backdrop-blur">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[--accent-danger]">Generated App Runtime Error</div>
      <p className="mt-1 text-sm text-zinc-200">{error.errorMessage || 'Unknown runtime error'}</p>
      {error.stack?.trim() ? (
        <pre className="mt-2 max-h-36 overflow-auto rounded-md nm-inset bg-ink p-2 text-[11px] leading-relaxed text-zinc-300">
          {error.stack}
        </pre>
      ) : null}
      {onFix ? (
        <div className="mt-2 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onFix}>
            Fix
          </Button>
        </div>
      ) : null}
    </div>
  );
}
