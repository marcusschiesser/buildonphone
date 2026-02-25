export const COOKIE_NAME = 'buildonphone_auth';
const HMAC_MESSAGE = 'buildonphone-auth-v1';
const TEXT_ENCODER = new TextEncoder();

function timingSafeEqualString(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;

  for (let i = 0; i < maxLength; i += 1) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }

  return mismatch === 0;
}

function toHex(input: Uint8Array): string {
  return Array.from(input, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function isPasswordProtectionEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim() && !!process.env.APP_PASSWORD?.trim();
}

export async function computeAuthToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', TEXT_ENCODER.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, TEXT_ENCODER.encode(HMAC_MESSAGE));
  return toHex(new Uint8Array(signature));
}

export function verifyPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD?.trim();
  if (!expected) return false;
  return timingSafeEqualString(input, expected);
}

export async function verifyAuthCookie(cookieValue: string): Promise<boolean> {
  const password = process.env.APP_PASSWORD?.trim();
  if (!password) return false;
  const expected = await computeAuthToken(password);
  return timingSafeEqualString(cookieValue, expected);
}
