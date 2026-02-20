import { describe, expect, it } from 'vitest';
import {
  PREVIEW_RUNTIME_ERROR_EVENT_TYPE,
  PREVIEW_FIX_PROMPT_PREFIX,
  buildFixPrompt,
  parsePreviewRuntimeErrorEvent,
} from './previewRuntimeError';

describe('previewRuntimeError', () => {
  it('builds fix prompt with prefix and normalized message', () => {
    expect(buildFixPrompt({ errorMessage: 'TypeError: x is undefined' })).toBe(`${PREVIEW_FIX_PROMPT_PREFIX}TypeError: x is undefined`);
    expect(buildFixPrompt({ errorMessage: 'TypeError: x is undefined', stack: 'line:1' })).toBe(
      `${PREVIEW_FIX_PROMPT_PREFIX}TypeError: x is undefined\n\nStack trace:\n\`\`\`\nline:1\n\`\`\``
    );
    expect(buildFixPrompt({ errorMessage: '   ' })).toBe(`${PREVIEW_FIX_PROMPT_PREFIX}Unknown runtime error`);
  });

  it('parses runtime error events and ignores unrelated payloads', () => {
    expect(parsePreviewRuntimeErrorEvent({ type: PREVIEW_RUNTIME_ERROR_EVENT_TYPE, errorMessage: 'Boom', stack: 'at App' })).toEqual({
      errorMessage: 'Boom',
      stack: 'at App',
    });
    expect(parsePreviewRuntimeErrorEvent({ type: 'other', errorMessage: 'Boom' })).toBeNull();
    expect(parsePreviewRuntimeErrorEvent({ type: PREVIEW_RUNTIME_ERROR_EVENT_TYPE })).toBeNull();
    expect(parsePreviewRuntimeErrorEvent('invalid')).toBeNull();
  });
});
