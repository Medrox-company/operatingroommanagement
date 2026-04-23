import { scrypt as scryptCb, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);

const KEYLEN = 64;
const SALT_BYTES = 16;
const FORMAT_VERSION = 'scrypt$v1';

/**
 * Vytvoří bezpečný hash hesla pomocí Node.js scrypt.
 * Formát uloženého hashe: `scrypt$v1$<salt-hex>$<hash-hex>`.
 */
export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string');
  }
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
  return `${FORMAT_VERSION}$${salt}$${derived.toString('hex')}`;
}

/**
 * Ověří heslo proti uloženému hashi. Vrací `false` i při jakékoli chybě formátu,
 * aby se útočník nedozvěděl rozdíl mezi "uživatel neexistuje" a "špatné heslo".
 */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!password || !stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  // Očekáváme: ['scrypt', 'v1', salt, hash]
  if (parts.length !== 4 || parts[0] !== 'scrypt' || parts[1] !== 'v1') return false;
  const [, , salt, hashHex] = parts;
  try {
    const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
    const expected = Buffer.from(hashHex, 'hex');
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
