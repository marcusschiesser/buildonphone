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
  const needsByok = input.fakeGenerationEnabled ? false : !input.hasByokKey;

  return {
    needsSignIn: !input.isSignedIn,
    needsByok,
  };
}
