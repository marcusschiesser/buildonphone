type PreviewMode = 'preview' | 'code';

export function PreviewModeTabs({
  mode,
  onChange,
}: {
  mode: PreviewMode;
  onChange: (mode: PreviewMode) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-black/25 p-1">
      <button
        type="button"
        onClick={() => onChange('preview')}
        className={`rounded-md px-2 py-1 text-[11px] ${mode === 'preview' ? 'bg-accent font-medium text-black' : 'text-zinc-300'}`}
      >
        Preview
      </button>
      <button
        type="button"
        onClick={() => onChange('code')}
        className={`rounded-md px-2 py-1 text-[11px] ${mode === 'code' ? 'bg-accent font-medium text-black' : 'text-zinc-300'}`}
      >
        Code
      </button>
    </div>
  );
}
