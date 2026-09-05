import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Gera hash seguro de senha utilizando scrypt nativo do Node.js (salt de 16 bytes + chave de 64 bytes).
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Compara uma senha em texto puro contra um hash scrypt armazenado.
 */
export function verifyPassword(password: string, hash: string): boolean {
  try {
    const [salt, key] = hash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedKey.length) return false;
    return timingSafeEqual(keyBuffer, derivedKey);
  } catch (error) {
    return false;
  }
}
