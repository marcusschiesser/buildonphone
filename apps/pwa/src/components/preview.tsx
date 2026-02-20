'use client';

import { useMemo } from 'react';

const FALLBACK_CODE = `function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 grid place-items-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">No preview yet</h1>
        <p className="mt-2 text-zinc-400">Generate an app to see output.</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('preview-root')).render(<App />);`;

function htmlTemplate(code: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="preview-root"></div>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"><\/script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
    <script type="text/babel">
${code}
    <\/script>
  </body>
</html>`;
}

export function buildPreviewHtml(files: Record<string, string>): string {
  const code = files['app.jsx']?.trim() ? files['app.jsx'] : FALLBACK_CODE;
  return htmlTemplate(code);
}

export function PreviewFrame({ files }: { files: Record<string, string> }) {
  const srcDoc = useMemo(() => buildPreviewHtml(files), [files]);

  return (
    <iframe
      title="preview"
      srcDoc={srcDoc}
      className="h-full w-full rounded-2xl border border-cyan-300/20 bg-black"
      sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
    />
  );
}
