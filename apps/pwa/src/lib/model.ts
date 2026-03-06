export const DEFAULT_MODEL = 'claude-sonnet-4-6';
export const DEFAULT_DEV_OVERRIDE_MODELS = [
  DEFAULT_MODEL,
  'claude-opus-4-1',
  'claude-3-7-sonnet-latest',
  'claude-3-5-haiku-latest',
] as const;

export interface ModelAccessContext {
  userId?: string | null;
  env?: NodeJS.ProcessEnv;
}

function isDevelopment(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV !== 'production';
}

export function getSuperUserIds(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.SUPERUSER_CLERK_USER_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function canOverrideModel(context: ModelAccessContext = {}): boolean {
  const env = context.env ?? process.env;
  if (isDevelopment(env)) return true;
  if (!context.userId) return false;
  return getSuperUserIds(env).includes(context.userId);
}

export function getAllowedModelOptions(context: ModelAccessContext = {}): string[] {
  const env = context.env ?? process.env;
  const configured = (env.MODEL_OVERRIDE_OPTIONS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const base = configured.length > 0 ? configured : [...DEFAULT_DEV_OVERRIDE_MODELS];
  return Array.from(new Set([DEFAULT_MODEL, ...base]));
}

export function resolveHostModel(requestedModel: string | null | undefined, context: ModelAccessContext = {}): string {
  const trimmed = requestedModel?.trim();
  if (!trimmed) {
    return DEFAULT_MODEL;
  }

  if (trimmed === DEFAULT_MODEL) {
    return DEFAULT_MODEL;
  }

  if (!canOverrideModel(context)) {
    throw new Error('Custom model selection is not allowed for this user.');
  }

  return trimmed;
}
