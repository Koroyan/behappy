// Comparing the first and the changed artwork of an art-reflection session.
//
// The AI model must never be the only judge of "what changed": a real session
// had the same photo uploaded twice and the model described a brighter centre
// and new colours that did not exist. The app now measures it first and tells
// the model what it may say (server/art/turn.mjs).
//
//   identical               the same file, or the same pixels
//   likely_same             only differences a camera or compression makes
//                           (lighting, white balance, size, a small shift or tilt)
//   different               the drawing itself changed (with where)
//   uncertain               in between: the model must not assert a change
//   comparison_unavailable  something could not be read (not a JPEG, no first image)
//
// How: each photo becomes a 48×48 map of "relative ink" — how much darker a spot
// is than the paper around it. Dividing by the local paper brightness removes
// lighting, gradients and exposure. The second map is aligned to the first
// (a small shift and tilt), then compared with a neighbourhood tolerance so
// edges that moved by one cell don't count as change. Colour is compared the
// same way on a 24×24 chromaticity map relative to the picture's own average
// (white balance). Only these fingerprints are kept, never the image.
// Thresholds are fixed by server/test/art.test.mjs on synthetic drawings.

import crypto from 'node:crypto';

import jpeg from 'jpeg-js';

const N = 48; // ink map
const M = 24; // colour map
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/** { mime, bytes } from a data URL (or null). */
export function decodeDataUrl(url) {
  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is.exec(String(url || ''));
  if (!m) return null;
  try {
    return { mime: m[1].toLowerCase(), bytes: Buffer.from(m[2], 'base64') };
  } catch {
    return null;
  }
}

/** Area-average downscale of RGBA pixels to w×h; returns { r, g, b } Float64Arrays. */
function downscale(data, width, height, w, h) {
  const r = new Float64Array(w * h);
  const g = new Float64Array(w * h);
  const b = new Float64Array(w * h);
  const n = new Float64Array(w * h);
  const step = Math.max(1, Math.floor(Math.max(width, height) / 800));
  for (let y = 0; y < height; y += step) {
    const cy = Math.min(h - 1, Math.floor((y * h) / height));
    for (let x = 0; x < width; x += step) {
      const cx = Math.min(w - 1, Math.floor((x * w) / width));
      const i = (y * width + x) * 4;
      const c = cy * w + cx;
      r[c] += data[i];
      g[c] += data[i + 1];
      b[c] += data[i + 2];
      n[c] += 1;
    }
  }
  for (let c = 0; c < w * h; c += 1) {
    const k = n[c] || 1;
    r[c] /= k;
    g[c] /= k;
    b[c] /= k;
  }
  return { r, g, b };
}

/**
 * Fingerprint of one uploaded image. Never throws: an unreadable image gives
 * { available: false } and comparisons then answer "comparison_unavailable".
 */
export function fingerprint(dataUrl) {
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return { available: false, reason: 'not_a_data_url' };
  const out = { sha256: sha256(decoded.bytes), available: false };
  if (decoded.mime !== 'image/jpeg' && decoded.mime !== 'image/jpg') return { ...out, reason: 'not_jpeg' };
  let img;
  try {
    img = jpeg.decode(decoded.bytes, { useTArray: true, maxResolutionInMP: 50, maxMemoryUsageInMB: 512, formatAsRGBA: true });
  } catch {
    return { ...out, reason: 'decode_failed' };
  }
  const { width, height, data } = img;
  const g = downscale(data, width, height, N, N);
  const gray = Array.from(g.r, (_, i) => Math.round(0.299 * g.r[i] + 0.587 * g.g[i] + 0.114 * g.b[i]));
  const c = downscale(data, width, height, M, M);
  const chroma = [];
  for (let i = 0; i < M * M; i += 1) {
    const sum = c.r[i] + c.g[i] + c.b[i] + 1e-6;
    chroma.push(Math.round((c.r[i] / sum) * 1000), Math.round((c.g[i] / sum) * 1000));
  }
  return { ...out, available: true, pixelSha256: sha256(Buffer.from(data.buffer, data.byteOffset, data.byteLength)), width, height, gray, chroma };
}

/** Separable box blur on an n×n grid (radius r, edges clamped). */
function blur(v, n, r) {
  const tmp = new Float64Array(n * n);
  const out = new Float64Array(n * n);
  for (let y = 0; y < n; y += 1)
    for (let x = 0; x < n; x += 1) {
      let s = 0;
      for (let k = -r; k <= r; k += 1) s += v[y * n + Math.min(n - 1, Math.max(0, x + k))];
      tmp[y * n + x] = s / (2 * r + 1);
    }
  for (let y = 0; y < n; y += 1)
    for (let x = 0; x < n; x += 1) {
      let s = 0;
      for (let k = -r; k <= r; k += 1) s += tmp[Math.min(n - 1, Math.max(0, y + k)) * n + x];
      out[y * n + x] = s / (2 * r + 1);
    }
  return out;
}

