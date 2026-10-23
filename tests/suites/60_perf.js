// Performance budgets suite: measures key UI interaction durations and ensures they stay within budget.
const {open, H, suite, path, DATA, RES, fs} = require('../lib/harness');

function makePNG(w, h) {
  const zlib = require('zlib');
  const crcTable = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c;
  }
  const crc32 = buf => {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return c ^ -1;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4); crc.writeInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const ihdrChunk = chunk('IHDR', ihdr);
  const lineSize = 1 + w * 3;
  const raw = Buffer.alloc(h * lineSize);
  for (let y = 0; y < h; y++) {
    const rowOff = y * lineSize;
    raw[rowOff] = 0;
    raw.fill(240, rowOff + 1, rowOff + lineSize);
    for (let l = 0; l < 10; l++) {
      const laneX = 200 + l * 250;
      if (laneX + 40 < w) {
        raw.fill(30, rowOff + 1 + laneX * 3, rowOff + 1 + (laneX + 40) * 3);
      }
    }
  }
  const compressed = zlib.deflateSync(raw);
  const idatChunk = chunk('IDAT', compressed);
  const iendChunk = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

(async () => {
  const T = suite('60_perf');
  const tmpGel = path.join(RES, 'synthetic_3000x2000.png');
  fs.mkdirSync(RES, {recursive: true});
  fs.writeFileSync(tmpGel, makePNG(3000, 2000));

  // 1. Page load
  let pageLoadMs = null;
  const tPage0 = Date.now();
  const {p, errs, close} = await open();
  pageLoadMs = Date.now() - tPage0;
  T.check('page-load', pageLoadMs < 4000, `${pageLoadMs} ms (budget: 4000 ms)`);

  const h = H(p);
  await h.newProject('Perf Test');

  // 2. Loading 200k run
  await T.t('load-200k', async () => {
    const bigFile = path.join(DATA, 'qa', 'akta_200k_HisTrap_5mL.csv');
    const n0 = (await h.timeline()).length;
    const t0 = Date.now();
    await p.setInputFiles('#file', bigFile);
    let ms = null;
    for (let k = 0; k < 120; k++) {
      await p.waitForTimeout(100);
      if ((await h.timeline()).length > n0) {
        ms = Date.now() - t0;
        break;
      }
    }
    T.check('load-200k-csv', ms != null && ms < 2000, ms != null ? `${ms} ms (budget: 2000 ms)` : 'timeout waiting for 200k csv load');
  });

  // 3. Typing in Pooled fractions box
  await T.t('pooled-fractions-typing', async () => {
    await p.waitForTimeout(800);
    const ms = await p.evaluate(async () => {
      const e = document.querySelector('.trace.run.sel [data-k=shade]');
      if (!e) return -1;
      const t = performance.now();
      e.value = 'A3-A12';
      e.dispatchEvent(new Event('input', {bubbles: true}));
      await new Promise(r => requestAnimationFrame(() => r()));
      return Math.round(performance.now() - t);
    });
    T.check('pool-typing', ms >= 0 && ms < 600, `${ms} ms (budget: 600 ms)`);
  });

  // 4. Switching workflow figure between row, grid and stack with 8 steps
  await T.t('layout-switching-8-steps', async () => {
    const F = {
      his: path.join(DATA, 'standins', 'imac_histrap_1ml_step.csv'),
      ortho: path.join(DATA, 'standins', 'imac_histrap_1ml_ortho.csv'),
      q: path.join(DATA, 'standins', 'iex_q_6ml.csv'),
      s200: path.join(DATA, 'chrom', 'sec_S200_Increase_minutes_u7.csv'),
      zip: path.join(DATA, 'chrom', 'sec_Sup6_basic_unicorn7.zip'),
      nd: path.join(DATA, 'nd', 'nd_one_protein_a280.csv')
    };
    for (const f of [F.his, F.ortho, F.q, F.s200, F.zip, F.his]) await h.dropFiles(f);
    await h.addConc(F.nd, 0.3);
    await h.step('figure');

    const layouts = ['row', 'grid', 'stack', 'row', 'grid', 'stack', 'row', 'grid'];
    const tLayout0 = Date.now();
    for (const l of layouts) {
      await p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); }, `label[for="wf-${l}"]`);
      await p.waitForTimeout(100);
    }
    const ms = Date.now() - tLayout0;
    T.check('layout-switching', ms < 12000, `${ms} ms for 8 layout switches (budget: 12000 ms)`);
  });

  // 5. Loading a 3000x2000 synthetic gel PNG
  await T.t('load-synthetic-gel-png', async () => {
    const tg0 = Date.now();
    await p.setInputFiles('#gelFile', tmpGel);
    let ms = null;
    for (let k = 0; k < 120; k++) {
      await p.waitForTimeout(100);
      const tabs = await p.$$eval('.figtab', els => els.map(e => e.textContent));
      if (tabs.some(t => /Gel:/i.test(t))) {
        ms = Date.now() - tg0;
        break;
      }
    }
    T.check('gel-load-3000x2000', ms != null && ms < 3000, ms != null ? `${ms} ms (budget: 3000 ms)` : 'timeout waiting for gel load');
  });

  // 6. Re-opening a saved project
  await T.t('reopen-saved-project', async () => {
    await p.waitForTimeout(3000); // allow flushSave
    const tReload0 = Date.now();
    await p.reload();
    await p.waitForTimeout(1000);
    await p.evaluate(() => {
      const card = document.querySelector('.pcard[data-pid]');
      if (card) card.click();
    });
    let ms = null;
    for (let k = 0; k < 120; k++) {
      await p.waitForTimeout(100);
      if ((await h.timeline()).length > 0) {
        ms = Date.now() - tReload0;
        break;
      }
    }
    T.check('reopen-project', ms != null && ms < 10000, ms != null ? `${ms} ms (budget: 10000 ms)` : 'timeout waiting for project reopen');
  });

  T.check('no-page-errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
  process.exit(0);
})();
