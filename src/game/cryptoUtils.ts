/**
 * Generates a cryptographically secure random integer between 0 (inclusive) and max (exclusive).
 * @param max The upper bound (exclusive)
 * @returns A secure random integer
 */
export function getSecureRandomInt(max: number): number {
  if (max <= 0) return 0;

  const array = new Uint32Array(1);
  const maxUint32 = 0xFFFFFFFF;
  // To avoid modulo bias, we need to find the largest multiple of max that fits in 32 bits
  const limit = maxUint32 - (maxUint32 % max);

  let randomNumber;
  do {
    globalThis.crypto.getRandomValues(array);
    randomNumber = array[0];
  } while (randomNumber >= limit);

  return randomNumber % max;
}
