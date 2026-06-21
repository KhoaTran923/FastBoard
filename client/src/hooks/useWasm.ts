import { useCallback, useEffect, useRef, useState } from 'react';
import { instantiate } from '@assemblyscript/loader';

// ── WASM loader ──────────────────────────────────────────────────────────────
// Raw WebAssembly exports: strings are passed/returned as numeric pointers into
// the module's linear memory.
interface RawExports extends Record<string, unknown> {
  kmpSearch(textPtr: number, patternPtr: number): number;
  contains(textPtr: number, patternPtr: number): number;
}

export interface Searcher {
  /** Index of the first occurrence of `pattern` in `text` (-1 if not found). */
  kmpSearch(text: string, pattern: string): number;
  /** Whether `pattern` occurs anywhere in `text`. */
  contains(text: string, pattern: string): boolean;
}

let searcherPromise: Promise<Searcher> | null = null;

async function loadSearcher(): Promise<Searcher> {
  // search.wasm is served from client/public/wasm/ (built by the @repo/wasm package).
  const { exports } = await instantiate<RawExports>(fetch('/wasm/search.wasm'), {});

  // Marshal JS strings into WASM memory, run the function, then release them.
  // Pinning prevents the GC from moving/freeing the strings mid-call.
  const withStrings = (
    fn: (t: number, p: number) => number,
    text: string,
    pattern: string
  ): number => {
    const t = exports.__pin(exports.__newString(text));
    const p = exports.__pin(exports.__newString(pattern));
    try {
      return fn(t, p);
    } finally {
      exports.__unpin(t);
      exports.__unpin(p);
    }
  };

  return {
    kmpSearch: (text, pattern) => withStrings(exports.kmpSearch, text, pattern),
    contains: (text, pattern) =>
      pattern.length === 0 || withStrings(exports.contains, text, pattern) !== 0,
  };
}

/** Loads (once) and returns the WASM-backed searcher. */
function getSearcher(): Promise<Searcher> {
  searcherPromise ??= loadSearcher();
  return searcherPromise;
}

// ── React hook ───────────────────────────────────────────────────────────────
/**
 * Loads the WASM KMP search module and returns a case-insensitive `match`
 * function. Until the module finishes loading it transparently falls back to
 * JavaScript's `String.includes`, so search always works.
 */
export function useWasm() {
  const searcherRef = useRef<Searcher | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    getSearcher()
      .then((searcher) => {
        if (active) {
          searcherRef.current = searcher;
          setReady(true);
        }
      })
      .catch(() => {
        // Stay on the JS fallback if the module fails to load.
      });
    return () => {
      active = false;
    };
  }, []);

  const match = useCallback((text: string, query: string): boolean => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const haystack = text.toLowerCase();
    const searcher = searcherRef.current;
    return searcher ? searcher.contains(haystack, q) : haystack.includes(q);
  }, []);

  return { ready, match };
}
