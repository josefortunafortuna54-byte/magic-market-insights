/**
 * Recorta o canvas vazio de um PNG RGBA de 8 bits, sem dependencias.
 * Descarta ruido de compressao (alpha residual) e usa filtragem adaptativa
 * para nao inchar o ficheiro.
 *
 * Uso: node scripts/crop-png.cjs <entrada> <saida> [margemPx] [alphaMin]
 */
const fs = require('fs');
const zlib = require('zlib');

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function decode(file) {
  const b = fs.readFileSync(file);
  let o = 8;
  let ihdr = null;
  const idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o);
    const type = b.subarray(o + 4, o + 8).toString('ascii');
    const data = b.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') {
      ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12] };
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    o += 12 + len;
  }
  if (!ihdr) throw new Error('PNG sem IHDR');
  if (ihdr.depth !== 8 || ihdr.color !== 6 || ihdr.interlace !== 0) {
    throw new Error(`formato nao suportado: depth=${ihdr.depth} color=${ihdr.color} interlace=${ihdr.interlace}`);
  }

  const { w: W, h: H } = ihdr;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = W * bpp;
  const px = Buffer.alloc(H * stride);
  let p = 0;
  for (let y = 0; y < H; y++) {
    const f = raw[p++];
    const line = raw.subarray(p, p + stride);
    p += stride;
    const cur = px.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const bb = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += bb;
      else if (f === 3) v += (a + bb) >> 1;
      else if (f === 4) {
        const pp = a + bb - c;
        const pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
      }
      cur[x] = v & 0xff;
    }
  }
  return { W, H, px };
}

function paeth(a, b, c) {
  const pp = a + b - c;
  const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Filtra cada linha escolhendo o tipo que minimiza a soma de |signed byte|. */
function encode(px, w, h) {
  const bpp = 4;
  const stride = w * bpp;
  const raw = Buffer.alloc(h * (stride + 1));
  const cand = [Buffer.alloc(stride), Buffer.alloc(stride), Buffer.alloc(stride), Buffer.alloc(stride), Buffer.alloc(stride)];
  for (let y = 0; y < h; y++) {
    const cur = px.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    const scores = [0, 0, 0, 0, 0];
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const bb = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      const raw0 = cur[x];
      const v = [raw0, raw0 - a, raw0 - bb, raw0 - ((a + bb) >> 1), raw0 - paeth(a, bb, c)];
      for (let f = 0; f < 5; f++) {
        cand[f][x] = v[f] & 0xff;
        scores[f] += v[f] < 128 ? v[f] : 256 - v[f];
      }
    }
    let best = 0;
    for (let f = 1; f < 5; f++) if (scores[f] < scores[best]) best = f;
    raw[y * (stride + 1)] = best;
    cand[best].copy(raw, y * (stride + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const [, , inFile, outFile, marginArg, alphaArg] = process.argv;
const margin = Number(marginArg ?? 4);
const alphaMin = Number(alphaArg ?? 12);
const { W, H, px } = decode(inFile);

let minX = W, minY = H, maxX = -1, maxY = -1;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (px[(y * W + x) * 4 + 3] >= alphaMin) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
if (maxX < 0) throw new Error(`nenhum pixel com alpha >= ${alphaMin}`);

const cx0 = Math.max(0, minX - margin);
const cy0 = Math.max(0, minY - margin);
const cx1 = Math.min(W - 1, maxX + margin);
const cy1 = Math.min(H - 1, maxY + margin);
const nw = cx1 - cx0 + 1;
const nh = cy1 - cy0 + 1;

const out = Buffer.alloc(nh * nw * 4);
for (let y = 0; y < nh; y++) {
  px.copy(out, y * nw * 4, ((cy0 + y) * W + cx0) * 4, ((cy0 + y) * W + cx0 + nw) * 4);
}

fs.writeFileSync(outFile, encode(out, nw, nh));
const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0);
console.log(`${inFile}  ${W}x${H}  ${kb(inFile)}KB`);
console.log(`  conteudo (alpha>=${alphaMin}): ${minX},${minY} -> ${maxX},${maxY}  ${maxX - minX + 1}x${maxY - minY + 1}  aspecto ${((maxX - minX + 1) / (maxY - minY + 1)).toFixed(3)}`);
console.log(`  recorte (+${margin}px): ${nw}x${nh}  aspecto ${(nw / nh).toFixed(3)}`);
console.log(`  ${outFile}  ${kb(outFile)}KB`);
