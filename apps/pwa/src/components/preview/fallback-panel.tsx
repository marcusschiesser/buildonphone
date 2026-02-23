export function PreviewFallbackPanel() {
  return (
    <div className="h-full w-full rounded-2xl nm-inset bg-ink text-zinc-100 grid place-items-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-[--text-1]">No preview yet</h1>
        <p className="mt-2 text-[--text-2]">Generate an app to see output.</p>
      </div>
    </div>
  );
}
