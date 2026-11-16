/**
 * Cryptographically secure random bytes on iOS and Android (the system
 * generator, through expo-crypto). The web version uses crypto.getRandomValues.
 */
import * as ExpoCrypto from 'expo-crypto';

export function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  // expo-crypto returns at most 1024 bytes per call.
  for (let i = 0; i < n; i += 1024) out.set(ExpoCrypto.getRandomBytes(Math.min(1024, n - i)), i);
  return out;
}
