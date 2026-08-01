import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fs = require('fs');
const path = require('path');
const iconsDir = join(__dirname, 'public', 'icons');

// Simple PNG generator using pure Node.js (no canvas dependency)
function createPNG(width, height) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  function createIHDR(w, h) {
    const data = Buffer.alloc(13);
    data.writeUInt32BE(w, 0);
    data.writeUInt32BE(h, 4);
    data[8] = 8; // bit depth
    data[9] = 2; // color type: truecolor
    data[10] = 0; // compression
    data[11] = 0; // filter
    data[12] = 0; // interlace
    return createChunk('IHDR', data);
  }
  
  // IDAT chunk - simple solid color with rupee symbol approximation
  function createIDAT(w, h) {
    const bytesPerPixel = 3; // RGB
    const stride = w * bytesPerPixel;
    const rawData = Buffer.alloc((stride + 1) * h); // +1 for filter byte per row
    
    const bgColor = [0x25, 0x63, 0xEB]; // #2563eb
    
    for (let y = 0; y < h; y++) {
      rawData[y * (stride + 1)] = 0; // filter type 0 (None)
      for (let x = 0; x < w; x++) {
        const i = y * (stride + 1) + 1 + x * 3;
        rawData[i] = bgColor[0];
        rawData[i + 1] = bgColor[1];
        rawData[i + 2] = bgColor[2];
      }
    }
    
    const zlib = require('zlib');
    const compressed = zlib.deflateSync(rawData);
    return createChunk('IDAT', compressed);
  }
  
  // IEND chunk
  function createIEND() {
    return createChunk('IEND', Buffer.alloc(0));
  }
  
  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const crc = require('zlib').crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }
  
  return Buffer.concat([
    signature,
    createIHDR(width, height),
    createIDAT(width, height),
    createIEND()
  ]);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  const png = createPNG(size, size);
  fs.writeFileSync(join(iconsDir, `icon-${size}x${size}.png`), png);
  console.log(`Generated icon-${size}x${size}.png`);
});

console.log('All icons generated!');