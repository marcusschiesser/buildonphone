'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PREVIEW_AI_CHUNK_OBJECT_EVENT_TYPE,
  PREVIEW_AI_CHUNK_TEXT_EVENT_TYPE,
  PREVIEW_AI_DONE_EVENT_TYPE,
  PREVIEW_AI_ERROR_EVENT_TYPE,
  PREVIEW_AI_REQUEST_EVENT_TYPE,
  executePreviewAiRequest,
  parsePreviewAiRequestEvent,
} from '@/lib/ui/previewAiBridge';
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
        var bridgeRequestCounter = 0;

        function createAsyncQueue() {
          var values = [];
          var waiters = [];
          var isDone = false;
          var doneError = null;

          function resolveWaiter(nextValue) {
            var waiter = waiters.shift();
            if (waiter) waiter.resolve(nextValue);
          }

          return {
            push: function (value) {
              if (isDone) return;
              if (waiters.length > 0) {
                resolveWaiter({ value: value, done: false });
                return;
              }
              values.push(value);
            },
            done: function () {
              if (isDone) return;
              isDone = true;
              while (waiters.length > 0) {
                resolveWaiter({ value: undefined, done: true });
              }
            },
            error: function (error) {
              if (isDone) return;
              isDone = true;
              doneError = error;
              while (waiters.length > 0) {
                var waiter = waiters.shift();
                if (waiter) waiter.reject(error);
              }
            },
            iterable: {
              [Symbol.asyncIterator]: function () {
                return {
                  next: function () {
                    if (values.length > 0) {
                      return Promise.resolve({ value: values.shift(), done: false });
                    }
                    if (isDone) {
                      if (doneError) return Promise.reject(doneError);
                      return Promise.resolve({ value: undefined, done: true });
                    }
                    return new Promise(function (resolve, reject) {
                      waiters.push({ resolve: resolve, reject: reject });
                    });
                  },
                };
              },
            },
          };
        }

        window.__CLAW2GO_AI__ = {
          streamText: async function (input) {
            if (!(window.parent && window.parent !== window)) {
              throw new Error('AI bridge unavailable: host window missing.');
            }

            bridgeRequestCounter += 1;
            var requestId = 'bridge-' + Date.now() + '-' + bridgeRequestCounter;
            var isObjectOutput = Boolean(input && input.output && input.output.type === 'object');
            var queue = createAsyncQueue();

            function cleanup() {
              window.removeEventListener('message', onBridgeMessage);
            }

            function onBridgeMessage(event) {
              var data = event && event.data;
              if (!data || data.requestId !== requestId) return;

              if (data.type === '${PREVIEW_AI_ERROR_EVENT_TYPE}') {
                cleanup();
                queue.error(new Error(data.error || 'AI bridge request failed.'));
                return;
              }

              if (data.type === '${PREVIEW_AI_DONE_EVENT_TYPE}') {
                cleanup();
                queue.done();
                return;
              }

              if (!isObjectOutput && data.type === '${PREVIEW_AI_CHUNK_TEXT_EVENT_TYPE}') {
                queue.push(typeof data.text === 'string' ? data.text : String(data.text || ''));
              }

              if (isObjectOutput && data.type === '${PREVIEW_AI_CHUNK_OBJECT_EVENT_TYPE}') {
                queue.push(data.object || {});
              }
            }

            window.addEventListener('message', onBridgeMessage);
            window.parent.postMessage(
              {
                type: '${PREVIEW_AI_REQUEST_EVENT_TYPE}',
                requestId: requestId,
                input: input || {},
              },
              '*'
            );

            return isObjectOutput ? { partialOutputStream: queue.iterable } : { textStream: queue.iterable };
          },
        };

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
  const srcDocRef = useRef(srcDoc);
  const [runtimeError, setRuntimeError] = useState<{ srcDoc: string; payload: PreviewFixPayload } | null>(null);
  const frameClassName = className ?? 'h-full w-full rounded-2xl border border-cyan-300/20 bg-black';

  useEffect(() => {
    srcDocRef.current = srcDoc;
  }, [srcDoc]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (!iframeRef.current?.contentWindow || event.source !== iframeRef.current.contentWindow) return;

      const runtimeError = parsePreviewRuntimeErrorEvent(event.data);
      if (runtimeError) {
        setRuntimeError({
          srcDoc: srcDocRef.current,
          payload: runtimeError,
        });
        return;
      }

      const aiRequest = parsePreviewAiRequestEvent(event.data);
      if (!aiRequest) return;

      void (async () => {
        const target = iframeRef.current?.contentWindow;
        if (!target) return;

        const postResponse = (payload: Record<string, unknown>) => {
          target.postMessage(
            {
              requestId: aiRequest.requestId,
              ...payload,
            },
            '*'
          );
        };

        try {
          await executePreviewAiRequest(aiRequest.input, {
            onTextChunk: (textChunk) => {
              postResponse({
                type: PREVIEW_AI_CHUNK_TEXT_EVENT_TYPE,
                text: textChunk,
              });
            },
            onObjectChunk: (objectChunk) => {
              postResponse({
                type: PREVIEW_AI_CHUNK_OBJECT_EVENT_TYPE,
                object: objectChunk,
              });
            },
          });

          postResponse({ type: PREVIEW_AI_DONE_EVENT_TYPE });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          postResponse({
            type: PREVIEW_AI_ERROR_EVENT_TYPE,
            error: message,
          });
        }
      })();
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, []);

  const activeRuntimeError = runtimeError?.srcDoc === srcDoc ? runtimeError.payload : null;

  const requestFix = () => {
    if (!activeRuntimeError || !onFixError) return;
    onFixError(activeRuntimeError);
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
      {activeRuntimeError ? (
        <PreviewRuntimeErrorPanel error={activeRuntimeError} onFix={onFixError ? requestFix : undefined} />
      ) : null}
    </div>
  );
}
