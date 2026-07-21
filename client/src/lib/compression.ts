import { instantiate } from '@assemblyscript/loader';
import { compressJs, decompressJs } from './compressionJs';

// String <-> compressed-base64 pipeline for localStorage snapshots:

interface RawExports extends Record<string, unknown> {
  UINT8ARRAY_ID: { valueOf(): number };
  compress(ptr: number): number;
  decompress(ptr: number): number;
}

interface Codec {
  compress(bytes: Uint8Array): Uint8Array;
  decompress(bytes: Uint8Array): Uint8Array;
  engine: 'wasm' | 'js';
}

const jsCodec: Codec = { compress: compressJs, decompress: decompressJs, engine: 'js' };

let codecPromise: Promise<Codec> | null = null;

async function loadCodec(): Promise<Codec> {
  try {
    const { exports } = await instantiate<RawExports>(fetch('/wasm/compression.wasm'), {});
    const u8Id = exports.UINT8ARRAY_ID.valueOf();

    const call = (fn: (ptr: number) => number, bytes: Uint8Array): Uint8Array => {
      const ptr = exports.__pin(exports.__newArray(u8Id, bytes));
      try {
        // slice() detaches the result from WASM memory before unpinning
        return exports.__getUint8Array(fn(ptr)).slice();
      } finally {
        exports.__unpin(ptr);
      }
    };

    return {
      compress: (bytes) => call(exports.compress, bytes),
      decompress: (bytes) => call(exports.decompress, bytes),
      engine: 'wasm',
    };
  } catch {
    return jsCodec; // e.g. fetch blocked or WASM unsupported
  }
}

/** Loads (once) the WASM codec, falling back to the JS implementation. */
function getCodec(): Promise<Codec> {
  codecPromise ??= loadCodec();
  return codecPromise;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000; // avoid call-stack limits on large arrays
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Compress a string to base64 (for localStorage). */
export async function compressString(text: string): Promise<string> {
  const codec = await getCodec();
  return toBase64(codec.compress(new TextEncoder().encode(text)));
}

/** Inverse of compressString(). Returns null when the stream is malformed. */
export async function decompressString(b64: string): Promise<string | null> {
  try {
    const codec = await getCodec();
    const bytes = codec.decompress(fromBase64(b64));
    if (bytes.length === 0 && b64.length > 0) return null;
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** Which engine ended up in use (surfaced in dev logs / docs). */
export async function compressionEngine(): Promise<'wasm' | 'js'> {
  return (await getCodec()).engine;
}
