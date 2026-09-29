/**
 * Verifica que um PNG recortado e pixel-exact face a regiao correspondente
 * do original, e compara varias estrategias de compressao.
 */
const fs = require('fs');
const zlib = require('zlib');

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
const crc32 = (b) => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
};

function decode(file) {
  const b = fs.readFileSync(file);
  let o = 8, ihdr = null; const idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o), type = b.subarray(o + 4, o + 8).toString('ascii'), d = b.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') ihdr = { w: d.readUInt32BE(0), h: d.readUInt32BE(4), depth: d[8], color: d[9], interlace: d[12] };
    else if (type === 'IDAT') idat.push(d); else if (type === 'IEND') break;
    o += 12 + len;
  }
  const { w: W, h: H } = ihdr;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = W * bpp, px = Buffer.alloc(H * stride);
  let p = 0;
  for (let y = 0; y < H; y++) {
    const f = raw[p++], line = raw.subarray(p, p + stride); p += stride;
    const cur = px.subarray(y * stride, (y + 1) * stride), prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, bb = prev ? prev[x] : 0, c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += bb; else if (f === 3) v += (a + bb) >> 1;
      else if (f === 4) { const pp = a + bb - c, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? bb : c; }
      cur[x] = v & 0xff;
    }
  }
  return { W, H, px };
}

const paeth = (a, b, c) => { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };

function filterRows(px, w, h) {
  const bpp = 4, stride = w * bpp;
  const out = Buffer.alloc(h * (stride + 1));
  const cand = [0, 1, 2, 3, 4].map(() => Buffer.alloc(stride));
  for (let y = 0; y < h; y++) {
    const cur = px.subarray(y * stride, (y + 1) * stride), prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    const s = [0, 0, 0, 0, 0];
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, bb = prev ? prev[x] : 0, c = prev && x >= bpp ? prev[x - bpp] : 0, r0 = cur[x];
      const v = [r0, r0 - a, r0 - bb, r0 - ((a + bb) >> 1), r0 - paeth(a, bb, c)];
      for (let f = 0; f < 5; f++) { cand[f][x] = v[f] & 0xff; s[f] += v[f] < 128 ? v[f] : 256 - v[f]; }
    }
    let best = 0; for (let f = 1; f < 5; f++) if (s[f] < s[best]) best = f;
    out[y * (stride + 1)] = best; cand[best].copy(out, y * (stride + 1) + 1);
  }
  return out;
}

function assemble(px, w, h, raw, deflateOpts) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, deflateOpts)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const [, , origFile, cropFile, x0, y0] = process.argv;
const O = decode(origFile), C = decode(cropFile);
const X0 = Number(x0), Y0 = Number(y0);
console.log(`original ${O.W}x${O.H}   recorte ${C.W}x${C.H}  (origem ${X0},${Y0})`);

let mismatches = 0, firstBad = null;
for (let y = 0; y < C.H; y++) {
  for (let x = 0; x < C.W; x++) {
    const si = ((Y0 + y) * O.W + (X0 + x)) * 4, di = (y * C.W + x) * 4;
    for (let k = 0; k < 4; k++) {
      if (O.px[si + k] !== C.px[di + k]) {
        mismatches++;
        if (!firstBad) firstBad = `(${x},${y}) canal ${k}: orig=${O.px[si + k]} crop=${C.px[di + k]}`;
        break;
      }
    }
  }
}
console.log(mismatches === 0
  ? 'PIXEL-EXACT: todos os ' + (C.W * C.H) + ' pixels do recorte batem certo com o original'
  : `DIVERGENCIA: ${mismatches} pixels diferentes. primeiro: ${firstBad}`);

// cobertura do canal alpha dentro do recorte (detecta resto de vazio)
let a0 = C.W, b0 = C.H, a1 = -1, b1 = -1;
for (let y = 0; y < C.H; y++) for (let x = 0; x < C.W; x++) {
  if (C.px[(y * C.W + x) * 4 + 3] >= 12) { if (x < a0) a0 = x; if (x > a1) a1 = x; if (y < b0) b0 = y; if (y > b1) b1 = y; }
}
console.log(`conteudo no recorte: ${a0},${b0} -> ${a1},${b1}  (margens: esq ${a0} dir ${C.W - 1 - a1} topo ${b0} base ${C.H - 1 - b1})`);

const raw = filterRows(C.px, C.W, C.H);
console.log(`\nestrategias de compressao para ${C.W}x${C.H}:`);
const opts = [
  ['level 9', { level: 9 }],
  ['level 9 FILTERED', { level: 9, strategy: zlib.constants.Z_FILTERED }],
  ['level 9 RLE', { level: 9, strategy: zlib.constants.Z_RLE }],
  ['level 9 HUFFONLY', { level: 9, strategy: zlib.constants.Z_HUFFMAN_ONLY }],
];
let bestName = null, bestSize = Infinity;
for (const [name, o] of opts) {
  const buf = assemble(C.px, C.W, C.H, raw, o);
  const kb = buf.length / 1024;
  console.log(`  ${name.padEnd(20)} ${kb.toFixed(0)}KB`);
  if (kb < bestSize) { bestSize = kb; bestName = name; }
}
console.log(`\nmelhor: ${bestName} (${bestSize.toFixed(0)}KB)  vs original ${(fs.statSync(origFile).size / 1024).toFixed(0)}KB`);
