import { createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE_NAME = 'claw2go_auth';
const HMAC_MESSAGE = 'claw2go-auth-v1';

export function isPasswordProtectionEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim() && !!process.env.APP_PASSWORD?.trim();
}

export function computeAuthToken(password: string): string {
  return createHmac('sha256', password).update(HMAC_MESSAGE).digest('hex');
}

export function verifyPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD?.trim();
  if (!expected) return false;
  try {
    return timingSafeEqual(Buffer.from(input), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function verifyAuthCookie(cookieValue: string): boolean {
  const password = process.env.APP_PASSWORD?.trim();
  if (!password) return false;
  const expected = computeAuthToken(password);
  try {
    return timingSafeEqual(Buffer.from(cookieValue), Buffer.from(expected));
  } catch {
    return false;
  }
}
