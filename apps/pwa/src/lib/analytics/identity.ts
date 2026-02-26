const ALIAS_KEY = 'analytics_identity_alias';
const PROMPT_DONE_KEY = 'analytics_identity_prompt_done';
const PROMPT_PENDING_KEY = 'analytics_identity_prompt_pending';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function getIdentityAlias(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  const value = storage.getItem(ALIAS_KEY)?.trim() ?? '';
  return value.length > 0 ? value : null;
}

export function setIdentityAlias(alias: string): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(ALIAS_KEY, alias.trim());
  storage.setItem(PROMPT_DONE_KEY, '1');
  storage.removeItem(PROMPT_PENDING_KEY);
}

export function isIdentityPromptDone(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  return storage.getItem(PROMPT_DONE_KEY) === '1';
}

export function markIdentityPromptSkipped(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(PROMPT_DONE_KEY, '1');
  storage.removeItem(PROMPT_PENDING_KEY);
}

export function markIdentityPromptPendingAfterLogin(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(PROMPT_PENDING_KEY, '1');
}

export function isIdentityPromptPendingAfterLogin(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  return storage.getItem(PROMPT_PENDING_KEY) === '1';
}

