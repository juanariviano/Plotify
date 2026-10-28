// gambar ikon pita bookmark (sama dengan favicon.svg web) ke png tanpa library gambar
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

// koordinat dari viewBox 32x32 favicon.svg
const SHAPE = [[8, 2], [24, 2], [24, 30], [16, 23.8], [8, 30]];
const COLOR = [0xc2, 0x41, 0x0c];
const SAMPLES = 4;

const inside = (x, y) => {
  let hit = false;
  for (let i = 0, j = SHAPE.length - 1; i < SHAPE.length; j = i++) {
    const [xi, yi] = SHAPE[i];
    const [xj, yj] = SHAPE[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};

const png = (size) => {
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    for (let x = 0; x < size; x++) {
      // anti-alias: hitung berapa sub-piksel yang masuk ke dalam bentuk
      let hits = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const px = ((x + (sx + 0.5) / SAMPLES) * 32) / size;
          const py = ((y + (sy + 0.5) / SAMPLES) * 32) / size;
          if (inside(px, py)) hits++;
        }
      }
      const at = row + 1 + x * 4;
      rows.set(COLOR, at);
      rows[at + 3] = Math.round((hits / SAMPLES ** 2) * 255);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // rgba
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

mkdirSync("public/icons", { recursive: true });
for (const size of [16, 32, 48, 128]) writeFileSync(`public/icons/${size}.png`, png(size));
