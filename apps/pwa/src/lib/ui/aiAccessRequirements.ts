export type AiAccessRequirements = {
  needsPassword: boolean;
  needsByok: boolean;
};

export type ResolveAiAccessRequirementsInput = {
  requiresPassword: boolean;
  authenticated: boolean;
  hasServerKey: boolean;
  hasByokKey: boolean;
  fakeGenerationEnabled?: boolean;
  forcePassword?: boolean;
};

export function resolveAiAccessRequirements(input: ResolveAiAccessRequirementsInput): AiAccessRequirements {
  const needsByok = input.fakeGenerationEnabled ? false : !input.hasServerKey && !input.hasByokKey;

  return {
    needsPassword: input.requiresPassword && (!input.authenticated || input.forcePassword === true),
    needsByok,
  };
}
