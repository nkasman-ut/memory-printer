import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const EINK_W = 400;
const EINK_H = 300;

export async function exportForEink(pngBuffer, outputDir) {
  const raw = await sharp(pngBuffer)
    .resize(EINK_W, EINK_H, { fit: "fill" })
    .greyscale()
    .threshold(128)
    .raw()
    .toBuffer();

  // Pack 1 byte/pixel → 1 bit/pixel, MSB first (matches Adafruit GFX drawBitmap format)
  // 1 = white (carved marks), 0 = black (background)
  const packed = Buffer.alloc((EINK_W * EINK_H) / 8);
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] > 0) {
      packed[Math.floor(i / 8)] |= 1 << (7 - (i % 8));
    }
  }

  await writeFile(join(outputDir, "latest-eink.bin"), packed);
  return packed;
}
