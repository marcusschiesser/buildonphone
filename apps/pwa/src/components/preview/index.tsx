'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PREVIEW_RUNTIME_ERROR_EVENT_TYPE,
  type PreviewFixPayload,
  parsePreviewRuntimeErrorEvent,
} from '@/lib/ui/previewRuntimeError';
import { PreviewFallbackPanel } from './fallback-panel';
import { PreviewRuntimeErrorPanel } from './runtime-error-panel';

function htmlTemplate(code: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="preview-root"></div>
    <script>
      (function () {
        function reportRuntimeError(message, stack) {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(
              {
                type: '${PREVIEW_RUNTIME_ERROR_EVENT_TYPE}',
                errorMessage: message || 'Unknown runtime error',
                stack: stack || '',
              },
              '*'
            );
          }
        }

        window.addEventListener('error', function (event) {
          const stack = event && event.error && event.error.stack ? event.error.stack : '';
          reportRuntimeError(event && event.message ? event.message : 'Unhandled error', stack);
        });

        window.addEventListener('unhandledrejection', function (event) {
          const reason = event && event.reason ? event.reason : 'Unhandled promise rejection';
          const message = typeof reason === 'string' ? reason : (reason && reason.message ? reason.message : String(reason));
          const stack = reason && reason.stack ? reason.stack : '';
          reportRuntimeError(message, stack);
        });
      })();
    <\/script>
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
  const code = files['app.jsx'] ?? '';
  return htmlTemplate(code);
}

export function PreviewFrame({
  files,
  className,
  onFixError,
}: {
  files: Record<string, string>;
  className?: string;
  onFixError?: (payload: PreviewFixPayload) => void;
}) {
  const hasCode = Boolean(files['app.jsx']?.trim());
  const srcDoc = useMemo(() => buildPreviewHtml(files), [files]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [runtimeError, setRuntimeError] = useState<PreviewFixPayload | null>(null);
  const frameClassName = className ?? 'h-full w-full rounded-2xl border border-cyan-300/20 bg-black';

  useEffect(() => {
    setRuntimeError(null);
  }, [srcDoc]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (!iframeRef.current?.contentWindow || event.source !== iframeRef.current.contentWindow) return;
      const payload = parsePreviewRuntimeErrorEvent(event.data);
      if (!payload) return;
      setRuntimeError(payload);
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, []);

  const requestFix = () => {
    if (!runtimeError || !onFixError) return;
    onFixError(runtimeError);
  };

  if (!hasCode) {
    return <PreviewFallbackPanel />;
  }

  return (
    <div className="relative h-full w-full">
      <iframe
        ref={iframeRef}
        title="preview"
        srcDoc={srcDoc}
        className={frameClassName}
        allow="camera; microphone; geolocation; payment"
        sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
      />
      {runtimeError ? <PreviewRuntimeErrorPanel error={runtimeError} onFix={onFixError ? requestFix : undefined} /> : null}
    </div>
  );
}
