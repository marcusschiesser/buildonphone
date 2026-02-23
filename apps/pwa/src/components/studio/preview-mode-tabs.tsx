type PreviewMode = 'preview' | 'code';

export function PreviewModeTabs({
  mode,
  onChange,
}: {
  mode: PreviewMode;
  onChange: (mode: PreviewMode) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg nm-inset bg-ink p-1">
      <button
        type="button"
        onClick={() => onChange('preview')}
        className={`rounded-md px-2 py-1 text-[11px] transition-all ${mode === 'preview' ? 'nm-raised-sm text-accent font-medium' : 'text-[--text-2]'}`}
      >
        Preview
      </button>
      <button
        type="button"
        onClick={() => onChange('code')}
        className={`rounded-md px-2 py-1 text-[11px] transition-all ${mode === 'code' ? 'nm-raised-sm text-accent font-medium' : 'text-[--text-2]'}`}
      >
        Code
      </button>
    </div>
  );
}
