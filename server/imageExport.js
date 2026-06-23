import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const EINK_W = 400;
const EINK_H = 300;

export const DEFAULT_THRESHOLD = 128;
export const DEFAULT_PIXEL_SIZE = 1; // 1 = full resolution, 2+ = chunkier pixels

async function toGrayscale(pngBuffer, w, h) {
  return sharp(pngBuffer)
    .resize(w, h, { fit: "fill", kernel: "lanczos3" })
    .greyscale()
    .normalize()
    .raw()
    .toBuffer();
}

function floydSteinberg(gray, w, h) {
  const pixels = new Float32Array(gray);
  const out = Buffer.alloc(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = Math.max(0, Math.min(255, pixels[i]));
      const nw = old < 128 ? 0 : 255;
      out[i] = nw;
      const err = old - nw;
      if (x + 1 < w)          pixels[i + 1]      += err * 7 / 16;
      if (y + 1 < h) {
        if (x > 0)             pixels[i + w - 1]  += err * 3 / 16;
                               pixels[i + w]      += err * 5 / 16;
        if (x + 1 < w)        pixels[i + w + 1]  += err * 1 / 16;
      }
    }
  }
  return out;
}

async function process(pngBuffer, { pixelSize = DEFAULT_PIXEL_SIZE } = {}) {
  const ps = Math.max(1, Math.round(pixelSize));
  const sw = Math.max(1, Math.round(EINK_W / ps));
  const sh = Math.max(1, Math.round(EINK_H / ps));

  const gray = await toGrayscale(pngBuffer, sw, sh);
  const dithered = floydSteinberg(gray, sw, sh);

  if (ps === 1) return dithered;

  // Scale back up with nearest-neighbor to keep hard pixel edges
  const upscaled = await sharp(dithered, { raw: { width: sw, height: sh, channels: 1 } })
    .resize(EINK_W, EINK_H, { kernel: "nearest" })
    .raw()
    .toBuffer();

  return upscaled;
}

function pack1bit(pixels) {
  const packed = Buffer.alloc((EINK_W * EINK_H) / 8);
  for (let i = 0; i < pixels.length; i++) {
    if (pixels[i] > 0) packed[Math.floor(i / 8)] |= 1 << (7 - (i % 8));
  }
  return packed;
}

export async function previewForEink(pngBuffer, opts = {}) {
  const pixels = await process(pngBuffer, opts);
  return sharp(pixels, { raw: { width: EINK_W, height: EINK_H, channels: 1 } })
    .png()
    .toBuffer();
}

export async function exportForEink(pngBuffer, outputDir, opts = {}) {
  const pixels = await process(pngBuffer, opts);
  const packed = pack1bit(pixels);
  await writeFile(join(outputDir, "latest-eink.bin"), packed);
  return packed;
}
