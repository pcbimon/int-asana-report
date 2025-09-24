import * as crypto from 'crypto';

const KEY_B64 = process.env.ASSIGNEE_ENCRYPTION_KEY;
const IV_B64 = process.env.ASSIGNEE_ENCRYPTION_IV;

function getKeyAndIv(): { key: Buffer; iv: Buffer } {
  if (!KEY_B64 || !IV_B64) throw new Error('ASSIGNEE_ENCRYPTION_KEY and ASSIGNEE_ENCRYPTION_IV must be set for assignee encryption');
  const key = Buffer.from(KEY_B64, 'base64');
  const iv = Buffer.from(IV_B64, 'base64');
  if (key.length !== 32) throw new Error('ASSIGNEE_ENCRYPTION_KEY must be 32 bytes when decoded (Base64 of 32 random bytes)');
  if (iv.length !== 16) throw new Error('ASSIGNEE_ENCRYPTION_IV must be 16 bytes when decoded (Base64 of 16 random bytes)');
  return { key, iv };
}

export function encrypt(plaintext: string): string {
  const { key, iv } = getKeyAndIv();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
  // store as Base64 to keep DB column as text
  return enc.toString('base64');
}

export function decrypt(b64: string): string {
  if (b64 == null) return '';
  const { key, iv } = getKeyAndIv();
  try {
    const data = Buffer.from(b64, 'base64');
    const dec = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const out = Buffer.concat([dec.update(data), dec.final()]);
    return out.toString('utf8');
  } catch (e) {
    // if decryption fails, return empty string to avoid crashing the app; log the error
    console.debug('[crypto] failed to decrypt assignee (returning original value):', (e as Error).message);
    // Likely the stored value is plaintext (pre-encryption). Return it as-is so existing data remains usable.
    return b64;
  }
}
