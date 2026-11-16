/** Cryptographically secure random bytes in the browser (Web Crypto). */
export function randomBytes(n: number): Uint8Array {
  const c = globalThis.crypto;
  if (!c?.getRandomValues) throw new Error('secure random numbers are not available in this browser');
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i += 65536) c.getRandomValues(out.subarray(i, Math.min(n, i + 65536)));
  return out;
}
