import { describe, expect, it } from 'vitest';
import {
  PREVIEW_AI_REQUEST_EVENT_TYPE,
  hardenJsonSchemaForProvider,
  normalizePreviewAiInput,
  parsePreviewAiRequestEvent,
} from './previewAiBridgeCore';

describe('previewAiBridge', () => {
  it('parses valid AI bridge request events', () => {
    expect(
      parsePreviewAiRequestEvent({
        type: PREVIEW_AI_REQUEST_EVENT_TYPE,
        requestId: 'req-1',
        input: { prompt: 'hello' },
      })
    ).toEqual({
      type: PREVIEW_AI_REQUEST_EVENT_TYPE,
      requestId: 'req-1',
      input: { prompt: 'hello' },
    });
  });

  it('rejects invalid AI bridge request events', () => {
    expect(parsePreviewAiRequestEvent({ type: PREVIEW_AI_REQUEST_EVENT_TYPE, requestId: '', input: {} })).toBeNull();
    expect(parsePreviewAiRequestEvent({ type: 'other', requestId: 'req-1', input: {} })).toBeNull();
    expect(parsePreviewAiRequestEvent(null)).toBeNull();
  });

  it('normalizes text mode input', () => {
    expect(
      normalizePreviewAiInput({
        prompt: 'hello',
        output: { type: 'text' },
      })
    ).toEqual({
      prompt: 'hello',
      messages: undefined,
      system: undefined,
      temperature: undefined,
      maxTokens: undefined,
      output: { type: 'text' },
    });
  });

  it('normalizes object mode input with schema', () => {
    expect(
      normalizePreviewAiInput({
        messages: [{ role: 'user', content: 'make recipe' }],
        output: { type: 'object', schema: { type: 'object', properties: { name: { type: 'string' } } } },
      })
    ).toEqual({
      prompt: undefined,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'make recipe' }] }],
      system: undefined,
      temperature: undefined,
      maxTokens: undefined,
      output: {
        type: 'object',
        schema: { type: 'object', properties: { name: { type: 'string' } }, additionalProperties: false },
      },
    });
  });

  it('normalizes multimodal message content including image parts', () => {
    expect(
      normalizePreviewAiInput({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this image' },
              { type: 'image', image: 'data:image/png;base64,abcd' },
            ],
          },
        ],
      })
    ).toEqual({
      prompt: undefined,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image' },
            { type: 'image', image: 'data:image/png;base64,abcd' },
          ],
        },
      ],
      system: undefined,
      temperature: undefined,
      maxTokens: undefined,
      output: { type: 'text' },
    });
  });

  it('rejects model/provider override and missing prompt/messages', () => {
    expect(() => normalizePreviewAiInput({ prompt: 'hello', model: 'x' })).toThrow(/not supported/i);
    expect(() => normalizePreviewAiInput({ provider: 'x' })).toThrow(/not supported/i);
    expect(() => normalizePreviewAiInput({})).toThrow(/must include either prompt or messages/i);
  });

  it('adds additionalProperties:false to nested object schema nodes', () => {
    expect(
      hardenJsonSchemaForProvider({
        type: 'object',
        properties: {
          ingredient: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
          list: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                score: { type: 'number' },
              },
            },
          },
        },
      })
    ).toEqual({
      type: 'object',
      properties: {
        ingredient: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          additionalProperties: false,
        },
        list: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              score: { type: 'number' },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    });
  });
});
