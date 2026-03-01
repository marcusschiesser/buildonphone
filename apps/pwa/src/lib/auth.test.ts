import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { computeAuthToken, COOKIE_NAME, isRequestAuthorized } from './auth';

const ORIGINAL_ENV = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  APP_PASSWORD: process.env.APP_PASSWORD,
};

afterEach(() => {
  process.env.ANTHROPIC_API_KEY = ORIGINAL_ENV.ANTHROPIC_API_KEY;
  process.env.APP_PASSWORD = ORIGINAL_ENV.APP_PASSWORD;
});

describe('auth helpers', () => {
  it('allows requests when password protection is disabled', async () => {
    process.env.ANTHROPIC_API_KEY = '';
    process.env.APP_PASSWORD = '';

    const req = new NextRequest('http://localhost/');
    await expect(isRequestAuthorized(req)).resolves.toBe(true);
  });

  it('rejects protected requests without a valid cookie', async () => {
    process.env.ANTHROPIC_API_KEY = 'server-key';
    process.env.APP_PASSWORD = 'secret';

    const req = new NextRequest('http://localhost/');
    await expect(isRequestAuthorized(req)).resolves.toBe(false);
  });

  it('accepts protected requests with a valid auth cookie', async () => {
    process.env.ANTHROPIC_API_KEY = 'server-key';
    process.env.APP_PASSWORD = 'secret';
    const token = await computeAuthToken('secret');

    const req = new NextRequest('http://localhost/', {
      headers: {
        cookie: `${COOKIE_NAME}=${token}`,
      },
    });

    await expect(isRequestAuthorized(req)).resolves.toBe(true);
  });
});
