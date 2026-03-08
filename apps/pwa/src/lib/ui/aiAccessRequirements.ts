export type AiAccessRequirements = {
  needsSignIn: boolean;
  needsByok: boolean;
};

export type ResolveAiAccessRequirementsInput = {
  isSignedIn: boolean;
  hasByokKey: boolean;
  fakeGenerationEnabled?: boolean;
};

export function resolveAiAccessRequirements(input: ResolveAiAccessRequirementsInput): AiAccessRequirements {
  if (input.fakeGenerationEnabled) {
    return {
      needsSignIn: false,
      needsByok: false,
    };
  }

  const needsByok = input.fakeGenerationEnabled ? false : !input.hasByokKey;

  return {
    needsSignIn: !input.isSignedIn,
    needsByok,
  };
}
