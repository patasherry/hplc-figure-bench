// Deterministic synthetic inputs for import and SEC calibration regressions.
// No measurements or files from a laboratory are used.
const file = (name, text) => ({name, mimeType: 'text/plain', buffer: Buffer.from(text)});
function unicorn(name = 'sec_Superdex 75 Increase 5-150 GL.tsv', comma = false){
  const n = v => comma ? v.toFixed(2).replace('.', ',') : v.toFixed(2);
  const rows = ['UV 1_280\t\tConductivity\t\tFraction\t', 'ml\tmAU\tml\tmS/cm\tml\t'];
  for (let i = 0; i <= 40; i++) {
    const x = i / 4, y = 2.5 + 100 * Math.exp(-Math.pow((x - 4.5) / 0.5, 2));
    rows.push([n(x), n(y), n(x), n(12.5 + x / 10), i % 4 === 0 ? n(x) : '', i % 4 === 0 ? 'F' + i / 4 : ''].join('\t'));
  }
  return file(name, rows.join('\n'));
}
function project(){
  const centers = [0.5, 2, 4, 6, 7, 9], heights = [900, 20, 10, 15, 400, 1200], xs = [], ys = [];
  for (let i = 0; i <= 400; i++) {
    const x = i / 40; xs.push(x);
    ys.push(centers.reduce((v, c, k) => v + heights[k] * Math.exp(-Math.pow((x - c) / 0.06, 2)), 0));
  }
  const stds = [{name: 'Small', kda: 30, ve: 6.6}, {name: 'Large', kda: 300, ve: 2.6},
    {name: 'Unticked', kda: 200, ve: 3.3, off: true}, {name: 'Middle', kda: 100, ve: 4.6}];
  return {app: 'HPLC Figure Bench', version: 1, cur: 'r1', traces: [], gels: [], nanodrop: [], prep: {},
    opt: {smooth: 1, baseline: false, intMethod: 'trap', intBase: 'line', secCals: [
      {id: 'scTest', name: 'Synthetic standards', col: 'custom', unit: 'mL', v0: 1, vt: 8, set: 'custom', stds}]},
    runs: [{id: 'r1', name: 'Synthetic SEC standards', file: 'sec_standards.tsv', xu: 'ml', uvi: 0, color: '#0072B2',
      xmin: '', xmax: '', ymin: '', ymax: '', shade: '', inWf: true, secMode: 'on', secCal: 'scTest', crop: 'full',
      uvs: [{name: 'UV 1_280', yu: 'mAU', xs, ys}], fracs: [], phases: [],
      integ: centers.map(x => ({a: x - 0.2, b: x + 0.2}))}]};
}
function nd(name, readings, dates = true){
  const head = dates ? ['Sample Name', 'A280', 'Concentration', 'Date', 'Time'] : ['Sample Name', 'A280', 'Concentration'];
  return file(name, [head.join('\t'), ...readings.map(r => r.join('\t'))].join('\n'));
}
// A NanoDrop table whose concentration column states its unit: in the header bracket, or with units = true in a Units column.
function ndUnit(name, unit, readings, units = false){
  const head = ['Sample Name', 'A280', units ? 'Concentration' : `Conc. (${unit})`].concat(units ? ['Units'] : []);
  return file(name, [head.join('\t'), ...readings.map(r => r.concat(units ? [unit] : []).join('\t'))].join('\n'));
}
// A UNICORN 7 export of the UV curve alone: one name row over a single ml,mAU pair. Peak 80 mAU at 12 mL on a 1.5 mAU baseline.
function uvOnly(name = 'uv_only_u7.csv'){
  const rows = ['Chrom.1,', 'UV 1_280,', 'ml,mAU'];
  for (let i = 0; i <= 500; i++) { const x = i * 0.05; rows.push(x.toFixed(4) + ',' + (1.5 + 80 * Math.exp(-0.5 * Math.pow((x - 12) / 0.4, 2))).toFixed(3)); }
  return file(name, rows.join('\r\n') + '\r\n');
}
// The synthetic UNICORN 7 archive chrom/valid_unicorn.zip (gen_11_unicorn_zip.py), rebuilt without the point files of the
// curves numbered in drop (1 UV, 2 Conductivity, 3 Conc B, 4 Flow), as an incomplete export would be. Its Chrom.1.Xml still lists them.
const zlib = require('zlib'), fsys = require('fs'), path = require('path');
const CRC = Array.from({length: 256}, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function unzip(buf){
  const out = []; let i = 0;
  while (i + 30 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) {
    const flag = buf.readUInt16LE(i + 6), meth = buf.readUInt16LE(i + 8), nl = buf.readUInt16LE(i + 26), xl = buf.readUInt16LE(i + 28); let cs = buf.readUInt32LE(i + 18), us = buf.readUInt32LE(i + 22);
    const name = buf.toString('utf8', i + 30, i + 30 + nl); let k = i + 30 + nl; const xe = k + xl;
    while (k + 4 <= xe) { const id = buf.readUInt16LE(k), sz = buf.readUInt16LE(k + 2); if (id === 1) { let q = k + 4; if (us === 0xffffffff) { us = Number(buf.readBigUInt64LE(q)); q += 8; } if (cs === 0xffffffff) cs = Number(buf.readBigUInt64LE(q)); } k += 4 + sz; }
    const raw = buf.subarray(xe, xe + cs); out.push({name, data: meth === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw)}); i = xe + cs;
    if (flag & 8) { if (buf.readUInt32LE(i) === 0x08074b50) i += 4; i += 12; }
  }
  return out;
}
function zip(entries){
  const loc = [], cen = []; let off = 0;
  for (const {name, data} of entries) {
    const nm = Buffer.from(name), crc = crc32(data), h = Buffer.alloc(30), c = Buffer.alloc(46);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(18432, 10); h.writeUInt16LE(23894, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nm.length, 26);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(18432, 12); c.writeUInt16LE(23894, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nm.length, 28); c.writeUInt32LE(off, 42);
    loc.push(h, nm, data); cen.push(c, nm); off += 30 + nm.length + data.length;
  }
  const cd = Buffer.concat(cen), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...loc, cd, end]);
}
function unicornZip(name, drop = []){
  const src = unzip(fsys.readFileSync(path.join(__dirname, 'chrom', 'valid_unicorn.zip')));
  return {name, mimeType: 'application/zip', buffer: zip(src.filter(e => !drop.some(n => e.name === `Chrom.1_${n}_True`)))};
}
module.exports = {file, unicorn, project, nd, ndUnit, uvOnly, unicornZip};
