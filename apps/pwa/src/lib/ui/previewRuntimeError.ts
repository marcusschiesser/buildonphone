export const PREVIEW_RUNTIME_ERROR_EVENT_TYPE = 'generated-app-runtime-error';
export const PREVIEW_FIX_PROMPT_PREFIX = 'Fix this error: ';

export interface PreviewFixPayload {
  errorMessage: string;
  stack?: string;
}

export function buildFixPrompt(payload: PreviewFixPayload): string {
  const { errorMessage, stack } = payload;
  const normalized = errorMessage.trim() || 'Unknown runtime error';
  const normalizedStack = stack?.trim();
  return normalizedStack ? `${PREVIEW_FIX_PROMPT_PREFIX}${normalized}\n\nStack trace:\n${normalizedStack}` : `${PREVIEW_FIX_PROMPT_PREFIX}${normalized}`;
}

export function parsePreviewRuntimeErrorEvent(data: unknown): PreviewFixPayload | null {
  if (!data || typeof data !== 'object') return null;

  const payload = data as { type?: unknown; errorMessage?: unknown; stack?: unknown };
  if (payload.type !== PREVIEW_RUNTIME_ERROR_EVENT_TYPE || typeof payload.errorMessage !== 'string') return null;

  return {
    errorMessage: payload.errorMessage,
    stack: typeof payload.stack === 'string' ? payload.stack : undefined,
  };
}
