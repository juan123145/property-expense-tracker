/**
 * Generates PNG app icons with a navy (#1a2744) background and white "P" letter.
 * Runs once: node scripts/generate-icons.js
 * Outputs: public/icons/icon-192.png, icon-512.png, apple-touch-icon.png
 *
 * Zero dependencies — builds valid PNG from raw bytes.
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT_DIR = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(OUT_DIR, { recursive: true });

// Brand colors
const BG = { r: 0x1a, g: 0x27, b: 0x44 }; // #1a2744 navy
const FG = { r: 0xff, g: 0xff, b: 0xff }; // white

function crc32(buf) {
  let crc = 0xffffffff;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, typeBytes, data, crcVal]);
}

function makePng(size) {
  // Draw "P" glyph on a grid — 7×9 pixel bitmap, scaled to fit
  const glyphW = 7, glyphH = 9;
  const glyph = [
    [1,1,1,1,0,0,0],
    [1,0,0,0,1,0,0],
    [1,0,0,0,1,0,0],
    [1,1,1,1,0,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
    [1,0,0,0,0,0,0],
  ];

  const scale = Math.floor(size * 0.55 / glyphH);
  const glyphPxW = glyphW * scale;
  const glyphPxH = glyphH * scale;
  const offX = Math.floor((size - glyphPxW) / 2);
  const offY = Math.floor((size - glyphPxH) / 2);

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = [0]; // filter byte
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - offX) / scale);
      const gy = Math.floor((y - offY) / scale);
      let on = false;
      if (gx >= 0 && gx < glyphW && gy >= 0 && gy < glyphH && glyph[gy][gx]) on = true;
      row.push(on ? FG.r : BG.r, on ? FG.g : BG.g, on ? FG.b : BG.b, 255);
    }
    rows.push(Buffer.from(row));
  }

  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8);  // bit depth
  ihdr.writeUInt8(6, 9);  // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG signature
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const icons = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

for (const { file, size } of icons) {
  const buf = makePng(size);
  fs.writeFileSync(path.join(OUT_DIR, file), buf);
  console.log(`✓ ${file} (${size}×${size}, ${buf.length} bytes)`);
}
