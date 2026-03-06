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
  try {
    const cipher = fromB64(body);
    const plain = cipher.map((byte, i) => byte ^ key[i % key.length]!);
    return new TextDecoder('utf-8', { fatal: true }).decode(plain);
  } catch {
    return null;
  }
}

function normalizeKey(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^[-\x20-\x7E]+$/.test(trimmed)) return null;
  return trimmed;
}

export async function setAnthropicKey(raw: string) {
  const payload = encrypt(raw);
  localStorage.setItem(KEY_SLOT, payload);
}

export async function getAnthropicKey(): Promise<string | null> {
  const localPayload = localStorage.getItem(KEY_SLOT);
  if (!localPayload) return null;

  const key = normalizeKey(decrypt(localPayload));
  if (!key) {
    localStorage.removeItem(KEY_SLOT);
    return null;
  }
  return key;
}

export async function hasAnthropicKey(): Promise<boolean> {
  const key = await getAnthropicKey();
  return Boolean(key && key.trim());
}

export async function clearAnthropicKey() {
  localStorage.removeItem(KEY_SLOT);
}
