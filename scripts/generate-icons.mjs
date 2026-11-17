import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const src = (y * width + x) * 4;
      const dst = rowStart + 1 + x * 4;
      raw[dst] = rgba[src];
      raw[dst + 1] = rgba[src + 1];
      raw[dst + 2] = rgba[src + 2];
      raw[dst + 3] = rgba[src + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function renderIcon(size) {
  const rgba = new Uint8Array(size * size * 4);
  const rCorner = size * 0.22;
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (y * size + x) * 4;
      // Rounded-rect SDF
      const qx = Math.abs(x + 0.5 - cx) - (cx - rCorner);
      const qy = Math.abs(y + 0.5 - cy) - (cy - rCorner);
      const dist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rCorner;
      if (dist > 0.6) continue;

      const edgeAlpha = dist > -0.6 ? Math.max(0, Math.min(1, 0.5 - dist)) : 1;

      // Safari Azure-to-Teal gradient
      const t = (x + y) / (2 * size);
      let r = Math.round(10 + t * 14);
      let g = Math.round(112 + t * 78);
      let b = Math.round(248 - t * 35);

      // Subtle inner ring + double fast-forward play glyph
      const nx = (x + 0.5 - cx) / (size * 0.5);
      const ny = (y + 0.5 - cy) / (size * 0.5);
      const rad = Math.hypot(nx, ny);
      if (Math.abs(rad - 0.72) < 0.055) {
        r = 255;
        g = 255;
        b = 255;
      }

      // Left triangle & Right triangle (>> clean speed emblem)
      const inTri1 = nx >= -0.34 && nx <= 0.04 && Math.abs(ny) <= (0.04 - nx) * 0.85;
      const inTri2 = nx >= 0.02 && nx <= 0.42 && Math.abs(ny) <= (0.42 - nx) * 0.85;
      if (inTri1 || inTri2) {
        r = 255;
        g = 255;
        b = 255;
      }

      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = Math.round(edgeAlpha * 255);
    }
  }
  return encodePng(size, size, rgba);
}

const extIconsDir = path.join(ROOT, "safari-extension", "icons");
fs.mkdirSync(extIconsDir, { recursive: true });
for (const sz of [16, 32, 48, 96, 128, 256, 512]) {
  fs.writeFileSync(path.join(extIconsDir, `icon-${sz}.png`), renderIcon(sz));
}
fs.mkdirSync(path.join(ROOT, "docs"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "docs", "icon-192.png"), renderIcon(192));
console.log("Generated Safari extension PNG icons (16..512px) + docs/icon-192.png");
