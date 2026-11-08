// Synthetic "drawings on paper" for the art-reflection tests: one drawing and
// the variants a phone camera produces (re-encoding, size, light, a small shift
// or rotation) or a person makes (an added shape, a recoloured area). No real
// artwork from anyone is used.
import jpeg from 'jpeg-js';

export function canvas(w = 480, h = 360, bg = [246, 243, 236]) {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i += 1) data.set([bg[0], bg[1], bg[2], 255], i * 4);
  return { w, h, data };
}

const put = (c, x, y, col) => {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  c.data.set([col[0], col[1], col[2], 255], (y * c.w + x) * 4);
};

export function rect(c, x0, y0, x1, y1, col) {
  for (let y = Math.round(y0); y < y1; y += 1) for (let x = Math.round(x0); x < x1; x += 1) put(c, x, y, col);
  return c;
}

export function circle(c, cx, cy, r, col) {
  for (let y = Math.floor(cy - r); y <= cy + r; y += 1) for (let x = Math.floor(cx - r); x <= cx + r; x += 1) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(c, x, y, col);
  return c;
}

export function wave(c, y0, amp, col, thick = 5) {
  for (let x = 0; x < c.w; x += 1) {
    const y = Math.round(y0 + amp * Math.sin(x / 18));
    for (let t = -thick; t <= thick; t += 1) put(c, x, y + t, col);
  }
  return c;
}

/** A child-like drawing with many colours: a red sun, blue waves, a green field, yellow dots. */
export function drawing() {
  const c = canvas();
  circle(c, 240, 130, 62, [214, 48, 40]);
  wave(c, 230, 10, [40, 80, 200]);
  wave(c, 262, 8, [60, 120, 220], 4);
  rect(c, 40, 290, 440, 340, [60, 150, 70]);
  for (const [x, y] of [[80, 70], [400, 60], [380, 160], [100, 170]]) circle(c, x, y, 14, [235, 200, 40]);
  return c;
}

export const clone = (c) => ({ w: c.w, h: c.h, data: Buffer.from(c.data) });

export function encode(c, quality = 85) {
  return `data:image/jpeg;base64,${jpeg.encode({ width: c.w, height: c.h, data: c.data }, quality).data.toString('base64')}`;
}

/** Box-filter resize to a new width (aspect kept). */
export function resize(c, w) {
  const h = Math.round((c.h * w) / c.w);
  const out = canvas(w, h);
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1) {
      const sx = Math.min(c.w - 1, Math.floor((x * c.w) / w));
      const sy = Math.min(c.h - 1, Math.floor((y * c.h) / h));
      out.data.set(c.data.subarray((sy * c.w + sx) * 4, (sy * c.w + sx) * 4 + 4), (y * w + x) * 4);
    }
  return out;
}

/** Different light: gain, offset, a side-to-side gradient and a colour cast. */
export function lighting(c, { gain = 1, offset = 0, gradient = 0, cast = [1, 1, 1] } = {}) {
  const out = clone(c);
  for (let y = 0; y < c.h; y += 1)
    for (let x = 0; x < c.w; x += 1) {
      const i = (y * c.w + x) * 4;
      const g = gain * (1 + gradient * (x / c.w - 0.5));
      for (let k = 0; k < 3; k += 1) out.data[i + k] = Math.max(0, Math.min(255, Math.round(c.data[i + k] * g * cast[k] + offset)));
    }
  return out;
}

/** Camera moved a little: crop `px` from the left/top and keep the size. */
export function shift(c, px) {
  const out = canvas(c.w, c.h);
  for (let y = 0; y < c.h; y += 1)
    for (let x = 0; x < c.w; x += 1) {
      const sx = Math.min(c.w - 1, x + px);
      const sy = Math.min(c.h - 1, y + px);
      out.data.set(c.data.subarray((sy * c.w + sx) * 4, (sy * c.w + sx) * 4 + 4), (y * c.w + x) * 4);
    }
  return out;
}

/** A slightly tilted photo (nearest neighbour, paper colour outside). */
export function rotate(c, deg) {
  const out = canvas(c.w, c.h);
  const a = (deg * Math.PI) / 180;
  const [cx, cy] = [c.w / 2, c.h / 2];
  for (let y = 0; y < c.h; y += 1)
    for (let x = 0; x < c.w; x += 1) {
      const sx = Math.round(Math.cos(a) * (x - cx) + Math.sin(a) * (y - cy) + cx);
      const sy = Math.round(-Math.sin(a) * (x - cx) + Math.cos(a) * (y - cy) + cy);
      if (sx >= 0 && sy >= 0 && sx < c.w && sy < c.h) out.data.set(c.data.subarray((sy * c.w + sx) * 4, (sy * c.w + sx) * 4 + 4), (y * c.w + x) * 4);
    }
  return out;
}

/** Sensor noise. */
export function noise(c, amount = 6, seed = 7) {
  const out = clone(c);
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  for (let i = 0; i < out.data.length; i += 4) for (let k = 0; k < 3; k += 1) out.data[i + k] = Math.max(0, Math.min(255, out.data[i + k] + Math.round((rnd() - 0.5) * 2 * amount)));
  return out;
}
