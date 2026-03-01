export type AiAccessRequirements = {
  needsPassword: boolean;
  needsByok: boolean;
};

export type ResolveAiAccessRequirementsInput = {
  requiresPassword: boolean;
  authenticated: boolean;
  hasServerKey: boolean;
  hasByokKey: boolean;
  forcePassword?: boolean;
};

export function resolveAiAccessRequirements(input: ResolveAiAccessRequirementsInput): AiAccessRequirements {
  return {
    needsPassword: input.requiresPassword && (!input.authenticated || input.forcePassword === true),
    needsByok: !input.hasServerKey && !input.hasByokKey,
  };
}
