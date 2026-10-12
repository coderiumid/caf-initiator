// Directory-listing stub for the ordering tests (CAF-FIX-01).
//
// fast-glob reads directories through `fs.readdir`, which @nodelib/fs.scandir captures when it is
// first loaded. So this module replaces `fs.readdir` at import time and MUST be imported before
// anything that loads fast-glob (i.e. before any import from `src/`).
//
// With no order set, the stub is a pass-through to the real `fs.readdir`. With an order set, a
// listing is read synchronously, put in name order, permuted by the given function and handed
// back on a later tick — so both the entry order and the completion order of the listings are
// decided by the test, not by the file system or the thread pool.
import fs from 'node:fs';

const realReaddir = fs.readdir;
let permute = null;

fs.readdir = function readdir(dir, options, callback) {
  if (permute === null) return realReaddir.call(fs, dir, options, callback);
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'function' ? undefined : options;
  let entries;
  try {
    entries = fs.readdirSync(dir, opts);
  } catch (error) {
    setImmediate(cb, error);
    return undefined;
  }
  const nameOf = (entry) => (typeof entry === 'string' ? entry : entry.name);
  const inNameOrder = [...entries].sort((a, b) => (nameOf(a) < nameOf(b) ? -1 : nameOf(a) > nameOf(b) ? 1 : 0));
  setImmediate(cb, null, permute(inNameOrder));
  return undefined;
};

// Deterministic PRNG (mulberry32) — "random" here means one fixed shuffle, the same on every run.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const LISTING_ORDERS = {
  normal: (entries) => entries,
  reversed: (entries) => [...entries].reverse(),
  // Fisher-Yates with a seed that is reset per listing: a fixed permutation for a given length.
  shuffled: (entries) => {
    const random = mulberry32(20261012);
    const out = [...entries];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  },
};

/** Run `fn` with every directory listing in the given order (`normal` | `reversed` | `shuffled`). */
export async function withListingOrder(order, fn) {
  if (!LISTING_ORDERS[order]) throw new Error(`unknown listing order "${order}"`);
  const previous = permute;
  permute = LISTING_ORDERS[order];
  try {
    return await fn();
  } finally {
    permute = previous;
  }
}
