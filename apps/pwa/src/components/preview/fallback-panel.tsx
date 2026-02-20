export function PreviewFallbackPanel() {
  return (
    <div className="h-full w-full rounded-2xl border border-cyan-300/20 bg-zinc-950 text-zinc-100 grid place-items-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">No preview yet</h1>
        <p className="mt-2 text-zinc-400">Generate an app to see output.</p>
      </div>
    </div>
  );
}
