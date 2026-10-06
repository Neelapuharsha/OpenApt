import fs from 'node:fs';
import zlib from 'node:zlib';

function createPNG(width, height, r, g, b, a = 255) {
  // Simple uncompressed or deflate PNG generator
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let crc = 0 ^ -1;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc ^ byte) & 1 ? 0xedb88320 : 0);
        byte >>>= 1;
      }
    }
    return (crc ^ -1) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const checksum = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(checksum, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw image data with filter byte 0 at start of each scanline
  const scanlineWidth = width * 4 + 1;
  const rawData = Buffer.alloc(scanlineWidth * height);

  for (let y = 0; y < height; y++) {
    const offset = y * scanlineWidth;
    rawData[offset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const px = offset + 1 + x * 4;
      // create a handsome gradient with emblem boundary
      const dx = (x - width / 2) / (width / 2);
      const dy = (y - height / 2) / (height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.75) {
        // inner emblem emerald
        rawData[px] = 16;     // R
        rawData[px + 1] = 185; // G
        rawData[px + 2] = 129; // B
        rawData[px + 3] = 255;
      } else {
        // dark background slate
        rawData[px] = 15;
        rawData[px + 1] = 23;
        rawData[px + 2] = 42;
        rawData[px + 3] = 255;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public', { recursive: true });
}

fs.writeFileSync('./public/pwa-192x192.png', createPNG(192, 192, 16, 185, 129));
fs.writeFileSync('./public/pwa-512x512.png', createPNG(512, 512, 16, 185, 129));
fs.writeFileSync('./public/pwa-maskable-512x512.png', createPNG(512, 512, 16, 185, 129));
fs.writeFileSync('./public/apple-touch-icon.png', createPNG(180, 180, 16, 185, 129));
fs.writeFileSync('./public/favicon.ico', createPNG(32, 32, 16, 185, 129));

console.log('Icons generated successfully.');
