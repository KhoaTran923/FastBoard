// WASM Data Compression: byte-oriented LZSS (an LZ77 variant) used to shrink board-state snapshots before they go into localStorage.
// Hot loops read and write linear memory directly (load/store on dataStart) instead of going through typed-array indexing.

// Runtime id for Uint8Array, needed by the JS loader's __newArray()
export const UINT8ARRAY_ID = idof<Uint8Array>();

const VERSION: u8 = 1;
const HEADER: i32 = 5;

const WINDOW: i32 = 4096; // offset must fit in 12 bits
const MIN_MATCH: i32 = 3; // shorter matches cost more than literals
const MAX_MATCH: i32 = 18; // length - MIN_MATCH must fit in 4 bits

const HASH_BITS: i32 = 13;
const HASH_SIZE: i32 = 1 << HASH_BITS;
const MAX_CHAIN: i32 = 32; // match-search depth: speed vs ratio trade-off

// Reused across calls so repeated compressions do not reallocate
const head = new Int32Array(HASH_SIZE);
const prev = new Int32Array(WINDOW);

/** Hash of the 3 bytes at `p` (a raw pointer into linear memory). */
function hash3(p: usize): i32 {
  const h: i32 = ((<i32>load<u8>(p)) << 10) ^ ((<i32>load<u8>(p, 1)) << 5) ^ (<i32>load<u8>(p, 2));
  return h & (HASH_SIZE - 1);
}

/** Compress `input`; the result is self-describing (see format above). */
export function compress(input: Uint8Array): Uint8Array {
  const n: i32 = input.length;
  // Worst case: all literals -> 1 flag byte per 8 bytes + header
  const out = new Uint8Array(HEADER + n + (n >> 3) + 2);
  const src: usize = input.dataStart;
  const dst: usize = out.dataStart;

  store<u8>(dst, VERSION);
  store<u32>(dst + 1, <u32>n); // WASM is little-endian by spec

  const headPtr: usize = head.dataStart;
  const prevPtr: usize = prev.dataStart;
  head.fill(-1);

  let outPos: i32 = HEADER;
  let flagPos: i32 = 0; // where the current group's flag byte lives
  let flagBits: i32 = 0;
  let tokenCount: i32 = 8; // forces a new flag byte on the first token

  let i: i32 = 0;
  while (i < n) {
    if (tokenCount === 8) {
      // Start a new group: reserve a byte for its flags
      if (flagPos !== 0) store<u8>(dst + flagPos, <u8>flagBits);
      flagPos = outPos++;
      flagBits = 0;
      tokenCount = 0;
    }

    // Find the longest match within the sliding window
    let bestLen: i32 = 0;
    let bestOffset: i32 = 0;
    if (i + MIN_MATCH <= n) {
      const h: i32 = hash3(src + i);
      let candidate: i32 = load<i32>(headPtr + ((<usize>h) << 2));
      let chain: i32 = MAX_CHAIN;
      const limit: i32 = i - WINDOW;
      const maxLen: i32 = n - i < MAX_MATCH ? n - i : MAX_MATCH;
      while (candidate >= 0 && candidate >= limit && chain-- > 0) {
        let len: i32 = 0;
        while (len < maxLen && load<u8>(src + candidate + len) === load<u8>(src + i + len)) {
          len++;
        }
        if (len > bestLen) {
          bestLen = len;
          bestOffset = i - candidate;
          if (len === maxLen) break;
        }
        candidate = load<i32>(prevPtr + ((<usize>(candidate & (WINDOW - 1))) << 2));
      }
    }

    if (bestLen >= MIN_MATCH) {
      // Match token: 12-bit offset (1-based), 4-bit length
      const off: i32 = bestOffset - 1;
      store<u8>(dst + outPos, <u8>(off & 0xff));
      store<u8>(dst + outPos + 1, <u8>(((off >> 8) << 4) | (bestLen - MIN_MATCH)));
      outPos += 2;
      // Index every covered position so later matches can find them
      const end: i32 = i + bestLen;
      const indexEnd: i32 = end < n - MIN_MATCH + 1 ? end : n - MIN_MATCH + 1;
      while (i < indexEnd) {
        const h: i32 = hash3(src + i);
        store<i32>(
          prevPtr + ((<usize>(i & (WINDOW - 1))) << 2),
          load<i32>(headPtr + ((<usize>h) << 2))
        );
        store<i32>(headPtr + ((<usize>h) << 2), i);
        i++;
      }
      i = end;
    } else {
      // Literal token
      flagBits |= 1 << tokenCount;
      store<u8>(dst + outPos, load<u8>(src + i));
      outPos++;
      if (i + MIN_MATCH <= n) {
        const h: i32 = hash3(src + i);
        store<i32>(
          prevPtr + ((<usize>(i & (WINDOW - 1))) << 2),
          load<i32>(headPtr + ((<usize>h) << 2))
        );
        store<i32>(headPtr + ((<usize>h) << 2), i);
      }
      i++;
    }
    tokenCount++;
  }
  if (n > 0) store<u8>(dst + flagPos, <u8>flagBits);

  return out.slice(0, outPos);
}

/** Inverse of compress(). Returns an empty array on a malformed header. */
export function decompress(input: Uint8Array): Uint8Array {
  if (input.length < HEADER || input[0] !== VERSION) return new Uint8Array(0);
  const src: usize = input.dataStart;
  const n: i32 = <i32>load<u32>(src + 1);
  const out = new Uint8Array(n);
  const dst: usize = out.dataStart;

  let inPos: i32 = HEADER;
  let outPos: i32 = 0;
  let flagBits: i32 = 0;
  let tokenCount: i32 = 8;

  while (outPos < n) {
    if (tokenCount === 8) {
      flagBits = <i32>load<u8>(src + inPos);
      inPos++;
      tokenCount = 0;
    }
    if ((flagBits >> tokenCount) & 1) {
      store<u8>(dst + outPos, load<u8>(src + inPos));
      outPos++;
      inPos++;
    } else {
      const b0: i32 = <i32>load<u8>(src + inPos);
      const b1: i32 = <i32>load<u8>(src + inPos, 1);
      inPos += 2;
      const offset: i32 = (b0 | ((b1 >> 4) << 8)) + 1;
      let len: i32 = (b1 & 0x0f) + MIN_MATCH;
      // Byte-by-byte copy: source may overlap the bytes being written
      let from: i32 = outPos - offset;
      while (len-- > 0) {
        store<u8>(dst + outPos, load<u8>(dst + from));
        outPos++;
        from++;
      }
    }
    tokenCount++;
  }
  return out;
}

/** Compressed size of `input` in bytes (for benchmarks and UI stats). */
export function compressedSize(input: Uint8Array): i32 {
  return compress(input).length;
}
