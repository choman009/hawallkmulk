// Prepare faithful crops/sizes of the supplied logo; no redrawing or recoloring.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const source = "public/brand/logo-original.jpg";
const { data, info } = await sharp(source)
  .removeAlpha()
  .toColourspace("srgb")
  .raw()
  .toBuffer({ resolveWithObject: true });
const rows = new Uint32Array(info.height);
let left = info.width,
  top = info.height,
  right = 0,
  bottom = 0;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (r > g && g > b && r - b > 55 && g - b > 30) {
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      rows[y]++;
    }
  }
}
if (left > right || top > bottom) throw new Error("Gold logo not found");
// The whitespace between the building symbol and its lettering separates them.
let gapStart = 0,
  gapLength = 0;
for (let y = top + Math.floor((bottom - top) * 0.45); y < bottom; y++) {
  if (rows[y]) continue;
  const start = y;
  while (y < bottom && rows[y] === 0) y++;
  if (y - start > gapLength) {
    gapStart = start;
    gapLength = y - start;
  }
}
if (gapLength < 10)
  throw new Error("Could not separate logo symbol from lettering");
const full = { left, top, width: right - left + 1, height: bottom - top + 1 };
const symbol = { ...full, height: gapStart - top };
await Promise.all([
  mkdir("public/icons", { recursive: true }),
  mkdir("public/brand", { recursive: true }),
]);
await sharp(source)
  .extract(full)
  .resize({ width: 640, withoutEnlargement: true })
  .png()
  .toFile("public/brand/logo-lockup.png");
async function square(path, size, coverage = 0.84) {
  const inner = Math.round(size * coverage);
  const mark = await sharp(source)
    .extract(symbol)
    .resize({ width: inner, height: inner, fit: "inside" })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 3, background: "#ffffff" },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .png()
    .toFile(path);
}
await Promise.all([
  square("public/brand/logo-mark.png", 512),
  square("public/icons/icon-192.png", 192),
  square("public/icons/icon-512.png", 512),
  square("public/icons/icon-maskable-512.png", 512, 0.58),
  square("src/app/icon.png", 64),
  square("src/app/apple-icon.png", 180),
]);
console.log("Prepared office logo and browser / Apple / Android icons.");
