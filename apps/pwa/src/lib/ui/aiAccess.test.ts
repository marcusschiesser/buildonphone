import { describe, expect, it } from 'vitest';
import { resolveAiAccessRequirements } from './aiAccessRequirements';

describe('aiAccess', () => {
  it('requires sign-in and BYOK when both are missing', () => {
    expect(
      resolveAiAccessRequirements({
        isSignedIn: false,
        hasByokKey: false,
      })
    ).toEqual({
      needsSignIn: true,
      needsByok: true,
    });
  });

  it('requires BYOK when signed in without key', () => {
    expect(
      resolveAiAccessRequirements({
        isSignedIn: true,
        hasByokKey: false,
      })
    ).toEqual({
      needsSignIn: false,
      needsByok: true,
    });
  });

  it('requires sign-in when signed out even if key exists', () => {
    expect(
      resolveAiAccessRequirements({
        isSignedIn: false,
        hasByokKey: true,
      })
    ).toEqual({
      needsSignIn: true,
      needsByok: false,
    });
  });

  it('requires nothing when signed in and key exists', () => {
    expect(
      resolveAiAccessRequirements({
        isSignedIn: true,
        hasByokKey: true,
      })
    ).toEqual({
      needsSignIn: false,
      needsByok: false,
    });
  });

  it('does not require BYOK when fake generation is enabled', () => {
    expect(
      resolveAiAccessRequirements({
        isSignedIn: true,
        hasByokKey: false,
        fakeGenerationEnabled: true,
      })
    ).toEqual({
      needsSignIn: false,
      needsByok: false,
    });
  });

});
