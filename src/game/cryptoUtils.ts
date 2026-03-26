export type RandomSource = () => number;

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

export function getRandomInt(max: number, random?: RandomSource): number {
  if (max <= 0) return 0;
  return random ? Math.floor(random() * max) : getSecureRandomInt(max);
}

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createSeededRandom(seed: string): RandomSource {
  let state = hashSeed(seed) || 0x6d2b79f5;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
