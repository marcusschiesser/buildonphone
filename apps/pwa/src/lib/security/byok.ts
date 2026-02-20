import { clearSecret, getSecret, saveSecret } from '@/lib/storage/db';

const KEY_SLOT = 'anthropic_api_key';
const ENC_SLOT = 'su_master_key';

function toB64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf));
}

function fromB64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function getMasterKey(): Uint8Array {
  const existing = localStorage.getItem(ENC_SLOT);
  if (existing) return fromB64(existing);
  const key = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(ENC_SLOT, toB64(key));
  return key;
}

function encrypt(raw: string): string {
  const key = getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(raw);
  const cipher = plain.map((byte, i) => byte ^ key[i % key.length]!);
  return `${toB64(iv)}.${toB64(cipher)}`;
}

function decrypt(payload: string): string | null {
  const [, body] = payload.split('.');
  if (!body) return null;
  const key = getMasterKey();
  const cipher = fromB64(body);
  const plain = cipher.map((byte, i) => byte ^ key[i % key.length]!);
  return new TextDecoder().decode(plain);
}

export async function setAnthropicKey(raw: string) {
  const payload = encrypt(raw);
  localStorage.setItem(KEY_SLOT, payload);
  await saveSecret(KEY_SLOT, payload);
}

export async function getAnthropicKey(): Promise<string | null> {
  const localPayload = localStorage.getItem(KEY_SLOT);
  if (localPayload) {
    return decrypt(localPayload);
  }

  // Backward compatibility: migrate old IndexedDB-stored key into localStorage.
  const dbPayload = await getSecret(KEY_SLOT);
  if (!dbPayload) return null;

  localStorage.setItem(KEY_SLOT, dbPayload);
  return decrypt(dbPayload);
}

export async function hasAnthropicKey(): Promise<boolean> {
  const key = await getAnthropicKey();
  return Boolean(key && key.trim());
}

export async function clearAnthropicKey() {
  localStorage.removeItem(KEY_SLOT);
  await clearSecret(KEY_SLOT);
}