/**
 * "Relative ink": how much darker each cell is than the paper around it.
 * The paper level is a bright-biased local maximum, so a large dark shape
 * doesn't pull it down; dividing by it removes light level and gradients.
 */
function inkMap(gray, n) {
  const v = Float64Array.from(gray);
  // Local paper level: maximum over a 7×7 neighbourhood, then smoothed.
  const max = new Float64Array(n * n);
  const R = 5;
  for (let y = 0; y < n; y += 1)
    for (let x = 0; x < n; x += 1) {
      let m = 0;
      for (let dy = -R; dy <= R; dy += 1)
        for (let dx = -R; dx <= R; dx += 1) {
          const yy = Math.min(n - 1, Math.max(0, y + dy));
          const xx = Math.min(n - 1, Math.max(0, x + dx));
          if (v[yy * n + xx] > m) m = v[yy * n + xx];
        }
      max[y * n + x] = m;
    }
  const paper = blur(max, n, 4);
  return Array.from(v, (val, i) => Math.max(0, Math.min(1, 1 - val / Math.max(paper[i], 8))));
}

/** Bilinear sample of an n×n grid (outside → null). */
function sample(v, n, x, y) {
  if (x < 0 || y < 0 || x > n - 1 || y > n - 1) return null;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(n - 1, x0 + 1);
  const y1 = Math.min(n - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  return v[y0 * n + x0] * (1 - fx) * (1 - fy) + v[y0 * n + x1] * fx * (1 - fy) + v[y1 * n + x0] * (1 - fx) * fy + v[y1 * n + x1] * fx * fy;
}

/**
 * Map b into a's frame with rotation θ (degrees) and shift (dx, dy) in cells
 * of an n grid. The grid squeezes the photo into a square, so the rotation is
 * done in true proportions (`aspect` = width / height) and mapped back.
 */
function transform(v, n, deg, dx, dy, aspect = 1) {
  const a = (deg * Math.PI) / 180;
  const c = (n - 1) / 2;
  const out = new Array(n * n);
  for (let y = 0; y < n; y += 1)
    for (let x = 0; x < n; x += 1) {
      const px = (x - c) * aspect;
      const py = y - c;
      const xr = (Math.cos(a) * px - Math.sin(a) * py) / aspect + c + dx;
      const yr = Math.sin(a) * px + Math.cos(a) * py + c + dy;
      out[y * n + x] = sample(v, n, xr, yr);
    }
  return out;
}

/** Mean squared difference over cells present in both (border excluded). */
function mismatch(a, b, n, border) {
  let s = 0;
  let k = 0;
  for (let y = border; y < n - border; y += 1)
    for (let x = border; x < n - border; x += 1) {
      const bv = b[y * n + x];
      if (bv === null) continue;
      const d = a[y * n + x] - bv;
      s += d * d;
      k += 1;
    }
  return k ? s / k : Infinity;
}

function correlation(a, b, n, border) {
  const xs = [];
  const ys = [];
  for (let y = border; y < n - border; y += 1)
    for (let x = border; x < n - border; x += 1) {
      if (b[y * n + x] === null) continue;
      xs.push(a[y * n + x]);
      ys.push(b[y * n + x]);
    }
  const mean = (v) => v.reduce((s, x) => s + x, 0) / (v.length || 1);
  const [ma, mb] = [mean(xs), mean(ys)];
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < xs.length; i += 1) {
    num += (xs[i] - ma) * (ys[i] - mb);
    da += (xs[i] - ma) ** 2;
    db += (ys[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 1;
}

/**
 * Cells where the two maps differ beyond what a one-cell misalignment explains:
 * a value in one map must lie within the range (min…max) of the other map's
 * 3×3 neighbourhood. Edge cells that are a blend of two sides stay within that
 * range; a new or removed mark does not.
 */
function changedCells(a, b, n, border, threshold) {
  const out = [];
  const outside = (v, lo, hi) => (v < lo ? lo - v : v > hi ? v - hi : 0);
  for (let y = border; y < n - border; y += 1)
    for (let x = border; x < n - border; x += 1) {
      const i = y * n + x;
      if (b[i] === null) continue;
      let aLo = Infinity;
      let aHi = -Infinity;
      let bLo = Infinity;
      let bHi = -Infinity;
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          const j = (y + dy) * n + (x + dx);
          if (a[j] !== undefined) {
            aLo = Math.min(aLo, a[j]);
            aHi = Math.max(aHi, a[j]);
          }
          if (b[j] !== null && b[j] !== undefined) {
            bLo = Math.min(bLo, b[j]);
            bHi = Math.max(bHi, b[j]);
          }
        }
      const d = Math.max(outside(b[i], aLo, aHi), outside(a[i], bLo, bHi));
      if (d > threshold) out.push({ x, y, d, sign: Math.sign(b[i] - a[i]) });
    }
  return out;
}

const REGION_NAMES = ['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'];
const regionOf = (x, y, n) => REGION_NAMES[Math.min(2, Math.floor((y * 3) / n)) * 3 + Math.min(2, Math.floor((x * 3) / n))];

/** Chromaticity relative to the picture's own average (removes a colour cast), per channel pair. */
function relativeChroma(ch) {
  const cells = ch.length / 2;
  let mr = 0;
  let mg = 0;
  for (let i = 0; i < cells; i += 1) {
    mr += ch[i * 2];
    mg += ch[i * 2 + 1];
  }
  mr /= cells;
  mg /= cells;
  return { r: Array.from({ length: cells }, (_, i) => (ch[i * 2] - mr) / 1000), g: Array.from({ length: cells }, (_, i) => (ch[i * 2 + 1] - mg) / 1000) };
}

/**
 * Compares the first (a) and the changed (b) artwork fingerprints.
 * Returns { state, evidence }; evidence explains the decision (tests, logs
 * and the note the model receives).
 */
export function compareFingerprints(a, b) {
  if (!a || !b) return { state: 'comparison_unavailable', evidence: { reason: !a ? 'no_first_image' : 'no_second_image' } };
  if (a.sha256 && a.sha256 === b.sha256) return { state: 'identical', evidence: { reason: 'same_file' } };
  if (a.pixelSha256 && a.pixelSha256 === b.pixelSha256) return { state: 'identical', evidence: { reason: 'same_pixels' } };
  if (!a.available || !b.available || !Array.isArray(a.gray) || !Array.isArray(b.gray)) return { state: 'comparison_unavailable', evidence: { reason: a.reason || b.reason || 'unreadable' } };

  // A light blur removes the staircase that thin lines get when a photo is tilted.
  const ia = Array.from(blur(inkMap(a.gray, N), N, 1));
  const ib = Array.from(blur(inkMap(b.gray, N), N, 1));
  const border = 3;
  // True proportions of the first photo (both are photos of the same paper).
  const aspect = a.width && a.height ? a.width / a.height : 1;

  // Alignment: a tilt of up to 4° (in 0.5° steps) and a shift of up to 3 cells (≈6 % of the picture).
  let best = { err: Infinity, deg: 0, dx: 0, dy: 0, map: null };
  for (let deg = -4; deg <= 4; deg += 0.5)
    for (let dy = -3; dy <= 3; dy += 1)
      for (let dx = -3; dx <= 3; dx += 1) {
        const map = transform(ib, N, deg, dx, dy, aspect);
        const err = mismatch(ia, map, N, border);
        if (err < best.err) best = { err, deg, dx, dy, map };
      }
  const corr = correlation(ia, best.map, N, border);
  const ink = changedCells(ia, best.map, N, border, 0.16);

  // Colour on the 24×24 grid with the same alignment (half the cells).
  const ca = relativeChroma(a.chroma);
  const cb = relativeChroma(b.chroma);
  const cbr = transform(cb.r, M, best.deg, best.dx / 2, best.dy / 2, aspect);
  const cbg = transform(cb.g, M, best.deg, best.dx / 2, best.dy / 2, aspect);
  const colourR = changedCells(ca.r, cbr, M, 1, 0.045);
  const colourG = changedCells(ca.g, cbg, M, 1, 0.045);
  const colourSet = new Map();
  for (const c of [...colourR, ...colourG]) colourSet.set(`${c.x},${c.y}`, c);
  const colour = [...colourSet.values()];

  const regions = new Map();
  for (const c of ink) regions.set(regionOf(c.x, c.y, N), (regions.get(regionOf(c.x, c.y, N)) || 0) + 1);
  for (const c of colour) regions.set(regionOf(c.x, c.y, M), (regions.get(regionOf(c.x, c.y, M)) || 0) + 4);
  const added = ink.filter((c) => c.sign > 0).length;
  const evidence = {
    correlation: Math.round(corr * 1000) / 1000,
    alignment: { degrees: best.deg, shift: [best.dx, best.dy] },
    changedInkCells: ink.length,
    changedColourCells: colour.length,
    regions: [...regions.entries()].sort((x, y) => y[1] - x[1]).slice(0, 2).map(([name]) => name),
    kind: !ink.length && colour.length ? 'colour' : ink.length ? (added >= ink.length / 2 ? 'more_drawn' : 'less_drawn') : null,
  };

  if (corr < 0.6 || ink.length >= 8 || colour.length >= 3) return { state: 'different', evidence };
  if (ink.length <= 1 && colour.length <= 1 && corr >= 0.9) return { state: 'likely_same', evidence };
  return { state: 'uncertain', evidence };
}
