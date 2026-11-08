# Comparing the first and the changed drawing

Code: `server/art/imageCompare.mjs`. Tests: `server/test/art.test.mjs`
("image comparison", D–G). Synthetic images: `server/test/art-images.mjs`.

## Why

A real session had the same drawing uploaded twice; the model described "a
brighter centre" and "new colours around it". The prompt used to require naming
one difference after every second upload. The app now measures the difference
itself and tells the model what it may say.

## Result states

| State | Meaning | What the model is told |
|---|---|---|
| `identical` | Same file (SHA-256 of the bytes) or same decoded pixels (SHA-256 of RGBA) | No visible change; say so instead of the two image questions |
| `likely_same` | Only what a camera or compression does: light, white balance, size, a small shift (≤ ≈6 %) or tilt (≤ 4°), noise | Never claim the drawing changed; when comparing, ask what they changed |
| `different` | Marks added, removed or recoloured; with the regions (3×3 grid) and kind (`more_drawn`, `less_drawn`, `colour`) | Name only a change visible there, neutrally |
| `uncertain` | Between the two (e.g. one tiny detail) | Don't assert a change; ask |
| `comparison_unavailable` | Not a JPEG, unreadable, or no first drawing in this run | Mention a difference only if clearly visible; otherwise ask |

`evidence` (logged in tests, given to the model as regions/kind):
correlation of the aligned maps, alignment (degrees, shift), changed ink cells,
changed colour cells, regions, kind.

## How

1. Decode the JPEG (`jpeg-js`, pure JavaScript) — the app always sends JPEG.
2. **Relative ink map, 48×48:** how much darker each cell is than the paper
   around it (`1 − grey / local paper level`; the paper level is a smoothed
   local maximum). Dividing by the paper level removes exposure, gradients and
   vignetting. A light blur removes the staircase that thin lines get when tilted.
3. **Alignment:** rotations −4…4° in 0.5° steps (in the photo's true
   proportions) × shifts −3…3 cells; keep the smallest mean squared difference.
4. **Changed cells:** a value in one map must lie within the min–max range of
   the other map's 3×3 neighbourhood (edges that moved by one cell don't count);
   threshold 0.16 relative ink.
5. **Colour, 24×24:** chromaticity (r/(r+g+b), g/(r+g+b)) minus the picture's
   own average (white balance), same alignment and range test, threshold 0.045.
6. **Decision:** `different` if correlation < 0.6, ≥ 8 changed ink cells or ≥ 3
   changed colour cells; `likely_same` if ≤ 1 ink and ≤ 1 colour cell and
   correlation ≥ 0.9; otherwise `uncertain`.

Cost: about 0.17 s to fingerprint a 1600×1200 photo and 0.05 s to compare.

## Calibration (synthetic drawing, all locked in tests)

| Variant | Result |
|---|---|
| same file | identical |
| re-encoded (quality 60, 95), resized (320, 1024 px) | likely_same |
| darker, brighter + offset, side light gradient, warm white balance, evening light | likely_same |
| camera shift 8 and 16 px, tilt 2° and 4°, sensor noise, light + shift + noise | likely_same |
| a black circle added, the sun recoloured, the field erased, the sun bigger, rays added, a new drawing | different |
| one small dot added | uncertain (never "unchanged") |

The live evaluation used a photo-like crayon drawing: identical → `identical`,
other light → `likely_same`, a dark circle added → `different` (top-right).

## Privacy

Only the fingerprint is stored (`art_image_fingerprints`: hashes and the
48×48 grey / 24×24 colour signatures, ~14 KB JSON), never the image; per
account, session and run; deleted with the account and after 60 days.

## Limits

- Not a semantic judgement: a drawing photographed from a very different angle
  (> 4°, perspective) or heavily cropped comes out `uncertain` or `different`;
  the model is then told to ask rather than assert.
- PNG/HEIC are `comparison_unavailable` (the app converts photos to JPEG first).
