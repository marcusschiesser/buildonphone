import { describe, expect, it } from 'vitest';
import { resolveAiAccessRequirements } from './aiAccessRequirements';

describe('aiAccess', () => {
  it('requires only password when the server key exists and auth is missing', () => {
    expect(
      resolveAiAccessRequirements({
        requiresPassword: true,
        authenticated: false,
        hasServerKey: true,
        hasByokKey: false,
      })
    ).toEqual({
      needsPassword: true,
      needsByok: false,
    });
  });

  it('requires password and BYOK when both are missing', () => {
    expect(
      resolveAiAccessRequirements({
        requiresPassword: true,
        authenticated: false,
        hasServerKey: false,
        hasByokKey: false,
      })
    ).toEqual({
      needsPassword: true,
      needsByok: true,
    });
  });

  it('requires only BYOK when no server key is configured', () => {
    expect(
      resolveAiAccessRequirements({
        requiresPassword: false,
        authenticated: true,
        hasServerKey: false,
        hasByokKey: false,
      })
    ).toEqual({
      needsPassword: false,
      needsByok: true,
    });
  });

  it('requires nothing when auth is already valid and a server key exists', () => {
    expect(
      resolveAiAccessRequirements({
        requiresPassword: true,
        authenticated: true,
        hasServerKey: true,
        hasByokKey: false,
      })
    ).toEqual({
      needsPassword: false,
      needsByok: false,
    });
  });

  it('does not require BYOK when fake generation is enabled', () => {
    expect(
      resolveAiAccessRequirements({
        requiresPassword: false,
        authenticated: true,
        hasServerKey: false,
        hasByokKey: false,
        fakeGenerationEnabled: true,
      })
    ).toEqual({
      needsPassword: false,
      needsByok: false,
    });
  });

  it('forces password re-entry when requested explicitly', () => {
    expect(
      resolveAiAccessRequirements({
        requiresPassword: true,
        authenticated: true,
        hasServerKey: true,
        hasByokKey: false,
        forcePassword: true,
      })
    ).toEqual({
      needsPassword: true,
      needsByok: false,
    });
  });
});
