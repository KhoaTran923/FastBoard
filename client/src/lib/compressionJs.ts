// Pure-JS LZSS, byte-for-byte compatible with the WASM module
const WINDOW = 4096;
const MIN_MATCH = 3;
const MAX_MATCH = 18;
const HASH_SIZE = 1 << 13;
const MAX_CHAIN = 32;
const HEADER = 5;
const VERSION = 1;

export function compressJs(input: Uint8Array): Uint8Array {
  const n = input.length;
  const out = new Uint8Array(HEADER + n + (n >> 3) + 2);
  out[0] = VERSION;
  out[1] = n & 0xff;
  out[2] = (n >> 8) & 0xff;
  out[3] = (n >> 16) & 0xff;
  out[4] = (n >> 24) & 0xff;

  const head = new Int32Array(HASH_SIZE).fill(-1);
  const prev = new Int32Array(WINDOW);
  const hash3 = (i: number) =>
    ((input[i] << 10) ^ (input[i + 1] << 5) ^ input[i + 2]) & (HASH_SIZE - 1);

  let outPos = HEADER;
  let flagPos = 0;
  let flagBits = 0;
  let tokenCount = 8;

  let i = 0;
  while (i < n) {
    if (tokenCount === 8) {
      if (flagPos !== 0) out[flagPos] = flagBits;
      flagPos = outPos++;
      flagBits = 0;
      tokenCount = 0;
    }

    let bestLen = 0;
    let bestOffset = 0;
    if (i + MIN_MATCH <= n) {
      const h = hash3(i);
      let candidate = head[h];
      let chain = MAX_CHAIN;
      const limit = i - WINDOW;
      const maxLen = n - i < MAX_MATCH ? n - i : MAX_MATCH;
      while (candidate >= 0 && candidate >= limit && chain-- > 0) {
        let len = 0;
        while (len < maxLen && input[candidate + len] === input[i + len]) len++;
        if (len > bestLen) {
          bestLen = len;
          bestOffset = i - candidate;
          if (len === maxLen) break;
        }
        candidate = prev[candidate & (WINDOW - 1)];
      }
    }

    if (bestLen >= MIN_MATCH) {
      const off = bestOffset - 1;
      out[outPos++] = off & 0xff;
      out[outPos++] = ((off >> 8) << 4) | (bestLen - MIN_MATCH);
      const end = i + bestLen;
      while (i < end) {
        if (i + MIN_MATCH <= n) {
          const h = hash3(i);
          prev[i & (WINDOW - 1)] = head[h];
          head[h] = i;
        }
        i++;
      }
    } else {
      flagBits |= 1 << tokenCount;
      out[outPos++] = input[i];
      if (i + MIN_MATCH <= n) {
        const h = hash3(i);
        prev[i & (WINDOW - 1)] = head[h];
        head[h] = i;
      }
      i++;
    }
    tokenCount++;
  }
  if (n > 0) out[flagPos] = flagBits;

  return out.slice(0, outPos);
}

export function decompressJs(input: Uint8Array): Uint8Array {
  if (input.length < HEADER || input[0] !== VERSION) return new Uint8Array(0);
  const n = input[1] | (input[2] << 8) | (input[3] << 16) | (input[4] << 24);
  const out = new Uint8Array(n);

  let inPos = HEADER;
  let outPos = 0;
  let flagBits = 0;
  let tokenCount = 8;

  while (outPos < n) {
    if (tokenCount === 8) {
      flagBits = input[inPos++];
      tokenCount = 0;
    }
    if ((flagBits >> tokenCount) & 1) {
      out[outPos++] = input[inPos++];
    } else {
      const b0 = input[inPos++];
      const b1 = input[inPos++];
      const offset = (b0 | ((b1 >> 4) << 8)) + 1;
      let len = (b1 & 0x0f) + MIN_MATCH;
      // Byte-by-byte: the source range may overlap the output being written
      let src = outPos - offset;
      while (len-- > 0) out[outPos++] = out[src++];
    }
    tokenCount++;
  }
  return out;
}
