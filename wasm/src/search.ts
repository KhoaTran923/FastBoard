// A shared failure-table buffer, reused across calls so a typical search does
// not allocate (and therefore does not trigger GC). Search queries are short,
// so they always fit; longer patterns fall back to a one-off allocation.
const LPS_CAPACITY: i32 = 1024;
const sharedLps = new StaticArray<i32>(LPS_CAPACITY);

/** Index of the first occurrence of `pattern` in `text`, or -1 if not found. */
export function kmpSearch(text: string, pattern: string): i32 {
  const n: i32 = text.length;
  const m: i32 = pattern.length;
  if (m === 0) return 0;
  if (m > n) return -1;

  // Build the longest-proper-prefix-which-is-also-suffix (failure) table.
  const lps = m <= LPS_CAPACITY ? sharedLps : new StaticArray<i32>(m);
  lps[0] = 0;
  let len: i32 = 0;
  let i: i32 = 1;
  while (i < m) {
    if (pattern.charCodeAt(i) === pattern.charCodeAt(len)) {
      len++;
      lps[i] = len;
      i++;
    } else if (len !== 0) {
      len = lps[len - 1];
    } else {
      lps[i] = 0;
      i++;
    }
  }

  // Scan the text using the failure table to skip redundant comparisons.
  let j: i32 = 0;
  i = 0;
  while (i < n) {
    if (text.charCodeAt(i) === pattern.charCodeAt(j)) {
      i++;
      j++;
      if (j === m) return i - j;
    } else if (j !== 0) {
      j = lps[j - 1];
    } else {
      i++;
    }
  }
  return -1;
}

/** True if `pattern` occurs anywhere in `text`. */
export function contains(text: string, pattern: string): bool {
  return kmpSearch(text, pattern) >= 0;
}

let docs: string[] = [];

/** Remove all stored documents. */
export function clearDocs(): void {
  docs = [];
}

/** Store one document (e.g. a task's text) for later batch searches. */
export function addDoc(text: string): void {
  docs.push(text);
}

/** Count how many stored documents contain `pattern`. */
export function searchAll(pattern: string): i32 {
  let count: i32 = 0;
  for (let i: i32 = 0, len = docs.length; i < len; i++) {
    if (kmpSearch(docs[i], pattern) >= 0) count++;
  }
  return count;
}
